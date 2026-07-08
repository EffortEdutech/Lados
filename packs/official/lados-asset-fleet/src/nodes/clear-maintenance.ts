/**
 * lados.asset_fleet.clear_maintenance — Phase 21 S6.1 (remaining Wave 4)
 *
 * Records maintenance clearance on an existing `maintenance_record`
 * Workspace Resource, then transitions it to 'cleared' through the
 * state-machine-guarded transition path. Must record the responsible
 * human or authorized integration that cleared the record — never
 * fabricates `clearedBy`, mirroring the MISSING_HUMAN_DECISION contract
 * used across every approval/clearance node since S2's
 * lados.human.record_decision.
 *
 * Config/Inputs (clearance input object takes priority over config):
 *   resourceId — the maintenance_record resourceId (required)
 *   clearedBy  — human actor identity (required, never inferred)
 *   clearanceDate — optional, defaults to now
 *   evidenceRefs, returnToService — optional
 *
 * Outputs:
 *   clearance — { resourceId, status, clearedBy, returnToService }
 *              | { resourceId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface ClearMaintenanceServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

export async function clearMaintenance(
  ctx: NodeContext,
  services: ClearMaintenanceServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { clearance: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const clearanceInput = (inp['maintenance'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (clearanceInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const clearedBy = (clearanceInput['clearedBy'] ?? cfg['clearedBy']) as string | undefined;
  const clearanceDate = ((clearanceInput['clearanceDate'] ?? cfg['clearanceDate']) as string | undefined) ?? new Date().toISOString();
  const evidenceRefs = ((clearanceInput['evidenceRefs'] ?? cfg['evidenceRefs']) as unknown[] | undefined) ?? [];
  const returnToService = (clearanceInput['returnToService'] ?? cfg['returnToService']) as boolean | undefined ?? true;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { clearance: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.clear_maintenance: resourceId is required' },
    };
  }
  if (!clearedBy) {
    return {
      status: 'failure',
      outputs: { clearance: null },
      error: {
        code: 'MISSING_HUMAN_DECISION',
        message: 'clearedBy is required — the value must come from a human actor or an authorized integration, never inferred automatically.',
      },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { clearance: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.asset_fleet.clear_maintenance: organizationId missing from execution context' },
    };
  }

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { clearanceDate, evidenceRefs, returnToService } },
      clearedBy,
    );
  }

  ctx.logger.info(`lados.asset_fleet.clear_maintenance → resource:${resourceId} clearedBy:${clearedBy}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, 'cleared', clearedBy);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { clearance: { resourceId, status: result.state, pending: true } },
        pause: {
          title: 'Approve maintenance clearance',
          description: 'Clearing this maintenance record requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: clearing maintenance ${resourceId} requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { clearance: { resourceId, status: result.state, clearedBy, returnToService } },
      summary: `Maintenance ${resourceId} cleared by ${clearedBy}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.asset_fleet.clear_maintenance failed: ${message}`);
    return { status: 'failure', outputs: { clearance: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
