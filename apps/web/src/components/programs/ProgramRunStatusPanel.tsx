'use client';

/**
 * ProgramRunStatusPanel — Phase 23 S23.4, renamed from
 * PipelineRunStatusPanel in Phase 24 S24.4.
 *
 * Live-ish view of a triggered program run: polls GET /program-runs/:runId
 * every 3s while the run is active. Deliberately poll-based, not SSE —
 * ProgramWatchdogService (S23.2, renamed from PipelineWatchdogService in
 * S24.2) advances stages asynchronously with no single "run" process to
 * push events from, and building a dedicated program SSE endpoint
 * (mirroring runs/:runId/stream, S3 D4) is a real but separable follow-up,
 * not required to ship a working status view. Matches this program's own
 * precedent: workflow run monitoring itself was poll-only from Phase 12
 * until SSE was added on top much later (S3 D4).
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient, apiErrorMessage } from '@/lib/api/client';

interface StageHistoryEntry {
  stageNodeId: string;
  type: 'workflow' | 'gate';
  executionRunId?: string;
  approvalTaskId?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
}

interface ProgramRun {
  id: string;
  status: string;
  current_stage_ids: string[];
  stage_history: StageHistoryEntry[];
  started_at: string | null;
  completed_at: string | null;
  error: { code: string; message: string } | null;
}

const ACTIVE_STATUSES = new Set(['running', 'paused']);

const STATUS_BANNER: Record<string, { icon: string; cls: string; label: string }> = {
  created:   { icon: '○', cls: 'text-gray-500',   label: 'Created' },
  running:   { icon: '▶', cls: 'text-blue-600',   label: 'Running…' },
  paused:    { icon: '⏸', cls: 'text-amber-600',  label: 'Paused — awaiting a gate decision' },
  completed: { icon: '✓', cls: 'text-emerald-600', label: 'Completed' },
  failed:    { icon: '✕', cls: 'text-red-600',    label: 'Failed' },
  cancelled: { icon: '—', cls: 'text-gray-500',   label: 'Cancelled' },
  timed_out: { icon: '⏱', cls: 'text-amber-600',  label: 'Timed out' },
};

function fmt(iso?: string | null) {
  if (!iso) return '…';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ProgramRunStatusPanel({
  runId,
  onDismiss,
}: {
  runId: string;
  onDismiss: () => void;
}) {
  const [run, setRun] = useState<ProgramRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await apiClient.get<ProgramRun>(`/program-runs/${runId}`);
    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to load program run'));
      return;
    }
    setError(null);
    setRun(res.data);
  }, [runId]);

  useEffect(() => {
    void load();
    timer.current = setInterval(() => {
      void load();
    }, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  useEffect(() => {
    if (run && !ACTIVE_STATUSES.has(run.status) && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, [run]);

  const banner = run ? STATUS_BANNER[run.status] ?? { icon: '?', cls: 'text-gray-500', label: run.status } : null;
  const history = run?.stage_history ?? [];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className={`text-xs font-semibold ${banner?.cls ?? 'text-gray-500'}`}>
          {banner?.icon} {banner?.label ?? 'Loading…'}
        </span>
        {run?.error && (
          <span className="text-[11px] text-red-500 truncate">{run.error.message}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100"
          >
            ↻ Refresh
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-52 overflow-y-auto px-4 py-3 space-y-0">
        {error && <p className="text-xs text-red-600 py-2">{error}</p>}

        {!error && history.length === 0 && (
          <p className="text-xs text-gray-400 py-2">Starting…</p>
        )}

        {history.map((entry, idx) => (
          <div key={`${entry.stageNodeId}-${idx}`} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="flex flex-col items-center pt-0.5">
              <span className="text-base font-bold leading-none text-gray-400">
                {entry.type === 'gate' ? '👥' : '🗂️'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800 truncate">{entry.stageNodeId}</span>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full capitalize">
                  {entry.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] text-gray-400">{fmt(entry.startedAt)}</span>
                {entry.completedAt && (
                  <span className="text-[11px] text-gray-400">→ {fmt(entry.completedAt)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
