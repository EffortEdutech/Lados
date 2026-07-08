/**
 * lados.procurement.create_rfq — Phase 21 S5 (Wave 3)
 *
 * Creates a Request for Quotation Workspace Resource (`lados_resources`
 * type `rfq`). Drafting only; issuing to suppliers is a separate step
 * (lados.procurement.issue_rfq).
 *
 * Config/Inputs:
 *   title, scope — required
 *   dueDate, suppliers, knowledgePackRefs — optional (procurement SOP pack
 *     item refs pass through in `knowledgePackRefs` for provenance; the
 *     framework logs any KP item UUIDs found in config automatically —
 *     see lados-commercial-finance/src/nodes/submit-invoice.ts doc comment)
 *
 * Outputs:
 *   rfq — { rfqId, title, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function createRfq(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { rfq: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const rfqInput = (inp['rfq'] as Record<string, unknown> | undefined) ?? {};

  const title              = (rfqInput['title'] ?? cfg['title']) as string | undefined;
  const scope               = (rfqInput['scope'] ?? cfg['scope']) as string | undefined;
  const dueDate             = (rfqInput['dueDate'] ?? cfg['dueDate']) as string | undefined;
  const suppliers           = (rfqInput['suppliers'] ?? cfg['suppliers']) as unknown[] | undefined;
  const knowledgePackRefs   = cfg['knowledgePackRefs'] as unknown[] | undefined;

  if (!title) {
    return {
      status: 'failure',
      outputs: { rfq: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.create_rfq: title is required' },
    };
  }
  if (!scope) {
    return {
      status: 'failure',
      outputs: { rfq: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.create_rfq: scope is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { rfq: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.procurement.create_rfq: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.procurement.create_rfq → title:${title}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'rfq',
    name: `RFQ — ${title}`,
    data: {
      title,
      scope,
      dueDate: dueDate ?? null,
      suppliers: suppliers ?? [],
      knowledgePackRefs: knowledgePackRefs ?? [],
    },
    createdBy: actorId,
    initialState: 'draft',
  });

  return {
    status: 'success',
    outputs: { rfq: { rfqId: record.id, title, status: record.state } },
    summary: `RFQ drafted: ${title}`,
  };
}
