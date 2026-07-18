/**
 * lados.quran_media.build_evidence_bundle — STUB (real logic: Phase B)
 *
 * Assembles issue, themes, Quran evidence, tafsir evidence, and optional
 * hadith evidence into the bundleVersion 1.0 contract (Blueprint §15) with
 * religiousReview.status "pending" and publicationReady false. Purely
 * deterministic — the full structural validator lands in Phase B alongside
 * src/validators/evidence-bundle.validator.ts.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import { missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.build_evidence_bundle';

export async function buildEvidenceBundle(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const quranEvidence = inp['quranEvidence'];
  if (!Array.isArray(quranEvidence) || quranEvidence.length === 0) {
    return missingInput(NODE, 'quranEvidence', 'connect retrieve_quran_evidence — a bundle without Quran evidence is invalid');
  }
  return notImplemented(NODE, 'Phase B (deterministic evidence nodes — bundle assembly + evidence-bundle.validator)');
}
