/**
 * @lados/official-quran-media — end-to-end proxy chain (Phase F, per QMCP
 * Volume 2 §8 "E2E Acceptance Test Plan").
 *
 * Same proxy-E2E approach every other pack in this program has used before
 * a live NestJS/DB-backed pause-resume harness existed (see
 * official-wave2-e2e.spec.ts, official-video-production-e2e.spec.ts): this
 * test hand-chains real node executors from four packs
 * (workflow-foundation, human-work, video-production, quran-media)
 * in-process, using small invented fixtures (Volume 1 §21.3), to prove the
 * whole `issue-to-dakwah-video` template composes correctly end to end —
 * including the two real structural fixes from this phase (Gate 3/Gate R
 * context wiring and the cond-publication flat-boolean port; see
 * templates/README.md).
 *
 * Covers Volume 2 §8's numbered items:
 *   1-2. official pack discovery / manifest-nodes.json resolution — already
 *        covered by tools/validate-official-packs.cjs and the unit spec's
 *        contract test; not duplicated here.
 *   3. Full chain with all services stubbed against fixtures.
 *   4. Pause/resume at Gate 1, Gate 2, and Gate 3 — the gate executors
 *      genuinely return status:'paused' and never fabricate a decision;
 *      "resume" is modeled by supplying the human's data directly to the
 *      next node, exactly as apps/api's resumeRunWithInput/resumeRun do (the
 *      submitted payload becomes the paused node's output — the node
 *      function itself is not re-invoked on resume).
 *   5. Refusal path: compose_reflection called directly with a bundle whose
 *      religiousReview.status is still "pending" (bypassing the graph's
 *      normal Gate 2 wiring) must fail RELIGIOUS_REVIEW_REQUIRED, proving
 *      the enforcement lives in the node, not just the graph shape.
 *   6. validation.publicationBlocked === true routes to Gate R.
 *   7. Output handoff shape: prepare_media_brief's scriptText/title are
 *      accepted by lados.video.read_script for real (Phase E fix), and its
 *      script output feeds draft_scenes directly.
 */
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode as resolveQuranMedia,
  type ITextGenerationService,
  type IQuranSourceService,
  type ICurrentIssueResearchService,
  type IssueCandidate,
  type EvidenceBundle,
} from '@lados/official-quran-media';
import { resolveNode as resolveWorkflow } from '@lados/official-workflow-foundation';
import { resolveNode as resolveHumanWork, type IApprovalTaskService } from '@lados/official-human-work';
import { resolveNode as resolveVideoProduction, type IFileService } from '@lados/official-video-production';

function fakeAiService(response: unknown): ITextGenerationService {
  return { isConfigured: true, runCompletion: jest.fn().mockResolvedValue(JSON.stringify(response)) };
}

function makeIssue(id = 'issue-1'): IssueCandidate {
  return {
    issueId: id,
    headline: 'Banjir kilat melanda kawasan pinggir bandar',
    summary: 'Hujan lebat menyebabkan banjir kilat; ratusan penduduk dipindahkan ke pusat pemindahan sementara.',
    publishedAt: '2026-07-16T08:00:00.000Z',
    sources: [{ provider: 'Contoh Berita', sourceUrl: 'https://example.com/banjir', retrievedAt: '2026-07-16T09:00:00.000Z' }],
  };
}

describe('QMCP official E2E — issue-to-dakwah-video proxy chain', () => {
  it('resolves nodes across all four packs via one combined resolver', () => {
    const approvalService: IApprovalTaskService = { createTask: jest.fn().mockResolvedValue({ taskId: 't-1' }) };
    const resolvers = [
      resolveWorkflow(),
      resolveHumanWork({ approvalTaskService: approvalService }),
      resolveVideoProduction(),
      resolveQuranMedia({}),
    ];
    const resolveAny = (type: string) => resolvers.map((r) => r(type)).find((fn) => fn !== null) ?? null;

    expect(resolveAny('lados.workflow.trigger_manual')).not.toBeNull();
    expect(resolveAny('lados.human.request_input')).not.toBeNull();
    expect(resolveAny('lados.human.request_approval')).not.toBeNull();
    expect(resolveAny('lados.workflow.condition')).not.toBeNull();
    expect(resolveAny('lados.video.read_script')).not.toBeNull();
    expect(resolveAny('lados.video.draft_scenes')).not.toBeNull();
    for (const t of [
      'discover_current_issues', 'rank_issue_candidates', 'analyze_human_impact', 'map_islamic_themes',
      'find_quran_candidates', 'retrieve_quran_evidence', 'retrieve_tafsir_context', 'build_evidence_bundle',
      'compose_reflection', 'write_short_video_script', 'validate_dakwah_content', 'prepare_media_brief',
    ]) {
      expect(resolveAny(`lados.quran_media.${t}`)).not.toBeNull();
    }
  });

  it('runs the full chain in-process: discover -> Gate 1 -> ... -> Gate 3 -> brief -> Video Production handoff', async () => {
    // ── Services ──
    const currentIssueResearchService: ICurrentIssueResearchService = {
      discoverIssues: jest.fn().mockResolvedValue([makeIssue('issue-1'), makeIssue('issue-2')]),
    };
    const quranSourceService: IQuranSourceService = {
      searchAyahsByTheme: jest.fn().mockResolvedValue([{ reference: { surah: 2, ayahStart: 155 }, matchedThemes: ['sabr/patience'], matchSource: 'ayah-topics' }]),
      getAyah: jest.fn().mockResolvedValue({
        evidenceId: 'ev-2-155',
        reference: { surah: 2, ayahStart: 155 },
        arabicText: 'وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ',
        translation: { text: 'And We will surely test you with something of fear and hunger.', sourceName: 'Saheeh International', sourceId: 'en-saheeh' },
        provenance: { provider: 'QUL', resourceType: 'translation', resourceName: 'Saheeh International', resourceId: 'en-saheeh', language: 'en', sourceUrl: 'https://qul.tarteel.ai/resources', retrievedAt: '2026-07-01T00:00:00.000Z' },
        humanReviewStatus: 'pending',
      }),
      getTafsir: jest.fn().mockResolvedValue([{
        reference: { surah: 2, ayahStart: 155 }, sourceName: 'Ibn Kathir', sourceId: 'ibn-kathir-en', language: 'en',
        retrievedText: 'Allah tests His servants with fear, hunger, and loss of wealth to distinguish the patient.',
        summaryGeneratedByAI: false,
        provenance: { provider: 'QUL', resourceType: 'tafsir', resourceName: 'Ibn Kathir', resourceId: 'ibn-kathir-en', language: 'en', sourceUrl: 'https://qul.tarteel.ai/resources', retrievedAt: '2026-07-01T00:00:00.000Z' },
      }]),
      verifyReference: jest.fn(),
    };
    const approvalService: IApprovalTaskService = {
      createTask: jest
        .fn()
        .mockResolvedValueOnce({ taskId: 'gate1-task' })
        .mockResolvedValueOnce({ taskId: 'gate2-task' })
        .mockResolvedValueOnce({ taskId: 'gate3-task' }),
    };
    const fileService: IFileService = {
      getUpload: jest.fn(),
      downloadFile: jest.fn(),
    };

    const qmResolve = (aiService?: ITextGenerationService) =>
      resolveQuranMedia({ aiService, currentIssueResearchService, quranSourceService });
    const hwResolve = resolveHumanWork({ approvalTaskService: approvalService });
    const wfResolve = resolveWorkflow();
    const vpResolve = resolveVideoProduction({ fileService });

    // 1. Discover current issues
    const discoverExec = qmResolve()('lados.quran_media.discover_current_issues')!;
    const { ctx: discoverCtx } = createMockNodeContext({ config: { topics: ['kemanusiaan'], sinceHours: 48, limit: 10 } });
    const discoverResult = await discoverExec(discoverCtx);
    expect(discoverResult.status).toBe('success');
    const issues = discoverResult.outputs['issues'] as IssueCandidate[];
    expect(issues).toHaveLength(2);

    // 2. Rank issue candidates (advisory AI)
    const rankAi = fakeAiService({ ranked: issues.map((i, idx) => ({ issueId: i.issueId, score: 90 - idx, rationale: 'Reflective, non-exploitative angle.', warnings: [] })) });
    const rankExec = qmResolve(rankAi)('lados.quran_media.rank_issue_candidates')!;
    const { ctx: rankCtx } = createMockNodeContext({ inputs: { issues }, config: { maxCandidates: 5 } });
    const rankResult = await rankExec(rankCtx);
    expect(rankResult.status).toBe('success');
    const ranked = rankResult.outputs['ranked'] as Array<{ issueId: string }>;

    // 3. Gate 1 — human issue selection. Must pause, must not auto-select.
    const gate1Exec = hwResolve('lados.human.request_input')!;
    const { ctx: gate1Ctx } = createMockNodeContext({
      inputs: { context: ranked },
      config: {
        title: 'Gate 1 — Issue selection',
        description: 'Review the ranked issue candidates and submit the single selected issue.',
        inputSchema: [{ key: 'issueId', label: 'Selected issue ID', type: 'string', required: true }],
      },
    });
    const gate1Result = await gate1Exec(gate1Ctx);
    expect(gate1Result.status).toBe('paused');
    expect(gate1Result.outputs['inputTask']).toMatchObject({ approvalTaskId: 'gate1-task', pending: true });

    // 3b. Resume — a human submits the selected issue object directly (never inferred).
    const selectedIssue = issues.find((i) => i.issueId === ranked[0]?.issueId) ?? issues[0]!;

    // 4. Analyze human impact
    const impactAi = fakeAiService({
      verifiedFacts: ['Banjir kilat berlaku di kawasan pinggir bandar.'],
      humanImpact: 'Ratusan penduduk terpaksa berpindah sementara.',
      uncertainties: ['Punca tepat kerosakan harta belum disahkan.'],
      sensitivityFlags: [],
    });
    const impactExec = qmResolve(impactAi)('lados.quran_media.analyze_human_impact')!;
    const { ctx: impactCtx } = createMockNodeContext({ inputs: { issue: selectedIssue }, config: { language: 'ms' } });
    const impactResult = await impactExec(impactCtx);
    expect(impactResult.status).toBe('success');

    // 5. Map Islamic themes
    const themesAi = fakeAiService({ themes: [{ theme: 'sabr/patience', rationale: 'Ujian dan ketabahan menghadapi kesukaran.' }] });
    const themesExec = qmResolve(themesAi)('lados.quran_media.map_islamic_themes')!;
    const { ctx: themesCtx } = createMockNodeContext({ inputs: { impact: impactResult.outputs['impact'] }, config: { maxThemes: 5 } });
    const themesResult = await themesExec(themesCtx);
    expect(themesResult.status).toBe('success');
    const themes = themesResult.outputs['themes'];

    // 6. Find Quran candidates (deterministic dataset retrieval)
    const findExec = qmResolve()('lados.quran_media.find_quran_candidates')!;
    const { ctx: findCtx } = createMockNodeContext({ inputs: { themes }, config: { limit: 10, language: 'ms' } });
    const findResult = await findExec(findCtx);
    expect(findResult.status).toBe('success');
    const candidates = findResult.outputs['candidates'];

    // 7. Retrieve Quran evidence
    const quranExec = qmResolve()('lados.quran_media.retrieve_quran_evidence')!;
    const { ctx: quranCtx } = createMockNodeContext({ inputs: { candidates } });
    const quranResult = await quranExec(quranCtx);
    expect(quranResult.status).toBe('success');
    const quranEvidence = quranResult.outputs['quranEvidence'];

    // 8. Retrieve tafsir context
    const tafsirExec = qmResolve()('lados.quran_media.retrieve_tafsir_context')!;
    const { ctx: tafsirCtx } = createMockNodeContext({ inputs: { quranEvidence }, config: { tafsirIds: [] } });
    const tafsirResult = await tafsirExec(tafsirCtx);
    expect(tafsirResult.status).toBe('success');
    const tafsirEvidence = tafsirResult.outputs['tafsirEvidence'];

    // 9. Build evidence bundle
    const bundleExec = qmResolve()('lados.quran_media.build_evidence_bundle')!;
    const { ctx: bundleCtx } = createMockNodeContext({
      inputs: { issue: selectedIssue, themes, quranEvidence, tafsirEvidence },
      config: { requireTafsir: true },
    });
    const bundleResult = await bundleExec(bundleCtx);
    expect(bundleResult.status).toBe('success');
    const assembledBundle = bundleResult.outputs['bundle'] as EvidenceBundle;
    expect(assembledBundle.religiousReview.status).toBe('pending'); // never pre-approved by the executor

    // 10. Gate 2 — religious evidence review. Must pause.
    const gate2Exec = hwResolve('lados.human.request_input')!;
    const { ctx: gate2Ctx } = createMockNodeContext({
      inputs: { context: assembledBundle },
      config: {
        title: 'Gate 2 — Religious evidence review',
        description: 'Confirm the evidence bundle and submit it to continue.',
        inputSchema: [{ key: 'bundleVersion', label: 'Bundle version', type: 'string', required: true }],
      },
    });
    const gate2Result = await gate2Exec(gate2Ctx);
    expect(gate2Result.status).toBe('paused');
    expect(gate2Result.outputs['inputTask']).toMatchObject({ approvalTaskId: 'gate2-task' });

    // 10b. Resume — a human confirms the bundle by setting religiousReview.status to "approved".
    // This is a human decision, never inferred by the node itself (proven separately by the
    // RELIGIOUS_REVIEW_REQUIRED refusal-path test below).
    const approvedBundle: EvidenceBundle = {
      ...assembledBundle,
      religiousReview: { status: 'approved', reviewedBy: 'reviewer-1', reviewedAt: '2026-07-16T10:00:00.000Z', notes: 'Confirmed reference, translation and tafsir.' },
    };

    // 11. Compose reflection
    const reflectionAi = fakeAiService({ text: 'Marilah kita renungkan ujian yang menimpa insan dengan penuh kesabaran.', evidenceRefs: ['ev-2-155'], warnings: [] });
    const reflectExec = qmResolve(reflectionAi)('lados.quran_media.compose_reflection')!;
    const { ctx: reflectCtx } = createMockNodeContext({ inputs: { bundle: approvedBundle }, config: { language: 'ms', tone: 'reflective' } });
    const reflectResult = await reflectExec(reflectCtx);
    expect(reflectResult.status).toBe('success');

    // 12. Write short video script
    const scriptAi = fakeAiService({
      title: 'Ujian dan Sabar',
      durationSeconds: 45,
      hook: 'Pernahkah kita rasa diuji melampaui had?',
      scenes: [
        { sceneNumber: 1, startSecond: 0, endSecond: 15, visualIntent: 'Tenang, hujan jatuh perlahan', voiceover: 'Marilah kita renungkan ujian yang menimpa.', onScreenText: 'Ujian itu pasti', emotion: 'reflective', evidenceRefs: ['ev-2-155'] },
        { sceneNumber: 2, startSecond: 15, endSecond: 45, visualIntent: 'Cahaya lembut', voiceover: 'Semoga kita mampu bersabar dan bersyukur.', onScreenText: 'Sabar itu indah', emotion: 'hopeful', evidenceRefs: ['ev-2-155'] },
      ],
      caption: 'Ujian datang, sabar itu penawar.',
      callToAction: 'Renungkan bersama, kongsi jika ia menyentuh hati.',
      sourceAppendix: ['Saheeh International', 'Ibn Kathir'],
    });
    const scriptExec = qmResolve(scriptAi)('lados.quran_media.write_short_video_script')!;
    const { ctx: scriptCtx } = createMockNodeContext({ inputs: { reflection: reflectResult.outputs['reflection'] }, config: { durationSeconds: 45, language: 'ms' } });
    const scriptResult = await scriptExec(scriptCtx);
    expect(scriptResult.status).toBe('success');
    const script = scriptResult.outputs['script'];

    // 13. Validate dakwah content — clean script, no AI needed for the deterministic pass to matter.
    const validateExec = qmResolve()('lados.quran_media.validate_dakwah_content')!;
    const { ctx: validateCtx } = createMockNodeContext({ inputs: { script, bundle: approvedBundle }, config: { strictMode: true } });
    const validateResult = await validateExec(validateCtx);
    expect(validateResult.status).toBe('success');
    const validation = validateResult.outputs['validation'] as { publicationBlocked: boolean };
    expect(validation.publicationBlocked).toBe(false);
    expect(validateResult.outputs['publicationBlocked']).toBe(false);

    // 14. cond-publication — routes on the flat publicationBlocked boolean (Phase F fix).
    const condExec = wfResolve('lados.workflow.condition')!;
    const { ctx: condCtx } = createMockNodeContext({
      inputs: { value: validateResult.outputs['publicationBlocked'], validation },
      config: { expression: 'value == false', label: 'Publication not blocked' },
    });
    const condResult = await condExec(condCtx);
    expect(condResult.status).toBe('success');
    // condition.ts's `true`/`false` output ports carry the *payload* (here,
    // the publicationBlocked boolean itself — a `false` value), not a
    // separate "which branch fired" flag; routing is indicated by which of
    // the two ports is non-null. Not blocked -> the `true` branch fires, so
    // `outputs.true` holds the (false) payload and `outputs.false` is null.
    expect(condResult.outputs['false']).toBeNull();
    expect(condResult.outputs['true']).toBe(false);

    // 15. Gate 3 — editorial approval, context wired directly from validation (Phase F fix).
    const gate3Exec = hwResolve('lados.human.request_approval')!;
    const { ctx: gate3Ctx } = createMockNodeContext({
      inputs: { context: validation },
      config: { title: 'Gate 3 — Editorial publication approval', description: 'Confirm script tone and production suitability.' },
    });
    const gate3Result = await gate3Exec(gate3Ctx);
    expect(gate3Result.status).toBe('paused');
    expect(gate3Result.outputs['approvalTask']).toMatchObject({ approvalTaskId: 'gate3-task' });

    // 16. Prepare media brief (only after Gate 3 approval — proxy-simulated by proceeding)
    const briefAi = fakeAiService({ sceneIntent: [], voiceDirection: 'Calm, reflective, compassionate', additionalVisualRestrictions: [] });
    const briefExec = qmResolve(briefAi)('lados.quran_media.prepare_media_brief')!;
    const { ctx: briefCtx } = createMockNodeContext({
      inputs: { script, validation: gate3Result.outputs['approvalTask'] },
      config: { visualRestrictions: 'No graphic suffering, no identifiable victims, dignity-first visuals', voiceDirection: 'Calm, reflective, compassionate' },
    });
    const briefResult = await briefExec(briefCtx);
    expect(briefResult.status).toBe('success');

    // 17. Video Production handoff — output handoff shape (Volume 2 §8 item 7), now real.
    const readScriptExec = vpResolve('lados.video.read_script')!;
    const { ctx: readCtx } = createMockNodeContext({
      inputs: { scriptText: briefResult.outputs['scriptText'], title: briefResult.outputs['title'] },
    });
    const readResult = await readScriptExec(readCtx);
    expect(readResult.status).toBe('success');
    expect(readResult.outputs['script']).toMatchObject({ title: 'Ujian dan Sabar' });

    const draftScenesExec = vpResolve('lados.video.draft_scenes')!;
    const { ctx: draftCtx } = createMockNodeContext({ inputs: { script: readResult.outputs['script'] }, config: { splitStrategy: 'paragraph' } });
    const draftResult = await draftScenesExec(draftCtx);
    expect(draftResult.status).toBe('success');
    expect((draftResult.outputs['scenes'] as unknown[]).length).toBeGreaterThan(0);

    // Full-chain invariant: at no point did any node fabricate a human decision,
    // and the final Video Production handoff genuinely consumed the approved
    // script's own words (scriptText contains the real hook, not a paraphrase).
    expect(briefResult.outputs['scriptText']).toContain('Pernahkah kita rasa diuji melampaui had?');
  });

  it('refusal path: compose_reflection rejects a bundle whose religiousReview.status is still "pending", bypassing Gate 2 wiring', async () => {
    const ai = fakeAiService({ text: 'Should never be produced.', evidenceRefs: [], warnings: [] });
    const exec = resolveQuranMedia({ aiService: ai })('lados.quran_media.compose_reflection')!;
    const pendingBundle: EvidenceBundle = {
      bundleVersion: '1.0',
      issue: { issueId: 'issue-1', headline: 'x', summary: 'y', sources: [], facts: [], uncertainties: [] },
      themes: [],
      quranEvidence: [{
        evidenceId: 'ev-2-155', reference: { surah: 2, ayahStart: 155 },
        arabicText: 'x', translation: { text: 'x', sourceName: 'x', sourceId: 'x' },
        provenance: { provider: 'QUL', resourceType: 'translation', resourceName: 'x', resourceId: 'x', language: 'en', sourceUrl: 'x', retrievedAt: 'x' },
        humanReviewStatus: 'pending', tafsir: [],
      }],
      hadithEvidence: [],
      warnings: [],
      religiousReview: { status: 'pending', reviewedBy: null, reviewedAt: null, notes: '' }, // Gate 2 was bypassed
      publicationReady: false,
    };
    const { ctx } = createMockNodeContext({ inputs: { bundle: pendingBundle } });
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('RELIGIOUS_REVIEW_REQUIRED');
    expect((ai.runCompletion as jest.Mock)).not.toHaveBeenCalled(); // never even asked the model
  });

  it('publicationBlocked routes to Gate R (human-facing revision checkpoint), never auto-publishes', async () => {
    const blockedScript = {
      title: 'x', durationSeconds: 45, hook: 'x',
      scenes: [{ sceneNumber: 1, startSecond: 0, endSecond: 45, visualIntent: 'x', voiceover: 'x', onScreenText: 'x', emotion: 'x', evidenceRefs: [] }], // no evidenceRefs -> deterministic block
      caption: 'x', callToAction: 'x', sourceAppendix: [],
    };
    const validateExec = resolveQuranMedia({})('lados.quran_media.validate_dakwah_content')!;
    const { ctx: validateCtx } = createMockNodeContext({ inputs: { script: blockedScript } });
    const validateResult = await validateExec(validateCtx);
    expect(validateResult.outputs['publicationBlocked']).toBe(true);

    const wfResolve = resolveWorkflow();
    const condExec = wfResolve('lados.workflow.condition')!;
    const { ctx: condCtx } = createMockNodeContext({
      inputs: { value: validateResult.outputs['publicationBlocked'], validation: validateResult.outputs['validation'] },
      config: { expression: 'value == false', label: 'Publication not blocked' },
    });
    const condResult = await condExec(condCtx);
    expect(condResult.status).toBe('success');
    expect(condResult.outputs['false']).toBe(true); // blocked -> false branch carries the real boolean
    expect(condResult.outputs['true']).toBeNull();

    // Gate R receives the real validation detail directly from validate_dakwah_content
    // (Phase F fix — not laundered through cond-publication's now-boolean-only true/false ports).
    const approvalService: IApprovalTaskService = { createTask: jest.fn().mockResolvedValue({ taskId: 'gateR-task' }) };
    const gateRExec = resolveHumanWork({ approvalTaskService: approvalService })('lados.human.request_input')!;
    const { ctx: gateRCtx } = createMockNodeContext({
      inputs: { context: validateResult.outputs['validation'] },
      config: {
        title: 'Gate R — Revision required',
        description: 'Dakwah content validation blocked publication.',
        inputSchema: [{ key: 'acknowledgementNote', label: 'Note', type: 'string', required: false }],
      },
    });
    const gateRResult = await gateRExec(gateRCtx);
    expect(gateRResult.status).toBe('paused');
    expect(gateRResult.outputs['inputTask']).toMatchObject({ approvalTaskId: 'gateR-task', pending: true });
  });
});
