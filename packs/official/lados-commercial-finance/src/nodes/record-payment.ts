/**
 * lados.finance.record_payment — Phase 21 S5 (Wave 3)
 *
 * Records payment status and reference after payment has been made or
 * confirmed elsewhere — it does NOT initiate any external payment itself
 * (payment gateway execution requires a controlled integration pack, out
 * of scope here). Transitions the bound resource (typically a
 * finance_invoice, but kept generic — this node's compatibilityAliases
 * include the prototype's cross-domain `contractor.record_payment`) to
 * `paid` through the state-machine-guarded transition path.
 *
 * Config/Inputs (payment input object takes priority over config):
 *   resourceId — required
 *   paidAmount — required
 *   paidDate, reference, method — optional
 *
 * Outputs:
 *   record — { resourceId, status, paidAmount, paidDate, reference }
 *          | { resourceId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface RecordPaymentServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

export async function recordPayment(
  ctx: NodeContext,
  services: RecordPaymentServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const paymentInput = (inp['payment'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (paymentInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const paidAmount = (paymentInput['paidAmount'] ?? cfg['paidAmount']) as number | undefined;
  const paidDate   = ((paymentInput['paidDate']  ?? cfg['paidDate']) as string | undefined) ?? new Date().toISOString();
  const reference  = (paymentInput['reference']  ?? cfg['reference']) as string | undefined;
  const method     = (paymentInput['method']     ?? cfg['method'])    as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.record_payment: resourceId is required' },
    };
  }
  if (paidAmount == null) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.record_payment: paidAmount is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.finance.record_payment: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { paidAmount, paidDate, reference: reference ?? null, method: method ?? null } },
      actorId,
    );
  }

  ctx.logger.info(`lados.finance.record_payment → resource:${resourceId} amount:${paidAmount}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, 'paid', actorId);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { record: { resourceId, status: result.state, pending: true } },
        pause: {
          title: 'Approve payment recording',
          description: 'Recording this payment requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: recording payment for ${resourceId} requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { record: { resourceId, status: result.state, paidAmount, paidDate, reference: reference ?? null } },
      summary: `Payment recorded for ${resourceId}: ${paidAmount}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.finance.record_payment failed: ${message}`);
    return { status: 'failure', outputs: { record: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
