/**
 * lados.qs.value_variation — Phase 21 S6 (Wave 4)
 *
 * Deterministic, rules-based advisory computation — NOT an AI/LLM call.
 * Values each variation item using an explicit rate if given, otherwise
 * looks it up in a caller-supplied rate map (`inputs.rateLookup`, keyed by
 * item description) standing in for a real QS rate library lookup —
 * items with no resolvable rate are flagged rather than guessed at ("rate
 * check against QS rate library"). Applies an optional markup percentage.
 * `rateLibraryRefs` (config) is a Knowledge Pack reference pass-through
 * only; the framework logs any item UUIDs referenced in config
 * automatically.
 *
 * Valuation is advisory only — approval/recording of the variation value
 * must be a separate human decision (lados.human.record_decision), never
 * decided by this node.
 *
 * Config/Inputs:
 *   variation.items      — array of { description, quantity, rate? } — required
 *   variation.resourceId — optional existing 'variation' resource id
 *   currency             — default 'MYR'
 *   rateLibraryRefs       — optional KP ref pass-through
 *   defaultMarkupPercent  — default 0
 *   rateLookup (input)    — optional Record<description, rate> standing in for a rate library
 *
 * Outputs:
 *   valuation — { advisory:true, items: ValuedItem[], totalValue, unresolvedCount,
 *                 requiresReview, rateLibraryRefsReferenced }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface VariationItem {
  description?: string;
  quantity?: number;
  rate?: number;
}

export async function valueVariation(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const variationInput = (inp['variation'] as Record<string, unknown> | undefined) ?? {};
  const items = (variationInput['items'] as VariationItem[] | undefined) ?? [];
  const resourceId = variationInput['resourceId'] as string | undefined;
  const currency = (cfg['currency'] as string | undefined) ?? 'MYR';
  const rateLibraryRefs = cfg['rateLibraryRefs'] as unknown[] | undefined;
  const defaultMarkupPercent = (cfg['defaultMarkupPercent'] as number | undefined) ?? 0;
  const rateLookup = (inp['rateLookup'] as Record<string, number> | undefined) ?? {};

  if (items.length === 0) {
    return {
      status: 'failure',
      outputs: { valuation: null },
      error: { code: 'MISSING_INPUT', message: 'lados.qs.value_variation: variation.items array is required and must not be empty' },
    };
  }

  let unresolvedCount = 0;
  const valuedItems = items.map((item) => {
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
    let rate = item.rate;
    let rateSource: 'explicit' | 'lookup' | 'unresolved' = 'explicit';

    if (rate == null) {
      const looked = item.description ? rateLookup[item.description] : undefined;
      if (looked != null) {
        rate = looked;
        rateSource = 'lookup';
      } else {
        rate = 0;
        rateSource = 'unresolved';
        unresolvedCount += 1;
      }
    }

    const baseValue = quantity * rate;
    const value = baseValue * (1 + defaultMarkupPercent / 100);

    return { ...item, quantity, rate, rateSource, value };
  });

  const totalValue = valuedItems.reduce((sum, i) => sum + i.value, 0);
  const requiresReview = true; // Valuation is always advisory — never itself an approval.

  ctx.logger.info(`lados.qs.value_variation → ${items.length} item(s), total ${totalValue} ${currency}, ${unresolvedCount} unresolved rate(s)`);

  return {
    status: 'success',
    outputs: {
      valuation: {
        advisory: true,
        resourceId: resourceId ?? null,
        items: valuedItems,
        totalValue,
        currency,
        unresolvedCount,
        requiresReview,
        rateLibraryRefsReferenced: rateLibraryRefs ?? [],
      },
    },
    summary: `Variation valued: ${totalValue} ${currency} (advisory — ${unresolvedCount} item(s) had no resolvable rate)`,
  };
}
