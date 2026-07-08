/**
 * lados.people_payroll.record_payroll_approval — Phase 21 S6.1 (remaining Wave 4)
 *
 * Records a human payroll approval decision onto an existing
 * `payroll_run` Workspace Resource. Implements the same
 * MISSING_HUMAN_DECISION contract used across every approval node since
 * S2's lados.human.record_decision: `approvedBy` must come from a human
 * actor and is never inferred or fabricated. The system must not
 * approve payroll — this node only records a decision already made by a
 * human.
 *
 * Config/Inputs (decision input object takes priority over config):
 *   resourceId — the payroll_run resourceId (required)
 *   approvedBy — human actor identity (required, never inferred)
 *   decision — 'approved' | 'rejected' (required)
 *   approvalDate — optional, defaults to now
 *   notes — optional
 *
 * Outputs:
 *   approval — { resourceId, decision, approvedBy, approvalDate }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService } from '../types';

export async function recordPayrollApproval(
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
  const decisionInput = (inp['decision'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (decisionInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const approvedBy = (decisionInput['approvedBy'] ?? cfg['approvedBy']) as string | undefined;
  const decision = (decisionInput['decision'] ?? cfg['decision']) as string | undefined;
  const approvalDate = ((decisionInput['approvalDate'] ?? cfg['approvalDate']) as string | undefined) ?? new Date().toISOString();
  const notes = (decisionInput['notes'] ?? cfg['notes']) as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_INPUT', message: 'lados.people_payroll.record_payroll_approval: resourceId is required' },
    };
  }
  if (!decision || !['approved', 'rejected'].includes(decision)) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_INPUT', message: "lados.people_payroll.record_payroll_approval: decision must be 'approved' or 'rejected'" },
    };
  }
  if (!approvedBy) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: {
        code: 'MISSING_HUMAN_DECISION',
        message: 'approvedBy is required — the value must come from a human actor, never inferred automatically. The system must not approve payroll.',
      },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.people_payroll.record_payroll_approval: organizationId missing from execution context' },
    };
  }

  await updateService.updateResource(
    resourceId,
    ctx.organizationId,
    { data: { approvalDecision: decision, approvedBy, approvalDate, notes: notes ?? null } },
    approvedBy,
  );

  ctx.logger.info(`lados.people_payroll.record_payroll_approval → resource:${resourceId} decision:${decision} approvedBy:${approvedBy}`);

  return {
    status: 'success',
    outputs: { approval: { resourceId, decision, approvedBy, approvalDate } },
    summary: `Payroll approval recorded: ${decision} by ${approvedBy}`,
  };
}
