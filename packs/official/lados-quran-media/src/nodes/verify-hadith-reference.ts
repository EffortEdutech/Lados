/**
 * lados.quran_media.verify_hadith_reference — Phase B (real logic)
 *
 * Records human-assisted SemakHadis.com verification evidence: the human
 * supplies the exact record URL; the adapter records provider, status label,
 * and references with humanReviewStatus "pending". This node never generates
 * hadith content and never grades a hadith. Fails honestly without the
 * verification service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IHadithVerificationService } from '../types';
import { fail, failFromError } from './stub-helpers';

const NODE = 'lados.quran_media.verify_hadith_reference';

export async function verifyHadithReference(
  ctx: NodeContext,
  hadithVerificationService?: IHadithVerificationService,
): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const sourceUrl = typeof cfg['sourceUrl'] === 'string' ? (cfg['sourceUrl'] as string).trim() : '';
  const submittedBy = typeof cfg['submittedBy'] === 'string' ? (cfg['submittedBy'] as string).trim() : '';

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

  try {
    const hadithEvidence = await hadithVerificationService.createManualVerification({ sourceUrl, submittedBy });
    return {
      status: 'success',
      outputs: { hadithEvidence },
      summary: `Recorded hadith verification submission (${hadithEvidence.humanReviewStatus}) — a human reviewer must confirm title, status, and references before use.`,
    };
  } catch (e: unknown) {
    return failFromError('HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED', e);
  }
}
