/**
 * lados.quran_media.validate_dakwah_content — STUB (real logic: Phase C)
 *
 * Detects evidence, religious-safety, editorial, and sensitivity risks in the
 * drafted script and emits the validation contract (types.ts
 * DakwahValidationResult). Passing validation does not constitute religious
 * approval. Fails honestly without a configured AI service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.validate_dakwah_content';

export async function validateDakwahContent(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  if (!inp['script'] || typeof inp['script'] !== 'object') {
    return missingInput(NODE, 'script', 'connect write_short_video_script');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }
  return notImplemented(NODE, 'Phase C (AI editorial nodes — deterministic checks + advisory AI review)');
}
