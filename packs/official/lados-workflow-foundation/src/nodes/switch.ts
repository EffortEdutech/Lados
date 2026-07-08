/**
 * lados.workflow.switch — Phase 22 S22.4 (Branching Expressiveness, §6)
 *
 * True multi-way routing, as an alternative to chaining several binary
 * `lados.workflow.condition` nodes together. Evaluates a list of cases
 * in order (reusing the same expression grammar as `condition`, see
 * ../lib/expression.ts) and routes to the FIRST matching case's output
 * port; if none match, routes to the `default` port.
 *
 * Deliberately NOT a fully dynamic per-instance port count: this pack's
 * canvas port list is declared statically per node TYPE in nodes.json (no
 * per-workflow-instance port customization exists anywhere in this
 * codebase today — building that would be new canvas infrastructure, not
 * an official-node change, and the S22.4 plan explicitly says not to build
 * speculative capability ahead of real usage). Instead: 5 fixed case slots
 * (case1..case5) + a default port — enough for real multi-way routing
 * without chaining conditions, honestly bounded rather than pretending to
 * be infinite. If a real workflow genuinely needs more than 5 cases, adding
 * case6/case7/etc. to nodes.json's ports.outputs is a one-line, fully
 * backward-compatible addition (existing cases arrays are unaffected).
 *
 * Config:
 *   cases — array of { expression: string, label?: string }, max 5, evaluated
 *           in order; same JSON-string-or-real-array defensive parsing as
 *           request_input's inputSchema (S22.2) since the canvas inspector's
 *           generic TextField saves this as a raw string, not an array.
 *
 * Outputs:
 *   case1..case5 — the matched case's passthrough value (only one is
 *                  non-null: whichever case matched, by array index)
 *   default       — passthrough value when no case matched
 *   matchedCase   — the matched case's label (or "case1".."case5"/"default")
 *   context       — the full input set, for downstream nodes (same as
 *                   condition's S22.4 addition)
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import { evaluateExpression } from '../lib/expression';

const MAX_CASES = 5;

export interface SwitchCaseSpec {
  expression: string;
  label?: string;
}

/**
 * Same defensive parsing pattern as request-input.ts's parseInputSchema
 * (S22.2) — the canvas inspector's generic TextField (deriveConfigSchema(),
 * S7.3) saves an array-shaped config field as a JSON string, not a real
 * array, so this accepts either.
 */
function parseCases(raw: unknown): SwitchCaseSpec[] | undefined {
  if (Array.isArray(raw)) return raw as SwitchCaseSpec[];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SwitchCaseSpec[]) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function switchNode(ctx: NodeContext): Promise<NodeExecuteResult> {
  const rawCases = ctx.inputs?.['cases'] ?? ctx.config['cases'];
  const cases = parseCases(rawCases);

  if (!cases || cases.length === 0) {
    const hint = typeof rawCases === 'string' && rawCases.trim()
      ? ' (received a string that did not parse as a JSON array — check for a trailing comma or unquoted key)'
      : '';
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'MISSING_CONFIG',
        message: `cases (non-empty array of {expression, label?}, e.g. [{"expression":"priority == \\"urgent\\"","label":"Urgent"}]) is required${hint}`,
      },
    };
  }

  if (cases.length > MAX_CASES) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'MAX_CASES_EXCEEDED',
        message: `switch supports at most ${MAX_CASES} cases (case1..case${MAX_CASES}); received ${cases.length}. Chain a second Switch or Condition node for additional branches.`,
      },
    };
  }

  const passthroughValue: unknown = ctx.inputs?.['value'] ?? (ctx.inputs ? Object.values(ctx.inputs)[0] : undefined);
  const context = ctx.inputs ?? {};

  const outputs: Record<string, unknown> = {
    case1: null, case2: null, case3: null, case4: null, case5: null,
    default: null,
    matchedCase: null,
    context,
  };

  for (let i = 0; i < cases.length; i++) {
    const caseSpec = cases[i];
    if (!caseSpec?.expression || !caseSpec.expression.trim()) {
      return {
        status: 'failure',
        outputs: {},
        error: { code: 'MISSING_CONFIG', message: `cases[${i}].expression is required` },
      };
    }

    let matched: boolean;
    try {
      matched = evaluateExpression(caseSpec.expression, ctx.inputs);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: 'failure',
        outputs: {},
        error: { code: 'EXPRESSION_ERROR', message: `cases[${i}] ("${caseSpec.expression}"): ${message}` },
      };
    }

    if (matched) {
      const portId = `case${i + 1}`;
      outputs[portId] = passthroughValue;
      outputs.matchedCase = caseSpec.label ?? portId;
      ctx.logger.info(`lados.workflow.switch: matched case ${i + 1}${caseSpec.label ? ` ("${caseSpec.label}")` : ''} — "${caseSpec.expression}"`);
      return {
        status: 'success',
        outputs,
        summary: `Switch matched case ${i + 1}${caseSpec.label ? ` ("${caseSpec.label}")` : ''}`,
      };
    }
  }

  outputs.default = passthroughValue;
  outputs.matchedCase = 'default';
  ctx.logger.info('lados.workflow.switch: no case matched — routed to default');

  return {
    status: 'success',
    outputs,
    summary: 'Switch matched no case → default',
  };
}
