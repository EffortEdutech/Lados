/**
 * Provenance completeness validator (Blueprint §6.3 "Required Provenance").
 * Used by the QUL adapters before returning QuranEvidence/TafsirEvidence to
 * the pack — every source-grounded record must carry full provenance, or the
 * adapter must fail rather than hand back a partially-sourced item.
 */

export interface QuranProvenanceLike {
  provider: string;
  resourceType: string;
  resourceName: string;
  resourceId: string;
  language: string;
  sourceUrl: string;
  retrievedAt: string;
}

export interface CitationCheckResult {
  valid: boolean;
  missingFields: string[];
}

const REQUIRED_FIELDS: ReadonlyArray<keyof QuranProvenanceLike> = [
  'provider',
  'resourceType',
  'resourceName',
  'resourceId',
  'language',
  'sourceUrl',
  'retrievedAt',
];

export function validateProvenance(provenance: Partial<QuranProvenanceLike>): CitationCheckResult {
  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = provenance[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });
  return { valid: missingFields.length === 0, missingFields };
}

/**
 * Cross-checks that every evidenceId referenced by a downstream artifact
 * (a script scene, a reflection's evidenceRefs, etc.) resolves to an entry
 * in the evidence bundle it claims to be grounded in. Used by
 * compose_reflection / write_short_video_script's hallucination guard
 * (QMCP Volume 2 §4.3.4/§4.3.5) — kept here (not pack-local) because the
 * check is identical logic to the provenance-integrity concern this module
 * already owns.
 */
export function validateEvidenceRefsResolve(
  refs: readonly string[],
  knownEvidenceIds: readonly string[],
): { valid: boolean; unresolvedRefs: string[] } {
  const known = new Set(knownEvidenceIds);
  const unresolvedRefs = refs.filter((ref) => !known.has(ref));
  return { valid: unresolvedRefs.length === 0, unresolvedRefs };
}
