/**
 * Program layout shape — Phase 23 S23.2, renamed from pipeline-layout.types.ts
 * in Phase 24 S24.1/S24.2.
 *
 * `programs.layout` / `program_runs.program_snapshot` are React Flow
 * node/edge jsonb, same convention as the old `project_pipelines.layout`.
 * S23.4 (Canvas Rework) built the actual editor UI for this shape; this
 * file defines the contract the backend targets. Two stage node types,
 * matching §6 of the Phase23 plan — nested programs are explicitly out of
 * scope (eff, decision #4).
 */

export interface WorkflowStageData {
  workflowId: string;
  /** Display-only — ExecutionService.triggerRun() resolves the workflow's
   *  real project_id itself, so this isn't relied on for execution. */
  projectId?: string;
  name?: string;
}

export interface GateStageData {
  label?: string;
  /** The "M" roster — org member user ids eligible to vote. */
  voterUserIds: string[];
  /** The "N" — approved votes needed to pass. Must be 1 <= N <= M. */
  voteThreshold: number;
  /** Optional escalation window in minutes (notifies non-voters, no reassignment — §3.5). */
  escalateAfterMinutes?: number;
}

export interface ProgramStageNode {
  id: string;
  type: 'workflowNode' | 'gateNode';
  data: WorkflowStageData | GateStageData;
}

export interface ProgramEdge {
  id: string;
  source: string;
  target: string;
}

export interface ProgramLayout {
  nodes: ProgramStageNode[];
  edges: ProgramEdge[];
}

/** Nodes with no incoming edge — program entry points. Ported from the old
 *  client-side PipelineRunner.findEntryNodes() (Sprint 12). */
export function findEntryStages(layout: ProgramLayout): string[] {
  const hasIncoming = new Set(layout.edges.map((e) => e.target));
  return layout.nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
}

/** Nodes reachable by following stageId's outgoing edges. Ported from the
 *  old client-side PipelineRunner.traverse()'s edge-following logic. */
export function findNextStages(layout: ProgramLayout, stageId: string): string[] {
  return layout.edges.filter((e) => e.source === stageId).map((e) => e.target);
}

export function findStageNode(layout: ProgramLayout, stageId: string): ProgramStageNode | undefined {
  return layout.nodes.find((n) => n.id === stageId);
}
