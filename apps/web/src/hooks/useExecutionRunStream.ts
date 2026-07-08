'use client';

/**
 * useExecutionRunStream — Phase 21 S7 (UI Alignment)
 *
 * Consumes the S3 (D4) SSE endpoint GET /runs/:runId/stream for live
 * per-node progress (`run.node_started` / `run.node_done`) and terminal run
 * events (`run.complete` / `run.paused` / `run.failed` / `run.timed_out`),
 * so the canvas can colour nodes live instead of only learning final
 * per-node status once the whole run finishes (useExecutionRunMonitor's
 * poll only calls GET /runs/:runId/logs after a terminal run status).
 *
 * Deliberately NOT the native browser EventSource API: EventSource cannot
 * send custom headers, and this endpoint is guarded by SupabaseJwtGuard,
 * which only reads the Authorization header (no query-param token
 * fallback — see apps/api/src/common/guards/supabase-jwt.guard.ts). Adding
 * a query-param-token bypass to the guard would weaken auth (token leaks
 * into server logs/URLs) and is a backend security decision outside this
 * hook's scope, so this uses `fetch()` (which supports the same Bearer
 * header apiClient already sends) and manually parses the
 * `data: {...}\n\n` SSE framing from the response body stream instead.
 *
 * Purely additive: useExecutionRunMonitor's polling loop is untouched and
 * keeps running as the safety net it already was (matches the backend's
 * own "falls back gracefully" SSE comment) — this hook only adds the fast,
 * live per-node path on top. If the stream errs or the browser doesn't
 * support ReadableStream, node status simply stays exactly as informative
 * as before (poll-driven, post-completion), a graceful no-op degradation.
 */
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useExecutionStore } from '@/stores';
import type { NodeLog, NodeRunStatus, RunStatus } from '@/stores';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface NodeProgressPayload {
  runId: string;
  type: 'started' | 'done';
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  status?: NodeRunStatus;
  durationMs?: number;
}

interface RunTerminalPayload {
  runId: string;
  status?: RunStatus | string;
}

const TERMINAL_EVENT_NAMES = new Set(['run.complete', 'run.paused', 'run.failed', 'run.timed_out']);

function isNodeProgressPayload(payload: unknown): payload is NodeProgressPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'type' in payload &&
    ((payload as { type?: unknown }).type === 'started' || (payload as { type?: unknown }).type === 'done')
  );
}

export function useExecutionRunStream(runId: string | null) {
  const upsertNodeLog = useExecutionStore((state) => state.upsertNodeLog);
  const setRunStatus = useExecutionStore((state) => state.setRunStatus);
  const setStreamConnected = useExecutionStore((state) => state.setStreamConnected);

  useEffect(() => {
    if (!runId) return;
    if (typeof fetch === 'undefined') return;

    let cancelled = false;
    const controller = new AbortController();

    async function connect() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;

      let res: Response;
      try {
        res = await fetch(`${BASE}/runs/${runId}/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
      } catch {
        return; // network error — silently degrade to poll-only (see doc comment)
      }

      if (!res.ok || !res.body) return;

      setStreamConnected(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line; each frame may have
          // multiple `data:` lines, but NestJS's @Sse() here emits one JSON
          // object per `data:` line.
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
            if (!dataLine) continue;

            let payload: unknown;
            try {
              payload = JSON.parse(dataLine.slice(5).trim());
            } catch {
              continue; // malformed frame — skip rather than crash the stream
            }

            if (isNodeProgressPayload(payload)) {
              const log: NodeLog = {
                nodeId: payload.nodeId,
                nodeType: payload.nodeType,
                nodeName: payload.nodeName ?? payload.nodeType,
                status: payload.type === 'started' ? 'running' : (payload.status ?? 'completed'),
                durationMs: payload.durationMs,
              };
              upsertNodeLog(log);
            } else {
              const terminal = payload as RunTerminalPayload;
              if (terminal?.status) setRunStatus(terminal.status as RunStatus);
            }
          }
        }
      } catch {
        // Stream aborted/closed — normal on unmount or run completion.
      } finally {
        if (!cancelled) setStreamConnected(false);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
      setStreamConnected(false);
    };
  }, [runId, upsertNodeLog, setRunStatus, setStreamConnected]);
}

// Re-exported so callers that only need the terminal-event name set (e.g.
// tests) don't have to duplicate it.
export { TERMINAL_EVENT_NAMES };
