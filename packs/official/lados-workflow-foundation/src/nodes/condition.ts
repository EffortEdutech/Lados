/**
 * lados.workflow.condition — Phase 21 S2 (Wave 1)
 *
 * Official successor to the prototype `core.condition`. Evaluates a
 * user-defined expression against the incoming `value` input and routes to
 * one of two output ports: `true` or `false`.
 *
 * Supported expression syntax (case-insensitive operators):
 *   value >= 100 | value <= 50 | value > 0 | value < 1000
 *   value == "approved" | value != "rejected"
 *   value == null | value != null
 *   value includes "keyword" | value !includes "keyword"
 *
 * Security: expression is evaluated with a hand-rolled parser, never eval().
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

const OPERATORS = ['!=', '>=', '<=', '>', '<', '==', '!includes', 'includes'];

function parseLiteral(raw: string): unknown {
  if (raw === 'null' || raw === 'undefined') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const num = Number(raw);
  if (!isNaN(num) && raw !== '') return num;

  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  return raw;
}

function compare(lhs: unknown, op: string, rhs: unknown): boolean {
  switch (op) {
    case '==':
      if (rhs === null) return lhs == null;
      return String(lhs).toLowerCase() === String(rhs).toLowerCase();
    case '!=':
      if (rhs === null) return lhs != null;
      return String(lhs).toLowerCase() !== String(rhs).toLowerCase();
    case '>': return Number(lhs) > Number(rhs);
    case '<': return Number(lhs) < Number(rhs);
    case '>=': return Number(lhs) >= Number(rhs);
    case '<=': return Number(lhs) <= Number(rhs);
    case 'includes': return String(lhs ?? '').toLowerCase().includes(String(rhs).toLowerCase());
    case '!includes': return !String(lhs ?? '').toLowerCase().includes(String(rhs).toLowerCase());
    default: throw new Error(`Unknown operator: ${op}`);
  }
}

function evaluateExpression(expression: string, inputValue: unknown): boolean {
  const raw = expression.trim();

  let matchedOp: string | null = null;
  let rhsStr = '';

  for (const op of OPERATORS) {
    const idx = raw.indexOf(op);
    if (idx === -1) continue;

    const lhsStr = raw.slice(0, idx).trim();
    if (lhsStr.toLowerCase() === 'value') {
      matchedOp = op;
      rhsStr = raw.slice(idx + op.length).trim();
      break;
    }
  }

  if (!matchedOp) {
    throw new Error(
      `Condition expression "${expression}" could not be parsed. ` +
        'Expected: value <op> <literal> where op is one of: >=, <=, >, <, ==, !=, includes, !includes',
    );
  }

  return compare(inputValue, matchedOp, parseLiteral(rhsStr));
}

export async function condition(ctx: NodeContext): Promise<NodeExecuteResult> {
  const expression = (ctx.config['expression'] as string | undefined) ?? '';

  if (!expression.trim()) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_CONFIG', message: 'expression config is required' },
    };
  }

  const inputValue: unknown = ctx.inputs?.['value'] ?? (ctx.inputs ? Object.values(ctx.inputs)[0] : undefined);

  let result: boolean;
  try {
    result = evaluateExpression(expression, inputValue);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'EXPRESSION_ERROR', message } };
  }

  ctx.logger.info(`lados.workflow.condition: "${expression}" → ${result} (input: ${JSON.stringify(inputValue)})`);

  return {
    status: 'success',
    outputs: {
      true: result ? inputValue : null,
      false: result ? null : inputValue,
    },
    summary: `Condition "${expression}" → ${result ? 'TRUE' : 'FALSE'}`,
  };
}
