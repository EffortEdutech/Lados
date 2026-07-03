/**
 * lados.workflow.parallel — Phase 21 S2 (Wave 1)
 *
 * Fan-out marker node for explicit parallel branch documentation on the
 * canvas. The execution runner's level-based scheduling already runs all
 * topologically-independent nodes in parallel — this node exists so the
 * canvas can show an explicit split point and so downstream nodes can
 * inspect `branches.parallelStart` to know they are on a parallel branch.
 *
 * Config:
 *   branchCount — expected number of parallel branches (informational, default 2)
 *   label       — optional human label for this parallel group
 *
 * Outputs:
 *   branches — { parallelStart: true, branchCount, value, startedAt }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export async function parallel(ctx: NodeContext): Promise<NodeExecuteResult> {
  const branchCount = (ctx.config['branchCount'] as number | undefined) ?? 2;
  const label = (ctx.config['label'] as string | undefined) ?? 'parallel';

  ctx.logger.info(`lados.workflow.parallel: "${label}" — starting ${branchCount} parallel branches`);

  return {
    status: 'success',
    outputs: {
      branches: {
        parallelStart: true,
        branchCount,
        value: ctx.inputs?.['value'],
        startedAt: new Date().toISOString(),
      },
    },
    summary: `Parallel fan-out: ${branchCount} branches`,
  };
}
