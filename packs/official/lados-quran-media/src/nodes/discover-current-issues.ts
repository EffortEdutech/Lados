/**
 * lados.quran_media.discover_current_issues — STUB (real logic: Phase D)
 *
 * Retrieves and normalizes current issues from approved sources via the
 * Current Issue Research Service. The service does not exist yet
 * (apps/api/src/current-issue-research/ is Phase D), so without it this node
 * fails honestly with RESEARCH_SERVICE_NOT_CONFIGURED. Pack nodes must not
 * make unmanaged direct HTTP calls (Blueprint §9.2).
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICurrentIssueResearchService } from '../types';
import { fail } from './stub-helpers';

export async function discoverCurrentIssues(
  ctx: NodeContext,
  researchService?: ICurrentIssueResearchService,
): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const topics = Array.isArray(cfg['topics']) ? (cfg['topics'] as string[]) : undefined;
  const sinceHours = typeof cfg['sinceHours'] === 'number' ? (cfg['sinceHours'] as number) : undefined;
  const limit = typeof cfg['limit'] === 'number' ? (cfg['limit'] as number) : 10;

  if (!researchService) {
    ctx.logger.warn(
      'lados.quran_media.discover_current_issues: no Current Issue Research Service configured — this node cannot fetch news sources and will not make unmanaged HTTP calls.',
    );
    return fail(
      'RESEARCH_SERVICE_NOT_CONFIGURED',
      'The Current Issue Research Service (apps/api/src/current-issue-research/) is not wired yet — Phase D of the QMCP delivery plan.',
    );
  }

  const issues = await researchService.discoverIssues({ topics, sinceHours, limit });
  if (issues.length === 0) {
    return fail('NO_CURRENT_ISSUES_FOUND', 'No current issues matched the configured sources and filters.');
  }

  return {
    status: 'success',
    outputs: { issues },
    summary: `Discovered ${issues.length} issue candidate(s) from approved sources`,
  };
}
