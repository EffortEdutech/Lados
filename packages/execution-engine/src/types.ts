/**
 * @lados/execution-engine — Core types
 * Sprint 6 (S6-002)
 */

import type { QSWorkflowDefinition, SkillMode } from '@lados/shared-types';
import type { NodeContext, NodeExecuteResult, NodeLogger } from '@lados/node-sdk';

// ── Re-export NodeContext so callers only import from execution-engine ────────
export type { NodeContext, NodeExecuteResult, NodeLogger };

// ── Execution states ─────────────────────────────────────────────────────────

export type RunStatus =
  | 'created' | 'queued' | 'validating' | 'planning'
  | 'running' | 'waiting' | 'paused' | 'retrying'
  | 'completed' | 'failed' | 'cancelled' | 'timed_out';

export type NodeRunStatus =
  | 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';

// ── Execution plan ────────────────────────────────────────────────────────────

/**
 * Phase 21 (S9 chaining fix) — one incoming connection into this step,
 * carrying the real port ids so the runner can extract the specific
 * upstream output value a node actually asked for, instead of blindly
 * merging every key of every upstream node's entire output object.
 */
export interface InputBinding {
  sourceNodeId: string;
  sourcePortId: string;
  targetPortId: string;
}

export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  config: Record<string, unknown>;
  mode?: SkillMode;
  /** IDs of steps that must complete before this one */
  dependsOn: string[];
  /**
   * Phase 21 (S9 chaining fix): per-connection source/target port ids
   * feeding into this step, built directly from the workflow definition's
   * `connections`. See InputBinding and _resolveInputs in runner.ts.
   */
  inputBindings: InputBinding[];
  /**
   * Phase 6: BFS wave index (0-based).
   * All steps at the same level have no dependencies on each other
   * and can execute in parallel.
   */
  level: number;
}

export interface ExecutionPlan {
  /** Ordered list of steps (topological sort) */
  steps: ExecutionStep[];
  /**
   * Phase 6: Steps grouped by BFS level.
   * Each group is a set of steps that can run in parallel.
   * parallelGroups[0] are root nodes, parallelGroups[1] depend only on level-0, etc.
   */
  parallelGroups: ExecutionStep[][];
  /** Detected cycles — if any, execution is blocked */
  cycles: string[][];
}

// ── Node log entry ────────────────────────────────────────────────────────────

export interface NodeLogEntry {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  status: NodeRunStatus;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
  messages: string[];
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

// ── Execution result ──────────────────────────────────────────────────────────

export interface ExecutionResult {
  status: RunStatus;
  /** Final outputs from the last node */
  outputs: Record<string, unknown>;
  /** Per-node log entries */
  logs: NodeLogEntry[];
  error?: { code: string; message: string };
  startedAt: string;
  completedAt: string;
  durationMs: number;
  /**
   * Phase 1: set when status === 'paused'.
   * The node ID at which execution halted awaiting human input.
   */
  pausedAtNodeId?: string;
  /**
   * Phase 1: set when status === 'paused'.
   * Accumulated outputs of all nodes that ran before the pause point.
   * Used by resumeRun() to skip already-completed nodes.
   */
  checkpointOutputs?: Record<string, Record<string, unknown>>;
  /**
   * Phase 1: set when status === 'paused'.
   * The approval_tasks.id that must be decided before the run can resume.
   */
  pendingApprovalTaskId?: string;
}

// ── Resume checkpoint ─────────────────────────────────────────────────────────

export interface ResumeCheckpoint {
  /** Node ID at which execution was paused */
  pausedAtNodeId: string;
  /** Outputs from all nodes that ran before the pause */
  checkpointOutputs: Record<string, Record<string, unknown>>;
  /** The approval decision injected as that node's output */
  approvalResult: {
    approved: boolean;
    rejected: boolean;
    comments: string;
    approvalTaskId: string;
    decidedBy: string;
    /**
     * Phase 22 S22.2 — set instead of the approve/reject fields when the
     * paused node is `lados.human.request_input` and a human has submitted
     * structured data via POST /approvals/:taskId/submit-input. When
     * present, the runner injects `{ submittedData, approval_task_id }` as
     * the paused node's output instead of the approve/reject shape —
     * request_input has no approved/rejected concept, only submitted data.
     */
    submittedData?: Record<string, unknown>;
  };
}

// ── Skip node spec ────────────────────────────────────────────────────────────

/**
 * Specifies a node that should be skipped at execution time.
 * Used by the AI workflow trigger to bypass optional nodes
 * (e.g. "create customer" when the customer already exists).
 *
 * `outputs` are injected as if the node had run — downstream nodes
 * that depend on this node's outputs will receive them normally.
 */
export interface SkipNodeSpec {
  nodeId:   string;
  /** Outputs to inject — used by downstream nodes as if the node had run */
  outputs?: Record<string, unknown>;
  /** Human-readable reason shown in the execution log */
  reason?:  string;
}

// ── Runner options ────────────────────────────────────────────────────────────

export interface RunnerOptions {
  /** Actual DB run ID (UUID) — pass from ExecutionService so real nodes can write audit rows */
  executionId?: string;
  workflowId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  definition: QSWorkflowDefinition;
  inputs?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  /**
   * Sprint 7: Optional resolver that returns a REAL node executor.
   * If it returns null for a given nodeType, the runner falls back to mock.
   * Inject from NestJS context to give nodes access to DB/Storage services.
   */
  nodeResolver?: (nodeType: string) => ((ctx: NodeContext) => Promise<NodeExecuteResult>) | null;
  /**
   * Phase 1: When set, the runner resumes from a paused approval node
   * instead of starting from scratch.
   */
  resumeFromCheckpoint?: ResumeCheckpoint;
  /**
   * Phase 11: AI-requested node skips.
   * Each spec names a node to skip and provides the outputs to inject
   * so downstream nodes still receive the data they expect.
   * Example: skip "create_customer" when TSBSB already exists in the DB,
   * inject { customerId: 'existing-uuid' } as the node's outputs.
   */
  skipNodes?: SkipNodeSpec[];
  /**
   * Phase 6: Maximum number of nodes that may execute simultaneously within a
   * parallel level. Default: unlimited (all nodes in a level run concurrently).
   * Set to 1 to force sequential execution even for independent nodes.
   */
  concurrency?: number;
  /**
   * Phase 21 S3 (D4): optional per-node progress hook. Called once with
   * type:'started' right before a node executes, and once with type:'done'
   * when it finishes (whatever the outcome — completed/failed/skipped/
   * waiting). Never awaited and never allowed to throw into the runner —
   * callers use this to bridge live node progress to e.g. an SSE stream.
   * Purely observational: it cannot affect execution.
   */
  onNodeEvent?: (event: NodeProgressEvent) => void;
}

/** Payload passed to RunnerOptions.onNodeEvent — see its doc comment. */
export interface NodeProgressEvent {
  type: 'started' | 'done';
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  /** Only present on type:'done' */
  status?: NodeRunStatus;
  durationMs?: number;
}

// ── Mock node executor type ───────────────────────────────────────────────────

export type MockNodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;
