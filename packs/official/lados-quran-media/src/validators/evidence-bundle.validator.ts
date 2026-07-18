/**
 * Evidence bundle structural validator (Blueprint §15, Volume 2 §4.2.5).
 * Pack-local — validates the shape build_evidence_bundle assembles before
 * it is ever handed to a human at Gate 2. Never sets religiousReview.status
 * or publicationReady itself; only checks that the assembler produced a
 * bundle that IS still safely pending.
 */
import type { EvidenceBundle } from '../types';

export interface BundleValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateEvidenceBundle(bundle: EvidenceBundle, requireTafsir: boolean): BundleValidationResult {
  const issues: string[] = [];

  if (bundle.bundleVersion !== '1.0') {
    issues.push(`bundleVersion must be "1.0", got "${bundle.bundleVersion}"`);
  }
  if (!Array.isArray(bundle.quranEvidence) || bundle.quranEvidence.length === 0) {
    issues.push('quranEvidence must contain at least one item — a bundle without Quran evidence is invalid');
  }
  if (bundle.religiousReview.status !== 'pending') {
    issues.push('religiousReview.status must start "pending" — an executor may never pre-approve its own bundle');
  }
  if (bundle.publicationReady !== false) {
    issues.push('publicationReady must start false — an executor may never mark its own bundle publication-ready');
  }

  if (requireTafsir) {
    for (const item of bundle.quranEvidence) {
      if (!Array.isArray(item.tafsir) || item.tafsir.length === 0) {
        issues.push(`quranEvidence "${item.evidenceId}" has no tafsir and requireTafsir is true`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
