/**
 * @lados/official-asset-fleet — resolver entrypoint
 *
 * Official successor to Contractor Edition's job/trip/fuel-receipt/
 * maintenance capabilities (see compatibilityAliases in nodes.json).
 * Reuses existing Workspace Resource types (`job`/`trip`/`fuel_receipt`/
 * `maintenance_record`) already permitted by migration
 * 0032_phase9_contractor_edition.sql — no new migration needed.
 *
 * Services are declared locally per the program-wide convention: never
 * import service interfaces from another official pack or from any
 * prototype pack.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type {
  ICreateResourceService,
  IReadResourceService,
  IUpdateResourceService,
  ITransitionResourceService,
  IAiVisionService,
} from './types';
import { createJob } from './nodes/create-job';
import { dispatchTrip } from './nodes/dispatch-trip';
import { completeTrip } from './nodes/complete-trip';
import { uploadFuelReceipt } from './nodes/upload-fuel-receipt';
import { extractFuelReceipt } from './nodes/extract-fuel-receipt';
import { createMaintenanceRecord } from './nodes/create-maintenance-record';
import { clearMaintenance } from './nodes/clear-maintenance';

export interface AssetFleetServices {
  createService?: ICreateResourceService;
  readService?: IReadResourceService;
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
  aiService?: IAiVisionService;
}

// Local type alias — NOT imported from @lados/execution-engine, which does
// not export a member by this name (only MockNodeExecutor exists there).
// See every sibling official pack's src/index.ts for the same pattern.
type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export function resolveNode(services: AssetFleetServices): (nodeType: string) => NodeExecutor | null {
  return (nodeType: string): NodeExecutor | null => {
    switch (nodeType) {
      case 'lados.asset_fleet.create_job':
        return (ctx: NodeContext) => createJob(ctx, services.createService);
      case 'lados.asset_fleet.dispatch_trip':
        return (ctx: NodeContext) => dispatchTrip(ctx, services.createService);
      case 'lados.asset_fleet.complete_trip':
        return (ctx: NodeContext) =>
          completeTrip(ctx, { updateService: services.updateService, transitionService: services.transitionService });
      case 'lados.asset_fleet.upload_fuel_receipt':
        return (ctx: NodeContext) => uploadFuelReceipt(ctx, services.createService);
      case 'lados.asset_fleet.extract_fuel_receipt':
        return (ctx: NodeContext) =>
          extractFuelReceipt(ctx, {
            aiService: services.aiService,
            readService: services.readService,
            updateService: services.updateService,
          });
      case 'lados.asset_fleet.create_maintenance_record':
        return (ctx: NodeContext) => createMaintenanceRecord(ctx, services.createService);
      case 'lados.asset_fleet.clear_maintenance':
        return (ctx: NodeContext) =>
          clearMaintenance(ctx, { updateService: services.updateService, transitionService: services.transitionService });
      default:
        return null;
    }
  };
}

export {
  type ICreateResourceService,
  type IReadResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
  type IAiVisionService,
  type ResourceRecord,
} from './types';
