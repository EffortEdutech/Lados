'use client';

/**
 * PipelineCanvas
 *
 * React Flow canvas for the project pipeline — shows workflows as nodes,
 * lets users wire them with edges, add Switch routing nodes, save,
 * and execute the pipeline end-to-end.
 * Sprint 11 (S11-005) + Sprint 12 (S12-005)
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

import { apiClient } from '@/lib/api/client';
import WorkflowNode, { type WorkflowNodeData } from './WorkflowNode';
import SwitchNode, { type SwitchNodeData } from './SwitchNode';
import { PipelineRunner, type PipelineLogEntry, type NodeRunStatus } from './PipelineRunner';
import SwitchPathModal from './SwitchPathModal';
import PipelineRunLog from './PipelineRunLog';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;
}

// ── Node type registry ────────────────────────────────────────────────────────

const NODE_TYPES = {
  workflowNode: WorkflowNode,
  switchNode:   SwitchNode,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildWorkflowNode(wf: Workflow, projectId: string, x: number, y: number): Node<WorkflowNodeData> {
  return {
    id:       `wf-${wf.id}`,
    type:     'workflowNode',
    position: { x, y },
    data: {
      workflowId:  wf.id,
      projectId,
      name:        wf.name,
      status:      wf.status,
      description: wf.description,
    },
  };
}

// ── Inner canvas (needs ReactFlowProvider context) ────────────────────────────

interface PipelineCanvasInnerProps {
  projectId: string;
}

interface SwitchPending {
  nodeId:  string;
  label:   string;
  paths:   string[];
  resolve: (index: number) => void;
}

function PipelineCanvasInner({ projectId }: PipelineCanvasInnerProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sprint 12 — pipeline execution state
  const [running, setRunning]               = useState(false);
  const [pipelineLog, setPipelineLog]       = useState<PipelineLogEntry[]>([]);
  const [showLog, setShowLog]               = useState(false);
  const [switchPending, setSwitchPending]   = useState<SwitchPending | null>(null);
  const runnerRef = useRef<PipelineRunner | null>(null);

  // ── Load pipeline layout + workflows ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [pipelineRes, workflowsRes] = await Promise.all([
          apiClient.get<{ nodes: Node[]; edges: Edge[] }>(`/projects/${projectId}/pipeline`),
          apiClient.get<Workflow[]>(`/projects/${projectId}/workflows`),
        ]);

        if (cancelled) return;

        const savedNodes: Node[] = pipelineRes.data?.nodes ?? [];
        const savedEdges: Edge[] = pipelineRes.data?.edges ?? [];
        const workflows: Workflow[] = workflowsRes.data ?? [];

        // Auto-add any workflow not already in the saved layout
        const existingWfIds = new Set(
          savedNodes
            .filter((n) => n.type === 'workflowNode')
            .map((n) => (n.data as WorkflowNodeData).workflowId),
        );

        const newNodes: Node[] = workflows
          .filter((wf) => !existingWfIds.has(wf.id))
          .map((wf, i) =>
            buildWorkflowNode(wf, projectId, 80 + i * 280, 120 + (i % 2) * 80),
          );

        // Sync status on existing workflow nodes (workflows may have changed status)
        const syncedExisting = savedNodes.map((n) => {
          if (n.type !== 'workflowNode') return n;
          const wf = workflows.find((w) => w.id === (n.data as WorkflowNodeData).workflowId);
          if (!wf) return n;
          return { ...n, data: { ...n.data, status: wf.status, name: wf.name } };
        });

        setNodes([...syncedExisting, ...newNodes]);
        setEdges(savedEdges);
      } catch {
        // Non-fatal — show empty canvas
        setNodes([]);
        setEdges([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Node + edge change handlers ──────────────────────────────────────────────

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, animated: true, style: { stroke: '#3B82F6' } }, eds),
      ),
    [],
  );

  // ── Auto-save (debounced 1.5s after any change) ──────────────────────────────

  const scheduleSave = useCallback(
    (n: Node[], e: Edge[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await apiClient.put(`/projects/${projectId}/pipeline`, { nodes: n, edges: e });
          setSaveMsg('Saved');
          setTimeout(() => setSaveMsg(null), 2000);
        } catch {
          setSaveMsg('Save failed');
        } finally {
          setSaving(false);
        }
      }, 1500);
    },
    [projectId],
  );

  // Trigger auto-save whenever nodes or edges change (but not on initial load)
  const initialLoad = useRef(true);
  useEffect(() => {
    if (loading) return;
    if (initialLoad.current) { initialLoad.current = false; return; }
    scheduleSave(nodes, edges);
  }, [nodes, edges, loading, scheduleSave]);

  // ── Pipeline execution ────────────────────────────────────────────────────────

  /** Update a single node's runStatus in the React Flow node list */
  const setNodeRunStatus = useCallback((nodeId: string, status: NodeRunStatus) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, runStatus: status } } : n,
      ),
    );
  }, []);

  /** Clear all runStatus badges from nodes */
  const clearRunStatuses = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => (n.data?.runStatus ? { ...n, data: { ...n.data, runStatus: undefined } } : n)),
    );
  }, []);

  function handleRunPipeline() {
    if (running) {
      runnerRef.current?.abort();
      return;
    }

    clearRunStatuses();
    setPipelineLog([]);
    setShowLog(true);
    setRunning(true);

    // Capture stable snapshots of nodes/edges for this run
    const runNodes = nodes;
    const runEdges = edges;

    const runner = new PipelineRunner(runNodes, runEdges, projectId, {
      onNodeStatus: (nodeId, status) => {
        setNodeRunStatus(nodeId, status);
      },

      onSwitchReached: (nodeId, paths) => {
        // Find label from the node
        const node = runNodes.find((n) => n.id === nodeId);
        const label = (node?.data as SwitchNodeData | undefined)?.label ?? 'Switch';
        return new Promise<number>((resolve) => {
          setSwitchPending({ nodeId, label, paths, resolve });
        });
      },

      onLogUpdate: (log) => {
        setPipelineLog([...log]);
      },

      onComplete: (log) => {
        setPipelineLog([...log]);
        setRunning(false);
        setSwitchPending(null);
      },

      onError: (message) => {
        console.error('[PipelineRunner] Error:', message);
        setRunning(false);
        setSwitchPending(null);
      },
    });

    runnerRef.current = runner;
    void runner.run();
  }

  function handleSwitchChoice(pathIndex: number) {
    if (!switchPending) return;
    switchPending.resolve(pathIndex);
    setSwitchPending(null);
  }

  // ── Add Switch Node ──────────────────────────────────────────────────────────

  function addSwitchNode() {
    const id = `switch-${Date.now()}`;
    const newNode: Node<SwitchNodeData> = {
      id,
      type: 'switchNode',
      position: { x: 320, y: 200 },
      data: { label: 'Switch', paths: ['Path A', 'Path B'] },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  // ── Manual save ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    try {
      await apiClient.put(`/projects/${projectId}/pipeline`, { nodes, edges });
      setSaveMsg('Saved ✓');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg('Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Loading pipeline…
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          onClick={addSwitchNode}
          disabled={running}
          className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-lg shadow-sm hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ◆ Add Switch
        </button>
        <button
          onClick={handleSave}
          disabled={saving || running}
          className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saveMsg && (
          <span className="text-xs text-green-600 font-medium">{saveMsg}</span>
        )}

        {/* Run button */}
        <button
          onClick={handleRunPipeline}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors border ${
            running
              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              : 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600'
          }`}
        >
          {running ? '■ Stop' : '▶ Run Pipeline'}
        </button>
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <p className="text-gray-400 text-sm font-medium">No workflows yet</p>
            <p className="text-gray-300 text-xs mt-1">Create workflows in the Workflows tab — they&apos;ll appear here automatically</p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={running ? null : 'Delete'}
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => n.type === 'switchNode' ? '#8B5CF6' : '#3B82F6'}
          className="!bg-white !border !border-gray-200 !rounded-xl"
        />
      </ReactFlow>

      {/* Switch path selection modal — shown when PipelineRunner pauses at a SwitchNode */}
      {switchPending && (
        <SwitchPathModal
          switchLabel={switchPending.label}
          paths={switchPending.paths}
          onChoose={handleSwitchChoice}
        />
      )}

      {/* Execution timeline log panel */}
      {showLog && (
        <PipelineRunLog
          log={pipelineLog}
          running={running}
          onDismiss={() => {
            setShowLog(false);
            clearRunStatuses();
          }}
        />
      )}
    </div>
  );
}

// ── Public export (wraps in ReactFlowProvider) ────────────────────────────────

export default function PipelineCanvas({ projectId }: { projectId: string }) {
  return (
    <ReactFlowProvider>
      <div style={{ height: 'calc(100vh - 220px)' }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <PipelineCanvasInner projectId={projectId} />
      </div>
    </ReactFlowProvider>
  );
}
