/**
 * lados.workflow.delay — Phase 21 S2 (Wave 1)
 *
 * Pauses workflow execution for a configured number of milliseconds, then
 * continues. This is a real async sleep — the runner awaits it fully.
 * Ceiling of 5 minutes; longer waits should use a Human Work approval gate
 * or a scheduled re-trigger instead.
 *
 * Config/Inputs:
 *   delayMs — milliseconds to wait (required; clamped to 0-300_000ms)
 *
 * Outputs:
 *   resumed — true once the delay elapses
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

const MAX_DELAY_MS = 5 * 60 * 1000;

export async function delay(ctx: NodeContext): Promise<NodeExecuteResult> {
  const raw = (ctx.inputs?.['delayMs'] ?? ctx.config['delayMs']) as number | string | undefined;

  if (raw === undefined || raw === null || raw === '') {
    return { status: 'failure', outputs: {}, error: { code: 'MISSING_INPUT', message: 'delayMs is required' } };
  }

  const requestedMs = Number(raw);
  if (!isFinite(requestedMs) || requestedMs < 0) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'INVALID_INPUT', message: `delayMs must be a non-negative number (got ${raw})` },
    };
  }

  const delayMs = Math.min(Math.round(requestedMs), MAX_DELAY_MS);
  if (delayMs !== requestedMs) {
    ctx.logger.warn(`lados.workflow.delay: requested ${requestedMs}ms exceeds ceiling — clamped to ${delayMs}ms`);
  }

  ctx.logger.info(`lados.workflow.delay: sleeping ${delayMs}ms`);
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  ctx.logger.info('lados.workflow.delay: resumed');

  return {
    status: 'success',
    outputs: { resumed: true },
    summary: `Delayed ${delayMs}ms`,
  };
}
