/**
 * lados.contract.prepare_notice — Phase 21 S6.1 (remaining Wave 4)
 *
 * Creates a draft contract notice Workspace Resource (`lados_resources`
 * type `contract_notice`, new — migration
 * 0060_contract_admin_resource_types.sql). `clauseRefs` (config) is a
 * Knowledge Pack reference pass-through only — the framework logs any
 * item UUIDs referenced in config automatically; this node does NOT
 * itself draft notice text or make a legal determination (no AI/LLM
 * call — the drafting content, if any, must come from the caller via
 * `inputs.event`, this node only structures and persists it).
 *
 * Produces a draft notice for human review only; it must not issue legal
 * or contractual determinations.
 *
 * Config/Inputs:
 *   noticeType, recipient — required
 *   issueDate — optional, defaults to now
 *   clauseRefs — optional KP ref pass-through
 *   event (input) — event facts object, stored as-is on the notice
 *   requiresContractAdminReview — default true
 *   reviewerRole — optional
 *
 * Outputs:
 *   notice — { noticeId, noticeType, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function prepareNotice(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { notice: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const eventInput = (inp['event'] as Record<string, unknown> | undefined) ?? {};

  const noticeType = (eventInput['noticeType'] ?? cfg['noticeType']) as string | undefined;
  const recipient = (eventInput['recipient'] ?? cfg['recipient']) as string | undefined;
  const issueDate = ((eventInput['issueDate'] ?? cfg['issueDate']) as string | undefined) ?? new Date().toISOString();
  const clauseRefs = cfg['clauseRefs'] as unknown[] | undefined;
  const requiresContractAdminReview = (cfg['requiresContractAdminReview'] as boolean | undefined) ?? true;
  const reviewerRole = cfg['reviewerRole'] as string | undefined;

  if (!noticeType) {
    return {
      status: 'failure',
      outputs: { notice: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.prepare_notice: noticeType is required' },
    };
  }
  if (!recipient) {
    return {
      status: 'failure',
      outputs: { notice: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.prepare_notice: recipient is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { notice: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.contract.prepare_notice: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.contract.prepare_notice → ${noticeType} to ${recipient} (draft, requires review)`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'contract_notice',
    name: `Notice — ${noticeType}`,
    data: {
      noticeType,
      recipient,
      issueDate,
      clauseRefs: clauseRefs ?? [],
      eventFacts: eventInput,
      requiresContractAdminReview,
      reviewerRole: reviewerRole ?? null,
    },
    createdBy: actorId,
    initialState: 'draft',
  });

  return {
    status: 'success',
    outputs: { notice: { noticeId: record.id, noticeType, status: record.state } },
    summary: `Notice drafted (advisory, requires review): ${noticeType} to ${recipient}`,
  };
}
