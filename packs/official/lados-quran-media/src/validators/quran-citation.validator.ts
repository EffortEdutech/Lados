/**
 * Quran citation / hallucination guard (Blueprint §13.1, Volume 2 §4.3.4).
 * Verifies every evidenceId an AI-generated reflection or script claims to
 * cite actually exists in the evidence bundle that grounded it — an AI
 * response referencing an id that doesn't resolve is treated as a
 * hallucinated citation, never trusted.
 */
import type { EvidenceBundle } from '../types';

export interface CitationValidationResult {
  valid: boolean;
  unresolvedRefs: string[];
}

export function knownEvidenceIds(bundle: EvidenceBundle): string[] {
  return bundle.quranEvidence.map((e) => e.evidenceId);
}

export function validateEvidenceRefsResolve(refs: readonly string[], bundle: EvidenceBundle): CitationValidationResult {
  const known = new Set(knownEvidenceIds(bundle));
  const unresolvedRefs = refs.filter((ref) => !known.has(ref));
  return { valid: unresolvedRefs.length === 0, unresolvedRefs };
}
