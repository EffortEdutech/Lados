'use client';

import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import type {
  SkillMode,
  WorkflowFastGroupBypasser,
  WorkflowSkillGroup,
} from '@lados/shared-types';

export interface FastGroupBypasserNodeData {
  bypasser: WorkflowFastGroupBypasser;
  groups: WorkflowSkillGroup[];
  readOnly?: boolean;
  onModeChange?: (groupId: string, mode: SkillMode) => void;
  onFocusGroup?: (groupId: string) => void;
  onRemove?: (bypasserId: string) => void;
}

const MODE_BUTTONS: { mode: SkillMode; label: string; title: string }[] = [
  { mode: 'active', label: 'A', title: 'Activate group' },
  { mode: 'muted', label: 'M', title: 'Mute group' },
  { mode: 'bypassed', label: 'B', title: 'Bypass group' },
];

const MODE_LABELS: Record<SkillMode, string> = {
  active: 'Active',
  muted: 'Muted',
  bypassed: 'Bypass',
};

function FastGroupBypasserNode({ data, selected }: NodeProps<FastGroupBypasserNodeData>) {
  const { bypasser, groups, readOnly, onModeChange, onFocusGroup, onRemove } = data;

  return (
    <div
      className={`w-[300px] overflow-hidden rounded-md border bg-white text-xs shadow-lg ${
        selected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="fgb-drag-handle flex cursor-move items-center justify-between border-b border-gray-100 bg-gray-950 px-3 py-2 text-white">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{bypasser.name ?? 'Group Mode Switcher'}</p>
          <p className="text-[10px] text-gray-300">{groups.length} group{groups.length === 1 ? '' : 's'}</p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onRemove?.(bypasser.id)}
            className="nodrag rounded px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-white/10 hover:text-white"
            title="Remove switcher"
          >
            x
          </button>
        )}
      </div>

      <div className="nodrag max-h-64 overflow-y-auto p-2">
        {groups.length === 0 && (
          <div className="rounded border border-dashed border-gray-200 px-3 py-4 text-center text-[11px] text-gray-400">
            Create a group to control it here.
          </div>
        )}

        {groups.map((group) => {
          const mode = group.mode ?? 'active';
          return (
            <div key={group.id} className="mb-1 rounded border border-gray-100 bg-gray-50 px-2 py-1.5 last:mb-0">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: group.color }}
                />
                <button
                  type="button"
                  onClick={() => onFocusGroup?.(group.id)}
                  className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-gray-700 hover:text-blue-600"
                  title={group.name}
                >
                  {group.name}
                </button>
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-500">
                  {group.nodeIds.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MODE_BUTTONS.map(({ mode: nextMode, label, title }) => (
                  <button
                    key={nextMode}
                    type="button"
                    onClick={() => onModeChange?.(group.id, nextMode)}
                    disabled={readOnly}
                    title={title}
                    className={`h-7 rounded border text-[10px] font-semibold ${
                      mode === nextMode
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                    <span className="ml-1 font-normal">{MODE_LABELS[nextMode]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(FastGroupBypasserNode);
