/**
 * @qsos/execution-engine
 *
 * Workflow execution engine — DAG traversal, node scheduling, and state machine.
 * Sprint 1 stub — full implementation in Sprint 4 (BullMQ queue integration).
 *
 * Will provide:
 *   - WorkflowRunner class (run, pause, resume, cancel)
 *   - ExecutionContext (variables, nodeOutputs, logger)
 *   - DAGResolver (topological sort, cycle detection)
 *   - ExecutionStateManager (Supabase-backed state persistence)
 */

export const EXECUTION_ENGINE_VERSION = '0.1.0' as const;

/**
 * Placeholder runner — replaced in Sprint 4.
 */
export async function runWorkflow(
  _workflowId: string,
  _input: Record<string, unknown>,
): Promise<{ executionId: string }> {
  throw new Error(
    '[execution-engine] runWorkflow is a Sprint 1 stub — full implementation in Sprint 4.',
  );
}

// Sprint 4: export { WorkflowRunner } from './runner';
// Sprint 4: export { DAGResolver } from './dag-resolver';
// Sprint 4: export { ExecutionStateManager } from './state-manager';
// Sprint 4: export type { ExecutionContext, RunnerOptions } from './types';
