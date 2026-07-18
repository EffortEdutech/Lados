/**
 * lados.quran_media.prepare_media_brief — Phase C (real logic)
 *
 * Packages the human-approved script into a production handoff for
 * lados.video-production: sceneIntent, visualRestrictions, voiceDirection,
 * a subtitle package, and an evidence appendix. Fails honestly without a
 * configured AI service. Prompt contract per Volume 2 §4.3.7. The approved
 * script is copied through unmodified — never paraphrased.
 *
 * Gate 3 enforcement note: unlike compose_reflection's bundle.religiousReview
 * .status check, ShortVideoScript (the frozen Phase A port contract) carries
 * no "approved" field this node could check deterministically — Gate 3 is
 * enforced by graph wiring today (templates/README.md: validation is wired
 * in purely as an execution-order dependency, gated by
 * lados.human.request_approval upstream). EDITORIAL_APPROVAL_REQUIRED stays
 * catalogued (Volume 2 §5) for a future revision that threads an approval
 * marker through the port contract without breaking existing workflows.
 *
 * Phase E addition: also outputs `scriptText`/`title` as their own flat
 * ports (alongside `brief`) so the Video Production handoff
 * (lados.video.read_script) can be wired for real — it takes a flat string,
 * not the structured `brief` object. `scriptText` is the approved script's
 * own hook/scene-voiceover/callToAction text concatenated in order — never
 * paraphrased or regenerated, same "copied through unmodified" rule as
 * brief.approvedScript.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService, ShortVideoScript } from '../types';
import { fail, missingInput } from './stub-helpers';
import { runJsonCompletion, InvalidAiResponseError } from './ai-json-helper';
import { TRAGEDY_SENSITIVITY } from '../prompts/shared-guardrails';

const NODE = 'lados.quran_media.prepare_media_brief';

const HARD_CODED_VISUAL_RESTRICTIONS = ['no graphic imagery', 'no identifiable vulnerable persons'];

interface BriefAiResult {
  sceneIntent: Array<{ sceneNumber: number; intent: string }>;
  voiceDirection: string;
  additionalVisualRestrictions?: string[];
}

const SYSTEM_PROMPT = `${TRAGEDY_SENSITIVITY}

Package the approved script into a production handoff: sceneIntent per scene (derived from visualIntent+emotion), voiceDirection notes, and any additionalVisualRestrictions beyond the standard set. You do not render video, choose music, or publish.

Return JSON only, matching exactly: { "sceneIntent": [{ "sceneNumber": number, "intent": string }], "voiceDirection": string, "additionalVisualRestrictions": string[] }`;

export async function prepareMediaBrief(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const script = inp['script'] as ShortVideoScript | undefined;
  if (!script || typeof script !== 'object') {
    return missingInput(NODE, 'script', "connect the human-approved write_short_video_script output");
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }

  const cfg = ctx.config as Record<string, unknown>;
  const configVisualRestrictions =
    typeof cfg['visualRestrictions'] === 'string' && cfg['visualRestrictions'].trim()
      ? [cfg['visualRestrictions'] as string]
      : [];
  const configVoiceDirection = typeof cfg['voiceDirection'] === 'string' ? (cfg['voiceDirection'] as string) : '';

  const userPrompt = `script:\n${JSON.stringify(script, null, 2)}\n\nconfigVisualRestrictions: ${JSON.stringify(configVisualRestrictions)}\nconfigVoiceDirection: ${configVoiceDirection}`;

  let ai: BriefAiResult;
  try {
    ai = await runJsonCompletion<BriefAiResult>(aiService, SYSTEM_PROMPT, userPrompt, { temperature: 0.2 });
  } catch (e: unknown) {
    if (e instanceof InvalidAiResponseError) return fail('INVALID_AI_RESPONSE', `${NODE}: ${e.message}`);
    return fail('INVALID_AI_RESPONSE', `${NODE}: AI call failed — ${e instanceof Error ? e.message : String(e)}`);
  }

  // Hard-coded restrictions are always present even if the AI response omits
  // them (Volume 2 §4.3.7 unit test).
  const visualRestrictions = Array.from(
    new Set([...HARD_CODED_VISUAL_RESTRICTIONS, ...configVisualRestrictions, ...(ai.additionalVisualRestrictions ?? [])]),
  );

  const subtitlePackage = script.scenes.map((s) => ({
    startSecond: s.startSecond,
    endSecond: s.endSecond,
    text: s.voiceover,
  }));

  const evidenceAppendix = script.sourceAppendix ?? [];

  const brief = {
    approvedScript: script, // copied through unmodified — never paraphrased
    sceneIntent: ai.sceneIntent ?? script.scenes.map((s) => ({ sceneNumber: s.sceneNumber, intent: `${s.visualIntent} (${s.emotion})` })),
    visualRestrictions,
    voiceDirection: ai.voiceDirection || configVoiceDirection,
    subtitlePackage,
    evidenceAppendix,
    advisory: true,
    requiresHumanReview: true,
  };

  // Video Production handoff (Phase E): flatten the approved script's own
  // text into a single string for lados.video.read_script, which takes
  // scriptText/title rather than a structured object. Order matches how the
  // script reads aloud: hook, then each scene's voiceover by sceneNumber,
  // then the call to action. Never regenerated — the exact approved words.
  const orderedVoiceover = [...script.scenes]
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((s) => s.voiceover)
    .join('\n\n');
  const scriptText = [script.hook, orderedVoiceover, script.callToAction].filter(Boolean).join('\n\n');

  return {
    status: 'success',
    outputs: { brief, scriptText, title: script.title },
    summary: `Prepared media brief: ${subtitlePackage.length} subtitle segment(s), ${visualRestrictions.length} visual restriction(s)`,
  };
}
