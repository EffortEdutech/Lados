'use client';

/**
 * WorkflowPickerModal — Phase 23 S23.4
 *
 * Lets eff add a Workflow Stage node sourced from ANY published workflow
 * the org can see (GET /organizations/:orgId/workflows), not just the
 * current project — the core "today's auto-populate-from-this-project
 * behavior goes away" change called for in the plan §6.
 *
 * Phase 24 S24.6: now that `projects.program_id` is a real FK, an optional
 * `programId` prop lets this modal prioritize workflows belonging to the
 * current Program's own member projects — sorted first, under a "This
 * Program" heading — while still surfacing every other org workflow below
 * under "Other Projects". Cross-project pick capability is never removed,
 * only reordered; a program can legitimately want a workflow from outside
 * its own projects (that's the whole point of S23.4's org-wide picker).
 */
import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '@/lib/api/client';
import type { OrgWorkflow } from './types';

interface WorkflowPickerModalProps {
  orgId: string;
  programId?: string;
  onPick: (workflow: OrgWorkflow) => void;
  onClose: () => void;
}

interface ProjectRef {
  id: string;
  program_id: string | null;
}

export default function WorkflowPickerModal({ orgId, programId, onPick, onClose }: WorkflowPickerModalProps) {
  const [workflows, setWorkflows] = useState<OrgWorkflow[]>([]);
  const [memberProjectIds, setMemberProjectIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [wfRes, projRes] = await Promise.all([
        apiClient.get<OrgWorkflow[]>(`/organizations/${orgId}/workflows`),
        programId ? apiClient.get<ProjectRef[]>(`/organizations/${orgId}/projects`) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (wfRes.error) {
        setError(apiErrorMessage(wfRes.error, 'Failed to load workflows'));
      } else {
        setWorkflows(wfRes.data ?? []);
        if (programId && projRes && !projRes.error) {
          const ids = (projRes.data ?? []).filter((p) => p.program_id === programId).map((p) => p.id);
          setMemberProjectIds(new Set(ids));
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId, programId]);

  const filtered = workflows.filter((wf) =>
    !search.trim() ||
    wf.name.toLowerCase().includes(search.toLowerCase()) ||
    (wf.project_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // Only worth splitting into two sections when this modal actually knows
  // which projects belong to the current program AND at least one of them
  // has a matching workflow — otherwise a single flat list (unchanged from
  // S23.4) reads better than an empty "This Program" heading.
  const memberWorkflows = memberProjectIds.size > 0
    ? filtered.filter((wf) => memberProjectIds.has(wf.project_id))
    : [];
  const otherWorkflows = memberProjectIds.size > 0
    ? filtered.filter((wf) => !memberProjectIds.has(wf.project_id))
    : filtered;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Add Workflow Stage</p>
            <p className="text-blue-200 text-xs">Pick a published workflow from anywhere in this org</p>
          </div>
          <button onClick={onClose} className="text-blue-100 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows or projects…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
          {error && <p className="text-sm text-red-600 text-center py-6">{error}</p>}

          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No published workflows found{search ? ' matching your search' : ' in this organization'}.
            </p>
          )}

          {!loading && !error && memberWorkflows.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 px-1">
                This Program&apos;s Projects
              </p>
              {memberWorkflows.map((wf) => (
                <WorkflowRow key={wf.id} wf={wf} onPick={onPick} />
              ))}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1 pt-2">
                Other Projects
              </p>
            </>
          )}

          {!loading && !error && otherWorkflows.map((wf) => (
            <WorkflowRow key={wf.id} wf={wf} onPick={onPick} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowRow({ wf, onPick }: { wf: OrgWorkflow; onPick: (workflow: OrgWorkflow) => void }) {
  return (
    <button
      onClick={() => onPick(wf)}
      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base flex-shrink-0">
        🗂️
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{wf.name}</p>
        <p className="text-[11px] text-gray-400 truncate">
          {wf.project_name ?? 'Unknown project'}
        </p>
      </div>
    </button>
  );
}
