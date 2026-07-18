/**
 * lados.quran_media.retrieve_quran_evidence — Phase B (real logic)
 *
 * Deterministic retrieval of Arabic text, configured translation, and full
 * provenance from configured QUL datasets. No AI involvement — Arabic Quran
 * text is NEVER generated. Fails honestly without a configured Quran source.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IQuranSourceService } from '../types';
import { fail, missingInput, failFromError } from './stub-helpers';

const NODE = 'lados.quran_media.retrieve_quran_evidence';

interface CandidateLike {
  reference: { surah: number; ayahStart: number; ayahEnd?: number };
}

export async function retrieveQuranEvidence(
  ctx: NodeContext,
  quranSourceService?: IQuranSourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const candidates = inp['candidates'];
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return missingInput(NODE, 'candidates', 'connect find_quran_candidates');
  }
  if (!quranSourceService) {
    return fail(
      'RELIGIOUS_DATA_PATH_NOT_CONFIGURED',
      `${NODE}: no Quran source service is wired — the QUL dataset adapters (apps/api/src/religious-source/) are Phase B. Arabic text and translations come only from the configured dataset.`,
    );
  }

  const cfg = ctx.config as Record<string, unknown>;
  const translationId = typeof cfg['translationId'] === 'string' ? (cfg['translationId'] as string) : undefined;

  const quranEvidence: unknown[] = [];
  for (const raw of candidates as CandidateLike[]) {
    const ref = raw.reference;
    if (!ref || typeof ref.surah !== 'number' || typeof ref.ayahStart !== 'number') {
      return fail('INVALID_QURAN_REFERENCE', `${NODE}: candidate is missing a well-formed reference: ${JSON.stringify(raw)}`);
    }

    // A candidate range (ayahStart..ayahEnd) expands to one evidence item per ayah —
    // each ayah is retrieved and provenanced individually (Blueprint §7.4 per-record
    // validation), never merged into a single multi-ayah blob.
    const ayahEnd = ref.ayahEnd ?? ref.ayahStart;
    for (let ayah = ref.ayahStart; ayah <= ayahEnd; ayah++) {
      try {
        const evidence = await quranSourceService.getAyah({ surah: ref.surah, ayah, translationId });
        quranEvidence.push(evidence);
      } catch (e: unknown) {
        // A bad/unconfigured reference stops the whole run rather than
        // silently dropping evidence (Volume 2 §4.2.2 step 3.b).
        return failFromError('INVALID_QURAN_REFERENCE', e);
      }
    }
  }

  return {
    status: 'success',
    outputs: { quranEvidence },
    summary: `Retrieved ${quranEvidence.length} Quran evidence item(s)`,
  };
}
