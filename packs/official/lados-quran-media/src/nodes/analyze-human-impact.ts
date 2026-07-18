/**
 * lados.quran_media.analyze_human_impact — STUB (real logic: Phase C)
 *
 * Advisory separation of verified facts, human impact, uncertainty, and
 * sensitivity for the human-selected issue. Fails honestly without a
 * configured AI service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.analyze_human_impact';

export async function analyzeHumanImpact(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  if (!inp['issue'] || typeof inp['issue'] !== 'object') {
    return missingInput(NODE, 'issue', 'connect the Gate 1 issue-selection human input');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }
  return notImplemented(NODE, 'Phase C (AI editorial nodes)');
}
