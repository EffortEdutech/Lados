/**
 * lados.finance.claim_retention_release — Phase 21 S5 (Wave 3)
 *
 * Creates a retention release claim Workspace Resource (`lados_resources`
 * type `retention_release`). Records a claim only; release approval and
 * payment are separate (lados.finance.record_retention_release).
 *
 * Config/Inputs:
 *   contractReference, claimedAmount — required
 *   claimPercentage, currency — optional
 *
 * Outputs:
 *   retention — { retentionId, contractReference, claimedAmount, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function claimRetentionRelease(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { retention: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const claimInput = (inp['claim'] as Record<string, unknown> | undefined) ?? {};

  const contractReference = (claimInput['contractReference'] ?? cfg['contractReference']) as string | undefined;
  const claimedAmount     = (claimInput['claimedAmount']     ?? cfg['claimedAmount'])     as number | undefined;
  const claimPercentage   = (claimInput['claimPercentage']   ?? cfg['claimPercentage'])   as number | undefined;
  const currency          = ((claimInput['currency']         ?? cfg['currency']) as string | undefined) ?? 'MYR';

  if (!contractReference) {
    return {
      status: 'failure',
      outputs: { retention: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.claim_retention_release: contractReference is required' },
    };
  }
  if (claimedAmount == null) {
    return {
      status: 'failure',
      outputs: { retention: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.claim_retention_release: claimedAmount is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { retention: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.finance.claim_retention_release: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.finance.claim_retention_release → contract:${contractReference} amount:${claimedAmount}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'retention_release',
    name: `Retention Claim — ${contractReference}`,
    data: { contractReference, claimedAmount, claimPercentage: claimPercentage ?? null, currency },
    createdBy: actorId,
    initialState: 'claimed',
  });

  return {
    status: 'success',
    outputs: { retention: { retentionId: record.id, contractReference, claimedAmount, status: record.state } },
    summary: `Retention release claimed: ${contractReference} — ${claimedAmount} ${currency}`,
  };
}
