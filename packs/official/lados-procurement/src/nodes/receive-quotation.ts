/**
 * lados.procurement.receive_quotation — Phase 21 S5 (Wave 3)
 *
 * Creates a quotation Workspace Resource (`lados_resources` type
 * `quotation`) as a child of the RFQ resource (`parentId: rfqId`) —
 * records a supplier's submitted quotation only; it does not evaluate it
 * (that is lados.procurement.compare_quotations).
 *
 * Config/Inputs:
 *   rfqId, supplier, amount — required
 *   currency, validUntil, notes — optional
 *
 * Outputs:
 *   quotation — { quotationId, rfqId, supplier, amount, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function receiveQuotation(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { quotation: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const quoteInput = (inp['quotation'] as Record<string, unknown> | undefined) ?? {};

  const rfqId      = (quoteInput['rfqId'] ?? cfg['rfqId']) as string | undefined;
  const supplier   = (quoteInput['supplier'] ?? cfg['supplier']) as string | undefined;
  const amount     = (quoteInput['amount'] ?? cfg['amount']) as number | undefined;
  const currency   = ((quoteInput['currency'] ?? cfg['currency']) as string | undefined) ?? 'MYR';
  const validUntil = (quoteInput['validUntil'] ?? cfg['validUntil']) as string | undefined;
  const notes      = (quoteInput['notes'] ?? cfg['notes']) as string | undefined;

  if (!rfqId) {
    return {
      status: 'failure',
      outputs: { quotation: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.receive_quotation: rfqId is required' },
    };
  }
  if (!supplier) {
    return {
      status: 'failure',
      outputs: { quotation: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.receive_quotation: supplier is required' },
    };
  }
  if (amount == null) {
    return {
      status: 'failure',
      outputs: { quotation: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.receive_quotation: amount is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { quotation: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.procurement.receive_quotation: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.procurement.receive_quotation → rfq:${rfqId} supplier:${supplier} amount:${amount}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'quotation',
    name: `Quotation — ${supplier}`,
    data: { rfqId, supplier, amount, currency, validUntil: validUntil ?? null, notes: notes ?? null },
    parentId: rfqId,
    createdBy: actorId,
    initialState: 'received',
  });

  return {
    status: 'success',
    outputs: { quotation: { quotationId: record.id, rfqId, supplier, amount, status: record.state } },
    summary: `Quotation received from ${supplier}: ${amount} ${currency}`,
  };
}
