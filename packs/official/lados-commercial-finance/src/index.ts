/**
 * @lados/official-commercial-finance — Phase 21 S5 (Wave 3)
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
  IReadResourceService,
  IUpdateResourceService,
  ITransitionResourceService,
} from './types';

import { submitInvoice } from './nodes/submit-invoice';
import { verifyInvoice } from './nodes/verify-invoice';
import { recordInvoiceApproval } from './nodes/record-invoice-approval';
import { recordPayment } from './nodes/record-payment';
import { createPurchaseOrder } from './nodes/create-purchase-order';
import { recordPurchaseOrderApproval } from './nodes/record-purchase-order-approval';
import { claimRetentionRelease } from './nodes/claim-retention-release';
import { recordRetentionRelease } from './nodes/record-retention-release';

export {
  type ICreateResourceService,
  type IReadResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
  type ResourceRecord,
} from './types';

export interface CommercialFinanceServices {
  createService?: ICreateResourceService;
  readService?: IReadResourceService;
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export function resolveNode(services: CommercialFinanceServices = {}): (nodeType: string) => NodeExecutor | null {
  const { createService, readService, updateService, transitionService } = services;

  const table: Record<string, NodeExecutor> = {
    'lados.finance.submit_invoice': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      submitInvoice(ctx, createService),

    'lados.finance.verify_invoice': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      verifyInvoice(ctx, readService),

    'lados.finance.record_invoice_approval': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      recordInvoiceApproval(ctx, { updateService, transitionService }),

    'lados.finance.record_payment': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      recordPayment(ctx, { updateService, transitionService }),

    'lados.finance.create_purchase_order': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      createPurchaseOrder(ctx, { createService, readService }),

    'lados.finance.record_purchase_order_approval': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      recordPurchaseOrderApproval(ctx, { updateService, transitionService }),

    'lados.finance.claim_retention_release': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      claimRetentionRelease(ctx, createService),

    'lados.finance.record_retention_release': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      recordRetentionRelease(ctx, { updateService, transitionService }),
  };

  return (nodeType: string): NodeExecutor | null => table[nodeType] ?? null;
}
