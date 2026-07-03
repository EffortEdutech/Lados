/**
 * lados.workflow.trigger_schedule — Phase 21 S2 (Wave 1)
 *
 * Official successor to the prototype `core.cron_trigger`. Starts a workflow
 * on a recurring cron schedule. When executed as part of a manual/inline run
 * it behaves as an immediate trigger — the actual scheduling loop lives in
 * the platform scheduler, which enqueues a run and lets this node record the
 * fire metadata.
 *
 * Config:
 *   cronExpression — e.g. "0 8 * * 1-5" (required)
 *   timezone       — default 'Asia/Kuala_Lumpur'
 *   label          — optional human label
 *
 * Outputs:
 *   trigger — { triggeredAt, triggerType: 'schedule', cronExpression, timezone, scheduleLabel }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

function describeCron(expr: string): string {
  if (!expr) return 'Invalid cron expression';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;

  const [min, hour, dom, month, dow] = parts;
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (expr === '* * * * *') return 'Every minute';
  if (/^\d+ \* \* \* \*$/.test(expr)) return `Every hour at :${min!.padStart(2, '0')}`;
  if (/^\d+ \d+ \* \* \*$/.test(expr)) return `Daily at ${hour!.padStart(2, '0')}:${min!.padStart(2, '0')}`;
  if (/^\d+ \d+ \* \* \d+$/.test(expr)) {
    return `Every ${dowNames[parseInt(dow!, 10)] ?? dow} at ${hour!.padStart(2, '0')}:${min!.padStart(2, '0')}`;
  }
  if (dom === '*' && month !== '*') {
    return `Monthly (month ${monthNames[parseInt(month!, 10)] ?? month}) at ${hour!.padStart(2, '0')}:${min!.padStart(2, '0')}`;
  }

  return `Cron: ${expr}`;
}

export async function triggerSchedule(ctx: NodeContext): Promise<NodeExecuteResult> {
  const cronExpression = ((ctx.config['cronExpression'] as string | undefined) ?? '').trim();
  const timezone = ((ctx.config['timezone'] as string | undefined) ?? 'Asia/Kuala_Lumpur').trim();
  const label = ((ctx.config['label'] as string | undefined) ?? '').trim();

  if (!cronExpression) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'MISSING_CRON_EXPRESSION',
        message: 'cronExpression config is required. Example: "0 8 * * 1-5" (weekdays at 08:00).',
      },
    };
  }

  const triggeredAt = new Date().toISOString();
  const scheduleLabel = describeCron(cronExpression);

  ctx.logger.info(`lados.workflow.trigger_schedule: fired — ${cronExpression} (${timezone}) — ${scheduleLabel}`);

  return {
    status: 'success',
    outputs: {
      trigger: {
        triggeredAt,
        triggerType: 'schedule',
        cronExpression,
        timezone,
        scheduleLabel,
      },
    },
    summary: label ? `Scheduled trigger: ${label} [${scheduleLabel}]` : `Scheduled trigger [${scheduleLabel}]`,
  };
}
