/**
 * lados.quran_media.prepare_media_brief — STUB (real logic: Phase C)
 *
 * Prepares the production handoff for lados.video-production: approved
 * script, scene intent, visual restrictions, voice direction, subtitle
 * package, and evidence appendix. QMCP does not render, edit, or publish
 * (Blueprint §20). Fails honestly without a configured AI service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.prepare_media_brief';

export async function prepareMediaBrief(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  if (!inp['script'] || typeof inp['script'] !== 'object') {
    return missingInput(NODE, 'script', 'connect the human-approved write_short_video_script output');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }
  return notImplemented(NODE, 'Phase C (AI editorial nodes)');
}
