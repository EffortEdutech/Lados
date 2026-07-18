/**
 * lados.quran_media.discover_current_issues — Phase D (real logic)
 *
 * Retrieves and normalizes current issues from approved sources via the
 * Current Issue Research Service (apps/api/src/current-issue-research/).
 * Deterministic retrieval only — no prompt contract, no AI involvement; the
 * service owns outbound HTTP, source allowlists, rate limiting, timeout and
 * retry, date normalization, provenance, and duplicate detection (Volume 1
 * §9.2). This node never makes unmanaged HTTP calls itself.
 *
 * Fails honestly with RESEARCH_SERVICE_NOT_CONFIGURED when no service is
 * wired, or when the service is wired but no approved source is actually
 * configured (CurrentIssueResearchService.isConfigured gates that — see
 * real-nodes/index.ts) — this node is never passed an unconfigured service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICurrentIssueResearchService } from '../types';
import { fail, failFromError } from './stub-helpers';

const NODE = 'lados.quran_media.discover_current_issues';

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
      `${NODE}: no Current Issue Research Service configured — this node cannot fetch news sources and will not make unmanaged HTTP calls.`,
    );
    return fail(
      'RESEARCH_SERVICE_NOT_CONFIGURED',
      'The Current Issue Research Service (apps/api/src/current-issue-research/) is not configured — either it is not wired, or no approved source is registered yet (Blueprint §9.2 source allowlist is a content-governance decision, not an engineering default).',
    );
  }

  let issues: Awaited<ReturnType<ICurrentIssueResearchService['discoverIssues']>>;
  try {
    issues = await researchService.discoverIssues({ topics, sinceHours, limit });
  } catch (e: unknown) {
    // Volume 2 §4.1.1 step 5: the service owns retry/timeout/allowlist/date-
    // normalization — if it throws, map to SOURCE_FETCH_FAILED unless the
    // service tagged a more specific code (e.g. SOURCE_DATE_INVALID) via .code.
    return failFromError('SOURCE_FETCH_FAILED', e);
  }

  if (issues.length === 0) {
    return fail('NO_CURRENT_ISSUES_FOUND', 'No current issues matched the configured sources and filters.');
  }

  return {
    status: 'success',
    outputs: { issues },
    summary: `Discovered ${issues.length} issue candidate(s) from approved sources`,
  };
}
