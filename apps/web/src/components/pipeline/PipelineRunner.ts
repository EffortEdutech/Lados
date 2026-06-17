/**
 * PipelineRunner
 *
 * Client-side pipeline execution engine.
 * Traverses the React Flow pipeline DAG, running each WorkflowNode via the
 * execution API and pausing at SwitchNodes for user path selection.
 *
 * Execution is synchronous on the backend (POST /run blocks until done), so
 * no polling is needed — we just await each call.
 *
 * Sprint 12 (S12-001)
 */

import type { Node, Edge } from 'reactflow';
import { apiClient } from '@/lib/api/client';
import type { WorkflowNodeData } from './WorkflowNode';
import type { SwitchNodeData } from './SwitchNode';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NodeRunStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface PipelineLogEntry {
  nodeId:      string;
  label:       string;
  nodeType:    'workflow' | 'switch' | 'unknown';
  status:      NodeRunStatus;
  startedAt:   Date;
  completedAt?: Date;
  durationMs?:  number;
  runId?:       string;
  error?:       string;
}

export interface PipelineRunnerCallbacks {
  /** Fired whenever a node changes execution status */
  onNodeStatus: (nodeId: string, status: NodeRunStatus) => void;
  /** Fired when a SwitchNode is reached — return the chosen path index */
  onSwitchReached: (nodeId: string, paths: string[]) => Promise<number>;
  /** Fired as each step completes with updated log */
  onLogUpdate: (log: PipelineLogEntry[]) => void;
  /** Fired when the full pipeline completes successfully */
  onComplete: (log: PipelineLogEntry[]) => void;
  /** Fired on unrecoverable error */
  onError: (message: string) => void;
}

// ── PipelineRunner ────────────────────────────────────────────────────────────

export class PipelineRunner {
  private nodes: Node[];
  private edges: Edge[];
  private projectId: string;
  private callbacks: PipelineRunnerCallbacks;
  private log: PipelineLogEntry[] = [];
  private visited = new Set<string>();
  private aborted = false;

  constructor(
    nodes: Node[],
    edges: Edge[],
    projectId: string,
    callbacks: PipelineRunnerCallbacks,
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.projectId = projectId;
    this.callbacks = callbacks;
  }

  /** Stop the pipeline mid-run (best-effort — current await will still finish) */
  abort() {
    this.aborted = true;
  }

  /** Start pipeline execution from all entry nodes (no incoming edges) */
  async run(): Promise<void> {
    const entryNodeIds = this.findEntryNodes();

    if (entryNodeIds.length === 0) {
      this.callbacks.onError('Pipeline has no entry point — wire at least one workflow with no incoming connection.');
      return;
    }

    // Mark all workflow nodes as queued
    for (const node of this.nodes) {
      if (node.type === 'workflowNode') {
        this.callbacks.onNodeStatus(node.id, 'queued');
      }
    }

    try {
      for (const id of entryNodeIds) {
        await this.traverse(id);
        if (this.aborted) break;
      }
      if (!this.aborted) {
        this.callbacks.onComplete(this.log);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.callbacks.onError(message);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Find nodes that have no incoming edges (pipeline entry points) */
  private findEntryNodes(): string[] {
    const hasIncoming = new Set(this.edges.map((e) => e.target));
    return this.nodes
      .filter((n) => (n.type === 'workflowNode' || n.type === 'switchNode') && !hasIncoming.has(n.id))
      .map((n) => n.id);
  }

  /** Recursively traverse the DAG from a given node */
  private async traverse(nodeId: string): Promise<void> {
    if (this.aborted || this.visited.has(nodeId)) return;
    this.visited.add(nodeId);

    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.type === 'workflowNode') {
      await this.runWorkflowNode(node);
    } else if (node.type === 'switchNode') {
      await this.runSwitchNode(node);
    }
    // Unknown node types are skipped silently
  }

  /** Execute a single workflow node */
  private async runWorkflowNode(node: Node): Promise<void> {
    const data = node.data as WorkflowNodeData;
    const entry: PipelineLogEntry = {
      nodeId:    node.id,
      label:     data.name,
      nodeType:  'workflow',
      status:    'running',
      startedAt: new Date(),
    };

    this.callbacks.onNodeStatus(node.id, 'running');
    this.log = [...this.log, entry];
    this.callbacks.onLogUpdate(this.log);

    try {
      const res = await apiClient.post<{ id: string; status: string }>(
        `/workflows/${data.workflowId}/run`,
        { inputs: {}, variables: {} },
      );

      const completedAt = new Date();
      const apiStatus = res.data?.status ?? (res.success ? 'completed' : 'failed');
      const nodeStatus: NodeRunStatus = apiStatus === 'failed' ? 'failed' : 'completed';

      entry.status      = nodeStatus;
      entry.completedAt = completedAt;
      entry.durationMs  = completedAt.getTime() - entry.startedAt.getTime();
      entry.runId       = res.data?.id;
      if (!res.success) entry.error = res.error?.message ?? 'Run failed';

      this.callbacks.onNodeStatus(node.id, nodeStatus);
    } catch (err: unknown) {
      const completedAt = new Date();
      entry.status      = 'failed';
      entry.completedAt = completedAt;
      entry.durationMs  = completedAt.getTime() - entry.startedAt.getTime();
      entry.error       = err instanceof Error ? err.message : String(err);
      this.callbacks.onNodeStatus(node.id, 'failed');
    }

    // Update the log entry in-place
    this.log = this.log.map((l) => (l.nodeId === node.id && l.startedAt === entry.startedAt ? entry : l));
    this.callbacks.onLogUpdate(this.log);

    if (this.aborted) return;

    // Follow all outgoing edges sequentially
    const outEdges = this.edges.filter((e) => e.source === node.id);
    for (const edge of outEdges) {
      await this.traverse(edge.target);
    }
  }

  /** Pause at a SwitchNode and let the user pick a path */
  private async runSwitchNode(node: Node): Promise<void> {
    const data = node.data as SwitchNodeData;
    const entry: PipelineLogEntry = {
      nodeId:    node.id,
      label:     data.label,
      nodeType:  'switch',
      status:    'running',
      startedAt: new Date(),
    };

    this.callbacks.onNodeStatus(node.id, 'running');
    this.log = [...this.log, entry];
    this.callbacks.onLogUpdate(this.log);

    // Pause for user path selection
    const chosenPathIndex = await this.callbacks.onSwitchReached(node.id, data.paths);

    const completedAt = new Date();
    entry.status      = 'completed';
    entry.completedAt = completedAt;
    entry.durationMs  = completedAt.getTime() - entry.startedAt.getTime();

    this.callbacks.onNodeStatus(node.id, 'completed');
    this.log = this.log.map((l) => (l.nodeId === node.id && l.startedAt === entry.startedAt ? entry : l));
    this.callbacks.onLogUpdate(this.log);

    if (this.aborted) return;

    // Only follow the chosen path's handle (path-0, path-1, …)
    const chosenHandle = `path-${chosenPathIndex}`;
    const chosenEdge = this.edges.find(
      (e) => e.source === node.id && e.sourceHandle === chosenHandle,
    );

    // Mark unchosen path targets as skipped
    const unchosenEdges = this.edges.filter(
      (e) => e.source === node.id && e.sourceHandle !== chosenHandle,
    );
    for (const edge of unchosenEdges) {
      this.markSubtreeSkipped(edge.target);
    }

    if (chosenEdge) {
      await this.traverse(chosenEdge.target);
    }
  }

  /** Recursively mark a subtree as skipped (unchosen switch branch) */
  private markSubtreeSkipped(nodeId: string): void {
    if (this.visited.has(nodeId)) return;
    this.visited.add(nodeId);
    this.callbacks.onNodeStatus(nodeId, 'skipped');
    const outEdges = this.edges.filter((e) => e.source === nodeId);
    for (const edge of outEdges) {
      this.markSubtreeSkipped(edge.target);
    }
  }
}
