/**
 * Shared expression grammar — Phase 22 S22.4 (Branching Expressiveness, §6)
 *
 * Extracted from `lados.workflow.condition`'s original single-field parser
 * (Phase 21 S2) and generalized for reuse by both `condition` and the new
 * `switch` node. Backward compatible by construction: every expression the
 * original parser accepted (`value <op> literal`) still evaluates identically
 * — the only behavior this file adds is (a) allowing the left-hand side to
 * name any key in `ctx.inputs`, not just the literal word "value", and
 * (b) chaining multiple clauses with a single AND or OR combinator.
 *
 * Supported grammar:
 *   <field> <op> <literal>
 *   <field> <op> <literal> AND <field> <op> <literal> [AND ...]
 *   <field> <op> <literal> OR  <field> <op> <literal> [OR  ...]
 *
 * Where <field> is either the literal word "value" (legacy behavior: reads
 * `ctx.inputs.value`, falling back to the first input key if `value` itself
 * isn't wired — unchanged from Phase 21) or any other key name, which is
 * read directly from `ctx.inputs[field]` and throws a clear error if that
 * key isn't present at all (fail loud on a likely wiring mistake, rather
 * than silently treating a missing field as falsy).
 *
 * Deliberately NOT supported: mixing AND and OR in the same expression
 * (ambiguous without parentheses — no precedence/grouping grammar exists),
 * and grouping/parentheses in general. Matches this pack's "honest floor,
 * not fabricated richness" convention (see request-input.ts, S22.2) — a
 * real multi-way `switch` node covers the cases that would otherwise need
 * mixed AND/OR chains; nested Condition nodes cover the rest.
 */
const OPERATORS = ['!=', '>=', '<=', '>', '<', '==', '!includes', 'includes'];

export function parseLiteral(raw: string): unknown {
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

export function compare(lhs: unknown, op: string, rhs: unknown): boolean {
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

interface FieldOperatorSplit {
  field: string;
  op: string;
  rhsStr: string;
}

function findFieldOperatorSplit(raw: string): FieldOperatorSplit | null {
  for (const op of OPERATORS) {
    const idx = raw.indexOf(op);
    if (idx === -1) continue;

    const field = raw.slice(0, idx).trim();
    if (!field) continue; // operator with nothing before it — keep scanning (e.g. avoids matching inside a literal)

    return { field, op, rhsStr: raw.slice(idx + op.length).trim() };
  }
  return null;
}

/**
 * Resolves a clause's left-hand-side field name against `ctx.inputs`.
 * "value" (case-insensitive) keeps the exact Phase 21 legacy behavior —
 * every existing single-field expression evaluates identically to before
 * this sprint. Any other field name is read directly by key and throws if
 * the key genuinely isn't present, matching this codebase's fail-loud
 * convention for likely wiring mistakes (see MISSING_HUMAN_DECISION, etc.)
 * rather than silently comparing against `undefined`.
 */
function resolveFieldValue(field: string, inputs: Record<string, unknown> | undefined): unknown {
  if (field.toLowerCase() === 'value') {
    return inputs?.['value'] ?? (inputs ? Object.values(inputs)[0] : undefined);
  }
  if (!inputs || !(field in inputs)) {
    const available = inputs ? Object.keys(inputs).join(', ') : '';
    throw new Error(
      `Condition field "${field}" was not found among this node's inputs.` +
        (available ? ` Available: ${available}` : ' No inputs are wired to this node.'),
    );
  }
  return inputs[field];
}

function evaluateClause(raw: string, inputs: Record<string, unknown> | undefined): boolean {
  const trimmed = raw.trim();
  const split = findFieldOperatorSplit(trimmed);
  if (!split) {
    throw new Error(
      `Condition clause "${raw}" could not be parsed. ` +
        'Expected: <field> <op> <literal> where op is one of: >=, <=, >, <, ==, !=, includes, !includes',
    );
  }
  const fieldValue = resolveFieldValue(split.field, inputs);
  return compare(fieldValue, split.op, parseLiteral(split.rhsStr));
}

interface ClauseSplit {
  clauses: string[];
  combinators: string[];
}

/**
 * Splits on whole-word " AND "/" OR " (case-insensitive). Known limitation,
 * accepted deliberately (see file header): a quoted string literal that
 * itself contains the substring " AND " or " OR " would be split
 * incorrectly — an edge case rare enough that a real tokenizer/lexer isn't
 * justified for this pack's "simple expression, not a language" scope.
 */
function splitClauses(expression: string): ClauseSplit {
  const parts = expression.split(/\s+(AND|OR)\s+/i);
  const clauses: string[] = [];
  const combinators: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? '';
    if (i % 2 === 0) clauses.push(part);
    else combinators.push(part.toUpperCase());
  }
  return { clauses, combinators };
}

export function evaluateExpression(expression: string, inputs: Record<string, unknown> | undefined): boolean {
  const { clauses, combinators } = splitClauses(expression);

  if (clauses.length === 1) {
    return evaluateClause(clauses[0] ?? '', inputs);
  }

  const distinctCombinators = new Set(combinators);
  if (distinctCombinators.size > 1) {
    throw new Error(
      `Expression "${expression}" mixes AND and OR — not supported without parentheses/grouping. ` +
        'Use only AND or only OR in a single expression, or split into nested Condition nodes.',
    );
  }

  const combinator = [...distinctCombinators][0];
  const results = clauses.map((clause) => evaluateClause(clause, inputs));
  return combinator === 'AND' ? results.every(Boolean) : results.some(Boolean);
}
