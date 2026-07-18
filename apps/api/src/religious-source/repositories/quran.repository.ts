/**
 * Quran script + translation repository. Resolves WHICH dataset to read
 * from two places, in priority order:
 *   1. an explicit id passed by the caller (the pack node's `translationId`
 *      config field — i.e. the workflow operator picked it per Volume 2
 *      §4.2.2, answering "can dataset selection be a node input?": yes)
 *   2. the manifest entry flagged role:"primary" (the deployment-wide
 *      default an admin registered in source-manifest.json)
 * If neither resolves, this throws — the adapter maps that to
 * TRANSLATION_NOT_CONFIGURED (Blueprint §16), never falls back to guessing.
 */
import type { SourceManifest, TranslationManifestEntry } from '../types';
import { ayahKey } from '../types';
import { loadAyahTextDataset, DatasetLoadError } from './dataset-loader';

export function resolveTranslationEntry(
  manifest: SourceManifest,
  translationId?: string,
): TranslationManifestEntry | undefined {
  if (translationId) {
    return manifest.translations.find((t) => t.id === translationId);
  }
  return manifest.translations.find((t) => t.role === 'primary');
}

export async function getArabicText(
  dataPath: string,
  manifest: SourceManifest,
  surah: number,
  ayah: number,
): Promise<string | undefined> {
  const dataset = await loadAyahTextDataset(dataPath, manifest.quranScript.file, manifest.quranScript.contentHash);
  return dataset[ayahKey(surah, ayah)];
}

export async function getTranslationText(
  dataPath: string,
  entry: TranslationManifestEntry,
  surah: number,
  ayah: number,
): Promise<string | undefined> {
  const dataset = await loadAyahTextDataset(dataPath, entry.file, entry.contentHash);
  return dataset[ayahKey(surah, ayah)];
}

export { DatasetLoadError };
