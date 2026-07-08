/**
 * lados.asset_fleet.create_job — Phase 21 S6.1 (remaining Wave 4)
 *
 * Creates a fleet/asset job Workspace Resource (`lados_resources` type
 * `job`, already permitted per migration
 * 0032_phase9_contractor_edition.sql — this pack is the official
 * successor to contractor-pack's job capability, see
 * compatibilityAliases). Creates an operational job record only;
 * commercial approval is separate.
 *
 * Config/Inputs:
 *   request.customer — required
 *   asset, jobDate, scope — optional
 *
 * Outputs:
 *   job — { jobId, customer, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function createJob(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { job: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const requestInput = (inp['request'] as Record<string, unknown> | undefined) ?? {};

  const customer = (requestInput['customer'] ?? cfg['customer']) as string | undefined;
  const asset = (requestInput['asset'] ?? cfg['asset']) as string | undefined;
  const jobDate = ((requestInput['jobDate'] ?? cfg['jobDate']) as string | undefined) ?? new Date().toISOString();
  const scope = (requestInput['scope'] ?? cfg['scope']) as string | undefined;

  if (!customer) {
    return {
      status: 'failure',
      outputs: { job: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.create_job: customer is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { job: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.asset_fleet.create_job: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.asset_fleet.create_job → customer:${customer} asset:${asset ?? 'n/a'}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'job',
    name: `Job — ${customer}`,
    data: { customer, asset: asset ?? null, jobDate, scope: scope ?? null },
    createdBy: actorId,
    initialState: 'open',
  });

  return {
    status: 'success',
    outputs: { job: { jobId: record.id, customer, status: record.state } },
    summary: `Fleet job created: ${customer}`,
  };
}
