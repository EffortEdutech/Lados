/**
 * lados.workflow.write_log — Phase 21 S2 (Wave 1)
 *
 * Official successor to the prototype `core.logger`. Writes an explicit
 * checkpoint message to workflow runtime logs. Purely informational — never
 * gates or decides anything.
 *
 * Config:
 *   message — log message (default: 'Checkpoint reached')
 *   level   — 'info' | 'warn' | 'error' (default: 'info')
 *
 * Outputs:
 *   logged — true
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export async function writeLog(ctx: NodeContext): Promise<NodeExecuteResult> {
  const message = (ctx.config['message'] as string | undefined) ?? 'Checkpoint reached';
  const level = (ctx.config['level'] as 'info' | 'warn' | 'error' | undefined) ?? 'info';
  const data = ctx.inputs?.['data'] ?? ctx.inputs;

  const logFn = ctx.logger[level] ?? ctx.logger.info;
  logFn(message);

  if (data && Object.keys(data as Record<string, unknown>).length > 0) {
    ctx.logger.info(`Data snapshot: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return {
    status: 'success',
    outputs: { logged: true },
    summary: `Logged: "${message}"`,
  };
}
