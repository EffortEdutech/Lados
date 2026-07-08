/**
 * @lados/official-procurement — Phase 21 S5 (Wave 3)
 *
 * resolveNode(services) factory, matching the established per-pack
 * resolver pattern (S2/S4): returns a lookup function from nodeType string
 * to NodeExecutor, chained into apps/api/src/execution/real-nodes/index.ts
 * buildRealNodeResolver(). No cross-pack imports — all local service
 * interfaces declared in ./types.ts.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type {
  ICreateResourceService,
  ITransitionResourceService,
} from './types';

import { createRfq } from './nodes/create-rfq';
import { issueRfq } from './nodes/issue-rfq';
import { receiveQuotation } from './nodes/receive-quotation';
import { compareQuotations } from './nodes/compare-quotations';
import { recommendAward } from './nodes/recommend-award';
import { generatePoRequest } from './nodes/generate-po-request';

export {
  type ICreateResourceService,
  type IReadResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
  type ResourceRecord,
} from './types';

export interface ProcurementServices {
  createService?: ICreateResourceService;
  transitionService?: ITransitionResourceService;
}

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export function resolveNode(services: ProcurementServices = {}): (nodeType: string) => NodeExecutor | null {
  const { createService, transitionService } = services;

  const table: Record<string, NodeExecutor> = {
    'lados.procurement.create_rfq': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      createRfq(ctx, createService),

    'lados.procurement.issue_rfq': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      issueRfq(ctx, transitionService),

    'lados.procurement.receive_quotation': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      receiveQuotation(ctx, createService),

    'lados.procurement.compare_quotations': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      compareQuotations(ctx),

    'lados.procurement.recommend_award': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      recommendAward(ctx),

    'lados.procurement.generate_po_request': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      generatePoRequest(ctx, createService),
  };

  return (nodeType: string): NodeExecutor | null => table[nodeType] ?? null;
}
