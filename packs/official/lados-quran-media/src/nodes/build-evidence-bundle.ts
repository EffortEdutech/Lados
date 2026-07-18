/**
 * lados.quran_media.build_evidence_bundle — Phase B (real logic)
 *
 * Assembles issue, themes, Quran evidence, tafsir evidence, and optional
 * hadith evidence into the bundleVersion 1.0 contract (Blueprint §15) with
 * religiousReview.status "pending" and publicationReady false. Purely
 * deterministic — no service dependency.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import { missingInput, fail } from './stub-helpers';
import { validateEvidenceBundle } from '../validators/evidence-bundle.validator';
import type { EvidenceBundle, QuranEvidence, TafsirEvidence, HadithVerificationRecord } from '../types';

const NODE = 'lados.quran_media.build_evidence_bundle';

interface IssueLike {
  issueId?: string;
  headline?: string;
  summary?: string;
  sources?: Array<{ provider: string; sourceUrl: string; retrievedAt: string }>;
  facts?: string[];
  uncertainties?: string[];
}

export async function buildEvidenceBundle(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const quranEvidence = inp['quranEvidence'] as QuranEvidence[] | undefined;
  if (!Array.isArray(quranEvidence) || quranEvidence.length === 0) {
    return missingInput(NODE, 'quranEvidence', 'connect retrieve_quran_evidence — a bundle without Quran evidence is invalid');
  }

  const issue = (inp['issue'] as IssueLike | undefined) ?? {};
  const themes = Array.isArray(inp['themes']) ? (inp['themes'] as string[]) : [];
  const tafsirEvidence = Array.isArray(inp['tafsirEvidence']) ? (inp['tafsirEvidence'] as TafsirEvidence[]) : [];
  const hadithEvidence = inp['hadithEvidence'] as HadithVerificationRecord | undefined;

  const cfg = ctx.config as Record<string, unknown>;
  const requireTafsir = cfg['requireTafsir'] !== false; // default true

  const warnings: string[] = [];

  const mergedQuranEvidence = quranEvidence.map((item) => {
    const tafsirForAyah = tafsirEvidence.filter(
      (t) => t.reference.surah === item.reference.surah && t.reference.ayahStart === item.reference.ayahStart,
    );
    return { ...item, tafsir: tafsirForAyah };
  });

  if (requireTafsir) {
    const missing = mergedQuranEvidence.filter((item) => item.tafsir.length === 0);
    if (missing.length > 0) {
      const refs = missing.map((m) => `${m.reference.surah}:${m.reference.ayahStart}`).join(', ');
      return fail(
        'EVIDENCE_BUNDLE_INVALID',
        `${NODE}: requireTafsir is true but no tafsir was found for ayah(s) ${refs}. Set requireTafsir:false to bundle without them (not recommended).`,
      );
    }
  }

  if (hadithEvidence && hadithEvidence.humanReviewStatus !== 'approved') {
    warnings.push(
      `Hadith evidence "${hadithEvidence.recordId}" is not yet approved (status: ${hadithEvidence.humanReviewStatus}) — it is retained in the bundle but must not appear in any script until approved.`,
    );
  }

  const bundle: EvidenceBundle = {
    bundleVersion: '1.0',
    issue: {
      issueId: issue.issueId ?? '',
      headline: issue.headline ?? '',
      summary: issue.summary ?? '',
      sources: issue.sources ?? [],
      facts: issue.facts ?? [],
      uncertainties: issue.uncertainties ?? [],
    },
    themes,
    quranEvidence: mergedQuranEvidence,
    hadithEvidence: hadithEvidence ? [hadithEvidence] : [],
    warnings,
    religiousReview: { status: 'pending', reviewedBy: null, reviewedAt: null, notes: '' },
    publicationReady: false,
  };

  const validation = validateEvidenceBundle(bundle, requireTafsir);
  if (!validation.valid) {
    return fail('EVIDENCE_BUNDLE_INVALID', `${NODE}: ${validation.issues.join('; ')}`);
  }

  return {
    status: 'success',
    outputs: { bundle },
    summary: `Assembled evidence bundle: ${mergedQuranEvidence.length} Quran evidence item(s), ${bundle.hadithEvidence.length} hadith item(s), religiousReview pending`,
  };
}
