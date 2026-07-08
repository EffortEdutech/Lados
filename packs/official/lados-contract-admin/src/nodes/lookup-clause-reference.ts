/**
 * lados.contract.lookup_clause_reference — Phase 21 S6.1 (remaining Wave 4)
 *
 * Deterministic, stateless keyword match — NOT an AI/LLM call and NOT a
 * real Knowledge Pack search integration (no such search infrastructure
 * exists in this repo yet — an honest limitation, same "no fabricated
 * capability" discipline as S6's classify_trade). Matches `query` against
 * an optionally supplied candidate clause list (`inputs.availableClauses`,
 * typically pulled from a Knowledge Pack elsewhere in the graph); if no
 * candidate list is supplied, returns an empty result flagged
 * `NO_CLAUSE_SOURCE_SUPPLIED` rather than fabricating a match.
 *
 * Returns references only; interpretation and legal effect require human
 * review — this node never interprets a clause's legal effect.
 *
 * Config/Inputs:
 *   query (input or config) — required
 *   contractPack — optional Knowledge Pack ref pass-through
 *   maxResults — default 5
 *   availableClauses (input) — optional array of { clauseRef, text }
 *
 * Outputs:
 *   clauses — array of { clauseRef, text, score }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface ClauseCandidate {
  clauseRef: string;
  text: string;
}

export async function lookupClauseReference(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const query = ((inp['query'] as string | undefined) ?? (cfg['query'] as string | undefined))?.trim();
  const contractPack = cfg['contractPack'] as unknown;
  const maxResults = (cfg['maxResults'] as number | undefined) ?? 5;
  const availableClauses = (inp['availableClauses'] as ClauseCandidate[] | undefined) ?? [];

  if (!query) {
    return {
      status: 'failure',
      outputs: { clauses: [] },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.lookup_clause_reference: query is required' },
    };
  }

  if (availableClauses.length === 0) {
    ctx.logger.warn('lados.contract.lookup_clause_reference: no availableClauses supplied — returning empty result rather than fabricating a match');
    return {
      status: 'success',
      outputs: { clauses: [] },
      summary: 'No clause source supplied — returning empty result (advisory, no fabricated match)',
      logs: ['NO_CLAUSE_SOURCE_SUPPLIED'],
    };
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = availableClauses
    .map((c) => {
      const text = c.text.toLowerCase();
      const matches = queryTerms.filter((t) => text.includes(t)).length;
      const score = queryTerms.length > 0 ? matches / queryTerms.length : 0;
      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  ctx.logger.info(`lados.contract.lookup_clause_reference → "${query}" matched ${scored.length} clause(s) from ${availableClauses.length} candidate(s)${contractPack ? ' (contractPack referenced)' : ''}`);

  return {
    status: 'success',
    outputs: { clauses: scored },
    summary: `Found ${scored.length} candidate clause(s) for "${query}" (advisory — interpretation requires human review)`,
  };
}
