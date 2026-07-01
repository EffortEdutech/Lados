'use client';

import { memo, useState, type ChangeEvent } from 'react';
import {
  NodeResizer,
  type NodeProps,
} from 'reactflow';
import type { SkillMode, WorkflowSkillGroup } from '@lados/shared-types';

export interface SkillGroupNodeData {
  group: WorkflowSkillGroup;
  readOnly?: boolean;
  onRename?: (groupId: string, name: string) => void;
  onColorChange?: (groupId: string, color: string) => void;
  onModeChange?: (groupId: string, mode: SkillMode) => void;
  onCollapseChange?: (groupId: string, collapsed: boolean) => void;
  onRunGroup?: (groupId: string) => void;
  onRemove?: (groupId: string) => void;
}

const MODE_LABELS: Record<SkillMode, string> = {
  active: 'Active',
  muted: 'Muted',
  bypassed: 'Bypass',
};

function SkillGroupNode({ data, selected }: NodeProps<SkillGroupNodeData>) {
  const { group, readOnly, onRename, onColorChange, onModeChange, onCollapseChange, onRunGroup, onRemove } = data;
  const [draftName, setDraftName] = useState(group.name);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const mode = group.mode ?? 'active';
  const collapsed = group.collapsed ?? false;

  function commitName() {
    const next = draftName.trim() || group.name;
    setDraftName(next);
    onRename?.(group.id, next);
  }

  function handleColorChange(event: ChangeEvent<HTMLInputElement>) {
    onColorChange?.(group.id, event.target.value);
  }

  return (
    <div
      className={`relative h-full w-full rounded-md border-2 bg-white/20 shadow-sm backdrop-blur-[1px] ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      }`}
      style={{
        borderColor: group.color,
        backgroundColor: `${group.color}12`,
      }}
    >
      {!readOnly && (
        <NodeResizer
          color={group.color}
          minWidth={180}
          minHeight={collapsed ? 48 : 120}
          isVisible={selected}
        />
      )}

      <div
        className="nodrag flex h-10 items-center gap-2 rounded-t border-b px-2 text-xs"
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!readOnly) setMenu({ x: event.clientX, y: event.clientY });
        }}
        style={{
          borderColor: `${group.color}44`,
          backgroundColor: `${group.color}22`,
        }}
      >
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded border border-white/70 bg-white/70 text-[10px] text-gray-600 shadow-sm"
          onClick={() => onCollapseChange?.(group.id, !collapsed)}
          title={collapsed ? 'Expand group' : 'Collapse group'}
          disabled={readOnly}
        >
          {collapsed ? '+' : '-'}
        </button>

        <input
          value={draftName}
          readOnly={readOnly}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 rounded border border-transparent bg-white/70 px-2 py-1 font-semibold text-gray-800 outline-none focus:border-white"
        />

        <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
          {MODE_LABELS[mode]}
        </span>

        <button
          type="button"
          className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onRunGroup?.(group.id)}
          disabled={readOnly}
          title="Run group"
        >
          Run
        </button>

        <input
          type="color"
          value={group.color}
          onChange={handleColorChange}
          disabled={readOnly}
          className="h-6 w-6 cursor-pointer rounded border border-white/80 bg-transparent p-0"
          title="Group color"
        />

        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-[13px] font-semibold leading-none text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onRemove?.(group.id)}
          disabled={readOnly}
          title="Delete group frame"
        >
          ×
        </button>
      </div>

      {!collapsed && (
        <div className="nodrag absolute right-2 top-12 flex items-center gap-1 rounded border border-white/70 bg-white/85 p-1 shadow-sm">
          {(['active', 'muted', 'bypassed'] as SkillMode[]).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => onModeChange?.(group.id, nextMode)}
              disabled={readOnly}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                mode === nextMode
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              title={MODE_LABELS[nextMode]}
            >
              {nextMode === 'active' ? 'A' : nextMode === 'muted' ? 'M' : 'B'}
            </button>
          ))}
        </div>
      )}

      {collapsed && (
        <div className="px-3 py-2 text-[11px] text-gray-600">
          {group.nodeIds.length} skill{group.nodeIds.length === 1 ? '' : 's'}
        </div>
      )}

      {menu && (
        <div
          className="nodrag fixed z-[1300] min-w-[140px] rounded border border-gray-200 bg-white py-1 text-xs shadow-xl"
          style={{ top: menu.y, left: menu.x }}
          onMouseLeave={() => setMenu(null)}
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => {
              setMenu(null);
              onRunGroup?.(group.id);
            }}
          >
            Run Group
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left font-medium text-red-600 hover:bg-red-50"
            onClick={() => {
              setMenu(null);
              onRemove?.(group.id);
            }}
          >
            Delete Group
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(SkillGroupNode);
