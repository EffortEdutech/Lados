/**
 * lados.contract.track_notice_due_date — Phase 21 S6.1 (remaining Wave 4)
 *
 * Deterministic date-arithmetic computation — NOT an AI/LLM call. Computes
 * a due date from a base date plus a rule (a plain day-offset, the only
 * rule kind this honestly supports — no contract-clause date-logic
 * engine exists, so anything more complex must be resolved by a human)
 * and writes the tracking result onto the bound `contract_notice`
 * resource (already a permitted type per migration
 * 0060_contract_admin_resource_types.sql).
 *
 * Tracks dates and reminders only; disputed date interpretation requires
 * human review — this node never decides a dispute.
 *
 * Config/Inputs:
 *   resourceId  — the bound contract_notice resourceId (required)
 *   baseDate    — required
 *   dueDateRule — offset in days from baseDate (number), default 0
 *   reminderOffsetDays — days before due date to remind, default 3
 *
 * Outputs:
 *   tracking — { resourceId, baseDate, dueDate, reminderDate, requiresReview }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService } from '../types';

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export async function trackNoticeDueDate(
  ctx: NodeContext,
  updateService?: IUpdateResourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const noticeInput = (inp['notice'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (noticeInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const baseDate = (noticeInput['baseDate'] ?? cfg['baseDate']) as string | undefined;
  const dueDateRule = (cfg['dueDateRule'] as number | undefined) ?? 0;
  const reminderOffsetDays = (cfg['reminderOffsetDays'] as number | undefined) ?? 3;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { tracking: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.track_notice_due_date: resourceId is required' },
    };
  }
  if (!baseDate) {
    return {
      status: 'failure',
      outputs: { tracking: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.track_notice_due_date: baseDate is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { tracking: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.contract.track_notice_due_date: organizationId missing from execution context' },
    };
  }

  const dueDate = addDays(baseDate, dueDateRule);
  const reminderDate = addDays(dueDate, -reminderOffsetDays);
  const actorId = ctx.userId ?? 'system';

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { dueDate, reminderDate, trackedAt: new Date().toISOString() } },
      actorId,
    );
  }

  ctx.logger.info(`lados.contract.track_notice_due_date → notice:${resourceId} due:${dueDate}`);

  return {
    status: 'success',
    outputs: {
      tracking: {
        resourceId,
        baseDate,
        dueDate,
        reminderDate,
        requiresReview: true,
      },
    },
    summary: `Notice due date tracked: ${dueDate} (reminder ${reminderDate}) — disputed interpretation requires human review`,
  };
}
