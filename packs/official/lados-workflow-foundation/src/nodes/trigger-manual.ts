/**
 * lados.workflow.trigger_manual — Phase 21 S2 (Wave 1)
 *
 * Starts a workflow from a manual operator action. Behaves as an immediate
 * source node: it has no inputs and returns a trigger context object other
 * nodes can read from `ctx.upstream[thisNodeId].trigger`.
 *
 * Config:
 *   label       — optional human label for this run kind
 *   description — optional description shown on the canvas
 *
 * Outputs:
 *   trigger — { triggeredAt, triggerType: 'manual', label, description }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export async function triggerManual(ctx: NodeContext): Promise<NodeExecuteResult> {
  const label = (ctx.config['label'] as string | undefined) ?? '';
  const description = (ctx.config['description'] as string | undefined) ?? '';
  const triggeredAt = new Date().toISOString();

  ctx.logger.info(`lados.workflow.trigger_manual: manual run started${label ? ` — "${label}"` : ''}`);

  return {
    status: 'success',
    outputs: {
      trigger: {
        triggeredAt,
        triggerType: 'manual',
        label,
        description,
      },
    },
    summary: label ? `Manual trigger: ${label}` : 'Manual trigger started',
  };
}
