import { create } from 'zustand';

export type NodeRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting';

export type RunStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

export interface NodeLog {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  status: NodeRunStatus;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: { code: string; message: string };
  messages?: string[];
  dataPackUsages?: DataPackUsage[];
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface DataPackUsage {
  itemId: string;
  itemKey: string;
  title: string;
  unit: string | null;
  packSlug: string;
  packName: string;
  version: string;
  collectionKey: string;
  collectionName: string;
  sourceName: string;
  sourceUrl: string | null;
  sourceDate: string | null;
  region: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  classification: string | null;
  advisoryStatus: string;
  applicabilityNotes: string | null;
  assumptions: string | null;
}

export interface RunSummary {
  runId: string;
  status: RunStatus | string;
  durationMs: number;
  nodeCount: number;
}

/**
 * One workflow's run-tracking state. Phase 25 (2026-07-14) — this used to be
 * the entire store's shape, held as a single global instance shared by the
 * whole browser tab. That meant starting a run on workflow B while workflow
 * A's run was still in flight silently overwrote A's live view (A kept
 * executing correctly server-side — the backend has always supported
 * concurrent runs fine via BullMQ/in-process fallback — but the canvas lost
 * visibility into it). Now keyed by workflowId in `ExecutionState.byWorkflow`
 * so every open workflow tracks its own run independently. See
 * `Lados_V4_Phase25_MultiRun_Canvas_Tracking_Master_Plan.md` §3.
 */
export interface RunState {
  runId: string | null;
  runStatus: RunStatus;
  runSummary: RunSummary | null;
  nodeLogs: Record<string, NodeLog>;
  nodeLogList: NodeLog[];
  runError: string | null;
  streamConnected: boolean;
  polling: boolean;
}

export const DEFAULT_RUN_STATE: RunState = {
  runId: null,
  runStatus: 'idle',
  runSummary: null,
  nodeLogs: {},
  nodeLogList: [],
  runError: null,
  streamConnected: false,
  polling: false,
};

interface ExecutionState {
  byWorkflow: Record<string, RunState>;

  startRun: (workflowId: string, runId: string) => void;
  setRunStatus: (workflowId: string, runStatus: RunStatus) => void;
  setRunSummary: (workflowId: string, runSummary: RunSummary | null) => void;
  setNodeLogs: (workflowId: string, logs: NodeLog[]) => void;
  upsertNodeLog: (workflowId: string, log: NodeLog) => void;
  setRunError: (workflowId: string, runError: string | null) => void;
  setStreamConnected: (workflowId: string, streamConnected: boolean) => void;
  setPolling: (workflowId: string, polling: boolean) => void;
  resetRun: (workflowId: string) => void;
}

/** Reads a workflow's run state, falling back to the shared default (never mutated) if none exists yet. */
function getRunState(byWorkflow: Record<string, RunState>, workflowId: string): RunState {
  return byWorkflow[workflowId] ?? DEFAULT_RUN_STATE;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  byWorkflow: {},

  startRun: (workflowId, runId) =>
    set((state) => ({
      byWorkflow: {
        ...state.byWorkflow,
        [workflowId]: {
          runId,
          runStatus: 'starting',
          runSummary: { runId, status: 'starting', durationMs: 0, nodeCount: 0 },
          nodeLogs: {},
          nodeLogList: [],
          runError: null,
          streamConnected: false,
          polling: true,
        },
      },
    })),

  setRunStatus: (workflowId, runStatus) =>
    set((state) => ({
      byWorkflow: {
        ...state.byWorkflow,
        [workflowId]: { ...getRunState(state.byWorkflow, workflowId), runStatus },
      },
    })),

  setRunSummary: (workflowId, runSummary) =>
    set((state) => ({
      byWorkflow: {
        ...state.byWorkflow,
        [workflowId]: {
          ...getRunState(state.byWorkflow, workflowId),
          runSummary,
          runStatus: (runSummary?.status as RunStatus | undefined) ?? 'idle',
        },
      },
    })),

  setNodeLogs: (workflowId, logs) =>
    set((state) => ({
      byWorkflow: {
        ...state.byWorkflow,
        [workflowId]: {
          ...getRunState(state.byWorkflow, workflowId),
          nodeLogList: logs,
          nodeLogs: Object.fromEntries(logs.map((log) => [log.nodeId, log])),
        },
      },
    })),

  upsertNodeLog: (workflowId, log) =>
    set((state) => {
      const current = getRunState(state.byWorkflow, workflowId);
      const nodeLogs = { ...current.nodeLogs, [log.nodeId]: log };
      return {
        byWorkflow: {
          ...state.byWorkflow,
          [workflowId]: { ...current, nodeLogs, nodeLogList: Object.values(nodeLogs) },
        },
      };
    }),

  setRunError: (workflowId, runError) =>
    set((state) => ({
      byWorkflow: {
        ...state.byWorkflow,
        [workflowId]: { ...getRunState(state.byWorkflow, workflowId), runError },
      },
    })),

  setStreamConnected: (workflowId, streamConnected) =>
    set((state) => ({
      byWorkflow: {
        ...state.byWorkflow,
        [workflowId]: { ...getRunState(state.byWorkflow, workflowId), streamConnected },
      },
    })),

  setPolling: (workflowId, polling) =>
    set((state) => ({
      byWorkflow: {
        ...state.byWorkflow,
        [workflowId]: { ...getRunState(state.byWorkflow, workflowId), polling },
      },
    })),

  resetRun: (workflowId) =>
    set((state) => ({
      byWorkflow: { ...state.byWorkflow, [workflowId]: { ...DEFAULT_RUN_STATE } },
    })),
}));
