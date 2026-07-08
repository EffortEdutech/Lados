/**
 * lados.procurement.recommend_award — Phase 21 S5 (Wave 3)
 *
 * Deterministic advisory computation (NOT an AI/LLM call) that derives an
 * award recommendation from a prior compare_quotations result — picks the
 * top-ranked entry and states the reason. Restricted maturity: this node
 * NEVER creates an approval task or transitions any resource itself; award
 * approval is always composed via a separate lados.human.request_approval
 * node downstream in the template graph (per manifest guardrail: "Award
 * recommendation is advisory and must route through human review").
 *
 * Config/Inputs:
 *   comparison — the { ranked[] } output of compare_quotations — required
 *   reviewRole — optional, defaults to 'procurement_manager'
 *
 * Outputs:
 *   recommendation — { advisory:true, recommendedSupplier, recommendedQuotationId,
 *                       reason, reviewRole, requiresApproval:true }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface RankedEntry {
  quotationId: string;
  supplier: string;
  amount: number;
  score: number;
}

export async function recommendAward(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const comparison = (inp['comparison'] ?? cfg['comparison']) as { ranked?: RankedEntry[] } | undefined;
  const reviewRole = (cfg['reviewRole'] as string | undefined) ?? 'procurement_manager';

  const ranked = comparison?.ranked;
  if (!ranked || ranked.length === 0) {
    return {
      status: 'failure',
      outputs: { recommendation: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.recommend_award: comparison.ranked is required and must not be empty' },
    };
  }

  const top = ranked[0];
  if (!top) {
    return {
      status: 'failure',
      outputs: { recommendation: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.recommend_award: comparison.ranked contains no usable entries' },
    };
  }

  ctx.logger.info(`lados.procurement.recommend_award → recommending:${top.supplier} (advisory, requires human review)`);

  return {
    status: 'success',
    outputs: {
      recommendation: {
        advisory: true,
        recommendedSupplier: top.supplier,
        recommendedQuotationId: top.quotationId,
        reason: `Lowest-price-ranked quotation (score ${top.score.toFixed(2)}) among ${ranked.length} compared`,
        reviewRole,
        requiresApproval: true,
      },
    },
    summary: `Award recommendation (advisory): ${top.supplier} — requires human approval before proceeding`,
  };
}
