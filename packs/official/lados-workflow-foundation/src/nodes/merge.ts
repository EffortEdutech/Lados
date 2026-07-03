/**
 * lados.workflow.merge — Phase 21 S2 (Wave 1)
 *
 * Fan-in marker node. Because the level-based runner only executes this
 * node once every node at the previous level has completed, by the time
 * this executor runs all parallel branches are already finished and
 * available via `ctx.upstream`.
 *
 * Config:
 *   mergeStrategy — 'shallow' (default, Object.assign left-to-right) | 'deep'
 *   label         — optional human label for this merge point
 *
 * Outputs:
 *   merged — flat merged object from all upstream branch outputs
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = result[key];
    if (
      typeof value === 'object' && value !== null && !Array.isArray(value) &&
      typeof existing === 'object' && existing !== null && !Array.isArray(existing)
    ) {
      result[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function merge(ctx: NodeContext): Promise<NodeExecuteResult> {
  const strategy = (ctx.config['mergeStrategy'] as string | undefined) ?? 'shallow';
  const label = (ctx.config['label'] as string | undefined) ?? 'merge';

  const upstream = ctx.upstream ?? {};
  const branchIds = Object.keys(upstream);

  let merged: Record<string, unknown> = {};
  for (const nodeId of branchIds) {
    const branchOutput = upstream[nodeId] ?? {};
    merged = strategy === 'deep' ? deepMerge(merged, branchOutput) : Object.assign(merged, branchOutput);
  }

  ctx.logger.info(`lados.workflow.merge: "${label}" — merged ${branchIds.length} branch(es) using "${strategy}"`);

  return {
    status: 'success',
    outputs: { merged },
    summary: `Merged ${branchIds.length} branch(es)`,
  };
}
