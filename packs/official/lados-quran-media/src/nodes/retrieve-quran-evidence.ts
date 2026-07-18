/**
 * lados.quran_media.retrieve_quran_evidence — STUB (real logic: Phase B)
 *
 * Deterministic retrieval of Arabic text, configured translation, and full
 * provenance from configured QUL datasets. No AI involvement — Arabic Quran
 * text is NEVER generated. Fails honestly without a configured Quran source.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IQuranSourceService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.retrieve_quran_evidence';

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
  return notImplemented(NODE, 'Phase B (deterministic evidence nodes)');
}
