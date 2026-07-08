/**
 * lados.asset_fleet.complete_trip — Phase 21 S6.1 (remaining Wave 4)
 *
 * Records trip completion details on an existing `trip` Workspace
 * Resource, then transitions it to 'completed' through the
 * state-machine-guarded transition path (same mechanism as every other
 * transition node since S4 — a requires_approval guard surfaces as
 * status:'paused', never a silent auto-approval).
 *
 * Records completion evidence only; billing and payment approval are
 * separate — this node never certifies payment.
 *
 * Config/Inputs (completion input object takes priority over config):
 *   resourceId — the trip resourceId (required)
 *   completionTime — optional, defaults to now
 *   mileage, deliveryNoteRefs, exceptions — optional
 *
 * Outputs:
 *   completion — { resourceId, status, mileage }
 *              | { resourceId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface CompleteTripServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

export async function completeTrip(
  ctx: NodeContext,
  services: CompleteTripServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { completion: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const dispatchInput = (inp['dispatch'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (dispatchInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const completionTime = ((dispatchInput['completionTime'] ?? cfg['completionTime']) as string | undefined) ?? new Date().toISOString();
  const mileage = (dispatchInput['mileage'] ?? cfg['mileage']) as number | undefined;
  const deliveryNoteRefs = ((dispatchInput['deliveryNoteRefs'] ?? cfg['deliveryNoteRefs']) as unknown[] | undefined) ?? [];
  const exceptions = (dispatchInput['exceptions'] ?? cfg['exceptions']) as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { completion: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.complete_trip: resourceId is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { completion: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.asset_fleet.complete_trip: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { completionTime, mileage: mileage ?? null, deliveryNoteRefs, exceptions: exceptions ?? null } },
      actorId,
    );
  }

  ctx.logger.info(`lados.asset_fleet.complete_trip → trip:${resourceId} mileage:${mileage ?? 'n/a'}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, 'completed', actorId);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { completion: { resourceId, status: result.state, pending: true } },
        pause: {
          title: 'Approve trip completion',
          description: 'Completing this trip requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: completing trip ${resourceId} requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { completion: { resourceId, status: result.state, mileage: mileage ?? null } },
      summary: `Trip ${resourceId} completed`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.asset_fleet.complete_trip failed: ${message}`);
    return { status: 'failure', outputs: { completion: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
