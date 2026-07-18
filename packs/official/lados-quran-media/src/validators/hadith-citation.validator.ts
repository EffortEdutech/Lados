/**
 * Hadith usage guard (Blueprint §8.3, §13.3, Volume 2 §4.3.6). A hadith may
 * appear in a final script only if it has a source URL, a recorded status,
 * and humanReviewStatus "approved" — this validator is the single place
 * that rule is checked so every caller (validate_dakwah_content today,
 * publication-gate tomorrow) enforces it identically.
 */
import type { HadithVerificationRecord } from '../types';

export interface HadithUsageCheckResult {
  allowed: boolean;
  blockedRecordIds: string[];
  reason?: string;
}

export function checkHadithUsage(hadithEvidence: readonly HadithVerificationRecord[]): HadithUsageCheckResult {
  const blockedRecordIds = hadithEvidence
    .filter((h) => h.humanReviewStatus !== 'approved' || !h.sourceUrl || !h.statusLabel)
    .map((h) => h.recordId);

  if (blockedRecordIds.length > 0) {
    return {
      allowed: false,
      blockedRecordIds,
      reason: `${blockedRecordIds.length} hadith record(s) are not yet approved/complete and must not appear in the script: ${blockedRecordIds.join(', ')}.`,
    };
  }
  return { allowed: true, blockedRecordIds: [] };
}
