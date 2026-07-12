'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface RunRecord {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
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

interface GroupRunRecord {
  id: string;
  group_id: string;
  group_name: string | null;
  run_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  test_inputs: Record<string, unknown>;
  node_results: Record<string, unknown>;
  logs: NodeLog[];
  duration_ms: number | null;
  error: { code?: string; message?: string } | null;
}

interface RunSummary {
  runId: string;
  status: string;
  durationMs: number;
  nodeCount: number;
}

interface Props {
  workflowId: string;
  projectId?: string;
  groupRunRefreshKey?: number;
  onLoadRun: (summary: RunSummary, logs: NodeLog[]) => void;
  onReRun: () => void;
  reRunning: boolean;
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  running: 'bg-blue-500 animate-pulse',
  paused: 'bg-amber-500',
  cancelled: 'bg-gray-400',
};

const STATUS_BADGE: Record<string, string> = {
  completed: 'text-green-700 bg-green-50',
  failed: 'text-red-700 bg-red-50',
  running: 'text-blue-700 bg-blue-50',
  paused: 'text-amber-700 bg-amber-50',
  cancelled: 'text-gray-500 bg-gray-100',
};

function fmt(ms: number | null): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '-';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RunHistoryPanel({
  workflowId,
  projectId,
  groupRunRefreshKey = 0,
  onLoadRun,
  onReRun,
  reRunning,
}: Props) {
  const [tab, setTab] = useState<'workflow' | 'groups'>('workflow');
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [groupRuns, setGroupRuns] = useState<GroupRunRecord[]>([]);
  const [expandedGroupRunId, setExpandedGroupRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingRun, setLoadingRun] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  const fetchRuns = useCallback(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<RunRecord[]>(`/workflows/${workflowId}/runs`)
      .then((res) => setRuns(res.data ?? []))
      .catch(() => setError('Failed to load run history'))
      .finally(() => setLoading(false));
  }, [workflowId]);

  const fetchGroupRuns = useCallback(() => {
    if (!projectId) return;
    setLoadingGroups(true);
    setGroupError(null);
    apiClient
      .get<GroupRunRecord[]>(`/projects/${projectId}/workflows/${workflowId}/group-run-logs`)
      .then((res) => setGroupRuns(res.data ?? []))
      .catch(() => setGroupError('Failed to load group run history'))
      .finally(() => setLoadingGroups(false));
  }, [projectId, workflowId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    fetchGroupRuns();
  }, [fetchGroupRuns, groupRunRefreshKey]);

  useEffect(() => {
    if (groupRunRefreshKey > 0) setTab('groups');
  }, [groupRunRefreshKey]);

  async function handleLoadRun(run: RunRecord) {
    setLoadingRun(run.id);
    try {
      const logsRes = await apiClient.get<NodeLog[]>(`/runs/${run.id}/logs`);
      const logs = logsRes.data ?? [];
      onLoadRun({
        runId: run.id,
        status: run.status,
        durationMs: run.duration_ms ?? 0,
        nodeCount: logs.length,
      }, logs);
    } catch {
      setError('Failed to load run logs');
    } finally {
      setLoadingRun(null);
    }
  }

  const refresh = tab === 'workflow' ? fetchRuns : fetchGroupRuns;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Run History
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={refresh}
            title="Refresh"
            className="px-1 text-[10px] text-gray-400 transition-colors hover:text-gray-600"
          >
            Refresh
          </button>
          {tab === 'workflow' && (
            <button
              onClick={onReRun}
              disabled={reRunning}
              title="Start new run"
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                reRunning
                  ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {reRunning ? '...' : 'Run'}
            </button>
          )}
        </div>
      </div>

      <div className="grid flex-shrink-0 grid-cols-2 border-b border-gray-100 text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setTab('workflow')}
          className={`py-1.5 ${tab === 'workflow' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Workflow Runs
        </button>
        <button
          type="button"
          onClick={() => setTab('groups')}
          className={`py-1.5 ${tab === 'groups' ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Group Runs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'workflow' && loading && (
          <p className="py-6 text-center text-xs text-gray-400">Loading...</p>
        )}
        {tab === 'workflow' && error && (
          <p className="py-6 text-center text-xs text-red-500">{error}</p>
        )}
        {tab === 'workflow' && !loading && !error && runs.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">No runs yet</p>
        )}

        {tab === 'workflow' && !loading && !error && runs.map((run) => {
          const dot = STATUS_DOT[run.status] ?? 'bg-gray-300';
          const badge = STATUS_BADGE[run.status] ?? 'text-gray-500 bg-gray-100';
          const isLoading = loadingRun === run.id;

          return (
            <button
              key={run.id}
              onClick={() => { void handleLoadRun(run); }}
              disabled={isLoading}
              className="w-full border-b border-gray-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge}`}>
                  {run.status}
                </span>
                <span className="ml-auto text-[10px] text-gray-400">{fmt(run.duration_ms)}</span>
              </div>
              <div className="mt-1 ml-4 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{relativeTime(run.started_at)}</span>
                <span className="text-[10px] text-blue-500">{isLoading ? 'Loading...' : 'View logs'}</span>
              </div>
              {run.status === 'failed' && run.error && (
                <p className="ml-4 mt-0.5 truncate text-[10px] text-red-500">
                  {run.error.message}
                </p>
              )}
            </button>
          );
        })}

        {tab === 'groups' && loadingGroups && (
          <p className="py-6 text-center text-xs text-gray-400">Loading...</p>
        )}
        {tab === 'groups' && groupError && (
          <p className="py-6 text-center text-xs text-red-500">{groupError}</p>
        )}
        {tab === 'groups' && !loadingGroups && !groupError && groupRuns.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">No group runs yet</p>
        )}
        {tab === 'groups' && !loadingGroups && !groupError && groupRuns.map((run) => {
          const dot = STATUS_DOT[run.status] ?? 'bg-gray-300';
          const badge = STATUS_BADGE[run.status] ?? 'text-gray-500 bg-gray-100';
          const expanded = expandedGroupRunId === run.id;
          const logs = run.logs ?? [];

          return (
            <div key={run.id} className="border-b border-gray-100 last:border-0">
              <button
                type="button"
                onClick={() => setExpandedGroupRunId(expanded ? null : run.id)}
                className="w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700">
                    {run.group_name ?? run.group_id}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge}`}>
                    {run.status}
                  </span>
                </div>
                <div className="mt-1 ml-4 flex items-center justify-between text-[10px] text-gray-400">
                  <span>{relativeTime(run.run_at)}</span>
                  <span>{fmt(run.duration_ms)}</span>
                </div>
                {run.status === 'failed' && run.error?.message && (
                  <p className="ml-4 mt-0.5 truncate text-[10px] text-red-500">
                    {run.error.message}
                  </p>
                )}
              </button>
              {expanded && (
                <div className="space-y-1 bg-gray-50 px-3 py-2">
                  {logs.length === 0 && (
                    <p className="text-[10px] text-gray-400">No task logs captured</p>
                  )}
                  {logs.map((log) => (
                    <div key={`${run.id}-${log.nodeId}`} className="rounded border border-gray-200 bg-white px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-gray-700">
                          {log.nodeName}
                        </span>
                        <span className="text-[10px] text-gray-400">{log.status}</span>
                      </div>
                      {log.error?.message && (
                        <p className="mt-0.5 truncate text-[10px] text-red-500">{log.error.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 px-3 py-1.5">
        <p className="text-center text-[10px] text-gray-300">
          Last 20 {tab === 'workflow' ? 'workflow' : 'group'} runs
        </p>
      </div>
    </div>
  );
}
