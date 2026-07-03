/**
 * lados.case.close — Phase 21 S4 (Wave 2)
 *
 * Closes an operational case by transitioning its Workspace Resource to the
 * "closed" state through the org's configured state machine (same guarded
 * transition mechanism as lados.task.update_status / resource.transition).
 * Reason/closedBy/evidence are written into the case's data before
 * transitioning so they're on record even if a requires_approval guard
 * blocks the closure. Records closure only; approval or certification must
 * be modeled separately.
 *
 * Config/Inputs (case input object, from an upstream node's `case` output,
 * takes priority; otherwise a bound resourceId from config is used):
 *   case.caseId | case.id | config.resourceId — required
 *   reason    — optional
 *   closedBy  — optional (defaults to ctx.userId)
 *   evidence  — optional
 *
 * Outputs:
 *   closed — { caseId, status, reason, closedBy } | { caseId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface CloseCaseServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

const CLOSED_STATE = 'closed';

export async function closeCase(
  ctx: NodeContext,
  services: CloseCaseServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { closed: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const caseInput = (inp['case'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (caseInput['caseId'] ?? caseInput['id'] ?? cfg['resourceId']) as string | undefined;
  const reason      = (caseInput['reason']    ?? cfg['reason'])    as string | undefined;
  const closedBy    = (caseInput['closedBy']  ?? cfg['closedBy']  ?? ctx.userId) as string | undefined;
  const evidence    = (caseInput['evidence']  ?? cfg['evidence'])  as Record<string, unknown> | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { closed: null },
      error: { code: 'MISSING_INPUT', message: 'lados.case.close: case resourceId is required (bind a resource or supply case.caseId)' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { closed: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.case.close: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { closureReason: reason ?? null, closedBy: closedBy ?? actorId, closureEvidence: evidence ?? null } },
      actorId,
    );
  }

  ctx.logger.info(`lados.case.close → case:${resourceId}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, CLOSED_STATE, actorId);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { closed: { caseId: resourceId, status: result.state, pending: true } },
        pause: {
          title: 'Approve case closure',
          description: reason ?? 'Case closure requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: case ${resourceId} closure requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { closed: { caseId: resourceId, status: result.state, reason: reason ?? null, closedBy: closedBy ?? actorId } },
      summary: `Case ${resourceId} closed`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.case.close failed: ${message}`);
    return { status: 'failure', outputs: { closed: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
