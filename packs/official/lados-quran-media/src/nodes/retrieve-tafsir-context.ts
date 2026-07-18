/**
 * lados.quran_media.retrieve_tafsir_context — STUB (real logic: Phase B)
 *
 * Deterministic retrieval of configured tafsir context for retrieved ayah
 * evidence, keeping each tafsir source identified and separate. No AI
 * involvement. Fails honestly without a configured Quran source service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IQuranSourceService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.retrieve_tafsir_context';

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
  return notImplemented(NODE, 'Phase B (deterministic evidence nodes)');
}
