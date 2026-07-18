/**
 * lados.quran_media.write_short_video_script — STUB (real logic: Phase C)
 *
 * Produces a short-form video script per the script contract (types.ts
 * ShortVideoScript): hook, timed scenes with evidence refs, caption, call to
 * action, and source appendix. Output requires human review. Fails honestly
 * without a configured AI service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.write_short_video_script';

export async function writeShortVideoScript(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  if (!inp['reflection'] || typeof inp['reflection'] !== 'object') {
    return missingInput(NODE, 'reflection', 'connect compose_reflection');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }
  return notImplemented(NODE, 'Phase C (AI editorial nodes)');
}
