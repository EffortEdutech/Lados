'use client';

/**
 * ProgramCanvas (org-level) — Phase 23 S23.4, renamed from PipelineCanvas
 * in Phase 24 S24.4 (Pipeline→Program, Committee Gate→Stage Gate).
 *
 * Successor to the old project-scoped components/pipeline/PipelineCanvas.tsx
 * (Sprint 11/12, still on disk unrenamed — see components/pipeline/). Key
 * differences per the plan §6:
 *   - Workflow Stage nodes can reference any published workflow anywhere in
 *     the org (WorkflowPickerModal), not just the current project.
 *   - New Stage Gate node type — real inspector (GateInspectorModal),
 *     not a copy of the old client-side Switch node.
 *   - Triggering calls POST /programs/:id/run (ProgramExecutionService,
 *     S23.2, renamed from PipelineExecutionService in S24.2) and the run is
 *     tracked server-side — no client-side PipelineRunner.ts DAG walker
 *     anymore. The backend already knows how to find entry stages / follow
 *     edges (program-layout.types.ts, ported from the old runner's own
 *     traversal logic and renamed in S24.1/S24.3), so the canvas's only job
 *     on trigger is firing the request and then polling status.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { apiClient, apiErrorMessage } from '@/lib/api/client';
import WorkflowStageNode from './WorkflowStageNode';
import GateStageNode from './GateStageNode';
import WorkflowPickerModal from './WorkflowPickerModal';
import GateInspectorModal from './GateInspectorModal';
import ProgramRunStatusPanel from './ProgramRunStatusPanel';
import type {
  ProgramCanvasNode,
  WorkflowStageData,
  GateStageData,
  OrgWorkflow,
} from './types';

const NODE_TYPES = {
  workflowNode: WorkflowStageNode,
  gateNode:     GateStageNode,
};

interface ProgramRow {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  layout: { nodes: ProgramCanvasNode[]; edges: Edge[] } | null;
}

interface ProgramCanvasProps {
  orgId: string;
  programId: string;
}

/** Strip transient/UI-only fields before persisting layout. */
function sanitizeForSave(nodes: ProgramCanvasNode[]): ProgramCanvasNode[] {
  return nodes.map((n) => {
    if (n.type === 'gateNode') {
      const { onOpenInspector: _drop, runStatus: _drop2, ...rest } = n.data as GateStageData & { onOpenInspector?: unknown };
      return { ...n, data: rest };
    }
    if (n.type === 'workflowNode') {
      const { runStatus: _drop, ...rest } = n.data as WorkflowStageData;
      return { ...n, data: rest };
    }
    return n;
  });
}

function ProgramCanvasInner({ orgId, programId }: ProgramCanvasProps) {
  const [program, setProgram] = useState<ProgramRow | null>(null);
  const [nodes, setNodes] = useState<ProgramCanvasNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);

  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false);
  const [gateInspectorNodeId, setGateInspectorNodeId] = useState<string | 'new' | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.get<ProgramRow>(`/organizations/${orgId}/programs/${programId}`);
    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to load program'));
      setLoading(false);
      return;
    }
    setProgram(res.data);
    setNodes((res.data?.layout?.nodes as ProgramCanvasNode[] | undefined) ?? []);
    setEdges((res.data?.layout?.edges as Edge[] | undefined) ?? []);
    setError(null);
    setLoading(false);
  }, [orgId, programId]);

  useEffect(() => { void load(); }, [load]);

  // ── Node/edge change handlers ───────────────────────────────────────────

  // `applyNodeChanges`'s generic NodeData is inferred from the `nodes`
  // argument — pass the union type `ProgramCanvasNode[]` directly and
  // TypeScript's inference collapses it to a single member (WorkflowStageData
  // only), rejecting any GateStageNodeType element at compile time even
  // though it's a valid runtime union. Casting through the base `Node[]`
  // (no data-shape opinion) sidesteps the union-inference issue entirely;
  // the trailing `as ProgramCanvasNode[]` on the result restores the real
  // type for state. Pre-existing S23.4 bug, first caught here in S24.5 —
  // this file had never been through a real `tsc` pass before.
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds as Node[]) as ProgramCanvasNode[]),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect: OnConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#3B82F6' } }, eds)),
    [],
  );

  // ── Autosave (debounced 1.5s) ────────────────────────────────────────────

  const scheduleSave = useCallback(
    (n: ProgramCanvasNode[], e: Edge[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        const res = await apiClient.patch(`/organizations/${orgId}/programs/${programId}`, {
          layout: { nodes: sanitizeForSave(n), edges: e },
        });
        if (res.error) {
          setSaveMsg(apiErrorMessage(res.error, 'Save failed'));
        } else {
          setSaveMsg('Saved');
          setTimeout(() => setSaveMsg(null), 2000);
        }
        setSaving(false);
      }, 1500);
    },
    [orgId, programId],
  );

  useEffect(() => {
    if (loading) return;
    if (initialLoad.current) { initialLoad.current = false; return; }
    scheduleSave(nodes, edges);
  }, [nodes, edges, loading, scheduleSave]);

  // ── Add Workflow Stage ───────────────────────────────────────────────────

  function handlePickWorkflow(wf: OrgWorkflow) {
    const id = `wf-${wf.id}-${Date.now()}`;
    const newNode: ProgramCanvasNode = {
      id,
      type: 'workflowNode',
      position: { x: 80 + (nodes.length % 4) * 260, y: 120 + Math.floor(nodes.length / 4) * 160 },
      data: {
        workflowId:  wf.id,
        projectId:   wf.project_id,
        name:        wf.name,
        projectName: wf.project_name ?? undefined,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowWorkflowPicker(false);
  }

  // ── Add / edit Stage Gate ────────────────────────────────────────────────

  function handleSaveGate(data: GateStageData) {
    if (gateInspectorNodeId === 'new') {
      const id = `gate-${Date.now()}`;
      const newNode: ProgramCanvasNode = {
        id,
        type: 'gateNode',
        position: { x: 80 + (nodes.length % 4) * 260, y: 120 + Math.floor(nodes.length / 4) * 160 },
        data,
      };
      setNodes((nds) => [...nds, newNode]);
    } else if (gateInspectorNodeId) {
      setNodes((nds) =>
        nds.map((n) => (n.id === gateInspectorNodeId ? { ...n, data: { ...data, runStatus: (n.data as GateStageData).runStatus } } : n)),
      );
    }
    setGateInspectorNodeId(null);
  }

  const editingGateInitial = (() => {
    if (!gateInspectorNodeId || gateInspectorNodeId === 'new') return undefined;
    const n = nodes.find((node) => node.id === gateInspectorNodeId);
    return n?.type === 'gateNode' ? (n.data as GateStageData) : undefined;
  })();

  // Inject the transient "open my inspector" callback into gate nodes at
  // render time — React Flow only passes standard NodeProps into a
  // registered node component, so a parent callback has to travel via data.
  const renderNodes = nodes.map((n) =>
    n.type === 'gateNode'
      ? { ...n, data: { ...n.data, onOpenInspector: (id: string) => setGateInspectorNodeId(id) } }
      : n,
  );

  // ── Publish / Trigger ────────────────────────────────────────────────────

  async function handlePublish() {
    setPublishing(true);
    const res = await apiClient.patch(`/organizations/${orgId}/programs/${programId}`, { status: 'published' });
    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to publish program'));
    } else {
      await load();
    }
    setPublishing(false);
  }

  async function handleTrigger() {
    setTriggering(true);
    setError(null);
    const res = await apiClient.post<{ programRunId: string; status: string }>(`/programs/${programId}/run`, {});
    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to trigger program'));
    } else if (res.data) {
      setActiveRunId(res.data.programRunId);
    }
    setTriggering(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading program…</div>;
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowWorkflowPicker(true)}
          className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
        >
          🗂️ Add Workflow Stage
        </button>
        <button
          onClick={() => setGateInspectorNodeId('new')}
          className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-lg shadow-sm hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors"
        >
          👥 Add Stage Gate
        </button>

        {saveMsg && <span className="text-xs text-gray-500 font-medium">{saving ? 'Saving…' : saveMsg}</span>}

        <span className="mx-1 w-px h-5 bg-gray-200" />

        {program?.status !== 'published' ? (
          <button
            onClick={() => void handlePublish()}
            disabled={publishing || nodes.length === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm border bg-white border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title={nodes.length === 0 ? 'Add at least one stage first' : 'Publish before running'}
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        ) : (
          <button
            onClick={() => void handleTrigger()}
            disabled={triggering}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm border bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {triggering ? 'Starting…' : '▶ Run Program'}
          </button>
        )}

        {program && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            program.status === 'published' ? 'bg-green-100 text-green-700' :
            program.status === 'archived'  ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-gray-100 text-gray-500'
          }`}>
            {program.status}
          </span>
        )}
      </div>

      {error && (
        <div className="absolute top-3 right-3 z-10 max-w-sm bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 shadow-sm">
          {error}
        </div>
      )}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <p className="text-gray-400 text-sm font-medium">No stages yet</p>
            <p className="text-gray-300 text-xs mt-1">Add a Workflow Stage or Stage Gate to get started</p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={renderNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => (n.type === 'gateNode' ? '#8B5CF6' : '#3B82F6')}
          className="!bg-white !border !border-gray-200 !rounded-xl"
        />
      </ReactFlow>

      {showWorkflowPicker && (
        <WorkflowPickerModal
          orgId={orgId}
          programId={programId}
          onPick={handlePickWorkflow}
          onClose={() => setShowWorkflowPicker(false)}
        />
      )}

      {gateInspectorNodeId && (
        <GateInspectorModal
          orgId={orgId}
          initial={editingGateInitial}
          onSave={handleSaveGate}
          onClose={() => setGateInspectorNodeId(null)}
        />
      )}

      {activeRunId && (
        <ProgramRunStatusPanel runId={activeRunId} onDismiss={() => setActiveRunId(null)} />
      )}
    </div>
  );
}

export default function ProgramCanvas(props: ProgramCanvasProps) {
  return (
    <ReactFlowProvider>
      <div style={{ height: 'calc(100vh - 220px)' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <ProgramCanvasInner {...props} />
      </div>
    </ReactFlowProvider>
  );
}
