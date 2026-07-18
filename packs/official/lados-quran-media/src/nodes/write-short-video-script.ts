/**
 * lados.quran_media.write_short_video_script — Phase C (real logic)
 *
 * Turns the reviewed reflection into a short-form video script per the
 * ShortVideoScript contract. Fails honestly without a configured AI
 * service. Prompt contract per Volume 2 §4.3.5.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService, ShortVideoScript } from '../types';
import { fail, missingInput } from './stub-helpers';
import { runJsonCompletion, InvalidAiResponseError } from './ai-json-helper';
import { TRAGEDY_SENSITIVITY } from '../prompts/shared-guardrails';

const NODE = 'lados.quran_media.write_short_video_script';

interface ReflectionLike {
  text: string;
  evidenceRefs: string[];
}

function systemPrompt(durationSeconds: number): string {
  return `${TRAGEDY_SENSITIVITY}

Turn the reflection into a short-video script of exactly ${durationSeconds} seconds: a hook (first 3-5s), timed scenes (each with visualIntent, voiceover, onScreenText, emotion, and evidenceRefs carried over from the reflection's evidenceRefs — every scene must include at least one), a caption, a callToAction inviting reflection (not a hard sell), and a sourceAppendix listing every evidence source by name. No graphic imagery instructions. Scene startSecond/endSecond must be sequential, non-overlapping, and sum to exactly ${durationSeconds} seconds.

Return JSON only, matching exactly the ShortVideoScript shape: { "title": string, "durationSeconds": number, "hook": string, "scenes": [{ "sceneNumber": number, "startSecond": number, "endSecond": number, "visualIntent": string, "voiceover": string, "onScreenText": string, "emotion": string, "evidenceRefs": string[] }], "caption": string, "callToAction": string, "sourceAppendix": string[] }`;
}

export async function writeShortVideoScript(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const reflection = inp['reflection'] as ReflectionLike | undefined;
  if (!reflection || typeof reflection !== 'object') {
    return missingInput(NODE, 'reflection', 'connect compose_reflection');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }

  const cfg = ctx.config as Record<string, unknown>;
  const durationSeconds = typeof cfg['durationSeconds'] === 'number' ? (cfg['durationSeconds'] as number) : 45;
  const language = typeof cfg['language'] === 'string' ? (cfg['language'] as string) : 'ms';
  const userPrompt = `reflection:\n${JSON.stringify(reflection, null, 2)}\n\ndurationSeconds: ${durationSeconds}\nlanguage: ${language}`;

  let script: ShortVideoScript;
  try {
    script = await runJsonCompletion<ShortVideoScript>(aiService, systemPrompt(durationSeconds), userPrompt, { temperature: 0.4 });
  } catch (e: unknown) {
    if (e instanceof InvalidAiResponseError) return fail('INVALID_AI_RESPONSE', `${NODE}: ${e.message}`);
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI call failed — ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!Array.isArray(script?.scenes) || script.scenes.length === 0) {
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI response did not contain any scenes.`);
  }

  // Structural check: every scene must carry at least one evidence ref —
  // a scene with none is a structural defect, not just an editorial one
  // (Volume 2 §4.3.5).
  const emptyScene = script.scenes.find((s) => !Array.isArray(s.evidenceRefs) || s.evidenceRefs.length === 0);
  if (emptyScene) {
    return fail(
      'EVIDENCE_BUNDLE_INVALID',
      `${NODE}: scene ${emptyScene.sceneNumber} has no evidenceRefs — every scene must be grounded in evidence.`,
    );
  }

  // Timing sanity check (one repair already happened inside runJsonCompletion
  // for JSON validity; a timing mismatch is a content defect, not a JSON
  // defect, so it fails rather than triggering a second AI round-trip —
  // Volume 2 §10 open decision, revisit if this proves too strict in practice).
  const totalSeconds = script.scenes.reduce((max, s) => Math.max(max, s.endSecond), 0);
  if (Math.abs(totalSeconds - durationSeconds) > 2) {
    return fail(
      'INVALID_AI_RESPONSE',
      `${NODE}: scene timings sum to ~${totalSeconds}s, expected ${durationSeconds}s (±2s tolerance).`,
    );
  }

  const knownRefs = new Set(reflection.evidenceRefs ?? []);
  const sourceAppendix = script.sourceAppendix?.length ? script.sourceAppendix : Array.from(knownRefs);

  return {
    status: 'success',
    outputs: {
      script: { ...script, sourceAppendix },
      envelope: { advisory: true, requiresHumanReview: true, evidenceRefs: Array.from(knownRefs), warnings: [] },
    },
    summary: `Wrote a ${durationSeconds}s script with ${script.scenes.length} scene(s), all evidence-grounded`,
  };
}
