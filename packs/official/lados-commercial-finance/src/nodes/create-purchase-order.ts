/**
 * lados.finance.create_purchase_order — Phase 21 S5 (Wave 3)
 *
 * Creates a finance-owned purchase order Workspace Resource
 * (`lados_resources` type `purchase_order`). If `approvedRequest` (config)
 * names a resource id — typically a `po_request` created by
 * lados.procurement.generate_po_request — and a read service is injected,
 * this node fetches it and uses its supplier/amount as defaults,
 * overridable by explicit config. Lookup failure is handled gracefully
 * (falls back to explicit config) rather than failing the whole node, since
 * the linkage is a convenience, not a hard dependency.
 *
 * Creates a finance PO record only; procurement award and approval
 * decisions are separate (lados.procurement.recommend_award /
 * lados.finance.record_purchase_order_approval).
 *
 * Config/Inputs:
 *   supplier, amount, currency — required (directly or via approvedRequest)
 *   approvedRequest — optional resource id to pull defaults from
 *
 * Outputs:
 *   po — { poId, supplier, amount, currency, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService, IReadResourceService } from '../types';

export interface CreatePurchaseOrderServices {
  createService?: ICreateResourceService;
  readService?: IReadResourceService;
}

export async function createPurchaseOrder(
  ctx: NodeContext,
  services: CreatePurchaseOrderServices = {},
): Promise<NodeExecuteResult> {
  const { createService, readService } = services;

  if (!createService) {
    return {
      status: 'failure',
      outputs: { po: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const requestInput = (inp['request'] as Record<string, unknown> | undefined) ?? {};

  const approvedRequest = (requestInput['poRequestId'] ?? requestInput['requestId'] ?? cfg['approvedRequest']) as
    | string
    | undefined;

  let supplier = (requestInput['supplier'] ?? cfg['supplier']) as string | undefined;
  let amount   = (requestInput['amount']   ?? cfg['amount'])   as number | undefined;
  const currency = ((requestInput['currency'] ?? cfg['currency']) as string | undefined) ?? 'MYR';
  let sourceRequestId: string | null = null;

  if (approvedRequest && readService && ctx.organizationId) {
    try {
      const req = await readService.getResource(approvedRequest, ctx.organizationId);
      supplier = supplier ?? (req.data['supplier'] as string | undefined);
      amount = amount ?? (req.data['amount'] as number | undefined);
      sourceRequestId = req.id;
    } catch (err) {
      ctx.logger.warn(
        `lados.finance.create_purchase_order: approvedRequest "${approvedRequest}" lookup failed — falling back to explicit config. Cause: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  if (!supplier) {
    return {
      status: 'failure',
      outputs: { po: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.create_purchase_order: supplier is required (directly or via approvedRequest)' },
    };
  }
  if (amount == null) {
    return {
      status: 'failure',
      outputs: { po: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.create_purchase_order: amount is required (directly or via approvedRequest)' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { po: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.finance.create_purchase_order: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.finance.create_purchase_order → supplier:${supplier} amount:${amount} ${currency}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'purchase_order',
    name: `PO — ${supplier}`,
    data: { supplier, amount, currency, sourceRequestId },
    createdBy: actorId,
    initialState: 'draft',
  });

  return {
    status: 'success',
    outputs: { po: { poId: record.id, supplier, amount, currency, status: record.state } },
    summary: `Purchase order created: ${supplier} — ${amount} ${currency}`,
  };
}
