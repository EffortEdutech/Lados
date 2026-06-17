'use client';

/**
 * WorkflowNode — Pipeline Canvas Node
 *
 * Represents a workflow as a card on the project pipeline canvas.
 * Shows name, status badge, and a link to open the workflow canvas.
 * Sprint 11 (S11-005)
 */
import { memo } from 'react';
import Link from 'next/link';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { NodeRunStatus } from './PipelineRunner';

export interface WorkflowNodeData {
  workflowId: string;
  projectId: string;
  name: string;
  status: string;
  description?: string;
  /** Set by PipelineRunner during pipeline execution */
  runStatus?: NodeRunStatus;
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-500',
  published: 'bg-green-100 text-green-700',
  running:   'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived:  'bg-yellow-100 text-yellow-700',
};

/** Overlay badge shown while the pipeline runner is active */
function RunStatusBadge({ status }: { status: NodeRunStatus }) {
  if (status === 'idle') return null;

  const map: Record<NodeRunStatus, { icon: string; cls: string }> = {
    idle:      { icon: '',   cls: '' },
    queued:    { icon: '○',  cls: 'text-gray-400' },
    running:   { icon: '⟳',  cls: 'text-blue-500 animate-spin' },
    completed: { icon: '✓',  cls: 'text-emerald-600' },
    failed:    { icon: '✕',  cls: 'text-red-500' },
    skipped:   { icon: '—',  cls: 'text-gray-400' },
  };

  const { icon, cls } = map[status];
  if (!icon) return null;

  return (
    <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-[11px] font-bold shadow ${cls}`}>
      {icon}
    </span>
  );
}

function WorkflowNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const statusStyle = STATUS_STYLES[data.status] ?? 'bg-gray-100 text-gray-500';
  const runStatus = data.runStatus ?? 'idle';

  const runBorderCls =
    runStatus === 'running'   ? 'border-blue-400 shadow-blue-100 shadow-md' :
    runStatus === 'completed' ? 'border-emerald-400' :
    runStatus === 'failed'    ? 'border-red-400' :
    runStatus === 'skipped'   ? 'border-gray-200 opacity-50' :
    '';

  return (
    <div
      className={`
        relative bg-white rounded-xl border-2 shadow-sm w-56 transition-all
        ${runBorderCls || (selected ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-gray-200 hover:border-blue-300')}
      `}
    >
      <RunStatusBadge status={runStatus} />
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-400 !border-2 !border-white"
      />

      <div className="p-4">
        {/* Icon + name */}
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base flex-shrink-0">
            🗂️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
              {data.name}
            </p>
            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 ${statusStyle}`}>
              {data.status}
            </span>
          </div>
        </div>

        {data.description && (
          <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">{data.description}</p>
        )}

        {/* Open link */}
        <Link
          href={`/projects/${data.projectId}/workflows/${data.workflowId}`}
          className="block text-center text-[11px] text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Open canvas →
        </Link>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(WorkflowNode);
