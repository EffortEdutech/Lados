/**
 * lados.asset_fleet.dispatch_trip — Phase 21 S6.1 (remaining Wave 4)
 *
 * Creates a trip dispatch Workspace Resource (`lados_resources` type
 * `trip`, already permitted per migration
 * 0032_phase9_contractor_edition.sql), optionally nested under a job
 * (config.jobId → parentId). Records dispatch; it does not certify work
 * completion (see lados.asset_fleet.complete_trip).
 *
 * Config/Inputs:
 *   job.vehicle, driver, destination — required
 *   dispatchTime — optional, defaults to now
 *   jobId — optional parent job resourceId
 *
 * Outputs:
 *   dispatch — { tripId, vehicle, driver, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function dispatchTrip(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { dispatch: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const jobInput = (inp['job'] as Record<string, unknown> | undefined) ?? {};

  const vehicle = (jobInput['vehicle'] ?? cfg['vehicle']) as string | undefined;
  const driver = (jobInput['driver'] ?? cfg['driver']) as string | undefined;
  const destination = (jobInput['destination'] ?? cfg['destination']) as string | undefined;
  const dispatchTime = ((jobInput['dispatchTime'] ?? cfg['dispatchTime']) as string | undefined) ?? new Date().toISOString();
  const jobId = (jobInput['jobId'] ?? cfg['jobId']) as string | undefined;

  if (!vehicle) {
    return {
      status: 'failure',
      outputs: { dispatch: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.dispatch_trip: vehicle is required' },
    };
  }
  if (!driver) {
    return {
      status: 'failure',
      outputs: { dispatch: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.dispatch_trip: driver is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { dispatch: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.asset_fleet.dispatch_trip: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.asset_fleet.dispatch_trip → vehicle:${vehicle} driver:${driver} destination:${destination ?? 'n/a'}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'trip',
    name: `Trip — ${vehicle}`,
    data: { vehicle, driver, destination: destination ?? null, dispatchTime },
    parentId: jobId,
    createdBy: actorId,
    initialState: 'dispatched',
  });

  return {
    status: 'success',
    outputs: { dispatch: { tripId: record.id, vehicle, driver, status: record.state } },
    summary: `Trip dispatched: ${vehicle} / ${driver}`,
  };
}
