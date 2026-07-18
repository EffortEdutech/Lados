/**
 * Allowlist-aware wrapper over rss-source.adapter.ts. Owns:
 *  - which feed URLs may be fetched at all (the configured ApprovedSourceConfig[] —
 *    never a URL the caller passes in ad hoc);
 *  - rate limiting (per-source minimum interval between real fetches — a
 *    request within the window is served from the process-lifetime cache,
 *    same caching philosophy as religious-source's dataset-loader.ts);
 *  - topic pre-filtering at the source level, before any items are fetched.
 *
 * A single source's fetch failure is non-fatal here — it's recorded and
 * skipped so the other configured sources still contribute candidates
 * (Volume 1 §9.2 "source failure handling"); current-issue-research.service.ts
 * decides whether an all-sources failure should propagate as
 * SOURCE_FETCH_FAILED.
 */
import type { ApprovedSourceConfig, RawFeedItem } from '../types';
import { fetchAndParseFeed, type FetchFeedOptions } from './rss-source.adapter';
import { CurrentIssueResearchError } from '../errors';

export interface SourceFetchResult {
  source: ApprovedSourceConfig;
  items: RawFeedItem[];
  fetchError?: CurrentIssueResearchError;
}

export interface RateLimitOptions extends FetchFeedOptions {
  minIntervalMs: number;
}

interface CacheEntry {
  fetchedAt: number;
  items: RawFeedItem[];
}

export class ApprovedNewsSourceAdapter {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly sources: readonly ApprovedSourceConfig[],
    private readonly opts: RateLimitOptions,
  ) {}

  private sourcesForTopics(topics?: string[]): ApprovedSourceConfig[] {
    if (!topics || topics.length === 0) return [...this.sources];
    const requested = topics.map((t) => t.toLowerCase());
    return this.sources.filter((s) => !s.topics || s.topics.length === 0 || s.topics.some((t) => requested.includes(t.toLowerCase())));
  }

  async fetchAll(topics?: string[]): Promise<SourceFetchResult[]> {
    const candidates = this.sourcesForTopics(topics);
    const results: SourceFetchResult[] = [];

    for (const source of candidates) {
      const cached = this.cache.get(source.feedUrl);
      const isFresh = cached && Date.now() - cached.fetchedAt < this.opts.minIntervalMs;
      if (isFresh && cached) {
        results.push({ source, items: cached.items });
        continue;
      }
      try {
        const items = await fetchAndParseFeed(source.feedUrl, { timeoutMs: this.opts.timeoutMs, maxRetries: this.opts.maxRetries });
        this.cache.set(source.feedUrl, { fetchedAt: Date.now(), items });
        results.push({ source, items });
      } catch (e: unknown) {
        const fetchError =
          e instanceof CurrentIssueResearchError ? e : new CurrentIssueResearchError('SOURCE_FETCH_FAILED', String(e));
        results.push({ source, items: [], fetchError });
      }
    }

    return results;
  }

  /** Test-only: clears the in-memory rate-limit cache so specs can point at fresh fixtures. */
  __clearCacheForTests(): void {
    this.cache.clear();
  }
}
