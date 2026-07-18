/**
 * lados.quran_media.rank_issue_candidates — Phase C (real logic)
 *
 * Advisory AI ranking of discovered issues for dakwah suitability. Fails
 * honestly without a configured AI service; prompt contract per Volume 2
 * §4.3.1.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput } from './stub-helpers';
import { runJsonCompletion, InvalidAiResponseError } from './ai-json-helper';
import { TRAGEDY_SENSITIVITY } from '../prompts/shared-guardrails';

const NODE = 'lados.quran_media.rank_issue_candidates';

interface IssueLike {
  issueId: string;
  [key: string]: unknown;
}

interface RankedItem {
  issueId: string;
  score: number;
  rationale: string;
  warnings: string[];
}

const SYSTEM_PROMPT = `${TRAGEDY_SENSITIVITY}

You rank news issues for suitability as reflective Islamic dakwah content. You do not select the issue — a human does. Score each issue 0-100 on: relevance to a broad Muslim audience, non-exploitative framing, absence of graphic/sensitive content, clarity of a reflective (not political) angle.

Return JSON only, matching exactly: { "ranked": [{ "issueId": string, "score": number, "rationale": string, "warnings": string[] }] }`;

export async function rankIssueCandidates(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const issues = inp['issues'];
  if (!Array.isArray(issues) || issues.length === 0) {
    return missingInput(NODE, 'issues', 'connect discover_current_issues');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }

  const cfg = ctx.config as Record<string, unknown>;
  const maxCandidates = typeof cfg['maxCandidates'] === 'number' ? (cfg['maxCandidates'] as number) : undefined;
  const audienceNote = typeof cfg['audienceNote'] === 'string' ? (cfg['audienceNote'] as string) : '';

  const knownIds = new Set((issues as IssueLike[]).map((i) => i.issueId));
  const userPrompt = `issues:\n${JSON.stringify(issues, null, 2)}\n\naudienceNote: ${audienceNote}`;

  let parsed: { ranked: RankedItem[] };
  try {
    parsed = await runJsonCompletion<{ ranked: RankedItem[] }>(aiService, SYSTEM_PROMPT, userPrompt, { temperature: 0.2 });
  } catch (e: unknown) {
    if (e instanceof InvalidAiResponseError) return fail('INVALID_AI_RESPONSE', `${NODE}: ${e.message}`);
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI call failed — ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!Array.isArray(parsed?.ranked)) {
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI response did not contain a "ranked" array.`);
  }

  // Never trust an AI-invented issueId not present in the input.
  const originalById = new Map((issues as IssueLike[]).map((i) => [i.issueId, i]));
  let ranked = parsed.ranked
    .filter((r) => knownIds.has(r.issueId))
    .map((r) => ({ ...(originalById.get(r.issueId) as object), score: r.score, rationale: r.rationale, warnings: r.warnings ?? [] }))
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  if (maxCandidates && maxCandidates > 0) {
    ranked = ranked.slice(0, maxCandidates);
  }

  return {
    status: 'success',
    outputs: {
      ranked,
      envelope: { advisory: true, requiresHumanReview: true, evidenceRefs: [], warnings: [] },
    },
    summary: `Ranked ${ranked.length} of ${issues.length} issue candidate(s)`,
  };
}
