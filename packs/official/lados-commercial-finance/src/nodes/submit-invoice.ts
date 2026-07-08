/**
 * lados.finance.submit_invoice — Phase 21 S5 (Wave 3)
 *
 * Creates an invoice Workspace Resource (`lados_resources` type
 * `finance_invoice`) for later verification/approval. Submits an invoice
 * only — approval and payment decisions are separate human-boundary
 * actions (lados.finance.record_invoice_approval / record_payment).
 *
 * `knowledgePackRefs` (config) is passed through into the resource's data
 * for traceability; the actual provenance logging of any Knowledge Pack
 * item UUIDs referenced anywhere in this node's config is handled
 * automatically by the framework (DataPacksService
 * .resolveRuntimeUsagesForDefinition scans every node's config for
 * data-pack-item UUIDs and attaches usage to the execution log) — no
 * additional code is needed here for that.
 *
 * Config/Inputs:
 *   supplier, amount, currency — required (invoice input object or config)
 *   poReference, contractReference, knowledgePackRefs — optional references
 *
 * Outputs:
 *   submission — { invoiceId, supplier, amount, currency, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function submitInvoice(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { submission: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const invoiceInput = (inp['invoice'] as Record<string, unknown> | undefined) ?? {};

  const supplier          = (invoiceInput['supplier'] ?? cfg['supplier']) as string | undefined;
  const amount            = (invoiceInput['amount']   ?? cfg['amount'])   as number | undefined;
  const currency          = ((invoiceInput['currency'] ?? cfg['currency']) as string | undefined) ?? 'MYR';
  const poReference       = (invoiceInput['poReference']       ?? cfg['poReference'])       as string | undefined;
  const contractReference = (invoiceInput['contractReference'] ?? cfg['contractReference']) as string | undefined;
  const knowledgePackRefs = cfg['knowledgePackRefs'] as unknown[] | undefined;

  if (!supplier) {
    return {
      status: 'failure',
      outputs: { submission: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.submit_invoice: supplier is required' },
    };
  }
  if (amount == null) {
    return {
      status: 'failure',
      outputs: { submission: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.submit_invoice: amount is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { submission: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.finance.submit_invoice: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.finance.submit_invoice → supplier:${supplier} amount:${amount} ${currency}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'finance_invoice',
    name: `Invoice — ${supplier}`,
    data: {
      supplier,
      amount,
      currency,
      poReference: poReference ?? null,
      contractReference: contractReference ?? null,
      knowledgePackRefs: knowledgePackRefs ?? [],
    },
    createdBy: actorId,
    initialState: 'submitted',
  });

  return {
    status: 'success',
    outputs: { submission: { invoiceId: record.id, supplier, amount, currency, status: record.state } },
    summary: `Invoice submitted: ${supplier} — ${amount} ${currency}`,
  };
}
