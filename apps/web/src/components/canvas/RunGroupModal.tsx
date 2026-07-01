'use client';

import { useEffect, useMemo, useState } from 'react';
import type { WorkflowSkillGroup } from '@lados/shared-types';
import { apiClient } from '@/lib/api/client';

interface GroupEntryPort {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  portId: string;
  portLabel: string;
  sourceNodeId?: string;
}

interface GroupRunResult {
  runId: string;
  groupId: string;
  groupName: string;
  status: string;
  durationMs: number;
  nodeResults: Record<string, unknown>;
  logs: unknown[];
}

interface RunGroupModalProps {
  projectId: string;
  workflowId: string;
  group: WorkflowSkillGroup;
  onClose: () => void;
  onCompleted?: (result: GroupRunResult) => void;
}

function parseInputValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

export default function RunGroupModal({
  projectId,
  workflowId,
  group,
  onClose,
  onCompleted,
}: RunGroupModalProps) {
  const [entryPorts, setEntryPorts] = useState<GroupEntryPort[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GroupRunResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get<{ entryPorts: GroupEntryPort[] }>(
        `/projects/${projectId}/workflows/${workflowId}/groups/${encodeURIComponent(group.id)}/entry-ports`,
      )
      .then((res) => {
        if (cancelled) return;
        if (!res.success || !res.data) {
          setError(res.error?.message ?? 'Failed to load group inputs');
          return;
        }
        setEntryPorts(res.data.entryPorts ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load group inputs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [group.id, projectId, workflowId]);

  const testInputs = useMemo(() => {
    const next: Record<string, unknown> = {};
    for (const port of entryPorts) {
      const key = `${port.nodeId}.${port.portId}`;
      const value = parseInputValue(values[key] ?? '');
      next[key] = value;
      next[port.portId] = value;
    }
    return next;
  }, [entryPorts, values]);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiClient.post<GroupRunResult>(
        `/projects/${projectId}/workflows/${workflowId}/run-group`,
        { groupId: group.id, testInputs },
      );

      if (!res.success || !res.data) {
        setError(res.error?.message ?? 'Group run failed');
        return;
      }

      setResult(res.data);
      onCompleted?.(res.data);
    } catch {
      setError('Group run failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Run Group: {group.name}</p>
            <p className="text-xs text-gray-500">{group.nodeIds.length} skill nodes</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close Run Group modal"
          >
            x
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {loading && <p className="py-6 text-center text-sm text-gray-400">Loading inputs...</p>}

          {!loading && entryPorts.length === 0 && (
            <p className="rounded border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-500">
              This group has no external entry ports. It can run with empty test inputs.
            </p>
          )}

          {!loading && entryPorts.length > 0 && (
            <div className="space-y-3">
              {entryPorts.map((port) => {
                const key = `${port.nodeId}.${port.portId}`;
                return (
                  <label key={key} className="block">
                    <span className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-gray-700">
                        {port.nodeLabel} / {port.portLabel}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-gray-500">
                        {port.portId}
                      </span>
                    </span>
                    <input
                      value={values[key] ?? ''}
                      onChange={(event) => setValues((prev) => ({ ...prev, [key]: event.target.value }))}
                      placeholder="Test value, number, boolean, or JSON"
                      className="w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                );
              })}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              Group run {result.status} in {result.durationMs}ms. Run ID: {result.runId}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={loading || running}
            className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-200"
          >
            {running ? 'Running...' : 'Run Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
