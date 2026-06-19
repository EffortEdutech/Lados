'use client';

/**
 * WorkflowCanvas — React Flow canvas for the QS-OS workflow editor.
 *
 * Sprint 2:  initial React Flow integration
 * Sprint 13: V3 — custom SkillNode with mode visual states (active/muted/bypassed),
 *             right-click context menu for mode toggle, mode persisted in workflow JSON
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  BackgroundVariant,
  Handle,
  Position,
} from 'reactflow';
import type {
  QSWorkflowDefinition,
  WorkflowNodeInstance,
  WorkflowConnection,
  SkillMode,
} from '@qsos/shared-types';
import PropertyPanel from './PropertyPanel';
import { ConditionNode } from './ConditionNode';

// ── Custom SkillNode ──────────────────────────────────────────────────────────
//
// Three visual states driven by data.mode:
//   active   — white card, solid border (default)
//   muted    — gray/dim, 🔇 badge, outputs null at runtime
//   bypassed — dashed amber border, ⏭ badge, passes input[0] through at runtime

function SkillNode({ data, selected }: NodeProps) {
  const mode: SkillMode = (data.mode as SkillMode) ?? 'active';

  const selectedRing = selected ? 'ring-2 ring-offset-1 ' : '';

  const containerCls =
    mode === 'muted'
      ? `bg-gray-100 border border-gray-300 opacity-55 ${selectedRing}${selected ? 'ring-blue-300' : ''}`
      : mode === 'bypassed'
        ? `bg-white border-2 border-dashed border-amber-400 ${selectedRing}${selected ? 'ring-amber-300' : ''}`
        : `bg-white border border-gray-300 ${selectedRing}${selected ? 'ring-blue-400' : ''}`;

  return (
    <div
      className={`relative rounded px-3 py-2 text-xs font-medium min-w-[120px] text-center shadow-sm transition-all ${containerCls}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#9ca3af', width: 8, height: 8 }}
      />

      {/* Mode badge — only when not active */}
      {mode !== 'active' && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider whitespace-nowrap ${
            mode === 'muted'
              ? 'bg-gray-200 text-gray-500'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          {mode === 'muted' ? '🔇 muted' : '⏭ bypass'}
        </span>
      )}

      <span className={mode === 'muted' ? 'text-gray-400' : 'text-gray-800'}>
        {data.label as string}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#9ca3af', width: 8, height: 8 }}
      />
    </div>
  );
}

// Stable module-level constant — prevents React Flow nodeTypes warning.
// 'condition' uses ConditionNode (teal diamond); everything else uses SkillNode.
const NODE_TYPES: NodeTypes = {
  skill:     SkillNode,
  condition: ConditionNode,
};

// ── Helpers: convert QS-OS types ↔ React Flow types ─────────────────────────

function rfNodeType(nodeType: string): string {
  return nodeType === 'workflow.condition' ? 'condition' : 'skill';
}

function toRFNodes(nodes: WorkflowNodeInstance[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: rfNodeType(n.type),
    position: n.position,
    data: {
      label: n.label ?? n.type,
      nodeType: n.type,
      config: n.config ?? {},
      mode: n.mode ?? 'active',
      // expose expression at top level for ConditionNode rendering
      expression: (n.config?.['expression'] as string | undefined) ?? undefined,
    },
  }));
}

function toRFEdges(connections: WorkflowConnection[]): Edge[] {
  return connections.map((c) => ({
    id: c.id,
    source: c.sourceNodeId,
    sourceHandle: c.sourcePortId,
    target: c.targetNodeId,
    targetHandle: c.targetPortId,
  }));
}

function fromRFNodes(rfNodes: Node[]): WorkflowNodeInstance[] {
  return rfNodes.map((n) => ({
    id: n.id as WorkflowNodeInstance['id'],
    type: (n.data as { nodeType: string }).nodeType as WorkflowNodeInstance['type'],
    label: (n.data as { label: string }).label,
    position: n.position,
    config: (n.data as { config: Record<string, unknown> }).config,
    mode: ((n.data as { mode?: SkillMode }).mode ?? 'active') as SkillMode,
  }));
}

function fromRFEdges(rfEdges: Edge[]): WorkflowConnection[] {
  return rfEdges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source as WorkflowConnection['sourceNodeId'],
    sourcePortId: e.sourceHandle ?? 'out',
    targetNodeId: e.target as WorkflowConnection['targetNodeId'],
    targetPortId: e.targetHandle ?? 'in',
  }));
}

// ── Context menu type ─────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

const MODE_OPTIONS: { mode: SkillMode; icon: string; label: string; desc: string }[] = [
  { mode: 'active',   icon: '▶',  label: 'Active',  desc: 'Normal execution'    },
  { mode: 'muted',    icon: '🔇', label: 'Mute',    desc: 'Skip, output null'   },
  { mode: 'bypassed', icon: '⏭',  label: 'Bypass',  desc: 'Pass input through'  },
];

// ── Component ─────────────────────────────────────────────────────────────────

/** Opaque request to bulk-set mode on a set of node types. `stamp` must be unique per request. */
export interface BulkModeRequest {
  nodeTypes: string[];
  mode: SkillMode;
  stamp: number;
}

interface WorkflowCanvasProps {
  definition: QSWorkflowDefinition;
  onSave?: (updated: QSWorkflowDefinition) => void;
  readOnly?: boolean;
  organizationId?: string;
  projectId?: string;
  /** When set (and stamp changes), bulk-applies mode to all canvas nodes matching nodeTypes. */
  bulkModeRequest?: BulkModeRequest | null;
}

export default function WorkflowCanvas({
  definition,
  onSave,
  readOnly = false,
  organizationId,
  projectId,
  bulkModeRequest,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toRFNodes(definition.nodes ?? []));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRFEdges(definition.connections ?? []));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Apply bulk mode to all canvas nodes whose nodeType matches the request */
  useEffect(() => {
    if (!bulkModeRequest) return;
    const { nodeTypes, mode } = bulkModeRequest;
    const typeSet = new Set(nodeTypes);
    setNodes((nds) => {
      const updated = nds.map((n) =>
        typeSet.has((n.data as { nodeType: string }).nodeType)
          ? { ...n, data: { ...n.data, mode } }
          : n,
      );
      scheduleAutoSave(updated, edges);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkModeRequest?.stamp]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, id: `e-${Date.now()}` }, eds));
    },
    [setEdges],
  );

  /** Debounced auto-save — fires 1.5s after last canvas change */
  const scheduleAutoSave = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[]) => {
      if (!onSave) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const updated: QSWorkflowDefinition = {
          ...definition,
          workflow: { ...definition.workflow, updatedAt: new Date().toISOString() },
          nodes: fromRFNodes(updatedNodes),
          connections: fromRFEdges(updatedEdges),
        };
        onSave(updated);
      }, 1500);
    },
    [definition, onSave],
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      setNodes((nds) => {
        scheduleAutoSave(nds, edges);
        return nds;
      });
    },
    [onNodesChange, setNodes, edges, scheduleAutoSave],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      setEdges((eds) => {
        scheduleAutoSave(nodes, eds);
        return eds;
      });
    },
    [onEdgesChange, setEdges, nodes, scheduleAutoSave],
  );

  /** Delete the currently selected node */
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        scheduleAutoSave(updated, edges);
        return updated;
      });
      setEdges((eds) => {
        const updated = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
        scheduleAutoSave(nodes.filter((n) => n.id !== nodeId), updated);
        return updated;
      });
      setSelectedNode(null);
    },
    [setNodes, setEdges, scheduleAutoSave, edges, nodes],
  );

  /** Update a node's config from the Skill Inspector */
  const handleConfigChange = useCallback(
    (nodeId: string, newConfig: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config: newConfig } } : n,
        ),
      );
    },
    [setNodes],
  );

  /** Set execution mode on a skill node (from context menu) */
  const handleSetMode = useCallback(
    (nodeId: string, mode: SkillMode) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, mode } } : n,
        );
        scheduleAutoSave(updated, edges);
        return updated;
      });
      setContextMenu(null);
    },
    [setNodes, scheduleAutoSave, edges],
  );

  /** Right-click on a node — show mode context menu */
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [],
  );

  /** Drop a skill from the palette onto the canvas */
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/qsos-node-type');
      const nodeLabel = event.dataTransfer.getData('application/qsos-node-label');
      if (!nodeType) return;

      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 75,
        y: event.clientY - bounds.top - 20,
      };

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: rfNodeType(nodeType),
        position,
        data: { label: nodeLabel || nodeType, nodeType, config: {}, mode: 'active' },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, []);

  return (
    <div className="relative flex h-full w-full">
      {/* Canvas */}
      <div
        className="flex-1"
        onDrop={readOnly ? undefined : onDrop}
        onDragOver={readOnly ? undefined : onDragOver}
      >
        <ReactFlow
          nodeTypes={NODE_TYPES}
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : handleNodesChange}
          onEdgesChange={readOnly ? undefined : handleEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={(_, node) => {
            setSelectedNode(node);
            setContextMenu(null);
          }}
          onPaneClick={handlePaneClick}
          onNodeContextMenu={readOnly ? undefined : onNodeContextMenu}
          deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
          fitView
          attributionPosition="bottom-right"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              const mode = (n.data as { mode?: SkillMode }).mode ?? 'active';
              return mode === 'muted' ? '#d1d5db' : mode === 'bypassed' ? '#fbbf24' : '#3b82f6';
            }}
            maskColor="rgba(0,0,0,0.08)"
            style={{ border: '1px solid #e5e7eb' }}
          />
        </ReactFlow>
      </div>

      {/* Skill Inspector (PropertyPanel) */}
      <PropertyPanel
        selectedNode={selectedNode}
        onConfigChange={handleConfigChange}
        onDeleteNode={readOnly ? undefined : handleDeleteNode}
        organizationId={organizationId}
        projectId={projectId}
      />

      {/* Skill mode context menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1000 }}
          className="rounded-lg border border-gray-200 bg-white shadow-xl py-1 min-w-[160px]"
          onMouseLeave={() => setContextMenu(null)}
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
            Skill Mode
          </p>
          {MODE_OPTIONS.map(({ mode, icon, label, desc }) => {
            const currentMode =
              (nodes.find((n) => n.id === contextMenu.nodeId)?.data as { mode?: SkillMode })
                ?.mode ?? 'active';
            const isCurrentMode = currentMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleSetMode(contextMenu.nodeId, mode)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
                  isCurrentMode ? 'font-semibold text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="w-5 text-center flex-shrink-0">{icon}</span>
                <span className="flex-1">
                  {label}
                  <span className="ml-1 text-[10px] text-gray-400 font-normal">— {desc}</span>
                </span>
                {isCurrentMode && (
                  <span className="text-blue-400 text-[11px]">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
