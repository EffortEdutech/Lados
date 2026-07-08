/**
 * lados.asset_fleet.create_maintenance_record — Phase 21 S6.1 (remaining Wave 4)
 *
 * Creates a maintenance Workspace Resource (`lados_resources` type
 * `maintenance_record`, already permitted per migration
 * 0032_phase9_contractor_edition.sql). Creates a maintenance record only;
 * procurement and payment actions are separate.
 *
 * Config/Inputs:
 *   issue.asset, issueType — required
 *   priority, reportedBy — optional
 *
 * Outputs:
 *   maintenance — { maintenanceId, asset, issueType, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function createMaintenanceRecord(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { maintenance: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const issueInput = (inp['issue'] as Record<string, unknown> | undefined) ?? {};

  const asset = (issueInput['asset'] ?? cfg['asset']) as string | undefined;
  const issueType = (issueInput['issueType'] ?? cfg['issueType']) as string | undefined;
  const priority = ((issueInput['priority'] ?? cfg['priority']) as string | undefined) ?? 'normal';
  const reportedBy = (issueInput['reportedBy'] ?? cfg['reportedBy']) as string | undefined;

  if (!asset) {
    return {
      status: 'failure',
      outputs: { maintenance: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.create_maintenance_record: asset is required' },
    };
  }
  if (!issueType) {
    return {
      status: 'failure',
      outputs: { maintenance: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.create_maintenance_record: issueType is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { maintenance: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.asset_fleet.create_maintenance_record: organizationId missing from execution context' },
    };
  }

  const actorId = reportedBy ?? ctx.userId ?? 'system';

  ctx.logger.info(`lados.asset_fleet.create_maintenance_record → asset:${asset} issue:${issueType} priority:${priority}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'maintenance_record',
    name: `Maintenance — ${asset}`,
    data: { asset, issueType, priority, reportedBy: actorId },
    createdBy: actorId,
    initialState: 'open',
  });

  return {
    status: 'success',
    outputs: { maintenance: { maintenanceId: record.id, asset, issueType, status: record.state } },
    summary: `Maintenance record created: ${asset} — ${issueType} (${priority})`,
  };
}
