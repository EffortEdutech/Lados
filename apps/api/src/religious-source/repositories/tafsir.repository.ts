/**
 * Tafsir repository. Same node-input-first, manifest-default-fallback
 * resolution as quran.repository.ts's translation lookup (Volume 2 §4.2.3):
 * an explicit `tafsirIds` config array (workflow operator's choice) wins;
 * with none supplied, every manifest entry with role "primary" or
 * "secondary" is used (role "optional" is only included when explicitly
 * requested by id — matches Blueprint §7.3's optional/supporting tafsir row).
 * Each tafsir source is kept as a separate array entry — never merged
 * (Blueprint §13.2 "do not combine ... into a false consensus").
 */
import type { SourceManifest, TafsirManifestEntry } from '../types';
import { ayahKey } from '../types';
import { loadAyahTextDataset } from './dataset-loader';

export function resolveTafsirEntries(manifest: SourceManifest, tafsirIds?: string[]): TafsirManifestEntry[] {
  if (tafsirIds && tafsirIds.length > 0) {
    const requested = new Set(tafsirIds);
    return manifest.tafsirs.filter((t) => requested.has(t.id));
  }
  return manifest.tafsirs.filter((t) => t.role === 'primary' || t.role === 'secondary');
}

export async function getTafsirText(
  dataPath: string,
  entry: TafsirManifestEntry,
  surah: number,
  ayah: number,
): Promise<string | undefined> {
  const dataset = await loadAyahTextDataset(dataPath, entry.file, entry.contentHash);
  return dataset[ayahKey(surah, ayah)];
}
