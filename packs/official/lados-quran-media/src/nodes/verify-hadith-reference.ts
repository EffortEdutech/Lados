/**
 * lados.quran_media.verify_hadith_reference — STUB (real logic: Phase B)
 *
 * Records human-assisted SemakHadis.com verification evidence: the human
 * supplies the exact record URL; the adapter records provider, status label,
 * and references with humanReviewStatus "pending". This node never generates
 * hadith content and never grades a hadith. Fails honestly without the
 * verification service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IHadithVerificationService } from '../types';
import { fail, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.verify_hadith_reference';

export async function verifyHadithReference(
  ctx: NodeContext,
  hadithVerificationService?: IHadithVerificationService,
): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const sourceUrl = typeof cfg['sourceUrl'] === 'string' ? (cfg['sourceUrl'] as string).trim() : '';

  if (!sourceUrl) {
    return fail(
      'HADITH_SOURCE_URL_REQUIRED',
      `${NODE}: sourceUrl is required — a human must supply the exact SemakHadis.com record URL (human-assisted verification, Blueprint §8.1).`,
    );
  }
  if (!hadithVerificationService) {
    return fail(
      'HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED',
      `${NODE}: no hadith verification service is wired — the Semak Hadis adapter (apps/api/src/religious-source/) is Phase B.`,
    );
  }
  return notImplemented(NODE, 'Phase B (deterministic evidence nodes)');
}
