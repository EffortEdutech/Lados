/**
 * lados.quran_media.map_islamic_themes — Phase C (real logic)
 *
 * Advisory mapping of the analyzed issue to candidate Islamic themes used as
 * QUL topic/theme search input. Fails honestly without a configured AI
 * service. Prompt contract per Volume 2 §4.3.3.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput } from './stub-helpers';
import { runJsonCompletion, InvalidAiResponseError } from './ai-json-helper';
import { QURAN_REFERENCE_SAFETY } from '../prompts/shared-guardrails';

const NODE = 'lados.quran_media.map_islamic_themes';

interface ThemeItem {
  theme: string;
  rationale: string;
}

const SYSTEM_PROMPT = `${QURAN_REFERENCE_SAFETY}

From the impact analysis, propose up to maxThemes candidate Islamic themes (e.g. 'sabr/patience', 'rahmah/compassion', 'tawakkul/trust in Allah') that could frame a reflective — not causal — dakwah message. You are proposing search terms for a Quran topic/theme dataset, not asserting that any ayah applies to this event. Do not mention a surah name, ayah number, or any specific verse — themes only.

Return JSON only, matching exactly: { "themes": [{ "theme": string, "rationale": string }] }`;

// Defense-in-depth: reject a theme response that leaks a surah:ayah-style
// reference (Volume 2 §4.3.3 unit test) — this node proposes search terms,
// never a specific ayah.
const AYAH_REFERENCE_PATTERN = /\bsurah\b|\bayah\b|\b\d{1,3}\s*:\s*\d{1,3}\b/i;

export async function mapIslamicThemes(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const impact = inp['impact'];
  if (!impact || typeof impact !== 'object') {
    return missingInput(NODE, 'impact', 'connect analyze_human_impact');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }

  const cfg = ctx.config as Record<string, unknown>;
  const maxThemes = typeof cfg['maxThemes'] === 'number' ? (cfg['maxThemes'] as number) : 5;
  const userPrompt = `impact:\n${JSON.stringify(impact, null, 2)}\n\nmaxThemes: ${maxThemes}`;

  let parsed: { themes: ThemeItem[] };
  try {
    parsed = await runJsonCompletion<{ themes: ThemeItem[] }>(aiService, SYSTEM_PROMPT, userPrompt, { temperature: 0.3 });
  } catch (e: unknown) {
    if (e instanceof InvalidAiResponseError) return fail('INVALID_AI_RESPONSE', `${NODE}: ${e.message}`);
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI call failed — ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!Array.isArray(parsed?.themes)) {
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI response did not contain a "themes" array.`);
  }

  const leaked = parsed.themes.find((t) => AYAH_REFERENCE_PATTERN.test(t.theme) || AYAH_REFERENCE_PATTERN.test(t.rationale));
  if (leaked) {
    return fail(
      'INVALID_AI_RESPONSE',
      `${NODE}: AI response appears to reference a specific ayah ("${leaked.theme}") — this node must only propose themes, never a Quran reference (Blueprint §13.1).`,
    );
  }

  const themes = parsed.themes.slice(0, maxThemes);

  return {
    status: 'success',
    outputs: {
      themes,
      envelope: { advisory: true, requiresHumanReview: true, evidenceRefs: [], warnings: [] },
    },
    summary: `Mapped ${themes.length} candidate Islamic theme(s)`,
  };
}
