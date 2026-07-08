/**
 * lados.finance.verify_invoice — Phase 21 S5 (Wave 3)
 *
 * Deterministic, rules-based advisory check — NOT an AI call. Compares the
 * invoice amount against a bound purchase order's amount (if `poBinding`
 * resolves to a real resource and a read service is injected) within
 * `tolerance` (default 5%), and flags anything it cannot verify. This is a
 * checking/advisory node only — it never approves payment. `invoiceRules`
 * (config) is a pass-through Knowledge Pack reference, echoed in the
 * output for traceability; provenance logging of any item UUIDs referenced
 * in config happens automatically at the framework level (see
 * submit-invoice.ts's doc comment) — this node does not fetch or interpret
 * the referenced rule content itself (no rules-interpretation engine exists
 * yet — honestly out of scope, not silently faked).
 *
 * Config/Inputs:
 *   invoice.amount | config.amount — required
 *   poBinding    — optional resource id of a bound PO to check against
 *   tolerance    — fractional tolerance, default 0.05 (5%)
 *   invoiceRules — optional Knowledge Pack item ref(s), pass-through only
 *   reviewLowConfidence — default true; when false, suppresses the
 *                         requiresReview flag even if issues are found
 *
 * Outputs:
 *   verification — { advisory:true, passed, flags[], withinTolerance,
 *                     requiresReview, checkedAgainstPoAmount, invoiceRulesReferenced }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IReadResourceService } from '../types';

export async function verifyInvoice(
  ctx: NodeContext,
  readService?: IReadResourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const invoiceInput = (inp['invoice'] as Record<string, unknown> | undefined) ?? {};

  const amount       = (invoiceInput['amount'] ?? cfg['amount']) as number | undefined;
  const poBinding    = cfg['poBinding'] as string | undefined;
  const tolerance    = (cfg['tolerance'] as number | undefined) ?? 0.05;
  const invoiceRules = cfg['invoiceRules'] as unknown[] | undefined;
  const reviewLowConfidence = (cfg['reviewLowConfidence'] as boolean | undefined) ?? true;

  if (amount == null) {
    return {
      status: 'failure',
      outputs: { verification: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.verify_invoice: amount is required to verify' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { verification: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.finance.verify_invoice: organizationId missing from execution context' },
    };
  }

  const flags: string[] = [];
  let poAmount: number | null = null;

  if (poBinding && readService) {
    try {
      const po = await readService.getResource(poBinding, ctx.organizationId);
      poAmount = (po.data['amount'] as number | undefined) ?? null;
      if (poAmount == null) flags.push('PO_MISSING_AMOUNT');
    } catch {
      flags.push('PO_NOT_FOUND');
    }
  } else if (poBinding && !readService) {
    flags.push('PO_CHECK_UNAVAILABLE');
  } else {
    flags.push('NO_PO_REFERENCE_TO_CHECK');
  }

  let withinTolerance: boolean | null = null;
  if (poAmount != null) {
    const diff = poAmount === 0 ? (amount === 0 ? 0 : 1) : Math.abs(amount - poAmount) / poAmount;
    withinTolerance = diff <= tolerance;
    if (!withinTolerance) flags.push('AMOUNT_EXCEEDS_TOLERANCE');
  }

  const passed = flags.length === 0;
  const requiresReview = reviewLowConfidence && !passed;

  ctx.logger.info(
    `lados.finance.verify_invoice → amount:${amount} passed:${passed} flags:[${flags.join(', ')}]`,
  );

  return {
    status: 'success',
    outputs: {
      verification: {
        advisory: true,
        passed,
        flags,
        withinTolerance,
        requiresReview,
        checkedAgainstPoAmount: poAmount,
        invoiceRulesReferenced: invoiceRules ?? [],
      },
    },
    summary: passed
      ? 'Invoice verification: no issues found (advisory — human review still required before approval)'
      : `Invoice verification flagged: ${flags.join(', ')} (advisory — human review required before approval)`,
  };
}
