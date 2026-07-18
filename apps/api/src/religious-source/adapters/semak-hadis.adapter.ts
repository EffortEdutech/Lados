/**
 * Semak Hadis adapter — human-assisted MVP verification flow (Blueprint
 * §8.1): a human searches SemakHadis.com themselves and supplies the exact
 * record URL; this adapter only records that submission with a stable id
 * and humanReviewStatus:"pending". It never fetches, scrapes, or generates
 * hadith content — no scraper is used as the default production
 * architecture without a formal integration (Blueprint §8.2).
 *
 * Persistence note: verification records are NOT written to a database
 * table in this v1 pass — nothing in the Blueprint requires it, and the
 * record already flows forward as the node's own output through the
 * workflow run's existing state/artifact persistence (Volume 1 §9.1 only
 * specifies this as a service-layer adapter, no repository). getVerification
 * here is a process-lifetime lookup for symmetry with the interface;
 * revisit if a future phase needs cross-run hadith-record lookup.
 */
import { createHash } from 'node:crypto';
import type { HadithVerificationRecord } from '../types';

const inMemoryRecords = new Map<string, HadithVerificationRecord>();

export class SemakHadisAdapter {
  async createManualVerification(input: {
    sourceUrl: string;
    submittedBy: string;
  }): Promise<HadithVerificationRecord> {
    const recordId = `hadith-${createHash('sha256')
      .update(`${input.sourceUrl}|${input.submittedBy}|${Date.now()}`)
      .digest('hex')
      .slice(0, 16)}`;

    const record: HadithVerificationRecord = {
      recordId,
      provider: 'Semak Hadis',
      sourceUrl: input.sourceUrl,
      retrievedAt: new Date().toISOString(),
      // recordTitle/statusLabel/references are NOT auto-populated — a human
      // supplied only the URL; the exact title/status/references must be
      // confirmed by the human reviewer at Gate 2, never inferred here.
      recordTitle: '',
      statusLabel: 'pending_human_confirmation',
      references: [],
      submittedBy: input.submittedBy,
      humanReviewStatus: 'pending',
    };

    inMemoryRecords.set(recordId, record);
    return record;
  }

  async getVerification(recordId: string): Promise<HadithVerificationRecord> {
    const record = inMemoryRecords.get(recordId);
    if (!record) {
      throw new Error(`No hadith verification record found for id "${recordId}" (process-lifetime store only).`);
    }
    return record;
  }
}
