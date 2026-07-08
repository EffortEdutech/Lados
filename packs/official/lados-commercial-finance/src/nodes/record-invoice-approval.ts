/**
 * lados.finance.record_invoice_approval — Phase 21 S5 (Wave 3)
 *
 * Records a human invoice approval/rejection decision, transitioning the
 * finance_invoice Workspace Resource's state through the org's configured
 * state machine (state-machine-guarded, same mechanism as Resource
 * Operations / Task-Case). Never fabricates `approvedBy` — mirrors
 * lados.human.record_decision's MISSING_HUMAN_DECISION contract exactly.
 * Must record a human decision; system must not decide approval.
 *
 * Config/Inputs (decision input object takes priority over config):
 *   resourceId  — the finance_invoice resource id (required)
 *   approvedBy  — human actor identity (required, never inferred)
 *   decision    — 'approved' | 'rejected' (required)
 *   approvalDate, notes — optional
 *
 * Outputs:
 *   approval — { resourceId, status, approvedBy, decision, approvalDate }
 *            | { resourceId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface RecordInvoiceApprovalServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

export async function recordInvoiceApproval(
  ctx: NodeContext,
  services: RecordInvoiceApprovalServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const decisionInput = (inp['decision'] as Record<string, unknown> | undefined) ?? {};

  const resourceId    = (decisionInput['resourceId']   ?? cfg['resourceId']) as string | undefined;
  const approvedBy    = (decisionInput['approvedBy']   ?? cfg['approvedBy']) as string | undefined;
  const decision      = (decisionInput['decision']     ?? cfg['decision'])   as string | undefined;
  const notes         = (decisionInput['notes']        ?? cfg['notes'])     as string | undefined;
  const approvalDate  = ((decisionInput['approvalDate'] ?? cfg['approvalDate']) as string | undefined)
    ?? new Date().toISOString();

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.record_invoice_approval: resourceId is required' },
    };
  }
  if (!decision) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.record_invoice_approval: decision ("approved"/"rejected") is required' },
    };
  }
  if (!approvedBy) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: {
        code: 'MISSING_HUMAN_DECISION',
        message: 'approvedBy is required — the value must come from a human actor, never inferred automatically.',
      },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { approval: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.finance.record_invoice_approval: organizationId missing from execution context' },
    };
  }

  const toState = decision === 'approved' ? 'approved' : 'rejected';

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { approvalNotes: notes ?? null, approvalDate } },
      approvedBy,
    );
  }

  ctx.logger.info(`lados.finance.record_invoice_approval → invoice:${resourceId} decision:${decision} by:${approvedBy}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, toState, approvedBy);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { approval: { resourceId, status: result.state, pending: true } },
        pause: {
          title: `Approve invoice status change to "${toState}"`,
          description: notes ?? 'Invoice approval requires a further approval step',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: invoice ${resourceId} status change to "${toState}" requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { approval: { resourceId, status: result.state, approvedBy, decision, approvalDate } },
      summary: `Invoice ${resourceId} ${decision} by ${approvedBy}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.finance.record_invoice_approval failed: ${message}`);
    return { status: 'failure', outputs: { approval: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
