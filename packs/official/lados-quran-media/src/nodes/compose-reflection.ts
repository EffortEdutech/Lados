/**
 * lados.quran_media.compose_reflection — Phase C (real logic)
 *
 * Creates an evidence-grounded reflective dakwah passage from the
 * human-confirmed evidence bundle, in the reflective register (see
 * prompts/shared-guardrails.ts). Fails honestly without a configured AI
 * service. CRITICAL: this is the code-level enforcement point for Gate 2 —
 * a bundle whose religiousReview.status is not "approved" is refused here,
 * not just by graph wiring (Volume 2 §4.3.4 step 3, §6, §7 "critical" test).
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService, EvidenceBundle } from '../types';
import { fail, missingInput } from './stub-helpers';
import { runJsonCompletion, InvalidAiResponseError } from './ai-json-helper';
import { QURAN_REFERENCE_SAFETY, TAFSIR_CONTEXT_SAFETY, TRAGEDY_SENSITIVITY, REFLECTIVE_DAKWAH_REGISTER } from '../prompts/shared-guardrails';
import { validateEvidenceRefsResolve, knownEvidenceIds } from '../validators/quran-citation.validator';

const NODE = 'lados.quran_media.compose_reflection';

interface ReflectionResult {
  text: string;
  evidenceRefs: string[];
  warnings: string[];
}

const SYSTEM_PROMPT = `${QURAN_REFERENCE_SAFETY}

${TAFSIR_CONTEXT_SAFETY}

${TRAGEDY_SENSITIVITY}

Write a short reflective passage (150-250 words) grounded ONLY in the supplied evidence bundle. Use register like: ${REFLECTIVE_DAKWAH_REGISTER.preferred.join(' / ')}. Never use phrasing like: ${REFLECTIVE_DAKWAH_REGISTER.avoid.join(' / ')} or any framing with that pattern (blame, punishment, forced consensus). Cite every claim back to an evidenceId from the bundle. Do not summarize tafsir as if it were your own interpretation — attribute it by source name.

Return JSON only, matching exactly: { "text": string, "evidenceRefs": string[], "warnings": string[] }`;

export async function composeReflection(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const bundle = inp['bundle'] as EvidenceBundle | undefined;
  if (!bundle || typeof bundle !== 'object') {
    return missingInput(NODE, 'bundle', 'connect build_evidence_bundle via the Gate 2 religious review');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }

  // CRITICAL GATE 2 ENFORCEMENT — do not remove or weaken this check even if
  // the graph wiring already routes through a human-review node; this is the
  // actual safety boundary, not a UI convention (Volume 2 §4.3.4 step 3).
  if (bundle.religiousReview?.status !== 'approved') {
    return fail(
      'RELIGIOUS_REVIEW_REQUIRED',
      `${NODE}: bundle.religiousReview.status is "${bundle.religiousReview?.status ?? 'unknown'}", not "approved". A reflection may only be composed from a bundle a human religious reviewer has confirmed at Gate 2.`,
    );
  }

  const cfg = ctx.config as Record<string, unknown>;
  const language = typeof cfg['language'] === 'string' ? (cfg['language'] as string) : 'ms';
  const tone = typeof cfg['tone'] === 'string' ? (cfg['tone'] as string) : '';
  const userPrompt = `bundle:\n${JSON.stringify(bundle, null, 2)}\n\nlanguage: ${language}\ntone: ${tone}`;

  let reflection: ReflectionResult;
  try {
    reflection = await runJsonCompletion<ReflectionResult>(aiService, SYSTEM_PROMPT, userPrompt, { temperature: 0.5 });
  } catch (e: unknown) {
    if (e instanceof InvalidAiResponseError) return fail('INVALID_AI_RESPONSE', `${NODE}: ${e.message}`);
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI call failed — ${e instanceof Error ? e.message : String(e)}`);
  }

  // Hallucination guard — every cited evidenceId must resolve.
  const citationCheck = validateEvidenceRefsResolve(reflection.evidenceRefs ?? [], bundle);
  if (!citationCheck.valid) {
    return fail(
      'EVIDENCE_BUNDLE_INVALID',
      `${NODE}: reflection cites evidenceRef(s) not present in the bundle: ${citationCheck.unresolvedRefs.join(', ')}. Known ids: ${knownEvidenceIds(bundle).join(', ')}.`,
    );
  }

  // Defense-in-depth: reject output containing avoid-register phrasing even
  // though the prompt already forbids it.
  const lowerText = (reflection.text ?? '').toLowerCase();
  const matchedAvoid = REFLECTIVE_DAKWAH_REGISTER.avoid.find((phrase) => lowerText.includes(phrase.toLowerCase().replace(/\.\.\.$/, '')));
  if (matchedAvoid) {
    return fail('INVALID_AI_RESPONSE', `${NODE}: reflection text contains prohibited framing ("${matchedAvoid}").`);
  }

  return {
    status: 'success',
    outputs: {
      reflection: {
        text: reflection.text ?? '',
        evidenceRefs: reflection.evidenceRefs ?? [],
        warnings: reflection.warnings ?? [],
        advisory: true,
        requiresHumanReview: true,
      },
    },
    summary: `Composed reflection grounded in ${reflection.evidenceRefs?.length ?? 0} evidence reference(s)`,
  };
}
