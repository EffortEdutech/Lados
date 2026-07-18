/**
 * QUL Quran adapter — implements the Quran-script/translation/search slice
 * of IQuranSourceService (searchAyahsByTheme, getAyah, verifyReference).
 * Local governed adapter over downloaded JSON datasets (Blueprint §7.1) —
 * never assumes a public QUL API, never fabricates Arabic text or a
 * translation (Blueprint §19 rules 1/6).
 */
import { validateQuranReference } from '../validators/quran-reference.validator';
import { validateProvenance } from '../validators/evidence-citation.validator';
import { loadManifest, DatasetLoadError } from '../repositories/dataset-loader';
import { getArabicText, getTranslationText, resolveTranslationEntry } from '../repositories/quran.repository';
import { searchAyahsByTheme as searchTopics, type TopicCandidate } from '../repositories/topic.repository';
import { RS_ERROR, ReligiousSourceError } from '../errors';
import type { QuranReference } from '../types';

export interface QuranEvidenceResult {
  evidenceId: string;
  reference: QuranReference;
  arabicText: string;
  translation: { text: string; sourceName: string; sourceId: string };
  provenance: {
    provider: 'QUL';
    resourceType: string;
    resourceName: string;
    resourceId: string;
    language: string;
    sourceUrl: string;
    retrievedAt: string;
    datasetVersion?: string;
    contentHash?: string;
    licenseReference?: string;
  };
  humanReviewStatus: 'pending';
}

export class QulQuranAdapter {
  constructor(private readonly dataPath: string) {}

  async searchAyahsByTheme(input: {
    themes: string[];
    query?: string;
    language?: string;
    limit?: number;
  }): Promise<TopicCandidate[]> {
    const manifest = await loadManifest(this.dataPath);
    if (!manifest) {
      throw new ReligiousSourceError(RS_ERROR.QUL_DATASET_NOT_FOUND, 'No QUL source manifest registered.');
    }
    const themes = input.query ? [...input.themes, input.query] : input.themes;
    return searchTopics(this.dataPath, manifest, themes, input.limit ?? 10);
  }

  async verifyReference(ref: QuranReference): Promise<{ valid: boolean; reference: QuranReference; issues: string[] }> {
    const result = validateQuranReference({ surah: ref.surah, ayahStart: ref.ayahStart, ayahEnd: ref.ayahEnd });
    return { valid: result.valid, reference: ref, issues: result.issues };
  }

  async getAyah(input: { surah: number; ayah: number; translationId?: string }): Promise<QuranEvidenceResult> {
    const refCheck = validateQuranReference({ surah: input.surah, ayahStart: input.ayah });
    if (!refCheck.valid) {
      throw new ReligiousSourceError(
        RS_ERROR.INVALID_QURAN_REFERENCE,
        `Invalid Quran reference ${input.surah}:${input.ayah} — ${refCheck.issues.join('; ')}`,
      );
    }

    const manifest = await loadManifest(this.dataPath);
    if (!manifest) {
      throw new ReligiousSourceError(RS_ERROR.QUL_DATASET_NOT_FOUND, 'No QUL source manifest registered.');
    }

    let arabicText: string | undefined;
    try {
      arabicText = await getArabicText(this.dataPath, manifest, input.surah, input.ayah);
    } catch (e: unknown) {
      throw mapDatasetLoadError(e, manifest.quranScript.file);
    }
    if (!arabicText) {
      throw new ReligiousSourceError(
        RS_ERROR.QUL_DATASET_NOT_FOUND,
        `Arabic text not found for ${input.surah}:${input.ayah} in ${manifest.quranScript.file}.`,
      );
    }

    const translationEntry = resolveTranslationEntry(manifest, input.translationId);
    if (!translationEntry) {
      throw new ReligiousSourceError(
        RS_ERROR.TRANSLATION_NOT_CONFIGURED,
        input.translationId
          ? `Requested translationId "${input.translationId}" is not registered in the source manifest.`
          : 'No translation with role:"primary" is registered in the source manifest.',
      );
    }

    let translationText: string | undefined;
    try {
      translationText = await getTranslationText(this.dataPath, translationEntry, input.surah, input.ayah);
    } catch (e: unknown) {
      throw mapDatasetLoadError(e, translationEntry.file);
    }
    if (!translationText) {
      throw new ReligiousSourceError(
        RS_ERROR.TRANSLATION_NOT_CONFIGURED,
        `Translation "${translationEntry.id}" has no entry for ${input.surah}:${input.ayah}.`,
      );
    }

    const provenance = {
      provider: 'QUL' as const,
      resourceType: 'translation',
      resourceName: translationEntry.resourceName,
      resourceId: translationEntry.id,
      language: translationEntry.language,
      sourceUrl: translationEntry.sourceUrl ?? 'https://qul.tarteel.ai/resources',
      retrievedAt: new Date().toISOString(),
      datasetVersion: translationEntry.datasetVersion,
      contentHash: translationEntry.contentHash,
      licenseReference: translationEntry.licenseReference,
    };

    const provenanceCheck = validateProvenance(provenance);
    if (!provenanceCheck.valid) {
      throw new ReligiousSourceError(
        RS_ERROR.TRANSLATION_NOT_CONFIGURED,
        `Translation "${translationEntry.id}" provenance is incomplete: missing ${provenanceCheck.missingFields.join(', ')}.`,
      );
    }

    return {
      evidenceId: `quran-${input.surah}-${input.ayah}-${translationEntry.id}`,
      reference: { surah: input.surah, ayahStart: input.ayah },
      arabicText,
      translation: { text: translationText, sourceName: translationEntry.resourceName, sourceId: translationEntry.id },
      provenance,
      humanReviewStatus: 'pending',
    };
  }
}

function mapDatasetLoadError(e: unknown, file: string): ReligiousSourceError {
  if (e instanceof DatasetLoadError) {
    return new ReligiousSourceError(RS_ERROR.QUL_DATASET_INTEGRITY_FAILED, `${file}: ${e.message}`);
  }
  const message = e instanceof Error ? e.message : String(e);
  if (message.includes('ENOENT')) {
    return new ReligiousSourceError(RS_ERROR.QUL_DATASET_NOT_FOUND, `${file} not found on disk: ${message}`);
  }
  return new ReligiousSourceError(RS_ERROR.QUL_DATASET_INTEGRITY_FAILED, `${file}: ${message}`);
}
