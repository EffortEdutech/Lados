/**
 * lados.procurement.compare_quotations — Phase 21 S5 (Wave 3)
 *
 * Deterministic, rules-based advisory computation — NOT an AI/LLM call.
 * Scores each quotation by a simple lowest-price-wins ratio
 * (minAmount / amount, clamped to [0,1]), sorted descending. This is
 * deliberately NOT a full weighted multi-criteria scoring engine (no
 * quality/delivery/compliance weighting) — an honest limitation, matching
 * the "no fabricated capability" discipline used for document-intelligence's
 * stub read_pdf/read_docx in S2. `comparisonRules`/`supplierCatalogueRefs`
 * (config) are Knowledge Pack references passed through for traceability
 * only; provenance logging of any item UUIDs referenced in config happens
 * automatically at the framework level.
 *
 * This node never decides an award — it only ranks. Award recommendation
 * is a separate node (lados.procurement.recommend_award), and actual
 * award approval always requires human review downstream.
 *
 * Config/Inputs:
 *   quotations — array of { quotationId, supplier, amount } — required
 *   comparisonRules, supplierCatalogueRefs — optional KP ref pass-through
 *
 * Outputs:
 *   comparison — { advisory:true, ranked[], criteria, weighting,
 *                   comparisonRulesReferenced, supplierCatalogueRefsReferenced,
 *                   requiresReview:true }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface QuotationInput {
  quotationId: string;
  supplier: string;
  amount: number;
}

export async function compareQuotations(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const quotations = (inp['quotations'] ?? cfg['quotations']) as QuotationInput[] | undefined;
  const comparisonRules = cfg['comparisonRules'] as unknown[] | undefined;
  const supplierCatalogueRefs = cfg['supplierCatalogueRefs'] as unknown[] | undefined;

  if (!quotations || quotations.length === 0) {
    return {
      status: 'failure',
      outputs: { comparison: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.compare_quotations: quotations array is required and must not be empty' },
    };
  }

  const amounts = quotations.map((q) => q.amount).filter((a) => typeof a === 'number' && !Number.isNaN(a));
  if (amounts.length === 0) {
    return {
      status: 'failure',
      outputs: { comparison: null },
      error: { code: 'MISSING_INPUT', message: 'lados.procurement.compare_quotations: no valid quotation amounts found' },
    };
  }

  const minAmount = Math.min(...amounts);

  const ranked = quotations
    .map((q) => {
      const score = q.amount > 0 ? Math.min(1, Math.max(0, minAmount / q.amount)) : 0;
      return { quotationId: q.quotationId, supplier: q.supplier, amount: q.amount, score };
    })
    .sort((a, b) => b.score - a.score);

  ctx.logger.info(`lados.procurement.compare_quotations → ${ranked.length} quotations ranked, lowest:${minAmount}`);

  return {
    status: 'success',
    outputs: {
      comparison: {
        advisory: true,
        ranked,
        criteria: ['price'],
        weighting: { price: 1.0 },
        comparisonRulesReferenced: comparisonRules ?? [],
        supplierCatalogueRefsReferenced: supplierCatalogueRefs ?? [],
        requiresReview: true,
      },
    },
    summary: `Compared ${ranked.length} quotations (price-only, advisory) — top: ${ranked[0]?.supplier ?? 'n/a'}`,
  };
}
