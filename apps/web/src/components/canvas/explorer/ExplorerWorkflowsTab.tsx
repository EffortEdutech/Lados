'use client';

/**
 * ExplorerWorkflowsTab — 2026-07-15
 *
 * Lists every workflow in the current project so you can jump between them
 * without leaving the canvas. Added after eff's feedback that opening a
 * second workflow required going back to the project page with no visible
 * way to open it in a new tab.
 *
 * Every row is a real anchor (`<a>`), not a JS onClick — that's what makes
 * "open in new tab" work reliably everywhere (right-click, Ctrl/Cmd-click,
 * middle-click), instead of depending on undiscoverable modifier-key
 * behavior. There are two explicit affordances per row:
 *   - Clicking the row itself navigates in THIS tab (replaces the current
 *     canvas, same as the project page's list).
 *   - The small "open in new tab" icon button next to it always opens a
 *     second, independent browser tab — the recommended way (over building
 *     an in-app tab strip) to view/run multiple workflows at once, since
 *     each browser tab already gets its own fully independent canvas state
 *     and run tracking (Phase 25, 2026-07-14).
 */
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface WorkflowSummary {
  id: string;
  name: string;
  status?: string;
  updated_at?: string;
}

interface ExplorerWorkflowsTabProps {
  projectId: string;
  workflowId: string; // the workflow currently open in this tab, for highlighting
  search: string;
}

export default function ExplorerWorkflowsTab({
  projectId,
  workflowId,
  search,
}: ExplorerWorkflowsTabProps) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<WorkflowSummary[]>(`/projects/${projectId}/workflows`)
      .then((res) => {
        if (!res.success) {
          setError(res.error?.message ?? 'Failed to load workflows');
          return;
        }
        setWorkflows(res.data ?? []);
      })
      .catch(() => setError('Failed to load workflows'))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = workflows.filter((wf) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return wf.name.toLowerCase().includes(term);
  });

  return (
    <div className="flex h-full flex-col bg-white text-xs">
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <p className="text-[10px] text-gray-400">
          Other workflows in this project. Use <span className="font-semibold text-gray-500">↗</span> to open one in a new tab so it runs independently alongside this one.
        </p>
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="py-6 text-center text-xs text-gray-400">Loading workflows...</p>}
        {!loading && filtered.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">No workflows found</p>
        )}
        {!loading && filtered.map((wf) => {
          const isCurrent = wf.id === workflowId;
          const href = `/projects/${projectId}/workflows/${wf.id}`;
          return (
            <div
              key={wf.id}
              className={`flex items-center gap-1 border-b border-gray-100 px-3 py-2.5 hover:bg-gray-50 ${
                isCurrent ? 'bg-blue-50/60' : ''
              }`}
            >
              <a
                href={href}
                className="min-w-0 flex-1"
                title={isCurrent ? 'Currently open in this tab' : `Open ${wf.name} in this tab`}
              >
                <p className={`truncate text-xs font-semibold ${isCurrent ? 'text-blue-700' : 'text-gray-800'}`}>
                  {wf.name}
                  {isCurrent && <span className="ml-1.5 text-[9px] font-normal text-blue-400">(open here)</span>}
                </p>
                {wf.status && (
                  <p className="mt-0.5 text-[10px] text-gray-400">{wf.status}</p>
                )}
              </a>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${wf.name} in a new tab`}
                aria-label={`Open ${wf.name} in a new tab`}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 rounded px-1.5 py-1 text-gray-400 hover:bg-blue-100 hover:text-blue-600"
              >
                ↗
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
