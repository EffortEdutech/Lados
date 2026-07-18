/**
 * lados.quran_media.retrieve_tafsir_context — Phase B (real logic)
 *
 * Deterministic retrieval of configured tafsir context for retrieved ayah
 * evidence, keeping each tafsir source identified and separate. No AI
 * involvement. Fails honestly without a configured Quran source service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IQuranSourceService } from '../types';
import { fail, missingInput, failFromError } from './stub-helpers';

const NODE = 'lados.quran_media.retrieve_tafsir_context';

interface QuranEvidenceLike {
  reference: { surah: number; ayahStart: number };
}

export async function retrieveTafsirContext(
  ctx: NodeContext,
  quranSourceService?: IQuranSourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const quranEvidence = inp['quranEvidence'];
  if (!Array.isArray(quranEvidence) || quranEvidence.length === 0) {
    return missingInput(NODE, 'quranEvidence', 'connect retrieve_quran_evidence');
  }
  if (!quranSourceService) {
    return fail(
      'TAFSIR_NOT_CONFIGURED',
      `${NODE}: no Quran source service / tafsir dataset is wired — the QUL tafsir adapter (apps/api/src/religious-source/) is Phase B.`,
    );
  }

  const cfg = ctx.config as Record<string, unknown>;
  const tafsirIds = Array.isArray(cfg['tafsirIds']) ? (cfg['tafsirIds'] as string[]) : [];

  const tafsirEvidence: unknown[] = [];
  const warnings: string[] = [];
  for (const item of quranEvidence as QuranEvidenceLike[]) {
    const ref = item.reference;
    try {
      const results = await quranSourceService.getTafsir({ surah: ref.surah, ayah: ref.ayahStart, tafsirIds });
      if (results.length === 0) {
        // Missing tafsir for one ayah is non-fatal at this stage — mandatory-
        // if-configured is enforced downstream by build_evidence_bundle's
        // requireTafsir config (Volume 2 §4.2.3 step 3).
        warnings.push(`No tafsir found for ${ref.surah}:${ref.ayahStart}.`);
        continue;
      }
      tafsirEvidence.push(...results);
    } catch (e: unknown) {
      return failFromError('TAFSIR_NOT_CONFIGURED', e);
    }
  }

  // Only `tafsirEvidence` is a declared output port (nodes.json) — the
  // frozen Phase A port contract does not change here. Any gaps are
  // surfaced in `summary` text, not a new output key.
  return {
    status: 'success',
    outputs: { tafsirEvidence },
    summary: `Retrieved ${tafsirEvidence.length} tafsir item(s)${warnings.length ? ` — ${warnings.join(' ')}` : ''}`,
  };
}
