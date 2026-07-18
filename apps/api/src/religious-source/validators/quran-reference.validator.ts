/**
 * Quran reference structural validator (Blueprint §7.4 "Run Quran reference
 * integrity checks"). Standard Uthmani-mushaf ayah counts per surah — public
 * factual/numeric reference data, not source text, safe to vendor directly.
 * Used by ReligiousSourceService.verifyReference() and by
 * retrieve_quran_evidence's executor before any dataset lookup.
 */

export const AYAH_COUNT_PER_SURAH: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112,
  78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8,
  19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export interface QuranReferenceInput {
  surah: number;
  ayahStart: number;
  ayahEnd?: number;
}

export interface QuranReferenceValidation {
  valid: boolean;
  issues: string[];
}

/**
 * Structural validation only: surah in range, ayah(s) in range for that
 * surah, ayahEnd >= ayahStart if provided. Does NOT check dataset presence
 * — that is the repository/adapter's job (QUL_DATASET_NOT_FOUND).
 */
export function validateQuranReference(ref: QuranReferenceInput): QuranReferenceValidation {
  const issues: string[] = [];

  if (!Number.isInteger(ref.surah) || ref.surah < 1 || ref.surah > 114) {
    issues.push(`surah ${ref.surah} is out of range (1-114)`);
    return { valid: false, issues };
  }

  const ayahCount = AYAH_COUNT_PER_SURAH[ref.surah - 1];

  if (!Number.isInteger(ref.ayahStart) || ref.ayahStart < 1 || ref.ayahStart > ayahCount) {
    issues.push(`surah ${ref.surah} ayahStart ${ref.ayahStart} is out of range (1-${ayahCount})`);
  }

  if (ref.ayahEnd !== undefined) {
    if (!Number.isInteger(ref.ayahEnd) || ref.ayahEnd < 1 || ref.ayahEnd > ayahCount) {
      issues.push(`surah ${ref.surah} ayahEnd ${ref.ayahEnd} is out of range (1-${ayahCount})`);
    } else if (ref.ayahEnd < ref.ayahStart) {
      issues.push(`ayahEnd ${ref.ayahEnd} is before ayahStart ${ref.ayahStart}`);
    }
  }

  return { valid: issues.length === 0, issues };
}
