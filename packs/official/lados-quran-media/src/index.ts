/**
 * @lados/official-quran-media
 *
 * Quran Media Creator Pack (QMCP) — official Capability Pack (L2) per
 * "LADOS_Quran_Media_Creator_Pack_QMCP_Blueprint_V1.0.md" (test-data/).
 * Transforms a current issue into a Quran-centred short-form dakwah content
 * package: evidence first, reflection second, publication only after human
 * review. Registry metadata lives in ../manifest.json + ../nodes.json (read
 * by OfficialPackLoaderService); this package supplies runtime behavior only.
 *
 * Honesty note (Phase A skeleton): ALL 13 executors are honest stubs — every
 * node validates its inputs deterministically, then fails with a catalogued
 * error code (Blueprint §16) because none of the backing services exist yet:
 *   - IQuranSourceService / IHadithVerificationService → religious-source
 *     module + QUL/Semak Hadis adapters (Phase B)
 *   - ITextGenerationService → neutral wrapper over the existing AiService
 *     (Phase C)
 *   - ICurrentIssueResearchService → current-issue-research module (Phase D)
 * nodes.json marks every node `executorStatus: "stub"` and the manifest's
 * runtimeStatus is `stub_executors`. No node ever fabricates a Quran
 * reference, translation, tafsir, hadith, news fact, or successful result.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { discoverCurrentIssues } from './nodes/discover-current-issues';
import { rankIssueCandidates } from './nodes/rank-issue-candidates';
import { analyzeHumanImpact } from './nodes/analyze-human-impact';
import { mapIslamicThemes } from './nodes/map-islamic-themes';
import { findQuranCandidates } from './nodes/find-quran-candidates';
import { retrieveQuranEvidence } from './nodes/retrieve-quran-evidence';
import { retrieveTafsirContext } from './nodes/retrieve-tafsir-context';
import { verifyHadithReference } from './nodes/verify-hadith-reference';
import { buildEvidenceBundle } from './nodes/build-evidence-bundle';
import { composeReflection } from './nodes/compose-reflection';
import { writeShortVideoScript } from './nodes/write-short-video-script';
import { validateDakwahContent } from './nodes/validate-dakwah-content';
import { prepareMediaBrief } from './nodes/prepare-media-brief';

export {
  discoverCurrentIssues,
  rankIssueCandidates,
  analyzeHumanImpact,
  mapIslamicThemes,
  findQuranCandidates,
  retrieveQuranEvidence,
  retrieveTafsirContext,
  verifyHadithReference,
  buildEvidenceBundle,
  composeReflection,
  writeShortVideoScript,
  validateDakwahContent,
  prepareMediaBrief,
};
export * from './prompts/shared-guardrails';
export type {
  ITextGenerationService,
  ICurrentIssueResearchService,
  IQuranSourceService,
  IHadithVerificationService,
  IssueCandidate,
  QuranCandidate,
  QuranEvidence,
  TafsirEvidence,
  QuranReferenceVerification,
  HadithVerificationRecord,
  EvidenceBundle,
  ShortVideoScript,
  ShortVideoScene,
  DakwahValidationResult,
} from './types';

export const PACK_ID = 'lados.quran-media' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface QuranMediaServices {
  aiService?: import('./types').ITextGenerationService;
  currentIssueResearchService?: import('./types').ICurrentIssueResearchService;
  quranSourceService?: import('./types').IQuranSourceService;
  hadithVerificationService?: import('./types').IHadithVerificationService;
}

/**
 * Returns the executor for a lados.quran_media node type, or null if unknown.
 * Call once in buildRealNodeResolver, injecting NestJS services (Phases B–D).
 * The resolver table matches Blueprint §17.1 exactly so future service wiring
 * never changes a node contract.
 */
export function resolveNode(
  services: QuranMediaServices = {},
): (nodeType: string) => NodeExecutor | null {
  const { aiService, currentIssueResearchService, quranSourceService, hadithVerificationService } =
    services;

  const nodes: Record<string, NodeExecutor> = {
    'lados.quran_media.discover_current_issues': (ctx) =>
      discoverCurrentIssues(ctx, currentIssueResearchService),
    'lados.quran_media.rank_issue_candidates': (ctx) => rankIssueCandidates(ctx, aiService),
    'lados.quran_media.analyze_human_impact': (ctx) => analyzeHumanImpact(ctx, aiService),
    'lados.quran_media.map_islamic_themes': (ctx) => mapIslamicThemes(ctx, aiService),
    'lados.quran_media.find_quran_candidates': (ctx) =>
      findQuranCandidates(ctx, quranSourceService, aiService),
    'lados.quran_media.retrieve_quran_evidence': (ctx) =>
      retrieveQuranEvidence(ctx, quranSourceService),
    'lados.quran_media.retrieve_tafsir_context': (ctx) =>
      retrieveTafsirContext(ctx, quranSourceService),
    'lados.quran_media.verify_hadith_reference': (ctx) =>
      verifyHadithReference(ctx, hadithVerificationService),
    'lados.quran_media.build_evidence_bundle': (ctx) => buildEvidenceBundle(ctx),
    'lados.quran_media.compose_reflection': (ctx) => composeReflection(ctx, aiService),
    'lados.quran_media.write_short_video_script': (ctx) => writeShortVideoScript(ctx, aiService),
    'lados.quran_media.validate_dakwah_content': (ctx) => validateDakwahContent(ctx, aiService),
    'lados.quran_media.prepare_media_brief': (ctx) => prepareMediaBrief(ctx, aiService),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
