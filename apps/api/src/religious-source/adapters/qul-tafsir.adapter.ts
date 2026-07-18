/**
 * QUL Tafsir adapter — implements the tafsir slice of IQuranSourceService
 * (getTafsir). Never summarizes or merges tafsir sources itself — returns
 * each configured source's retrieved text separately with
 * summaryGeneratedByAI: false; any AI summarization happens later, in the
 * pack's own Phase C nodes, and must be kept visibly separate from this
 * retrieved text (Blueprint §13.2).
 */
import { validateQuranReference } from '../validators/quran-reference.validator';
import { validateProvenance } from '../validators/evidence-citation.validator';
import { loadManifest, DatasetLoadError } from '../repositories/dataset-loader';
import { getTafsirText, resolveTafsirEntries } from '../repositories/tafsir.repository';
import { RS_ERROR, ReligiousSourceError } from '../errors';
import type { QuranReference } from '../types';

export interface TafsirEvidenceResult {
  reference: QuranReference;
  sourceName: string;
  sourceId: string;
  language: string;
  retrievedText: string;
  summaryGeneratedByAI: false;
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
}

export class QulTafsirAdapter {
  constructor(private readonly dataPath: string) {}

  async getTafsir(input: { surah: number; ayah: number; tafsirIds: string[] }): Promise<TafsirEvidenceResult[]> {
    const refCheck = validateQuranReference({ surah: input.surah, ayahStart: input.ayah });
    if (!refCheck.valid) {
      throw new ReligiousSourceError(
        RS_ERROR.INVALID_QURAN_REFERENCE,
        `Invalid Quran reference ${input.surah}:${input.ayah} — ${refCheck.issues.join('; ')}`,
      );
    }

    const manifest = await loadManifest(this.dataPath);
    if (!manifest) {
      throw new ReligiousSourceError(RS_ERROR.TAFSIR_NOT_CONFIGURED, 'No QUL source manifest registered.');
    }

    const entries = resolveTafsirEntries(manifest, input.tafsirIds.length > 0 ? input.tafsirIds : undefined);
    if (entries.length === 0) {
      throw new ReligiousSourceError(
        RS_ERROR.TAFSIR_NOT_CONFIGURED,
        input.tafsirIds.length > 0
          ? `None of the requested tafsirIds [${input.tafsirIds.join(', ')}] are registered in the source manifest.`
          : 'No tafsir with role "primary"/"secondary" is registered in the source manifest.',
      );
    }

    const results: TafsirEvidenceResult[] = [];
    for (const entry of entries) {
      let text: string | undefined;
      try {
        text = await getTafsirText(this.dataPath, entry, input.surah, input.ayah);
      } catch (e: unknown) {
        if (e instanceof DatasetLoadError) {
          throw new ReligiousSourceError(RS_ERROR.QUL_DATASET_INTEGRITY_FAILED, `${entry.file}: ${e.message}`);
        }
        throw e;
      }
      // A missing entry for THIS ayah in one tafsir source is not fatal —
      // some tafsir datasets group ayat differently; skip, don't fail the
      // whole node (Volume 2 §4.2.3 step 3).
      if (!text) continue;

      const provenance = {
        provider: 'QUL' as const,
        resourceType: 'tafsir',
        resourceName: entry.resourceName,
        resourceId: entry.id,
        language: entry.language,
        sourceUrl: entry.sourceUrl ?? 'https://qul.tarteel.ai/resources',
        retrievedAt: new Date().toISOString(),
        datasetVersion: entry.datasetVersion,
        contentHash: entry.contentHash,
        licenseReference: entry.licenseReference,
      };
      const provenanceCheck = validateProvenance(provenance);
      if (!provenanceCheck.valid) continue; // same non-fatal treatment as a missing ayah entry

      results.push({
        reference: { surah: input.surah, ayahStart: input.ayah },
        sourceName: entry.resourceName,
        sourceId: entry.id,
        language: entry.language,
        retrievedText: text,
        summaryGeneratedByAI: false,
        provenance,
      });
    }

    return results;
  }
}
