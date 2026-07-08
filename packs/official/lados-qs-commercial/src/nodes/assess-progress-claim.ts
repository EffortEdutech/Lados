/**
 * lados.qs.assess_progress_claim — Phase 21 S6 (Wave 4)
 *
 * Deterministic, rules-based advisory computation — NOT an AI/LLM call.
 * Reads the bound `progress_claim` Workspace Resource (already a permitted
 * resource type, migration 0041_construction_resources.sql) and compares
 * the claimed amount/percentage against supplied evidence (e.g. site
 * diary or inspection references), flagging any claimed amount that
 * exceeds what the evidence supports. `claimEvidenceRules` (config) is a
 * required Knowledge Pack reference per the manifest — passed through for
 * traceability only; the framework logs any item UUIDs referenced in
 * config automatically.
 *
 * Produces a QS assessment recommendation only. Certification/payment
 * approval must be recorded by a separate human decision node
 * (lados.human.record_decision) — this node never certifies itself.
 *
 * Config/Inputs:
 *   claimBinding         — the bound progress_claim resourceId (required)
 *   claim.claimedAmount  — required (via inputs.claim, or falls back to the resource's data)
 *   evidence (input)     — array of evidence refs/amounts supporting the claim
 *   claimEvidenceRules   — required KP ref pass-through
 *   contractReference, standardsReferences — optional pass-through
 *   humanReviewRequired  — default true
 *   confidenceThreshold  — default 0.8 (evidence coverage ratio below this is flagged)
 *
 * Outputs:
 *   assessment — { advisory:true, claimedAmount, evidenceTotal, coverageRatio,
 *                  requiresReview, flags[], claimEvidenceRulesReferenced }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IReadResourceService } from '../types';

interface EvidenceItem {
  amount?: number;
  reference?: string;
}

export async function assessProgressClaim(
  ctx: NodeContext,
  readService?: IReadResourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const claimBinding = cfg['claimBinding'] as string | undefined;
  const claimInput = (inp['claim'] as Record<string, unknown> | undefined) ?? {};
  const evidence = (inp['evidence'] as EvidenceItem[] | undefined) ?? [];
  const claimEvidenceRules = cfg['claimEvidenceRules'] as unknown[] | undefined;
  const humanReviewRequired = (cfg['humanReviewRequired'] as boolean | undefined) ?? true;
  const confidenceThreshold = (cfg['confidenceThreshold'] as number | undefined) ?? 0.8;

  if (!claimBinding) {
    return {
      status: 'failure',
      outputs: { assessment: null },
      error: { code: 'MISSING_INPUT', message: 'lados.qs.assess_progress_claim: claimBinding (bound progress_claim resourceId) is required' },
    };
  }
  if (!readService) {
    return {
      status: 'failure',
      outputs: { assessment: null },
      error: { code: 'NO_SERVICE', message: 'Resource read service not injected' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { assessment: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.qs.assess_progress_claim: organizationId missing from execution context' },
    };
  }

  const claimResource = await readService.getResource(claimBinding, ctx.organizationId);
  const claimedAmount = (claimInput['claimedAmount'] as number | undefined) ?? (claimResource.data['claimedAmount'] as number | undefined) ?? 0;

  const evidenceTotal = evidence.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0);
  const coverageRatio = claimedAmount > 0 ? Math.min(1, evidenceTotal / claimedAmount) : 0;

  const flags: string[] = [];
  if (coverageRatio < confidenceThreshold) flags.push('EVIDENCE_COVERAGE_BELOW_THRESHOLD');
  if (evidence.length === 0) flags.push('NO_EVIDENCE_SUPPLIED');

  const requiresReview = humanReviewRequired || flags.length > 0;

  ctx.logger.info(`lados.qs.assess_progress_claim → claim:${claimBinding} claimed:${claimedAmount} evidence:${evidenceTotal} coverage:${coverageRatio.toFixed(2)}`);

  return {
    status: 'success',
    outputs: {
      assessment: {
        advisory: true,
        claimedAmount,
        evidenceTotal,
        coverageRatio,
        requiresReview,
        flags,
        claimEvidenceRulesReferenced: claimEvidenceRules ?? [],
      },
    },
    summary: `Claim assessment (advisory): ${claimedAmount} claimed, ${(coverageRatio * 100).toFixed(0)}% evidence coverage — human review ${requiresReview ? 'required' : 'optional'}`,
  };
}
