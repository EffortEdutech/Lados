/**
 * Program canvas types — Phase 23 S23.4, renamed from Pipeline canvas types
 * in Phase 24 S24.4 (directory renamed components/pipelines/ → components/programs/).
 *
 * Mirrors apps/api/src/program-execution/program-layout.types.ts exactly
 * (ProgramStageNode/ProgramEdge/ProgramLayout) so `programs.layout`
 * round-trips cleanly between the canvas and ProgramExecutionService.
 * React Flow's `Node<T>` additionally carries `position` — the backend
 * type doesn't declare it, but every consumer there (findEntryStages,
 * findStageNode, etc.) only reads `id`/`type`/`data`, so the extra field
 * is saved and reloaded harmlessly.
 */
import type { Node, Edge } from 'reactflow';

export interface WorkflowStageData {
  workflowId: string;
  projectId?: string;
  /** Display-only cache of the workflow's name/project at the time it was added. */
  name?: string;
  projectName?: string;
  /** Set client-side while polling an active program run — never persisted. */
  runStatus?: StageRunStatus;
}

export interface GateStageData {
  label?: string;
  voterUserIds: string[];
  voteThreshold: number;
  escalateAfterMinutes?: number;
  /** Set client-side while polling an active program run — never persisted. */
  runStatus?: StageRunStatus;
}

export type StageRunStatus = 'idle' | 'active' | 'completed' | 'failed' | 'skipped';

export type WorkflowStageNodeType = Node<WorkflowStageData>;
export type GateStageNodeType = Node<GateStageData>;
export type ProgramCanvasNode = WorkflowStageNodeType | GateStageNodeType;
export type ProgramCanvasEdge = Edge;

export interface OrgWorkflow {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  project_id: string;
  project_name: string | null;
  updated_at: string;
}

export interface OrgMember {
  user_id: string;
  role: string;
  joined_at: string;
}
