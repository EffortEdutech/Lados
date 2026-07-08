/**
 * lados.procurement.generate_po_request — Phase 21 S5 (Wave 3)
 *
 * Creates a PO request Workspace Resource (`lados_resources` type
 * `po_request`) as the handoff artifact from Procurement to Commercial
 * Finance. Finance-owned PO creation and approval belong to
 * lados-commercial-finance (lados.finance.create_purchase_order can look
 * this resource up via its `approvedRequest` config) — this node does not
 * create a purchase_order itself (per manifest guardrail).
 *
 * Config/Inputs:
 *   supplier, amount — required
 *   currency, sourceRfqId, sourceQuotationId, notes — optional
 *
 * Outputs:
 *   poRequest — { poRequestId, supplier, amount, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function generatePoRequest(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { poRequest: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const requestInput = (inp['request'] as Record<string, unknown> | undefined) ?? {};

  const supplier          = (requestInput['supplier'] ?? cfg['supplier']) as string | undefined;
  const amount            = (requestInput['amount']   ?? cfg['amount'])   as number | undefined;
  const currency          = ((requestInput['currency'] ?? cfg['currency']) as string | undefined) ?? 'MYR';
  const sourceRfqId       = (requestInput['sourceRfqId']       ?? cfg['sourceRfqId'])       as string | undefined;
  const sourceQuotationId = (requestInput['sourceQuotationId'] ?? cfg['sourceQuotationId']) as string | undefined;
  const notes             = (requestInput['notes'] ?? cfg['notes']) as string | undefined;

  if (!supplier) {
    return {
      status: 'failure',
      outputs: { poRequest: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.generate_po_request: supplier is required' },
    };
  }
  if (amount == null) {
    return {
      status: 'failure',
      outputs: { poRequest: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.generate_po_request: amount is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { poRequest: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.procurement.generate_po_request: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.procurement.generate_po_request → supplier:${supplier} amount:${amount}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'po_request',
    name: `PO Request — ${supplier}`,
    data: {
      supplier,
      amount,
      currency,
      sourceRfqId: sourceRfqId ?? null,
      sourceQuotationId: sourceQuotationId ?? null,
      notes: notes ?? null,
    },
    createdBy: actorId,
    initialState: 'pending_finance_review',
  });

  return {
    status: 'success',
    outputs: { poRequest: { poRequestId: record.id, supplier, amount, status: record.state } },
    summary: `PO request generated for Finance: ${supplier} — ${amount} ${currency}`,
  };
}
