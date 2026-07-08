/**
 * @lados/official-qs-commercial — Phase 21 S6 (Wave 4)
 *
 * resolveNode(services) factory, matching the established per-pack
 * resolver pattern (S2/S4/S5): returns a lookup function from nodeType
 * string to NodeExecutor, chained into
 * apps/api/src/execution/real-nodes/index.ts buildRealNodeResolver(). No
 * cross-pack imports — all local service interfaces declared in
 * ./types.ts.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type {
  ICreateResourceService,
  IReadResourceService,
} from './types';

import { readBoq } from './nodes/read-boq';
import { normalizeBoq } from './nodes/normalize-boq';
import { classifyTrade } from './nodes/classify-trade';
import { splitWorkPackages } from './nodes/split-work-packages';
import { valueVariation } from './nodes/value-variation';
import { assessProgressClaim } from './nodes/assess-progress-claim';
import { reconcileFinalAccount } from './nodes/reconcile-final-account';

export {
  type ICreateResourceService,
  type IReadResourceService,
  type IUpdateResourceService,
  type ResourceRecord,
} from './types';

export interface QsCommercialServices {
  createService?: ICreateResourceService;
  readService?: IReadResourceService;
}

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export function resolveNode(services: QsCommercialServices = {}): (nodeType: string) => NodeExecutor | null {
  const { createService, readService } = services;

  const table: Record<string, NodeExecutor> = {
    'lados.qs.read_boq': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      readBoq(ctx, readService),

    'lados.qs.normalize_boq': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      normalizeBoq(ctx, createService),

    'lados.qs.classify_trade': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      classifyTrade(ctx),

    'lados.qs.split_work_packages': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      splitWorkPackages(ctx),

    'lados.qs.value_variation': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      valueVariation(ctx),

    'lados.qs.assess_progress_claim': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      assessProgressClaim(ctx, readService),

    'lados.qs.reconcile_final_account': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      reconcileFinalAccount(ctx),
  };

  return (nodeType: string): NodeExecutor | null => table[nodeType] ?? null;
}
