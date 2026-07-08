/**
 * lados.qs.reconcile_final_account — Phase 21 S6 (Wave 4)
 *
 * Deterministic, stateless aggregation — NOT an AI/LLM call. Sums work
 * package values and variation values into a single advisory cost
 * summary, compares it against an optional budget/target, and flags
 * variance beyond `tolerancePercent`. This is the "cost summary" node
 * referenced by the master plan's S6 bullet and the
 * `qs_practice.boq_upload_to_cost_summary` gate — no Workspace Resource is
 * persisted here; final account acceptance always happens via a separate
 * human decision/approval node downstream in the composing template.
 *
 * Config/Inputs:
 *   summary.workPackages — array of { key, totalQuantity, items } or valued items with .value — optional
 *   summary.variations    — array of variation valuations (each with .totalValue) — optional
 *   summary.budget        — optional target/budget amount to compare against
 *   tolerancePercent       — default 5
 *   currency               — default 'MYR'
 *
 * Outputs:
 *   costSummary — { advisory:true, totalValue, budget, variancePercent,
 *                    withinTolerance, requiresReview }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface ValuedEntry {
  value?: number;
  totalValue?: number;
  items?: Array<{ quantity?: number; rate?: number; value?: number }>;
}

function sumEntry(entry: ValuedEntry): number {
  if (typeof entry.totalValue === 'number') return entry.totalValue;
  if (typeof entry.value === 'number') return entry.value;
  if (Array.isArray(entry.items)) {
    return entry.items.reduce((sum, i) => {
      if (typeof i.value === 'number') return sum + i.value;
      const qty = typeof i.quantity === 'number' ? i.quantity : 0;
      const rate = typeof i.rate === 'number' ? i.rate : 0;
      return sum + qty * rate;
    }, 0);
  }
  return 0;
}

export async function reconcileFinalAccount(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const summaryInput = (inp['summary'] as Record<string, unknown> | undefined) ?? {};
  const workPackages = (summaryInput['workPackages'] as ValuedEntry[] | undefined) ?? [];
  const variations = (summaryInput['variations'] as ValuedEntry[] | undefined) ?? [];
  const budget = summaryInput['budget'] as number | undefined;
  const tolerancePercent = (cfg['tolerancePercent'] as number | undefined) ?? 5;
  const currency = (cfg['currency'] as string | undefined) ?? 'MYR';

  if (workPackages.length === 0 && variations.length === 0) {
    return {
      status: 'failure',
      outputs: { costSummary: null },
      error: { code: 'MISSING_INPUT', message: 'lados.qs.reconcile_final_account: at least one of summary.workPackages or summary.variations is required' },
    };
  }

  const totalValue = workPackages.reduce((sum, e) => sum + sumEntry(e), 0) + variations.reduce((sum, e) => sum + sumEntry(e), 0);

  let variancePercent: number | null = null;
  let withinTolerance: boolean | null = null;
  if (budget != null && budget !== 0) {
    variancePercent = ((totalValue - budget) / budget) * 100;
    withinTolerance = Math.abs(variancePercent) <= tolerancePercent;
  }

  const requiresReview = true; // Cost summary is always advisory — final account acceptance is a separate human step.

  ctx.logger.info(`lados.qs.reconcile_final_account → total:${totalValue} ${currency}${budget != null ? ` budget:${budget} variance:${variancePercent?.toFixed(1)}%` : ''}`);

  return {
    status: 'success',
    outputs: {
      costSummary: {
        advisory: true,
        totalValue,
        currency,
        budget: budget ?? null,
        variancePercent,
        withinTolerance,
        requiresReview,
      },
    },
    summary: `Cost summary (advisory): ${totalValue} ${currency}${withinTolerance === false ? ' — variance exceeds tolerance' : ''}`,
  };
}
