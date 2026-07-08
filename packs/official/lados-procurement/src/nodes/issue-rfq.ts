/**
 * lados.procurement.issue_rfq — Phase 21 S5 (Wave 3)
 *
 * Transitions an RFQ Workspace Resource from `draft` to `issued` through
 * the state-machine-guarded transition path. Actual supplier communication
 * (sending the RFQ) is composed via lados-communication in the template
 * graph — this node records the issuance decision/state only, it does not
 * itself send anything (mustNotOwn: communication/notification delivery).
 *
 * Config/Inputs:
 *   resourceId — the rfq resource id (required)
 *   issuedDate — optional, defaults to now
 *
 * Outputs:
 *   rfq — { resourceId, status, issuedDate }
 *       | { resourceId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITransitionResourceService } from '../types';

export async function issueRfq(
  ctx: NodeContext,
  transitionService?: ITransitionResourceService,
): Promise<NodeExecuteResult> {
  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { rfq: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const rfqInput = (inp['rfq'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (rfqInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const issuedDate  = ((rfqInput['issuedDate'] ?? cfg['issuedDate']) as string | undefined) ?? new Date().toISOString();

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { rfq: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.issue_rfq: resourceId is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { rfq: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.procurement.issue_rfq: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.procurement.issue_rfq → rfq:${resourceId}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, 'issued', actorId);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { rfq: { resourceId, status: result.state, pending: true } },
        pause: {
          title: 'Approve RFQ issuance',
          description: 'Issuing this RFQ requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: issuing RFQ ${resourceId} requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { rfq: { resourceId, status: result.state, issuedDate } },
      summary: `RFQ ${resourceId} issued`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.procurement.issue_rfq failed: ${message}`);
    return { status: 'failure', outputs: { rfq: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
