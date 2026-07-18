/**
 * lados.quran_media.rank_issue_candidates — STUB (real logic: Phase C)
 *
 * Advisory AI ranking of discovered issues for dakwah suitability. Fails
 * honestly without a configured AI service; the ranking prompt contract is
 * defined in QMCP Volume 2 (Phase C).
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.rank_issue_candidates';

export async function rankIssueCandidates(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const issues = inp['issues'];
  if (!Array.isArray(issues) || issues.length === 0) {
    return missingInput(NODE, 'issues', 'connect discover_current_issues');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }
  return notImplemented(NODE, 'Phase C (AI editorial nodes)');
}
