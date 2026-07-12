'use client';

/**
 * GateInspectorModal — Phase 23 S23.4 (§6)
 *
 * The "real new inspector control" the plan calls for — a voter picker
 * (multi-select from org members) + threshold number input (validated
 * 1 <= N <= M client-side; ProgramExecutionService.validateGateConfigs()
 * enforces the same rule server-side at trigger time) + optional
 * escalation window. Deliberately not a copy of request_approval's
 * single-assignee field — quorum configuration genuinely needs its own UI.
 * Used both to create a new Stage Gate stage and to edit an existing
 * one (same component, `initial` prop present vs. absent).
 *
 * Phase 24 S24.4: renamed "Committee Gate"→"Stage Gate" throughout;
 * PipelineExecutionService reference updated to ProgramExecutionService.
 */
import { useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '@/lib/api/client';
import type { GateStageData, OrgMember } from './types';

interface GateInspectorModalProps {
  orgId: string;
  initial?: GateStageData;
  onSave: (data: GateStageData) => void;
  onClose: () => void;
}

export default function GateInspectorModal({ orgId, initial, onSave, onClose }: GateInspectorModalProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState(initial?.label ?? 'Stage Gate');
  const [selectedVoters, setSelectedVoters] = useState<Set<string>>(new Set(initial?.voterUserIds ?? []));
  const [threshold, setThreshold] = useState(initial?.voteThreshold ?? 1);
  const [escalateAfterMinutes, setEscalateAfterMinutes] = useState<string>(
    initial?.escalateAfterMinutes != null ? String(initial.escalateAfterMinutes) : '',
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await apiClient.get<OrgMember[]>(`/organizations/${orgId}/members`);
      if (cancelled) return;
      if (res.error) {
        setError(apiErrorMessage(res.error, 'Failed to load organization members'));
      } else {
        setMembers(res.data ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  function toggleVoter(userId: string) {
    setSelectedVoters((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      // Threshold can never exceed the roster size.
      if (threshold > next.size) setThreshold(Math.max(1, next.size));
      return next;
    });
  }

  const voterCount = selectedVoters.size;
  const canSave = voterCount > 0 && threshold >= 1 && threshold <= voterCount;

  function handleSave() {
    if (!canSave) return;
    onSave({
      label: label.trim() || 'Stage Gate',
      voterUserIds: [...selectedVoters],
      voteThreshold: threshold,
      escalateAfterMinutes: escalateAfterMinutes.trim() ? Number(escalateAfterMinutes) : undefined,
    });
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-violet-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Stage Gate</p>
            <p className="text-violet-200 text-xs">Configure who votes and how many are needed</p>
          </div>
          <button onClick={onClose} className="text-violet-100 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-violet-400"
            />
          </label>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Voters ({voterCount} selected)
            </p>
            {loading && <p className="text-sm text-gray-400 py-2">Loading members…</p>}
            {error && <p className="text-sm text-red-600 py-2">{error}</p>}
            {!loading && !error && members.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No other organization members found.</p>
            )}
            {!loading && !error && members.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {members.map((m) => (
                  <label
                    key={m.user_id}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-violet-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVoters.has(m.user_id)}
                      onChange={() => toggleVoter(m.user_id)}
                    />
                    <span className="font-mono text-gray-700 truncate flex-1">{m.user_id}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{m.role}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Votes needed to pass (of {voterCount || 0})
            <input
              type="number"
              min={1}
              max={Math.max(1, voterCount)}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, Number(e.target.value)))}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-violet-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Escalate after (minutes, optional)
            <input
              type="number"
              min={1}
              value={escalateAfterMinutes}
              onChange={(e) => setEscalateAfterMinutes(e.target.value)}
              placeholder="e.g. 1440 for 24 hours"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-violet-400"
            />
          </label>

          {!canSave && voterCount === 0 && (
            <p className="text-[11px] text-amber-600">Select at least one voter.</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
