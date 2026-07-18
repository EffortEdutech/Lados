/**
 * ReligiousSourceModule — internal manifest/dataset types.
 *
 * These describe the on-disk layout under LADOS_RELIGIOUS_DATA_PATH
 * (Blueprint §7.2/§7.3). They are internal to this module — the module's
 * public surface to the rest of the app is IQuranSourceService /
 * IHadithVerificationService, structurally matching
 * @lados/official-quran-media's src/types.ts (never imported directly here,
 * to keep this module pack-agnostic; the pack's types are satisfied by
 * duck typing, same convention as FileService/AiService elsewhere).
 *
 * v1 scope (Phase B, per QMCP Volume 2 §9 "build against fixtures first"):
 * JSON-only datasets. SQLite is an approved future format (Blueprint §7.1)
 * that can be added as a second adapter without changing
 * ReligiousSourceService's public methods.
 */

export type DatasetRole = 'primary' | 'secondary' | 'optional';

export interface TranslationManifestEntry {
  id: string;
  resourceName: string;
  language: string;
  file: string;
  role: DatasetRole;
  sourceUrl?: string;
  datasetVersion?: string;
  contentHash?: string;
  licenseReference?: string;
}

export interface TafsirManifestEntry {
  id: string;
  resourceName: string;
  language: string;
  file: string;
  role: DatasetRole;
  sourceUrl?: string;
  datasetVersion?: string;
  contentHash?: string;
  licenseReference?: string;
}

export interface QuranScriptManifestEntry {
  id: string;
  resourceName: string;
  language: string;
  file: string;
  sourceUrl?: string;
  datasetVersion?: string;
  contentHash?: string;
}

export interface TopicDatasetManifestEntry {
  id: string;
  file: string;
  sourceUrl?: string;
}

/** Shape of qul/source-manifest.json (Blueprint §7.2). */
export interface SourceManifest {
  quranScript: QuranScriptManifestEntry;
  translations: TranslationManifestEntry[];
  tafsirs: TafsirManifestEntry[];
  topics?: TopicDatasetManifestEntry;
  themes?: TopicDatasetManifestEntry;
}

/** Ayah-keyed text dataset file shape: { "90:11": "...", "90:12": "...", ... } */
export type AyahTextDataset = Record<string, string>;

/** Topic/theme dataset file shape (ayah-topics.json / ayah-theme.json). */
export interface TopicDatasetEntry {
  theme: string;
  references: Array<{ surah: number; ayahStart: number; ayahEnd?: number }>;
}
export type TopicDataset = TopicDatasetEntry[];

export function ayahKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

/**
 * Local structural mirror of @lados/official-quran-media's QuranReference.
 * Deliberately NOT imported from the pack — this module stays decoupled at
 * the type level the same way FileService doesn't import IFileService from
 * lados-video-production; the pack's IQuranSourceService is satisfied by
 * duck typing against QulReligiousSourceService's public methods instead.
 */
export interface QuranReference {
  surah: number;
  ayahStart: number;
  ayahEnd?: number;
}

/** Local structural mirror of @lados/official-quran-media's HadithVerificationRecord. */
export interface HadithVerificationRecord {
  recordId: string;
  provider: 'Semak Hadis';
  sourceUrl: string;
  retrievedAt: string;
  recordTitle: string;
  statusLabel: string;
  references: string[];
  submittedBy: string;
  humanReviewStatus: 'pending' | 'approved' | 'rejected';
}

