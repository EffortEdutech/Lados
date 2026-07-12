'use client';

/**
 * GateStageNode — Stage Gate node on the org-level Program Canvas
 * (Phase 23 S23.4, renamed from "Committee Gate"/"Pipeline Canvas" in
 * Phase 24 S24.4)
 *
 * A genuinely new node type (not carried over from the old canvas) — pauses
 * the program for N-of-M quorum voting by a named roster. Configuration
 * (voters/threshold/escalation) is deliberately NOT edited inline on the
 * card, unlike the old SwitchNode's double-click-to-rename pattern — a
 * multi-select voter picker needs more room than a canvas card can offer,
 * so this opens GateInspectorModal on click instead.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { GateStageData } from './types';

const RUN_STATUS_STYLE: Record<string, string> = {
  idle:      '',
  active:    'border-amber-400 shadow-amber-100 shadow-md',
  completed: 'border-emerald-400',
  failed:    'border-red-400',
  skipped:   'border-gray-200 opacity-50',
};

// React Flow only ever passes standard NodeProps into a registered node
// component — a parent-owned callback like "open the inspector modal for
// this node" has to travel inside `data` itself (set when ProgramCanvas
// builds its `nodes` array), not as a sibling prop. Kept out of the
// persisted GateStageData type in types.ts since it's stripped before save.
type GateStageDataWithCallback = GateStageData & { onOpenInspector?: (nodeId: string) => void };

function GateStageNode({ id, data, selected }: NodeProps<GateStageDataWithCallback>) {
  const onOpenInspector = data.onOpenInspector;
  const runStatus = data.runStatus ?? 'idle';
  const runCls = RUN_STATUS_STYLE[runStatus] ?? '';
  const voterCount = data.voterUserIds?.length ?? 0;

  return (
    <div
      className={`relative bg-white rounded-xl border-2 shadow-sm w-60 transition-all cursor-pointer ${
        runCls || (selected ? 'border-violet-500 shadow-violet-100 shadow-md' : 'border-gray-200 hover:border-violet-300')
      }`}
      onDoubleClick={() => onOpenInspector?.(id)}
      title="Double-click to configure voters/threshold"
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-violet-400 !border-2 !border-white" />

      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-base flex-shrink-0">
            👥
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
              {data.label ?? 'Stage Gate'}
            </p>
            <span className="text-[10px] text-gray-400">Stage Gate</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded font-medium">
            {data.voteThreshold ?? 0} of {voterCount} to pass
          </span>
        </div>

        {data.escalateAfterMinutes && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            Escalates after {data.escalateAfterMinutes}m
          </p>
        )}

        {onOpenInspector && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenInspector(id); }}
            className="mt-2 w-full text-center text-[11px] text-violet-600 hover:text-violet-800 font-medium bg-violet-50 hover:bg-violet-100 rounded-lg py-1.5 transition-colors"
          >
            Configure →
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-violet-400 !border-2 !border-white" />
    </div>
  );
}

export default memo(GateStageNode);
