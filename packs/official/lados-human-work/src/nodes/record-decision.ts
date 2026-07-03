/**
 * lados.human.record_decision — Phase 21 S2 (Wave 1)
 *
 * Records a human decision and its evidence. This node never makes a
 * decision itself — `decisionBy` must come from a human actor or an
 * existing approval record (e.g. the resolved output of
 * `lados.human.request_approval`), never fabricated here. If `decisionBy`
 * is missing, the node fails rather than guessing.
 *
 * Config/Inputs:
 *   decisionType — free-text category, e.g. 'variation-approval' (required)
 *   decisionBy   — the human actor who made the decision (required)
 *   decisionDate — ISO date the decision was made (defaults to now)
 *   notes        — free-text notes (optional)
 *   attachments  — array of file references (optional)
 *
 * Outputs:
 *   decision — the full decision record, including any `evidence` input
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export async function recordDecision(ctx: NodeContext): Promise<NodeExecuteResult> {
  const decisionType = (ctx.inputs['decisionType'] ?? ctx.config['decisionType']) as string | undefined;
  const decisionBy = (ctx.inputs['decisionBy'] ?? ctx.config['decisionBy']) as string | undefined;
  const decisionDate = ((ctx.inputs['decisionDate'] ?? ctx.config['decisionDate']) as string | undefined)
    ?? new Date().toISOString();
  const notes = (ctx.inputs['notes'] ?? ctx.config['notes']) as string | undefined;
  const attachments = (ctx.inputs['attachments'] ?? ctx.config['attachments']) as unknown[] | undefined;
  const evidence = ctx.inputs['evidence'] as Record<string, unknown> | undefined;

  if (!decisionType) {
    return { status: 'failure', outputs: {}, error: { code: 'MISSING_INPUT', message: 'decisionType is required' } };
  }
  if (!decisionBy) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'MISSING_HUMAN_DECISION',
        message: 'decisionBy is required — the value must come from a human actor or an existing approval record, never inferred automatically.',
      },
    };
  }

  const decision = {
    decisionType,
    decisionBy,
    decisionDate,
    notes: notes ?? null,
    attachments: attachments ?? [],
    evidence: evidence ?? null,
    recordedAt: new Date().toISOString(),
  };

  ctx.logger.info(`lados.human.record_decision: "${decisionType}" recorded by ${decisionBy}`);

  return {
    status: 'success',
    outputs: { decision },
    summary: `Decision recorded: ${decisionType} (by ${decisionBy})`,
  };
}
