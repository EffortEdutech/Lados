/**
 * lados.workflow.condition — Phase 21 S2 (Wave 1)
 * Extended Phase 22 S22.4 (Branching Expressiveness, §6)
 *
 * Official successor to the prototype `core.condition`. Evaluates a
 * user-defined expression and routes to one of two output ports: `true` or
 * `false`.
 *
 * Supported expression syntax (case-insensitive operators, see
 * ../lib/expression.ts for the full grammar and its documented limits):
 *   value >= 100 | value <= 50 | value > 0 | value < 1000
 *   value == "approved" | value != "rejected"
 *   value == null | value != null
 *   value includes "keyword" | value !includes "keyword"
 *
 * S22.4 additions (backward compatible — every expression above still
 * evaluates identically):
 *   amount >= 1000                          (named field, not just "value")
 *   amount >= 1000 AND status == "approved" (AND combinator, any number of clauses)
 *   priority == "low" OR priority == "normal" (OR combinator)
 * Mixing AND and OR in one expression is deliberately rejected — see
 * ../lib/expression.ts's evaluateExpression() for why.
 *
 * Security: expression is evaluated with a hand-rolled parser, never eval().
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import { evaluateExpression } from '../lib/expression';

export async function condition(ctx: NodeContext): Promise<NodeExecuteResult> {
  const expression = (ctx.config['expression'] as string | undefined) ?? '';

  if (!expression.trim()) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_CONFIG', message: 'expression config is required' },
    };
  }

  let result: boolean;
  try {
    result = evaluateExpression(expression, ctx.inputs);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'EXPRESSION_ERROR', message } };
  }

  // Passthrough payload on the true/false ports is unchanged from Phase 21
  // (the implicit "value" input) even for multi-field expressions — this
  // keeps every existing downstream wiring reading `true`/`false` working
  // exactly as before. `context` (new, S22.4) additively carries the full
  // input set for downstream nodes that need the other fields a multi-field
  // expression referenced.
  const inputValue: unknown = ctx.inputs?.['value'] ?? (ctx.inputs ? Object.values(ctx.inputs)[0] : undefined);

  ctx.logger.info(`lados.workflow.condition: "${expression}" → ${result} (input: ${JSON.stringify(inputValue)})`);

  return {
    status: 'success',
    outputs: {
      true: result ? inputValue : null,
      false: result ? null : inputValue,
      context: ctx.inputs ?? {},
    },
    summary: `Condition "${expression}" → ${result ? 'TRUE' : 'FALSE'}`,
  };
}
