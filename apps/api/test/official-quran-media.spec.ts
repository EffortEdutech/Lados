/**
 * @lados/official-quran-media — manifest <-> executor contract + per-node
 * tests (Phase F, per QMCP Volume 2 §7 "Unit Test Plan Matrix").
 *
 * Covers all 13 nodes with, per Volume 2 §7's table: missing-input,
 * missing-service, invalid-AI-JSON (where the node has an AI boundary), and
 * a domain-specific safety test for each. Two tests are marked CRITICAL in
 * Volume 2 §7 and are the actual code-level enforcement points, not UI
 * conventions — both exist here, independent of everything else in this
 * file:
 *   - compose_reflection: RELIGIOUS_REVIEW_REQUIRED gate enforcement (Gate 2)
 *   - validate_dakwah_content: deterministic checks run even if the AI
 *     advisory pass is unavailable or degrades — validation must never
 *     silently no-op.
 *
 * Fixtures below are small, obviously-invented sample data (not real QUL/
 * Semak Hadis content) — consistent with Volume 1 §21.3's "small legal test
 * fixtures, not full production datasets" rule.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ITextGenerationService,
  type ICurrentIssueResearchService,
  type IQuranSourceService,
  type IHadithVerificationService,
  type IssueCandidate,
  type QuranEvidence,
  type TafsirEvidence,
  type HadithVerificationRecord,
  type EvidenceBundle,
  type ShortVideoScript,
} from '@lados/official-quran-media';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-quran-media/nodes.json'), 'utf8'),
);

// ── Fake services ────────────────────────────────────────────────────────────

/** Always returns the same JSON-encoded response, regardless of call count. */
function fakeAiService(response: unknown, configured = true): ITextGenerationService {
  return {
    isConfigured: configured,
    runCompletion: jest.fn().mockResolvedValue(JSON.stringify(response)),
  };
}

/** Never parses as JSON — exercises the one-repair-then-fail path fully (2 calls, both invalid). */
function fakeAiServiceInvalidJson(): ITextGenerationService {
  return {
    isConfigured: true,
    runCompletion: jest.fn().mockResolvedValue('this is not json'),
  };
}

function fakeAiServiceThrows(message = 'upstream AI call failed'): ITextGenerationService {
  return {
    isConfigured: true,
    runCompletion: jest.fn().mockRejectedValue(new Error(message)),
  };
}

function fakeAiServiceUnconfigured(): ITextGenerationService {
  return { isConfigured: false, runCompletion: jest.fn() };
}

function fakeResearchService(issues: IssueCandidate[] | (() => Promise<IssueCandidate[]>)): ICurrentIssueResearchService {
  return {
    discoverIssues: jest.fn().mockImplementation(async () => (typeof issues === 'function' ? issues() : issues)),
  };
}

function fakeQuranSourceService(overrides: Partial<IQuranSourceService> = {}): IQuranSourceService {
  return {
    searchAyahsByTheme: jest.fn().mockResolvedValue([]),
    getAyah: jest.fn().mockResolvedValue(makeQuranEvidence()),
    getTafsir: jest.fn().mockResolvedValue([]),
    verifyReference: jest.fn().mockResolvedValue({ valid: true, reference: { surah: 2, ayahStart: 155 }, issues: [] }),
    ...overrides,
  };
}

function fakeHadithService(overrides: Partial<IHadithVerificationService> = {}): IHadithVerificationService {
  return {
    createManualVerification: jest.fn().mockResolvedValue(makeHadithRecord()),
    getVerification: jest.fn().mockResolvedValue(makeHadithRecord()),
    ...overrides,
  };
}

// ── Fixtures (small, invented, non-production — Volume 1 §21.3) ────────────

function makeIssue(id = 'issue-1'): IssueCandidate {
  return {
    issueId: id,
    headline: 'Banjir kilat melanda kawasan pinggir bandar',
    summary: 'Hujan lebat menyebabkan banjir kilat; ratusan penduduk dipindahkan ke pusat pemindahan sementara.',
    publishedAt: '2026-07-16T08:00:00.000Z',
    sources: [{ provider: 'Contoh Berita', sourceUrl: 'https://example.com/banjir', retrievedAt: '2026-07-16T09:00:00.000Z' }],
  };
}

function makeQuranEvidence(evidenceId = 'ev-2-155', surah = 2, ayahStart = 155): QuranEvidence {
  return {
    evidenceId,
    reference: { surah, ayahStart },
    arabicText: 'وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ',
    translation: {
      text: 'And We will surely test you with something of fear and hunger.',
      sourceName: 'Saheeh International',
      sourceId: 'en-saheeh',
    },
    provenance: {
      provider: 'QUL',
      resourceType: 'translation',
      resourceName: 'Saheeh International',
      resourceId: 'en-saheeh',
      language: 'en',
      sourceUrl: 'https://qul.tarteel.ai/resources',
      retrievedAt: '2026-07-01T00:00:00.000Z',
    },
    humanReviewStatus: 'pending',
  };
}

function makeTafsirEvidence(surah = 2, ayahStart = 155, sourceName = 'Ibn Kathir'): TafsirEvidence {
  return {
    reference: { surah, ayahStart },
    sourceName,
    sourceId: 'ibn-kathir-en',
    language: 'en',
    retrievedText: 'Allah tests His servants with fear, hunger, and loss of wealth to distinguish the patient.',
    summaryGeneratedByAI: false,
    provenance: {
      provider: 'QUL',
      resourceType: 'tafsir',
      resourceName: sourceName,
      resourceId: 'ibn-kathir-en',
      language: 'en',
      sourceUrl: 'https://qul.tarteel.ai/resources',
      retrievedAt: '2026-07-01T00:00:00.000Z',
    },
  };
}

function makeHadithRecord(status: 'pending' | 'approved' = 'pending'): HadithVerificationRecord {
  return {
    recordId: 'hadith-1',
    provider: 'Semak Hadis',
    sourceUrl: 'https://semakhadis.com/record/123',
    retrievedAt: '2026-07-01T00:00:00.000Z',
    recordTitle: 'Contoh rekod hadis',
    statusLabel: 'Hasan (sanad hasan, sedikit diperselisihkan)',
    references: ['HR. Tirmidzi'],
    submittedBy: 'reviewer-1',
    humanReviewStatus: status,
  };
}

function makeBundle(religiousReviewStatus: 'pending' | 'approved' | 'rejected' = 'approved'): EvidenceBundle {
  return {
    bundleVersion: '1.0',
    issue: { issueId: 'issue-1', headline: makeIssue().headline, summary: makeIssue().summary, sources: [], facts: [], uncertainties: [] },
    themes: ['sabr/patience'],
    quranEvidence: [{ ...makeQuranEvidence(), tafsir: [makeTafsirEvidence()] }],
    hadithEvidence: [],
    warnings: [],
    religiousReview: {
      status: religiousReviewStatus,
      reviewedBy: religiousReviewStatus === 'approved' ? 'reviewer-1' : null,
      reviewedAt: religiousReviewStatus === 'approved' ? '2026-07-16T10:00:00.000Z' : null,
      notes: religiousReviewStatus === 'approved' ? 'Confirmed reference, translation and tafsir.' : '',
    },
    publicationReady: false,
  };
}

function makeScript(evidenceRefs: string[] = ['ev-2-155']): ShortVideoScript {
  return {
    title: 'Ujian dan Sabar',
    durationSeconds: 45,
    hook: 'Pernahkah kita rasa diuji melampaui had?',
    scenes: [
      {
        sceneNumber: 1,
        startSecond: 0,
        endSecond: 15,
        visualIntent: 'Tenang, hujan jatuh perlahan di tingkap',
        voiceover: 'Marilah kita renungkan ujian yang menimpa insan.',
        onScreenText: 'Ujian itu pasti',
        emotion: 'reflective',
        evidenceRefs,
      },
      {
        sceneNumber: 2,
        startSecond: 15,
        endSecond: 45,
        visualIntent: 'Cahaya lembut, tangan menadah doa',
        voiceover: 'Semoga kita mampu bersabar dan terus bersyukur.',
        onScreenText: 'Sabar itu indah',
        emotion: 'hopeful',
        evidenceRefs,
      },
    ],
    caption: 'Ujian datang, sabar itu penawar.',
    callToAction: 'Renungkan bersama, kongsi jika ia menyentuh hati.',
    sourceAppendix: ['Saheeh International', 'Ibn Kathir'],
  };
}

// ── Contract test ─────────────────────────────────────────────────────────

describe('official-quran-media — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      aiService: fakeAiService({}),
      currentIssueResearchService: fakeResearchService([]),
      quranSourceService: fakeQuranSourceService(),
      hadithVerificationService: fakeHadithService(),
    });
    for (const m of manifests) {
      expect(typeof resolve(m.type)).toBe('function');
    }
  });

  it('all 13 nodes are honestly marked implemented (no stubs remain post-Phase-D)', () => {
    expect(manifests).toHaveLength(13);
    for (const m of manifests) {
      expect(m.executorStatus).toBe('implemented');
    }
  });

  it('unknown node types resolve to null', () => {
    const resolve = resolveNode();
    expect(resolve('lados.quran_media.does_not_exist')).toBeNull();
  });
});

// ── discover_current_issues ─────────────────────────────────────────────────

describe('lados.quran_media.discover_current_issues', () => {
  const exec = () => resolveNode({ currentIssueResearchService: undefined })('lados.quran_media.discover_current_issues')!;

  it('fails with RESEARCH_SERVICE_NOT_CONFIGURED when no service is wired', async () => {
    const { ctx } = createMockNodeContext({});
    const result = await exec()(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('RESEARCH_SERVICE_NOT_CONFIGURED');
  });

  it('fails with NO_CURRENT_ISSUES_FOUND on a zero-results source (domain test)', async () => {
    const research = fakeResearchService([]);
    const { ctx } = createMockNodeContext({});
    const result = await resolveNode({ currentIssueResearchService: research })('lados.quran_media.discover_current_issues')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_CURRENT_ISSUES_FOUND');
  });

  it('maps a service throw to SOURCE_FETCH_FAILED (domain test)', async () => {
    const research = fakeResearchService(() => {
      throw new Error('all sources unreachable');
    });
    const { ctx } = createMockNodeContext({});
    const result = await resolveNode({ currentIssueResearchService: research })('lados.quran_media.discover_current_issues')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('SOURCE_FETCH_FAILED');
  });

  it('preserves a service-tagged error code (e.g. SOURCE_DATE_INVALID) instead of the default', async () => {
    const research = fakeResearchService(() => {
      const err = new Error('no items had a parseable date') as Error & { code?: string };
      err.code = 'SOURCE_DATE_INVALID';
      throw err;
    });
    const { ctx } = createMockNodeContext({});
    const result = await resolveNode({ currentIssueResearchService: research })('lados.quran_media.discover_current_issues')!(ctx);
    expect(result.error?.code).toBe('SOURCE_DATE_INVALID');
  });

  it('succeeds and returns issues from the configured service', async () => {
    const research = fakeResearchService([makeIssue('issue-1'), makeIssue('issue-2')]);
    const { ctx } = createMockNodeContext({ config: { topics: ['kemanusiaan'], sinceHours: 48, limit: 10 } });
    const result = await resolveNode({ currentIssueResearchService: research })('lados.quran_media.discover_current_issues')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['issues']).toHaveLength(2);
  });
});

// ── rank_issue_candidates ────────────────────────────────────────────────────

describe('lados.quran_media.rank_issue_candidates', () => {
  const NODE = 'lados.quran_media.rank_issue_candidates';

  it('fails with MISSING_INPUT when issues is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with AI_SERVICE_NOT_CONFIGURED when no AI service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { issues: [makeIssue()] } });
    const result = await resolveNode({ aiService: fakeAiServiceUnconfigured() })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('AI_SERVICE_NOT_CONFIGURED');
  });

  it('fails with INVALID_AI_RESPONSE when the AI never returns valid JSON', async () => {
    const { ctx } = createMockNodeContext({ inputs: { issues: [makeIssue()] } });
    const result = await resolveNode({ aiService: fakeAiServiceInvalidJson() })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('domain test: drops an AI-invented issueId not present in the input', async () => {
    const issues = [makeIssue('issue-1'), makeIssue('issue-2')];
    const ai = fakeAiService({
      ranked: [
        { issueId: 'issue-1', score: 80, rationale: 'Relevant and dignified framing.', warnings: [] },
        { issueId: 'issue-hallucinated', score: 99, rationale: 'Invented by the model.', warnings: [] },
      ],
    });
    const { ctx } = createMockNodeContext({ inputs: { issues } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const ranked = result.outputs['ranked'] as Array<{ issueId: string }>;
    expect(ranked).toHaveLength(1);
    expect(ranked.map((r) => r.issueId)).toEqual(['issue-1']);
  });
});

// ── analyze_human_impact ─────────────────────────────────────────────────────

describe('lados.quran_media.analyze_human_impact', () => {
  const NODE = 'lados.quran_media.analyze_human_impact';

  it('fails with MISSING_INPUT when issue is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with AI_SERVICE_NOT_CONFIGURED when no AI service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { issue: makeIssue() } });
    const result = await resolveNode({ aiService: fakeAiServiceUnconfigured() })(NODE)!(ctx);
    expect(result.error?.code).toBe('AI_SERVICE_NOT_CONFIGURED');
  });

  it('fails with INVALID_AI_RESPONSE on unparseable AI output', async () => {
    const { ctx } = createMockNodeContext({ inputs: { issue: makeIssue() } });
    const result = await resolveNode({ aiService: fakeAiServiceInvalidJson() })(NODE)!(ctx);
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('domain test: rejects AI output containing causal/theological (punishment) framing', async () => {
    const ai = fakeAiService({
      verifiedFacts: ['Banjir berlaku selepas hujan lebat.'],
      humanImpact: 'Mereka dihukum kerana kelalaian mereka sendiri.',
      uncertainties: [],
      sensitivityFlags: ['involves death'],
    });
    const { ctx } = createMockNodeContext({ inputs: { issue: makeIssue() } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('succeeds with clean, non-causal AI output', async () => {
    const ai = fakeAiService({
      verifiedFacts: ['Banjir kilat berlaku di kawasan pinggir bandar.'],
      humanImpact: 'Ratusan penduduk terpaksa berpindah sementara.',
      uncertainties: ['Punca tepat kerosakan harta belum disahkan.'],
      sensitivityFlags: [],
    });
    const { ctx } = createMockNodeContext({ inputs: { issue: makeIssue() } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['impact']).toMatchObject({ advisory: true, requiresHumanReview: true });
  });
});

// ── map_islamic_themes ───────────────────────────────────────────────────────

describe('lados.quran_media.map_islamic_themes', () => {
  const NODE = 'lados.quran_media.map_islamic_themes';
  const impact = { humanImpact: 'Ratusan penduduk terpaksa berpindah.', verifiedFacts: [], uncertainties: [], sensitivityFlags: [] };

  it('fails with MISSING_INPUT when impact is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with AI_SERVICE_NOT_CONFIGURED when no AI service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { impact } });
    const result = await resolveNode({ aiService: fakeAiServiceUnconfigured() })(NODE)!(ctx);
    expect(result.error?.code).toBe('AI_SERVICE_NOT_CONFIGURED');
  });

  it('fails with INVALID_AI_RESPONSE on unparseable AI output', async () => {
    const { ctx } = createMockNodeContext({ inputs: { impact } });
    const result = await resolveNode({ aiService: fakeAiServiceInvalidJson() })(NODE)!(ctx);
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('domain test: rejects a theme response that leaks a specific ayah reference', async () => {
    const ai = fakeAiService({
      themes: [
        { theme: 'sabr/patience', rationale: 'Lihat surah 2:155 untuk konteks ujian dan kesabaran.' },
      ],
    });
    const { ctx } = createMockNodeContext({ inputs: { impact } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('succeeds with theme-only output (no ayah leak)', async () => {
    const ai = fakeAiService({ themes: [{ theme: 'sabr/patience', rationale: 'Ujian dan ketabahan menghadapi kesukaran.' }] });
    const { ctx } = createMockNodeContext({ inputs: { impact } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['themes']).toHaveLength(1);
  });
});

// ── find_quran_candidates ────────────────────────────────────────────────────

describe('lados.quran_media.find_quran_candidates', () => {
  const NODE = 'lados.quran_media.find_quran_candidates';

  it('fails with MISSING_INPUT when themes is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with RELIGIOUS_DATA_PATH_NOT_CONFIGURED when no Quran source service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { themes: ['sabr/patience'] } });
    const result = await resolveNode({ quranSourceService: undefined })(NODE)!(ctx);
    expect(result.error?.code).toBe('RELIGIOUS_DATA_PATH_NOT_CONFIGURED');
  });

  it('domain test: fails with NO_QURAN_CANDIDATES_FOUND on an empty dataset match', async () => {
    const quranSourceService = fakeQuranSourceService({ searchAyahsByTheme: jest.fn().mockResolvedValue([]) });
    const { ctx } = createMockNodeContext({ inputs: { themes: ['sabr/patience'] } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_QURAN_CANDIDATES_FOUND');
  });

  it('succeeds with dataset-backed candidates, never invented', async () => {
    const candidates = [{ reference: { surah: 2, ayahStart: 155 }, matchedThemes: ['sabr/patience'], matchSource: 'ayah-topics' }];
    const quranSourceService = fakeQuranSourceService({ searchAyahsByTheme: jest.fn().mockResolvedValue(candidates) });
    const { ctx } = createMockNodeContext({ inputs: { themes: ['sabr/patience'] } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['candidates']).toEqual(candidates);
  });
});

// ── retrieve_quran_evidence ──────────────────────────────────────────────────

describe('lados.quran_media.retrieve_quran_evidence', () => {
  const NODE = 'lados.quran_media.retrieve_quran_evidence';
  const candidates = [{ reference: { surah: 2, ayahStart: 155 } }];

  it('fails with MISSING_INPUT when candidates is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with RELIGIOUS_DATA_PATH_NOT_CONFIGURED when no Quran source service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { candidates } });
    const result = await resolveNode({ quranSourceService: undefined })(NODE)!(ctx);
    expect(result.error?.code).toBe('RELIGIOUS_DATA_PATH_NOT_CONFIGURED');
  });

  it('domain test: an invalid/unresolvable reference stops the whole run, never drops silently', async () => {
    const quranSourceService = fakeQuranSourceService({
      getAyah: jest.fn().mockRejectedValue(Object.assign(new Error('ayah not found'), { code: 'INVALID_QURAN_REFERENCE' })),
    });
    const { ctx } = createMockNodeContext({ inputs: { candidates } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_QURAN_REFERENCE');
  });

  it('fails with INVALID_QURAN_REFERENCE when a candidate has a malformed reference', async () => {
    const quranSourceService = fakeQuranSourceService();
    const { ctx } = createMockNodeContext({ inputs: { candidates: [{ reference: { surah: 'two' } }] } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_QURAN_REFERENCE');
  });

  it('domain test: provenance is always populated on every retrieved item', async () => {
    const quranSourceService = fakeQuranSourceService({ getAyah: jest.fn().mockResolvedValue(makeQuranEvidence()) });
    const { ctx } = createMockNodeContext({ inputs: { candidates } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const evidence = result.outputs['quranEvidence'] as QuranEvidence[];
    expect(evidence).toHaveLength(1);
    expect(evidence[0].provenance).toBeDefined();
    expect(evidence[0].provenance.provider).toBe('QUL');
  });

  it('expands an ayah range into one evidence item per ayah', async () => {
    const getAyah = jest.fn().mockImplementation(async ({ ayah }: { ayah: number }) => makeQuranEvidence(`ev-2-${ayah}`, 2, ayah));
    const quranSourceService = fakeQuranSourceService({ getAyah });
    const { ctx } = createMockNodeContext({ inputs: { candidates: [{ reference: { surah: 2, ayahStart: 1, ayahEnd: 3 } }] } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['quranEvidence']).toHaveLength(3);
    expect(getAyah).toHaveBeenCalledTimes(3);
  });
});

// ── retrieve_tafsir_context ──────────────────────────────────────────────────

describe('lados.quran_media.retrieve_tafsir_context', () => {
  const NODE = 'lados.quran_media.retrieve_tafsir_context';
  const quranEvidence = [makeQuranEvidence()];

  it('fails with MISSING_INPUT when quranEvidence is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with TAFSIR_NOT_CONFIGURED when no Quran source service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { quranEvidence } });
    const result = await resolveNode({ quranSourceService: undefined })(NODE)!(ctx);
    expect(result.error?.code).toBe('TAFSIR_NOT_CONFIGURED');
  });

  it('domain test: multiple tafsir sources for the same ayah are never merged into one item', async () => {
    const items = [makeTafsirEvidence(2, 155, 'Ibn Kathir'), makeTafsirEvidence(2, 155, 'As-Saadi')];
    const quranSourceService = fakeQuranSourceService({ getTafsir: jest.fn().mockResolvedValue(items) });
    const { ctx } = createMockNodeContext({ inputs: { quranEvidence } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const tafsirEvidence = result.outputs['tafsirEvidence'] as TafsirEvidence[];
    expect(tafsirEvidence).toHaveLength(2);
    expect(new Set(tafsirEvidence.map((t) => t.sourceName))).toEqual(new Set(['Ibn Kathir', 'As-Saadi']));
  });

  it('is non-fatal (still succeeds) when tafsir is missing for one ayah', async () => {
    const quranSourceService = fakeQuranSourceService({ getTafsir: jest.fn().mockResolvedValue([]) });
    const { ctx } = createMockNodeContext({ inputs: { quranEvidence } });
    const result = await resolveNode({ quranSourceService })(NODE)!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['tafsirEvidence']).toEqual([]);
  });
});

// ── verify_hadith_reference ──────────────────────────────────────────────────

describe('lados.quran_media.verify_hadith_reference', () => {
  const NODE = 'lados.quran_media.verify_hadith_reference';

  it('fails with HADITH_SOURCE_URL_REQUIRED when sourceUrl is missing (config-driven)', async () => {
    const { ctx } = createMockNodeContext({ config: { sourceUrl: '', submittedBy: 'reviewer-1' } });
    const result = await resolveNode({ hadithVerificationService: fakeHadithService() })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('HADITH_SOURCE_URL_REQUIRED');
  });

  it('fails with HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED when no service is wired', async () => {
    const { ctx } = createMockNodeContext({ config: { sourceUrl: 'https://semakhadis.com/record/123', submittedBy: 'reviewer-1' } });
    const result = await resolveNode({ hadithVerificationService: undefined })(NODE)!(ctx);
    expect(result.error?.code).toBe('HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED');
  });

  it('domain test: statusLabel is preserved exactly as returned, never reduced to a boolean', async () => {
    const exactLabel = 'Hasan (sanad hasan, sedikit diperselisihkan oleh ulama hadis)';
    const hadithVerificationService = fakeHadithService({
      createManualVerification: jest.fn().mockResolvedValue({ ...makeHadithRecord(), statusLabel: exactLabel }),
    });
    const { ctx } = createMockNodeContext({ config: { sourceUrl: 'https://semakhadis.com/record/123', submittedBy: 'reviewer-1' } });
    const result = await resolveNode({ hadithVerificationService })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const evidence = result.outputs['hadithEvidence'] as HadithVerificationRecord;
    expect(evidence.statusLabel).toBe(exactLabel);
    expect(typeof evidence.statusLabel).toBe('string');
    expect(evidence.humanReviewStatus).toBe('pending');
  });
});

// ── build_evidence_bundle ────────────────────────────────────────────────────

describe('lados.quran_media.build_evidence_bundle', () => {
  const NODE = 'lados.quran_media.build_evidence_bundle';

  it('fails with MISSING_INPUT when quranEvidence is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { issue: makeIssue() } });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with EVIDENCE_BUNDLE_INVALID when requireTafsir is true but tafsir is missing', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { issue: makeIssue(), themes: ['sabr/patience'], quranEvidence: [makeQuranEvidence()], tafsirEvidence: [] },
      config: { requireTafsir: true },
    });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('EVIDENCE_BUNDLE_INVALID');
  });

  it('domain test: religiousReview.status always starts "pending" and publicationReady starts false', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        issue: makeIssue(),
        themes: ['sabr/patience'],
        quranEvidence: [makeQuranEvidence()],
        tafsirEvidence: [makeTafsirEvidence()],
      },
      config: { requireTafsir: true },
    });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.status).toBe('success');
    const bundle = result.outputs['bundle'] as EvidenceBundle;
    expect(bundle.religiousReview.status).toBe('pending');
    expect(bundle.publicationReady).toBe(false);
    expect(bundle.bundleVersion).toBe('1.0');
  });

  it('retains unapproved hadith evidence with a warning rather than dropping it', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        issue: makeIssue(),
        themes: [],
        quranEvidence: [makeQuranEvidence()],
        tafsirEvidence: [makeTafsirEvidence()],
        hadithEvidence: makeHadithRecord('pending'),
      },
      config: { requireTafsir: true },
    });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.status).toBe('success');
    const bundle = result.outputs['bundle'] as EvidenceBundle;
    expect(bundle.hadithEvidence).toHaveLength(1);
    expect(bundle.warnings.some((w) => w.includes('not yet approved'))).toBe(true);
  });
});

// ── compose_reflection (CRITICAL: Gate 2 enforcement) ────────────────────────

describe('lados.quran_media.compose_reflection', () => {
  const NODE = 'lados.quran_media.compose_reflection';

  it('fails with MISSING_INPUT when bundle is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with AI_SERVICE_NOT_CONFIGURED when no AI service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { bundle: makeBundle('approved') } });
    const result = await resolveNode({ aiService: fakeAiServiceUnconfigured() })(NODE)!(ctx);
    expect(result.error?.code).toBe('AI_SERVICE_NOT_CONFIGURED');
  });

  it('CRITICAL — refuses a bundle whose religiousReview.status is "pending", even with a configured AI service', async () => {
    const ai = fakeAiService({ text: 'Should never be reached.', evidenceRefs: [], warnings: [] });
    const { ctx } = createMockNodeContext({ inputs: { bundle: makeBundle('pending') } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('RELIGIOUS_REVIEW_REQUIRED');
    expect((ai.runCompletion as jest.Mock)).not.toHaveBeenCalled();
  });

  it('CRITICAL — refuses a bundle whose religiousReview.status is "rejected"', async () => {
    const ai = fakeAiService({ text: 'x', evidenceRefs: [], warnings: [] });
    const { ctx } = createMockNodeContext({ inputs: { bundle: makeBundle('rejected') } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.error?.code).toBe('RELIGIOUS_REVIEW_REQUIRED');
  });

  it('fails with INVALID_AI_RESPONSE on unparseable AI output', async () => {
    const { ctx } = createMockNodeContext({ inputs: { bundle: makeBundle('approved') } });
    const result = await resolveNode({ aiService: fakeAiServiceInvalidJson() })(NODE)!(ctx);
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('fails with EVIDENCE_BUNDLE_INVALID when the reflection cites an evidenceId not in the bundle (hallucination guard)', async () => {
    const ai = fakeAiService({ text: 'Marilah kita renungkan...', evidenceRefs: ['ev-does-not-exist'], warnings: [] });
    const { ctx } = createMockNodeContext({ inputs: { bundle: makeBundle('approved') } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('EVIDENCE_BUNDLE_INVALID');
  });

  it('fails with INVALID_AI_RESPONSE when the reflection text uses prohibited (avoid-register) phrasing', async () => {
    const ai = fakeAiService({ text: 'Mereka dihukum kerana kelalaian mereka.', evidenceRefs: ['ev-2-155'], warnings: [] });
    const { ctx } = createMockNodeContext({ inputs: { bundle: makeBundle('approved') } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('succeeds when the bundle is approved, citations resolve, and register is clean', async () => {
    const ai = fakeAiService({ text: 'Marilah kita renungkan ujian yang menimpa dengan penuh kesabaran.', evidenceRefs: ['ev-2-155'], warnings: [] });
    const { ctx } = createMockNodeContext({ inputs: { bundle: makeBundle('approved') } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['reflection']).toMatchObject({ advisory: true, requiresHumanReview: true });
  });
});

// ── write_short_video_script ─────────────────────────────────────────────────

describe('lados.quran_media.write_short_video_script', () => {
  const NODE = 'lados.quran_media.write_short_video_script';
  const reflection = { text: 'Marilah kita renungkan...', evidenceRefs: ['ev-2-155'] };

  it('fails with MISSING_INPUT when reflection is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with AI_SERVICE_NOT_CONFIGURED when no AI service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { reflection } });
    const result = await resolveNode({ aiService: fakeAiServiceUnconfigured() })(NODE)!(ctx);
    expect(result.error?.code).toBe('AI_SERVICE_NOT_CONFIGURED');
  });

  it('fails with INVALID_AI_RESPONSE on unparseable AI output', async () => {
    const { ctx } = createMockNodeContext({ inputs: { reflection } });
    const result = await resolveNode({ aiService: fakeAiServiceInvalidJson() })(NODE)!(ctx);
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('domain test: fails with EVIDENCE_BUNDLE_INVALID when a scene has empty evidenceRefs', async () => {
    const script = makeScript(['ev-2-155']);
    script.scenes[1].evidenceRefs = [];
    const ai = fakeAiService(script);
    const { ctx } = createMockNodeContext({ inputs: { reflection }, config: { durationSeconds: 45 } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('EVIDENCE_BUNDLE_INVALID');
  });

  it('fails with INVALID_AI_RESPONSE when scene timings do not sum to the requested duration', async () => {
    const script = makeScript(['ev-2-155']);
    script.scenes[1].endSecond = 20; // total ~20s, requested 45s, outside ±2s tolerance
    const ai = fakeAiService(script);
    const { ctx } = createMockNodeContext({ inputs: { reflection }, config: { durationSeconds: 45 } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('succeeds with a well-formed, fully evidence-grounded script', async () => {
    const ai = fakeAiService(makeScript(['ev-2-155']));
    const { ctx } = createMockNodeContext({ inputs: { reflection }, config: { durationSeconds: 45 } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const script = result.outputs['script'] as ShortVideoScript;
    expect(script.scenes).toHaveLength(2);
  });
});

// ── validate_dakwah_content (CRITICAL: deterministic checks never no-op) ────

describe('lados.quran_media.validate_dakwah_content', () => {
  const NODE = 'lados.quran_media.validate_dakwah_content';

  it('fails with MISSING_INPUT when script is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('CRITICAL — deterministic checks still run and flag issues with NO aiService wired (degrade, never no-op)', async () => {
    const badScript = makeScript(['ev-2-155']);
    badScript.scenes[0].evidenceRefs = []; // deterministic check a) should catch this
    const { ctx } = createMockNodeContext({ inputs: { script: badScript } });
    const result = await resolveNode({ aiService: undefined })(NODE)!(ctx);
    expect(result.status).toBe('success'); // the node itself never fails — it reports findings
    const validation = result.outputs['validation'] as { passed: boolean; publicationBlocked: boolean; issues: string[] };
    expect(validation.passed).toBe(false);
    expect(validation.publicationBlocked).toBe(true);
    expect(validation.issues.some((i) => i.includes('evidenceRefs'))).toBe(true);
  });

  it('CRITICAL — deterministic checks still run and pass a clean script even when the AI pass throws', async () => {
    const cleanScript = makeScript(['ev-2-155']);
    const { ctx } = createMockNodeContext({ inputs: { script: cleanScript, bundle: makeBundle('approved') } });
    const result = await resolveNode({ aiService: fakeAiServiceThrows() })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const validation = result.outputs['validation'] as { passed: boolean; publicationBlocked: boolean };
    expect(validation.passed).toBe(true);
    expect(validation.publicationBlocked).toBe(false);
  });

  it('CRITICAL — a clean script passes with no AI service wired at all', async () => {
    const cleanScript = makeScript(['ev-2-155']);
    const { ctx } = createMockNodeContext({ inputs: { script: cleanScript } });
    const result = await resolveNode({ aiService: undefined })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const validation = result.outputs['validation'] as { passed: boolean; publicationBlocked: boolean };
    expect(validation.passed).toBe(true);
    expect(validation.publicationBlocked).toBe(false);
    expect(result.outputs['publicationBlocked']).toBe(false);
  });

  it('domain test: unapproved hadith referenced in the script blocks publication', async () => {
    const script = makeScript(['ev-2-155']);
    script.sourceAppendix = [...script.sourceAppendix, 'Semak Hadis'];
    const bundle = makeBundle('approved');
    bundle.hadithEvidence = [makeHadithRecord('pending')];
    const { ctx } = createMockNodeContext({ inputs: { script, bundle } });
    const result = await resolveNode({ aiService: undefined })(NODE)!(ctx);
    const validation = result.outputs['validation'] as { publicationBlocked: boolean; issues: string[] };
    expect(validation.publicationBlocked).toBe(true);
  });

  it('phase F fix: also outputs a flat publicationBlocked boolean port alongside the nested validation object', async () => {
    const badScript = makeScript([]);
    badScript.scenes[0].evidenceRefs = [];
    badScript.scenes[1].evidenceRefs = [];
    const { ctx } = createMockNodeContext({ inputs: { script: badScript } });
    const result = await resolveNode({ aiService: undefined })(NODE)!(ctx);
    expect(result.outputs['publicationBlocked']).toBe((result.outputs['validation'] as { publicationBlocked: boolean }).publicationBlocked);
    expect(result.outputs['publicationBlocked']).toBe(true);
  });
});

// ── prepare_media_brief ──────────────────────────────────────────────────────

describe('lados.quran_media.prepare_media_brief', () => {
  const NODE = 'lados.quran_media.prepare_media_brief';

  it('fails with MISSING_INPUT when script is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const result = await resolveNode()(NODE)!(ctx);
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with AI_SERVICE_NOT_CONFIGURED when no AI service is wired', async () => {
    const { ctx } = createMockNodeContext({ inputs: { script: makeScript() } });
    const result = await resolveNode({ aiService: fakeAiServiceUnconfigured() })(NODE)!(ctx);
    expect(result.error?.code).toBe('AI_SERVICE_NOT_CONFIGURED');
  });

  it('fails with INVALID_AI_RESPONSE on unparseable AI output', async () => {
    const { ctx } = createMockNodeContext({ inputs: { script: makeScript() } });
    const result = await resolveNode({ aiService: fakeAiServiceInvalidJson() })(NODE)!(ctx);
    expect(result.error?.code).toBe('INVALID_AI_RESPONSE');
  });

  it('domain test: hard-coded visual restrictions are always present even when the AI response omits them', async () => {
    const ai = fakeAiService({ sceneIntent: [], voiceDirection: 'Calm and reflective.', additionalVisualRestrictions: [] });
    const { ctx } = createMockNodeContext({ inputs: { script: makeScript() } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('success');
    const brief = result.outputs['brief'] as { visualRestrictions: string[] };
    expect(brief.visualRestrictions).toEqual(expect.arrayContaining(['no graphic imagery', 'no identifiable vulnerable persons']));
  });

  it('flattens the approved script into scriptText/title ports unmodified, for the Video Production handoff', async () => {
    const ai = fakeAiService({ sceneIntent: [], voiceDirection: '', additionalVisualRestrictions: [] });
    const script = makeScript();
    const { ctx } = createMockNodeContext({ inputs: { script } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['title']).toBe(script.title);
    const scriptText = result.outputs['scriptText'] as string;
    expect(scriptText).toContain(script.hook);
    expect(scriptText).toContain(script.scenes[0].voiceover);
    expect(scriptText).toContain(script.scenes[1].voiceover);
    expect(scriptText).toContain(script.callToAction);
    // Order: hook, then scenes in sceneNumber order, then callToAction.
    expect(scriptText.indexOf(script.hook)).toBeLessThan(scriptText.indexOf(script.scenes[0].voiceover));
    expect(scriptText.indexOf(script.scenes[0].voiceover)).toBeLessThan(scriptText.indexOf(script.scenes[1].voiceover));
    expect(scriptText.indexOf(script.scenes[1].voiceover)).toBeLessThan(scriptText.indexOf(script.callToAction));
  });

  it('copies the approved script through unmodified (never paraphrased) inside the brief', async () => {
    const ai = fakeAiService({ sceneIntent: [], voiceDirection: '', additionalVisualRestrictions: [] });
    const script = makeScript();
    const { ctx } = createMockNodeContext({ inputs: { script } });
    const result = await resolveNode({ aiService: ai })(NODE)!(ctx);
    const brief = result.outputs['brief'] as { approvedScript: ShortVideoScript };
    expect(brief.approvedScript).toEqual(script);
  });
});
