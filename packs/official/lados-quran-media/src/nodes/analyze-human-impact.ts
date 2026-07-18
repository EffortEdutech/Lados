/**
 * lados.quran_media.analyze_human_impact — Phase C (real logic)
 *
 * Advisory separation of verified facts, human impact, uncertainty, and
 * sensitivity for the human-selected issue. Fails honestly without a
 * configured AI service. Prompt contract per Volume 2 §4.3.2.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput } from './stub-helpers';
import { runJsonCompletion, InvalidAiResponseError } from './ai-json-helper';
import { TRAGEDY_SENSITIVITY } from '../prompts/shared-guardrails';

const NODE = 'lados.quran_media.analyze_human_impact';

interface ImpactAnalysis {
  verifiedFacts: string[];
  humanImpact: string;
  uncertainties: string[];
  sensitivityFlags: string[];
}

const SYSTEM_PROMPT = `${TRAGEDY_SENSITIVITY}

Separate the selected issue into: verifiedFacts (only what the sources actually state), humanImpact (plain description, no speculation), uncertainties (what is not yet known/confirmed), sensitivityFlags (e.g. 'involves minors', 'involves death', 'politically contested'). You do not assign blame, cause, or divine meaning.

Return JSON only, matching exactly: { "verifiedFacts": string[], "humanImpact": string, "uncertainties": string[], "sensitivityFlags": string[] }`;

// Defense-in-depth: reject AI output that slips into causal/theological
// framing even though the prompt already forbids it (Volume 2 §4.3.2 unit test).
const FORBIDDEN_PATTERNS = [/hukuman/i, /balasan/i, /dihukum/i, /divine punishment/i, /god'?s wrath/i];

export async function analyzeHumanImpact(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const issue = inp['issue'];
  if (!issue || typeof issue !== 'object') {
    return missingInput(NODE, 'issue', 'connect the Gate 1 issue-selection human input');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }

  const cfg = ctx.config as Record<string, unknown>;
  const language = typeof cfg['language'] === 'string' ? (cfg['language'] as string) : 'ms';
  const userPrompt = `issue:\n${JSON.stringify(issue, null, 2)}\n\nlanguage: ${language}`;

  let impact: ImpactAnalysis;
  try {
    impact = await runJsonCompletion<ImpactAnalysis>(aiService, SYSTEM_PROMPT, userPrompt, { temperature: 0.2 });
  } catch (e: unknown) {
    if (e instanceof InvalidAiResponseError) return fail('INVALID_AI_RESPONSE', `${NODE}: ${e.message}`);
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI call failed — ${e instanceof Error ? e.message : String(e)}`);
  }

  const combinedText = `${impact.humanImpact ?? ''} ${(impact.verifiedFacts ?? []).join(' ')}`;
  const violated = FORBIDDEN_PATTERNS.find((re) => re.test(combinedText));
  if (violated) {
    return fail(
      'INVALID_AI_RESPONSE',
      `${NODE}: AI output contained causal/theological framing ("${violated.source}") — never permitted (Blueprint §13.1/§19 rules 8/9).`,
    );
  }

  return {
    status: 'success',
    outputs: {
      impact: {
        verifiedFacts: impact.verifiedFacts ?? [],
        humanImpact: impact.humanImpact ?? '',
        uncertainties: impact.uncertainties ?? [],
        sensitivityFlags: impact.sensitivityFlags ?? [],
        advisory: true,
        requiresHumanReview: true,
      },
    },
    summary: `Analyzed human impact — ${impact.sensitivityFlags?.length ?? 0} sensitivity flag(s)`,
  };
}
