'use client';

/**
 * ConditionNode — Sprint 14 (S14-006)
 *
 * Teal diamond shape for the workflow.condition skill.
 * Data-driven routing: evaluates an expression at runtime
 * and routes to true_path or false_path output handle.
 *
 * Distinct from Pipeline SwitchNode (violet ◆, user-driven, Sprint 12).
 */

import { type NodeProps, Handle, Position } from 'reactflow';

export function ConditionNode({ data, selected }: NodeProps) {
  const expression = (data.expression as string | undefined) ?? (data.config as Record<string, unknown>)?.['expression'] as string | undefined;
  const label      = (data.label as string | undefined) ?? 'Condition';

  const ringCls = selected ? 'ring-2 ring-offset-1 ring-teal-400' : '';

  return (
    <div
      className={`relative flex items-center justify-center ${ringCls}`}
      style={{ width: 96, height: 96 }}
    >
      {/* Diamond shape via rotated square */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: 'rotate(45deg)' }}
      >
        <div
          className="w-16 h-16 border-2 shadow-sm"
          style={{
            backgroundColor: '#f0fdfa',
            borderColor: '#0D9488',
          }}
        />
      </div>

      {/* Input handle — left centre */}
      <Handle
        id="value"
        type="target"
        position={Position.Left}
        style={{ background: '#0D9488', width: 8, height: 8, left: -4 }}
      />

      {/* True output — top-right */}
      <Handle
        id="true_path"
        type="source"
        position={Position.Right}
        style={{ background: '#16a34a', width: 8, height: 8, top: '25%' }}
      />

      {/* False output — bottom-right */}
      <Handle
        id="false_path"
        type="source"
        position={Position.Right}
        style={{ background: '#dc2626', width: 8, height: 8, top: '75%' }}
      />

      {/* Labels next to output handles */}
      <span
        className="absolute text-[8px] font-bold text-green-600 select-none"
        style={{ right: -32, top: '18%' }}
      >
        ✓ True
      </span>
      <span
        className="absolute text-[8px] font-bold text-red-500 select-none"
        style={{ right: -34, top: '68%' }}
      >
        ✗ False
      </span>

      {/* Centre content — on top of diamond */}
      <div className="relative z-10 text-center px-1">
        <p className="text-[9px] font-bold text-teal-700 leading-tight truncate max-w-[60px]">
          {label}
        </p>
        {expression && (
          <p className="text-[8px] text-teal-500 font-mono leading-tight mt-0.5 truncate max-w-[60px]">
            {expression}
          </p>
        )}
      </div>
    </div>
  );
}
