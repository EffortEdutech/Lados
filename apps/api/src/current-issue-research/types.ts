/**
 * CurrentIssueResearchModule — internal config/data types.
 *
 * Public surface to the rest of the app is ICurrentIssueResearchService,
 * structurally matching @lados/official-quran-media's src/types.ts (never
 * imported directly here, to keep this module pack-agnostic — same
 * duck-typing convention as ReligiousSourceService/AiService).
 *
 * Source allowlist (Volume 1 §9.2 "source allowlists") is deliberately NOT
 * hardcoded here — which real RSS feeds count as "approved" is a content-
 * governance decision for eff, same class of decision as Blueprint §7.3's
 * QUL dataset selection. This module ships fully working against ANY
 * configured source (env CURRENT_ISSUE_RESEARCH_SOURCES) or test fixtures;
 * isConfigured is false (honest RESEARCH_SERVICE_NOT_CONFIGURED stub stays
 * live) until at least one source is actually approved and configured.
 */

/** One allowlisted RSS/Atom feed, from CURRENT_ISSUE_RESEARCH_SOURCES (JSON array). */
export interface ApprovedSourceConfig {
  id: string;
  name: string;
  feedUrl: string;
  /** Optional topic tags this source is pre-scoped to (matched against IssueCandidate.sources filtering by cfg.topics). */
  topics?: string[];
}

/** One <item>/<entry> parsed out of an RSS 2.0 or Atom feed, before date/dedup processing. */
export interface RawFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

/** Local structural mirror of @lados/official-quran-media's SourceProvenance. */
export interface SourceProvenance {
  provider: string;
  sourceUrl: string;
  retrievedAt: string;
}

/** Local structural mirror of @lados/official-quran-media's IssueCandidate. */
export interface IssueCandidate {
  issueId: string;
  headline: string;
  summary: string;
  publishedAt?: string;
  sources: SourceProvenance[];
}
