'use client';

/**
 * SwitchNode — Pipeline Canvas Node
 *
 * Represents a manual branch point on the project pipeline canvas.
 * Each path is a labelled outgoing handle. Paths are editable inline.
 * Sprint 11 (S11-005)
 */
import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';

export interface SwitchNodeData {
  label: string;
  paths: string[];
}

// Vertical spacing between path handles
const HANDLE_OFFSET_TOP = 72;  // px from node top for first handle
const HANDLE_SPACING    = 36;  // px between handles

function SwitchNode({ id, data, selected }: NodeProps<SwitchNodeData>) {
  const { setNodes } = useReactFlow();
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingPathIdx, setEditingPathIdx] = useState<number | null>(null);

  const updateData = useCallback((patch: Partial<SwitchNodeData>) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
  }, [id, setNodes]);

  function addPath() {
    updateData({ paths: [...data.paths, `Path ${data.paths.length + 1}`] });
  }

  function removePath(idx: number) {
    if (data.paths.length <= 1) return; // keep at least one
    updateData({ paths: data.paths.filter((_, i) => i !== idx) });
  }

  function renamePath(idx: number, value: string) {
    const updated = [...data.paths];
    updated[idx] = value;
    updateData({ paths: updated });
  }

  const nodeHeight = HANDLE_OFFSET_TOP + data.paths.length * HANDLE_SPACING + 48;

  return (
    <div
      style={{ height: nodeHeight }}
      className={`
        bg-white rounded-xl border-2 shadow-sm w-52 transition-all relative
        ${selected ? 'border-violet-500 shadow-violet-100 shadow-md' : 'border-gray-200 hover:border-violet-300'}
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-violet-400 !border-2 !border-white"
        style={{ top: '50%' }}
      />

      <div className="p-4">
        {/* Diamond icon + label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-base flex-shrink-0">
            ◆
          </div>
          <div className="flex-1 min-w-0">
            {editingLabel ? (
              <input
                autoFocus
                className="text-xs font-semibold text-gray-900 w-full border-b border-violet-400 focus:outline-none bg-transparent"
                defaultValue={data.label}
                onBlur={(e) => { updateData({ label: e.target.value }); setEditingLabel(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { updateData({ label: e.currentTarget.value }); setEditingLabel(false); } }}
              />
            ) : (
              <p
                className="text-xs font-semibold text-gray-900 cursor-text hover:text-violet-700 truncate"
                onDoubleClick={() => setEditingLabel(true)}
                title="Double-click to rename"
              >
                {data.label}
              </p>
            )}
            <p className="text-[10px] text-gray-400">Switch</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-2" />

        {/* Paths */}
        <div className="space-y-1">
          {data.paths.map((path, idx) => (
            <div key={idx} className="flex items-center gap-1 group">
              {editingPathIdx === idx ? (
                <input
                  autoFocus
                  className="text-[11px] text-gray-700 flex-1 border-b border-violet-400 focus:outline-none bg-transparent"
                  defaultValue={path}
                  onBlur={(e) => { renamePath(idx, e.target.value); setEditingPathIdx(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { renamePath(idx, e.currentTarget.value); setEditingPathIdx(null); } }}
                />
              ) : (
                <span
                  className="text-[11px] text-gray-600 flex-1 truncate cursor-text hover:text-violet-700"
                  onDoubleClick={() => setEditingPathIdx(idx)}
                  title="Double-click to rename"
                >
                  {path}
                </span>
              )}
              {data.paths.length > 1 && (
                <button
                  onClick={() => removePath(idx)}
                  className="text-gray-300 hover:text-red-400 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove path"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add path button */}
        <button
          onClick={addPath}
          className="mt-2 text-[11px] text-violet-500 hover:text-violet-700 font-medium"
        >
          + Add path
        </button>
      </div>

      {/* One output handle per path */}
      {data.paths.map((path, idx) => (
        <Handle
          key={idx}
          id={`path-${idx}`}
          type="source"
          position={Position.Right}
          style={{ top: HANDLE_OFFSET_TOP + idx * HANDLE_SPACING }}
          className="w-3 h-3 !bg-violet-400 !border-2 !border-white"
          title={path}
        />
      ))}
    </div>
  );
}

export default memo(SwitchNode);
