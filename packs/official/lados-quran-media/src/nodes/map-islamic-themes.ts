/**
 * lados.quran_media.map_islamic_themes — STUB (real logic: Phase C)
 *
 * Advisory mapping of the analyzed issue to candidate Islamic themes used as
 * QUL topic/theme search input. Fails honestly without a configured AI service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.map_islamic_themes';

export async function mapIslamicThemes(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  if (!inp['impact'] || typeof inp['impact'] !== 'object') {
    return missingInput(NODE, 'impact', 'connect analyze_human_impact');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }
  return notImplemented(NODE, 'Phase C (AI editorial nodes)');
}
