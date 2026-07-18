/**
 * Low-level RSS 2.0 / Atom feed fetch + parse. Owns outbound HTTP (timeout +
 * retry) for exactly one feed URL — knows nothing about allowlists, rate
 * limiting across sources, or topic filtering (that's
 * approved-news-source.adapter.ts). Volume 1 §9.2: "Pack nodes must not make
 * unmanaged direct HTTP calls" — this is the one place in the whole QMCP
 * stack that calls fetch(), and only for URLs the caller has already
 * allowlisted.
 *
 * Deliberately dependency-free (regex-based tag extraction, not a full XML
 * parser) — matches the codebase's existing "honest, limited-scope, no
 * fabricated capability" pattern (e.g. lookup_clause_reference's keyword
 * match instead of a fake KP search integration). Handles the common
 * well-formed RSS 2.0 <item> and Atom <entry> shapes; a feed that doesn't
 * match either produces zero items rather than throwing — SOURCE_FETCH_FAILED
 * is reserved for actual network/HTTP failures, not "this feed's dialect
 * wasn't recognized," so a bad feed degrades to "no candidates from this
 * source" rather than aborting the whole discoverIssues() call.
 */
import type { RawFeedItem } from '../types';
import { CurrentIssueResearchError, CIR_ERROR } from '../errors';

export interface FetchFeedOptions {
  timeoutMs: number;
  maxRetries: number;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .trim();
}

function stripCdataAndTags(raw: string): string {
  const cdataMatch = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  const inner = cdataMatch ? cdataMatch[1] : raw;
  return decodeEntities(inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return undefined;
  const text = stripCdataAndTags(match[1]);
  return text.length > 0 ? text : undefined;
}

/** Atom's <link href="..."/> is a self-closing attribute, not tag content — RSS 2.0's <link>text</link> is tag content. */
function extractLink(block: string): string | undefined {
  const rssLink = extractTag(block, 'link');
  if (rssLink && !rssLink.includes(' ')) return rssLink;
  const atomLink = block.match(/<link\b[^>]*\shref=["']([^"']+)["'][^>]*\/?>/i);
  if (atomLink) return decodeEntities(atomLink[1]);
  return rssLink;
}

function extractItems(xml: string, tag: 'item' | 'entry'): string[] {
  const blocks: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function parseFeedXml(xml: string): RawFeedItem[] {
  const isAtom = /<feed\b/i.test(xml) && !/<rss\b/i.test(xml);
  const blocks = isAtom ? extractItems(xml, 'entry') : extractItems(xml, 'item');

  return blocks
    .map((block): RawFeedItem | null => {
      const title = extractTag(block, 'title');
      const link = extractLink(block);
      if (!title || !link) return null;
      const pubDate = extractTag(block, 'pubDate') ?? extractTag(block, 'published') ?? extractTag(block, 'updated');
      const description = extractTag(block, 'description') ?? extractTag(block, 'summary') ?? extractTag(block, 'content');
      return { title, link, ...(pubDate ? { pubDate } : {}), ...(description ? { description } : {}) };
    })
    .filter((item): item is RawFeedItem => item !== null);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Lados-QMCP-CurrentIssueResearch/1.0' } });
    if (!res.ok) {
      throw new CurrentIssueResearchError(CIR_ERROR.SOURCE_FETCH_FAILED, `${url}: HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches one feed URL with retry, then parses it. Never mutates the URL — the caller (approved-news-source.adapter.ts) owns which URLs are allowed. */
export async function fetchAndParseFeed(url: string, opts: FetchFeedOptions): Promise<RawFeedItem[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const xml = await fetchWithTimeout(url, opts.timeoutMs);
      return parseFeedXml(xml);
    } catch (e: unknown) {
      lastError = e;
      if (attempt < opts.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  if (lastError instanceof CurrentIssueResearchError) throw lastError;
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new CurrentIssueResearchError(CIR_ERROR.SOURCE_FETCH_FAILED, `${url}: ${message}`);
}
