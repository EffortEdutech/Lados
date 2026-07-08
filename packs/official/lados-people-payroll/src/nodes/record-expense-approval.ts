/**
 * lados.people_payroll.record_expense_approval — Phase 21 S6.1 (remaining Wave 4)
 *
 * Records a human expense approval decision onto an existing `expense`
 * Workspace Resource (already permitted per migration
 * 0032_phase9_contractor_edition.sql). Implements the same
 * MISSING_HUMAN_DECISION contract as every other approval node in the
 * program: `approvedBy` must come from a human actor and is never
 * inferred. AI may not approve expenses.
 *
 * Config/Inputs (expense input object takes priority over config):
 *   resourceId — the expense resourceId (required)
 *   approvedBy — human actor identity (required, never inferred)
 *   decision — 'approved' | 'rejected' (required)
 *   approvalDate — optional, defaults to now
 *   policyRefs — optional
 *
 * Outputs:
 *   approval — { resourceId, decision, approvedBy, approvalDate }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService } from '../types';

export async function recordExpenseApproval(
  ctx: NodeContext,
  updateService?: IUpdateResourceService,
): Promise<NodeExecuteResult> {
  if (!updateService) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'NO_SERVICE', message: 'Resource update service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const expenseInput = (inp['expense'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (expenseInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const approvedBy = (expenseInput['approvedBy'] ?? cfg['approvedBy']) as string | undefined;
  const decision = (expenseInput['decision'] ?? cfg['decision']) as string | undefined;
  const approvalDate = ((expenseInput['approvalDate'] ?? cfg['approvalDate']) as string | undefined) ?? new Date().toISOString();
  const policyRefs = ((expenseInput['policyRefs'] ?? cfg['policyRefs']) as unknown[] | undefined) ?? [];

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_INPUT', message: 'lados.people_payroll.record_expense_approval: resourceId is required' },
    };
  }
  if (!decision || !['approved', 'rejected'].includes(decision)) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_INPUT', message: "lados.people_payroll.record_expense_approval: decision must be 'approved' or 'rejected'" },
    };
  }
  if (!approvedBy) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: {
        code: 'MISSING_HUMAN_DECISION',
        message: 'approvedBy is required — the value must come from a human actor, never inferred automatically. AI may not approve expenses.',
      },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.people_payroll.record_expense_approval: organizationId missing from execution context' },
    };
  }

  await updateService.updateResource(
    resourceId,
    ctx.organizationId,
    { data: { approvalDecision: decision, approvedBy, approvalDate, policyRefs } },
    approvedBy,
  );

  ctx.logger.info(`lados.people_payroll.record_expense_approval → resource:${resourceId} decision:${decision} approvedBy:${approvedBy}`);

  return {
    status: 'success',
    outputs: { approval: { resourceId, decision, approvedBy, approvalDate } },
    summary: `Expense approval recorded: ${decision} by ${approvedBy}`,
  };
}
