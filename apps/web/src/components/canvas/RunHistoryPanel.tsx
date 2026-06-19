'use client';

/**
 * RunHistoryPanel — Sprint 16 (S16-001 + S16-002)
 *
 * Shows all past execution runs for the current workflow.
 * - Click any row to load its logs into the ExecutionLogPanel
 * - "Re-run" button triggers a fresh execution with empty inputs
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunRecord {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  trigger_type: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error: { code: string; message: string } | null;
}

interface NodeLog {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: { code: string; message: string };
  messages: string[];
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

interface RunSummary {
  runId: string;
  status: string;
  durationMs: number;
  nodeCount: number;
}

interface Props {
  workflowId: string;
  onLoadRun: (summary: RunSummary, logs: NodeLog[]) => void;
  onReRun: () => void;
  reRunning: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-green-500',
  failed:    'bg-red-500',
  running:   'bg-blue-500 animate-pulse',
  cancelled: 'bg-gray-400',
};

const STATUS_BADGE: Record<string, string> = {
  completed: 'text-green-700 bg-green-50',
  failed:    'text-red-700 bg-red-50',
  running:   'text-blue-700 bg-blue-50',
  cancelled: 'text-gray-500 bg-gray-100',
};

function fmt(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RunHistoryPanel({ workflowId, onLoadRun, onReRun, reRunning }: Props) {
  const [runs, setRuns]         = useState<RunRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingRun, setLoadingRun] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const fetchRuns = useCallback(() => {
    setLoading(true);
    apiClient
      .get<RunRecord[]>(`/workflows/${workflowId}/runs`)
      .then((res) => setRuns(res.data ?? []))
      .catch(() => setError('Failed to load run history'))
      .finally(() => setLoading(false));
  }, [workflowId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  async function handleLoadRun(run: RunRecord) {
    setLoadingRun(run.id);
    try {
      const logsRes = await apiClient.get<NodeLog[]>(`/runs/${run.id}/logs`);
      const logs = logsRes.data ?? [];
      const summary: RunSummary = {
        runId:     run.id,
        status:    run.status,
        durationMs: run.duration_ms ?? 0,
        nodeCount:  logs.length,
      };
      onLoadRun(summary, logs);
    } catch {
      setError('Failed to load run logs');
    } finally {
      setLoadingRun(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Run History
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchRuns}
            title="Refresh"
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors px-1"
          >
            ↻
          </button>
          <button
            onClick={onReRun}
            disabled={reRunning}
            title="Start new run"
            className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
              reRunning
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {reRunning ? '…' : '▶ Re-run'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
        )}
        {error && (
          <p className="text-xs text-red-500 text-center py-6">{error}</p>
        )}
        {!loading && !error && runs.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No runs yet</p>
        )}

        {!loading && !error && runs.map((run) => {
          const dot    = STATUS_DOT[run.status]   ?? 'bg-gray-300';
          const badge  = STATUS_BADGE[run.status] ?? 'text-gray-500 bg-gray-100';
          const isLoading = loadingRun === run.id;

          return (
            <button
              key={run.id}
              onClick={() => { void handleLoadRun(run); }}
              disabled={isLoading}
              className="w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge}`}>
                  {run.status}
                </span>
                <span className="ml-auto text-[10px] text-gray-400">{fmt(run.duration_ms)}</span>
              </div>
              <div className="mt-1 ml-4 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{relativeTime(run.started_at)}</span>
                {isLoading ? (
                  <span className="text-[10px] text-blue-400">Loading…</span>
                ) : (
                  <span className="text-[10px] text-blue-500">View logs →</span>
                )}
              </div>
              {run.status === 'failed' && run.error && (
                <p className="ml-4 mt-0.5 text-[10px] text-red-500 truncate">
                  {run.error.message}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-1.5 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] text-gray-300 text-center">Last 20 runs</p>
      </div>
    </div>
  );
}
