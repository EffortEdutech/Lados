/**
 * CurrentIssueResearchService — Phase D.
 *
 * Structurally satisfies @lados/official-quran-media's
 * ICurrentIssueResearchService (duck typing, same convention as
 * AiService/ReligiousSourceService — never imports the pack's interfaces
 * nominally). Owns date normalization, duplicate detection, and provenance
 * on top of ApprovedNewsSourceAdapter's allowlisted fetches (Volume 1 §9.2).
 *
 * `isConfigured` mirrors ReligiousSourceService.isConfigured's pattern
 * exactly — gates whether real-nodes/index.ts passes this service to the
 * pack at all. False until CURRENT_ISSUE_RESEARCH_SOURCES actually names at
 * least one approved feed (Blueprint's source-allowlist is a content-
 * governance decision, not something this module invents a default for —
 * same posture as QUL dataset selection in religious-source.service.ts).
 */
import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApprovedNewsSourceAdapter } from './adapters/approved-news-source.adapter';
import { CurrentIssueResearchError, CIR_ERROR } from './errors';
import type { ApprovedSourceConfig, IssueCandidate, RawFeedItem, SourceProvenance } from './types';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_MIN_INTERVAL_MS = 60_000;

function parseSourcesConfig(raw: string | undefined, logger: Logger): ApprovedSourceConfig[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn('CURRENT_ISSUE_RESEARCH_SOURCES is not a JSON array — ignoring.');
      return [];
    }
    return parsed.filter(
      (s): s is ApprovedSourceConfig =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as Record<string, unknown>)['id'] === 'string' &&
        typeof (s as Record<string, unknown>)['name'] === 'string' &&
        typeof (s as Record<string, unknown>)['feedUrl'] === 'string',
    );
  } catch (e: unknown) {
    logger.warn(`CURRENT_ISSUE_RESEARCH_SOURCES is not valid JSON — ignoring. ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

function normalizeForDedup(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLink(link: string): string {
  return link.trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\//, '');
}

function issueIdFor(link: string): string {
  return `issue-${createHash('sha256').update(link, 'utf8').digest('hex').slice(0, 12)}`;
}

@Injectable()
export class CurrentIssueResearchService {
  private readonly logger = new Logger(CurrentIssueResearchService.name);
  private readonly sources: ApprovedSourceConfig[];
  private readonly adapter: ApprovedNewsSourceAdapter;

  constructor(private readonly config: ConfigService) {
    this.sources = parseSourcesConfig(this.config.get<string>('CURRENT_ISSUE_RESEARCH_SOURCES'), this.logger);
    const timeoutMs = this.config.get<number>('CURRENT_ISSUE_RESEARCH_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = this.config.get<number>('CURRENT_ISSUE_RESEARCH_MAX_RETRIES') ?? DEFAULT_MAX_RETRIES;
    const minIntervalMs = this.config.get<number>('CURRENT_ISSUE_RESEARCH_MIN_INTERVAL_MS') ?? DEFAULT_MIN_INTERVAL_MS;
    this.adapter = new ApprovedNewsSourceAdapter(this.sources, { timeoutMs, maxRetries, minIntervalMs });

    if (this.sources.length > 0) {
      this.logger.log(`CurrentIssueResearchService: ${this.sources.length} approved source(s) configured.`);
    } else {
      this.logger.warn(
        'CurrentIssueResearchService: no CURRENT_ISSUE_RESEARCH_SOURCES configured — discover_current_issues will use the honest RESEARCH_SERVICE_NOT_CONFIGURED stub path.',
      );
    }
  }

  /** Whether at least one approved source is configured (gates discover_current_issues, mirrors ReligiousSourceService.isConfigured). */
  get isConfigured(): boolean {
    return this.sources.length > 0;
  }

  // ── ICurrentIssueResearchService surface ────────────────────────────────────

  async discoverIssues(input: { topics?: string[]; sinceHours?: number; limit?: number }): Promise<IssueCandidate[]> {
    if (!this.isConfigured) {
      throw new CurrentIssueResearchError(CIR_ERROR.SOURCE_FETCH_FAILED, 'No approved sources configured.');
    }

    const results = await this.adapter.fetchAll(input.topics);
    const succeeded = results.filter((r) => !r.fetchError);
    if (succeeded.length === 0 && results.length > 0) {
      const messages = results.map((r) => r.fetchError?.message).filter(Boolean);
      throw new CurrentIssueResearchError(
        CIR_ERROR.SOURCE_FETCH_FAILED,
        `All ${results.length} configured source(s) failed: ${messages.join('; ')}`,
      );
    }
    for (const r of results) {
      if (r.fetchError) {
        this.logger.warn(`discoverIssues: source "${r.source.name}" failed, skipping (non-fatal): ${r.fetchError.message}`);
      }
    }

    const retrievedAt = new Date().toISOString();
    let totalItems = 0;
    let parsedDateCount = 0;
    const seenLinks = new Set<string>();
    const seenHeadlines = new Set<string>();
    const candidates: IssueCandidate[] = [];

    for (const { source, items } of succeeded) {
      for (const item of items) {
        totalItems++;
        const linkKey = normalizeLink(item.link);
        const headlineKey = normalizeForDedup(item.title);
        if (seenLinks.has(linkKey) || seenHeadlines.has(headlineKey)) continue;

        const publishedAt = normalizeDate(item.pubDate);
        if (publishedAt) parsedDateCount++;

        if (typeof input.sinceHours === 'number') {
          if (!publishedAt) continue; // can't confirm recency — exclude rather than guess
          const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
          if (ageHours > input.sinceHours) continue;
        }

        seenLinks.add(linkKey);
        seenHeadlines.add(headlineKey);

        const provenance: SourceProvenance = { provider: source.name, sourceUrl: item.link, retrievedAt };
        candidates.push({
          issueId: issueIdFor(item.link),
          headline: item.title,
          summary: (item.description ?? item.title).slice(0, 500),
          ...(publishedAt ? { publishedAt } : {}),
          sources: [provenance],
        });
      }
    }

    // Volume 1 §9.2 "date normalization" — if the caller needs recency
    // filtering and literally none of the fetched items had a parseable
    // date, sinceHours can't be honored honestly; a silently-empty result
    // would be indistinguishable from "no recent issues exist". Only raised
    // when there was real data to work with (totalItems > 0) — an empty
    // feed is NO_CURRENT_ISSUES_FOUND territory (the node's own check), not
    // a date problem.
    if (typeof input.sinceHours === 'number' && totalItems > 0 && parsedDateCount === 0) {
      throw new CurrentIssueResearchError(
        CIR_ERROR.SOURCE_DATE_INVALID,
        `sinceHours=${input.sinceHours} was requested but no item across ${succeeded.length} source(s) had a parseable publish date.`,
      );
    }

    candidates.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
    const limit = input.limit ?? 10;
    return candidates.slice(0, limit);
  }
}

function normalizeDate(pubDate: string | undefined): string | undefined {
  if (!pubDate) return undefined;
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export type { RawFeedItem };
