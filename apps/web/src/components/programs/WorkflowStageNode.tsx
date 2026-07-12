'use client';

/**
 * WorkflowStageNode — org-level Program Canvas node (Phase 23 S23.4, canvas
 * renamed from Pipeline in Phase 24 S24.4)
 *
 * Successor to the old project-scoped WorkflowNode.tsx — the key
 * difference is this can reference a workflow living in ANY project the
 * org can see (data.projectName is shown so eff can tell them apart),
 * not just the current project. Read-only display card; the only action
 * is opening the referenced workflow's own canvas or removing the stage.
 */
import { memo } from 'react';
import Link from 'next/link';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowStageData } from './types';

const RUN_STATUS_STYLE: Record<string, string> = {
  idle:      '',
  active:    'border-blue-400 shadow-blue-100 shadow-md',
  completed: 'border-emerald-400',
  failed:    'border-red-400',
  skipped:   'border-gray-200 opacity-50',
};

const RUN_STATUS_BADGE: Record<string, { icon: string; cls: string }> = {
  idle:      { icon: '', cls: '' },
  active:    { icon: '⟳', cls: 'text-blue-500 animate-spin' },
  completed: { icon: '✓', cls: 'text-emerald-600' },
  failed:    { icon: '✕', cls: 'text-red-500' },
  skipped:   { icon: '—', cls: 'text-gray-400' },
};

function WorkflowStageNode({ data, selected }: NodeProps<WorkflowStageData>) {
  const runStatus = data.runStatus ?? 'idle';
  const runCls = RUN_STATUS_STYLE[runStatus] ?? '';
  const badge = RUN_STATUS_BADGE[runStatus];

  return (
    <div
      className={`relative bg-white rounded-xl border-2 shadow-sm w-60 transition-all ${
        runCls || (selected ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-gray-200 hover:border-blue-300')
      }`}
    >
      {badge?.icon && (
        <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-[11px] font-bold shadow ${badge.cls}`}>
          {badge.icon}
        </span>
      )}

      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-blue-400 !border-2 !border-white" />

      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base flex-shrink-0">
            🗂️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
              {data.name ?? 'Workflow Stage'}
            </p>
            {data.projectName && (
              <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 bg-gray-100 text-gray-500">
                {data.projectName}
              </span>
            )}
          </div>
        </div>

        {data.projectId && (
          <Link
            href={`/projects/${data.projectId}/workflows/${data.workflowId}`}
            className="block text-center text-[11px] text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
            target="_blank"
          >
            Open canvas →
          </Link>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-400 !border-2 !border-white" />
    </div>
  );
}

export default memo(WorkflowStageNode);
