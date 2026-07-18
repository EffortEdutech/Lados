/**
 * Topic/theme repository — backs find_quran_candidates (Volume 2 §4.2.1).
 * Reads the topics + themes datasets (Blueprint §7.3 "Quran Topics and
 * Concepts" / "Ayah Theme") and returns candidate references whose `theme`
 * matches any of the caller's requested themes. Matching is deterministic
 * (case-insensitive substring), never AI-driven — the pack's own advisory
 * AI step (if any) only shapes the `themes[]`/`query` input before this
 * runs, never the match itself.
 */
import type { SourceManifest, TopicDatasetEntry } from '../types';
import { loadTopicDataset } from './dataset-loader';

export interface TopicCandidate {
  reference: { surah: number; ayahStart: number; ayahEnd?: number };
  matchedThemes: string[];
  matchSource: 'ayah-topics' | 'ayah-theme';
}

function matches(entryTheme: string, requestedThemes: readonly string[]): string[] {
  const normalized = entryTheme.toLowerCase();
  return requestedThemes.filter((t) => normalized.includes(t.toLowerCase()) || t.toLowerCase().includes(normalized));
}

async function searchOneDataset(
  dataPath: string,
  file: string,
  matchSource: 'ayah-topics' | 'ayah-theme',
  themes: readonly string[],
): Promise<TopicCandidate[]> {
  const dataset = await loadTopicDataset(dataPath, file);
  const results: TopicCandidate[] = [];
  for (const entry of dataset as TopicDatasetEntry[]) {
    const matchedThemes = matches(entry.theme, themes);
    if (matchedThemes.length === 0) continue;
    for (const reference of entry.references) {
      results.push({ reference, matchedThemes, matchSource });
    }
  }
  return results;
}

export async function searchAyahsByTheme(
  dataPath: string,
  manifest: SourceManifest,
  themes: readonly string[],
  limit: number,
): Promise<TopicCandidate[]> {
  const all: TopicCandidate[] = [];
  if (manifest.topics) {
    all.push(...(await searchOneDataset(dataPath, manifest.topics.file, 'ayah-topics', themes)));
  }
  if (manifest.themes) {
    all.push(...(await searchOneDataset(dataPath, manifest.themes.file, 'ayah-theme', themes)));
  }
  return all.slice(0, limit);
}
