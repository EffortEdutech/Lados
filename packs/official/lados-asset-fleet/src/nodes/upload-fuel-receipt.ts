/**
 * lados.asset_fleet.upload_fuel_receipt — Phase 21 S6.1 (remaining Wave 4)
 *
 * Creates a fuel receipt Workspace Resource (`lados_resources` type
 * `fuel_receipt`, already permitted per migration
 * 0032_phase9_contractor_edition.sql), optionally nested under a trip
 * (config.tripId → parentId). Registers uploaded evidence only —
 * extraction is a separate step (lados.asset_fleet.extract_fuel_receipt).
 *
 * Config/Inputs:
 *   receipt.fileRef — required
 *   vehicle, trip, receiptDate — optional
 *
 * Outputs:
 *   receipt — { receiptId, fileRef, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function uploadFuelReceipt(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { receipt: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const fileInput = (inp['file'] as Record<string, unknown> | undefined) ?? {};

  const fileRef = (fileInput['fileRef'] ?? cfg['fileRef']) as string | undefined;
  const vehicle = (fileInput['vehicle'] ?? cfg['vehicle']) as string | undefined;
  const tripId = (fileInput['trip'] ?? cfg['trip']) as string | undefined;
  const receiptDate = ((fileInput['receiptDate'] ?? cfg['receiptDate']) as string | undefined) ?? new Date().toISOString();

  if (!fileRef) {
    return {
      status: 'failure',
      outputs: { receipt: null },
      error: { code: 'MISSING_INPUT', message: 'lados.asset_fleet.upload_fuel_receipt: fileRef is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { receipt: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.asset_fleet.upload_fuel_receipt: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.asset_fleet.upload_fuel_receipt → vehicle:${vehicle ?? 'n/a'} file:${fileRef}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'fuel_receipt',
    name: `Fuel Receipt — ${vehicle ?? 'unknown vehicle'}`,
    data: { fileRef, vehicle: vehicle ?? null, receiptDate },
    parentId: tripId,
    createdBy: actorId,
    initialState: 'pending_review',
  });

  return {
    status: 'success',
    outputs: { receipt: { receiptId: record.id, fileRef, status: record.state } },
    summary: `Fuel receipt uploaded: ${fileRef}`,
  };
}
