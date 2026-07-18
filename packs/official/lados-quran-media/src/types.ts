/**
 * @lados/official-quran-media — shared service interfaces & payload types
 *
 * Declared locally per the QMCP Blueprint V1.0 (§9). All services are
 * pack-local *neutral interfaces* satisfied by future NestJS services via
 * structural (duck) typing — same pattern as lados-video-production's
 * IFileService/IRenderService:
 *
 *   ITextGenerationService        → existing Lados AiService (Phase C wiring)
 *   ICurrentIssueResearchService  → apps/api/src/current-issue-research/ (Phase D)
 *   IQuranSourceService           → apps/api/src/religious-source/ QUL adapters (Phase B)
 *   IHadithVerificationService    → apps/api/src/religious-source/ Semak Hadis adapter (Phase B)
 *
 * None of these services exist yet — every node executor is an honest stub
 * that fails with a catalogued error code when its service is missing.
 */

// ── Neutral AI interface (Blueprint §9.3) ────────────────────────────────────

export interface ITextGenerationService {
  readonly isConfigured: boolean;

  runCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<string>;
}

// ── Current issue research (Blueprint §9.2) ──────────────────────────────────

export interface SourceProvenance {
  provider: string;
  sourceUrl: string;
  retrievedAt: string; // ISO-8601
}

export interface IssueCandidate {
  issueId: string;
  headline: string;
  summary: string;
  publishedAt?: string;
  sources: SourceProvenance[];
}

export interface ICurrentIssueResearchService {
  discoverIssues(input: {
    topics?: string[];
    sinceHours?: number;
    limit?: number;
  }): Promise<IssueCandidate[]>;
}

// ── Quran / tafsir source (Blueprint §9.4) ───────────────────────────────────

export interface QuranProvenance {
  provider: 'QUL';
  resourceType: string;
  resourceName: string;
  resourceId: string;
  language: string;
  sourceUrl: string;
  retrievedAt: string;
  datasetVersion?: string;
  contentHash?: string;
  licenseReference?: string;
}

export interface QuranReference {
  surah: number;
  ayahStart: number;
  ayahEnd?: number;
}

export interface QuranCandidate {
  reference: QuranReference;
  matchedThemes: string[];
  matchSource: string; // e.g. "ayah-topics" | "ayah-theme"
}

export interface QuranEvidence {
  evidenceId: string;
  reference: QuranReference;
  arabicText: string;
  translation: {
    text: string;
    sourceName: string;
    sourceId: string;
  };
  provenance: QuranProvenance;
  humanReviewStatus: 'pending' | 'approved' | 'rejected';
}

export interface TafsirEvidence {
  reference: QuranReference;
  sourceName: string;
  sourceId: string;
  language: string;
  retrievedText: string;
  summary?: string;
  summaryGeneratedByAI: boolean;
  provenance: QuranProvenance;
}

export interface QuranReferenceVerification {
  valid: boolean;
  reference: QuranReference;
  issues: string[];
}

export interface IQuranSourceService {
  searchAyahsByTheme(input: {
    themes: string[];
    query?: string;
    language?: string;
    limit?: number;
  }): Promise<QuranCandidate[]>;

  getAyah(input: {
    surah: number;
    ayah: number;
    translationId?: string;
  }): Promise<QuranEvidence>;

  getTafsir(input: {
    surah: number;
    ayah: number;
    tafsirIds: string[];
  }): Promise<TafsirEvidence[]>;

  verifyReference(input: QuranReference): Promise<QuranReferenceVerification>;
}

// ── Hadith verification (Blueprint §8, human-assisted MVP) ───────────────────

export interface HadithVerificationRecord {
  recordId: string;
  provider: 'Semak Hadis';
  sourceUrl: string;
  retrievedAt: string;
  recordTitle: string;
  statusLabel: string; // exact status from source — never reduced to a boolean
  references: string[];
  submittedBy: string;
  humanReviewStatus: 'pending' | 'approved' | 'rejected';
}

export interface IHadithVerificationService {
  createManualVerification(input: {
    sourceUrl: string;
    submittedBy: string;
  }): Promise<HadithVerificationRecord>;

  getVerification(recordId: string): Promise<HadithVerificationRecord>;
}

// ── Evidence bundle contract (Blueprint §15) ─────────────────────────────────

export interface EvidenceBundle {
  bundleVersion: '1.0';
  issue: {
    issueId: string;
    headline: string;
    summary: string;
    sources: SourceProvenance[];
    facts: string[];
    uncertainties: string[];
  };
  themes: string[];
  quranEvidence: Array<QuranEvidence & { tafsir: TafsirEvidence[] }>;
  hadithEvidence: HadithVerificationRecord[];
  warnings: string[];
  religiousReview: {
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy: string | null;
    reviewedAt: string | null;
    notes: string;
  };
  publicationReady: boolean;
}

// ── Script contract (Blueprint §12.2) ────────────────────────────────────────

export interface ShortVideoScene {
  sceneNumber: number;
  startSecond: number;
  endSecond: number;
  visualIntent: string;
  voiceover: string;
  onScreenText: string;
  emotion: string;
  evidenceRefs: string[];
}

export interface ShortVideoScript {
  title: string;
  durationSeconds: number;
  hook: string;
  scenes: ShortVideoScene[];
  caption: string;
  callToAction: string;
  sourceAppendix: string[];
}

// ── Validation contract (Blueprint §12.3) ────────────────────────────────────

export interface DakwahValidationResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  issues: string[];
  requiredHumanActions: string[];
  publicationBlocked: boolean;
}

// ── Common AI-output envelope (Blueprint §12.1) ──────────────────────────────

export interface AiAdvisoryEnvelope {
  advisory: true;
  requiresHumanReview: true;
  evidenceRefs: string[];
  warnings: string[];
}
