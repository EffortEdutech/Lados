/**
 * Phase 21 S6 (Wave 4) — official-node end-to-end test across
 * lados-qs-commercial + lados-construction-operations.
 *
 * Master plan S6 gate: "qs_practice.boq_upload_to_cost_summary (Advisory)
 * runs E2E: BOQ file → cost summary → human acceptance, provenance
 * logged." That named template is itself a templates-wave deliverable
 * (every pack's `verification.templates` is still `not_started`), so as a
 * proxy — same approach used for S4/S5's own gates — this suite chains
 * the QS Commercial nodes end-to-end in-process against their real
 * resolvers, pausing at a genuine human-acceptance gate, then separately
 * proves "provenance logged" by running the REAL
 * DataPacksService.resolveRuntimeUsagesForDefinition (DB stubbed at its
 * own boundary, same technique as data-packs.service.provenance.spec.ts)
 * over node configs shaped like these executors actually produce.
 *
 *   read_boq -> normalize_boq -> classify_trade -> split_work_packages
 *     -> reconcile_final_account (cost summary, advisory)
 *     -> lados.human.request_approval (human acceptance, pauses)
 *     -> lados.human.record_decision (human-supplied resume)
 *
 * A short Construction Operations chain is also proven:
 *   create_project -> create_site_inspection -> submit_inspection_report
 *     (pausing when the state machine requires approval)
 */
import { resolveNode as resolveQsCommercial, type ICreateResourceService as IQsCreateService } from '@lados/official-qs-commercial';
import { resolveNode as resolveConstructionOps, type ICreateResourceService as IConstructionCreateService, type ITransitionResourceService as IConstructionTransitionService } from '@lados/official-construction-operations';
import { resolveNode as resolveHumanWork, type IApprovalTaskService } from '@lados/official-human-work';
import { createMockNodeContext } from '@lados/testing';
import { DataPacksService } from '../src/data-packs/data-packs.service';

const TRADE_TAXONOMY_REF = '66666666-6666-4666-8666-666666666666';
const RATE_LIBRARY_REF = '77777777-7777-4777-8777-777777777777';

describe('Wave 4 official E2E — BOQ upload to cost summary proxy chain', () => {
  it('resolves every node across both packs via one combined resolver', () => {
    const qsCreateService: IQsCreateService = { createResource: jest.fn() };
    const constructionCreateService: IConstructionCreateService = { createResource: jest.fn() };
    const constructionTransitionService: IConstructionTransitionService = { transitionState: jest.fn() };
    const approvalService: IApprovalTaskService = { createTask: jest.fn() };

    const resolvers = [
      resolveQsCommercial({ createService: qsCreateService }),
      resolveConstructionOps({ createService: constructionCreateService, transitionService: constructionTransitionService }),
      resolveHumanWork({ approvalTaskService: approvalService }),
    ];
    const resolveAny = (type: string) => resolvers.map((r) => r(type)).find((fn) => fn !== null) ?? null;

    expect(resolveAny('lados.qs.read_boq')).not.toBeNull();
    expect(resolveAny('lados.qs.reconcile_final_account')).not.toBeNull();
    expect(resolveAny('lados.construction.create_project')).not.toBeNull();
    expect(resolveAny('lados.human.request_approval')).not.toBeNull();
  });

  it('BOQ upload to cost summary: chains read → normalize → classify → split → reconcile → human acceptance, never auto-accepting', async () => {
    const approvalService: IApprovalTaskService = {
      createTask: jest.fn().mockResolvedValue({ taskId: 'approval-task-w4e2e-1' }),
    };

    const readExec = resolveQsCommercial()('lados.qs.read_boq')!;
    const normalizeExec = resolveQsCommercial()('lados.qs.normalize_boq')!;
    const classifyExec = resolveQsCommercial()('lados.qs.classify_trade')!;
    const splitExec = resolveQsCommercial()('lados.qs.split_work_packages')!;
    const reconcileExec = resolveQsCommercial()('lados.qs.reconcile_final_account')!;
    const requestApprovalExec = resolveHumanWork({ approvalTaskService: approvalService })('lados.human.request_approval')!;
    const recordDecisionExec = resolveHumanWork()('lados.human.record_decision')!;

    // 1. Upload / read the BOQ
    const { ctx: readCtx } = createMockNodeContext({
      inputs: {
        source: {
          rows: [
            { itemNo: '1', description: 'Reinforced concrete slab', unit: 'm3', quantity: 20, rate: 250 },
            { itemNo: '2', description: 'Electrical wiring first fix', unit: 'lm', quantity: 100, rate: 15 },
          ],
        },
      },
    });
    const readResult = await readExec(readCtx);
    expect(readResult.status).toBe('success');
    const boq = readResult.outputs['boq'] as { items: unknown[] };

    // 2. Normalize / clean
    const { ctx: normalizeCtx } = createMockNodeContext({ inputs: { items: boq.items } });
    const normalizeResult = await normalizeExec(normalizeCtx);
    expect(normalizeResult.status).toBe('success');
    const normalized = normalizeResult.outputs['normalized'] as { items: Array<{ description?: string; quantity: number; rate: number }>; issues: string[] };
    expect(Array.isArray(normalized.issues)).toBe(true);

    // 3. Classify trade (deterministic, advisory)
    const { ctx: classifyCtx } = createMockNodeContext({
      inputs: { items: normalized.items },
      config: { knowledgePackRefs: [TRADE_TAXONOMY_REF] },
    });
    const classifyResult = await classifyExec(classifyCtx);
    expect(classifyResult.status).toBe('success');
    const classified = classifyResult.outputs['classified'] as Array<{ trade: string; quantity: number; rate: number }>;
    expect(classified.some((c) => c.trade === 'Concrete Works')).toBe(true);
    expect(classified.some((c) => c.trade === 'Electrical')).toBe(true);

    // 4. Split into work packages
    const { ctx: splitCtx } = createMockNodeContext({ inputs: { items: classified } });
    const splitResult = await splitExec(splitCtx);
    expect(splitResult.status).toBe('success');
    const workPackages = splitResult.outputs['workPackages'] as { packages: unknown[] };
    expect(workPackages.packages.length).toBeGreaterThan(0);

    // 5. Reconcile into a cost summary (advisory)
    const { ctx: reconcileCtx } = createMockNodeContext({
      inputs: { summary: { workPackages: workPackages.packages, variations: [] } },
    });
    const reconcileResult = await reconcileExec(reconcileCtx);
    expect(reconcileResult.status).toBe('success');
    const costSummary = reconcileResult.outputs['costSummary'] as { advisory: boolean; requiresReview: boolean; totalValue: number };
    expect(costSummary.advisory).toBe(true);
    expect(costSummary.requiresReview).toBe(true);
    // 20*250 + 100*15 = 5000 + 1500 = 6500
    expect(costSummary.totalValue).toBe(6500);

    // 6. Human acceptance gate — must pause, must not auto-accept
    const { ctx: approvalCtx } = createMockNodeContext({
      inputs: { title: 'Accept BOQ cost summary', assigneeRole: 'owner', costSummary },
    });
    const approvalResult = await requestApprovalExec(approvalCtx);
    expect(approvalResult.status).toBe('paused');
    const approvalTask = approvalResult.outputs['approvalTask'] as { approvalTaskId: string };
    expect(approvalTask.approvalTaskId).toBe('approval-task-w4e2e-1');

    // 6b. Resume — only proceeds because a human decision is supplied explicitly
    const { ctx: decisionCtx } = createMockNodeContext({
      inputs: {
        decisionType: 'boq-cost-summary-acceptance',
        decisionBy: 'user-owner-w4e2e',
        evidence: { approvalTaskId: approvalTask.approvalTaskId },
      },
    });
    const decisionResult = await recordDecisionExec(decisionCtx);
    expect(decisionResult.status).toBe('success');
    expect(decisionResult.outputs['decision']).toMatchObject({ decisionBy: 'user-owner-w4e2e' });

    expect(approvalService.createTask).toHaveBeenCalledTimes(1);
  });

  it('Construction Operations: create project → inspect → submit report, pausing (never certifying) when approval is required', async () => {
    const createService: IConstructionCreateService = {
      createResource: jest.fn()
        .mockResolvedValueOnce({ id: 'proj-w4e2e-1', type: 'construction_project', name: 'x', state: 'active', data: {} })
        .mockResolvedValueOnce({ id: 'insp-w4e2e-1', type: 'site_inspection', name: 'x', state: 'scheduled', data: {} }),
    };
    const transitionService: IConstructionTransitionService = {
      transitionState: jest.fn().mockResolvedValue({
        id: 'insp-w4e2e-1', type: 'site_inspection', name: 'x', state: 'scheduled', data: {},
        approvalRequired: true, approvalTaskId: 'appr-w4e2e-1',
      }),
    };

    const createProjectExec = resolveConstructionOps({ createService })('lados.construction.create_project')!;
    const createInspectionExec = resolveConstructionOps({ createService })('lados.construction.create_site_inspection')!;
    const submitReportExec = resolveConstructionOps({ transitionService })('lados.construction.submit_inspection_report')!;

    const { ctx: projectCtx } = createMockNodeContext({ inputs: { project: { projectName: 'Tower B' } } });
    const projectResult = await createProjectExec(projectCtx);
    expect(projectResult.status).toBe('success');
    const project = projectResult.outputs['resource'] as { projectId: string };

    const { ctx: inspectionCtx } = createMockNodeContext({
      inputs: { site: { inspectionType: 'Structural', location: 'Level 5', projectId: project.projectId } },
    });
    const inspectionResult = await createInspectionExec(inspectionCtx);
    expect(inspectionResult.status).toBe('success');
    const inspection = inspectionResult.outputs['inspection'] as { inspectionId: string };

    const { ctx: reportCtx } = createMockNodeContext({
      inputs: { inspection: { resourceId: inspection.inspectionId, findings: 'Crack observed near column C4' } },
    });
    const reportResult = await submitReportExec(reportCtx);
    expect(reportResult.status).toBe('paused'); // never silently certifies
    expect(reportResult.pause?.context).toMatchObject({ approvalTaskId: 'appr-w4e2e-1' });
  });
});

describe('Wave 4 provenance — Knowledge Pack item refs are visible via the real DataPacksService', () => {
  function makeProvenanceService(resolved: Array<{ itemId: string; packSlug: string; advisory: boolean }>): DataPacksService {
    const svc = new DataPacksService({} as never, {} as never);
    (svc as unknown as { resolveRuntimeUsages: (ids: string[]) => Promise<typeof resolved> }).resolveRuntimeUsages =
      jest.fn().mockImplementation(async (ids: string[]) => resolved.filter((u) => ids.includes(u.itemId)));
    return svc;
  }

  it('logs provenance for qs.classify_trade + qs.value_variation from their KP ref config fields', async () => {
    const svc = makeProvenanceService([
      { itemId: TRADE_TAXONOMY_REF, packSlug: 'lados.trade-taxonomy', advisory: true },
      { itemId: RATE_LIBRARY_REF, packSlug: 'lados.qs-rate-library', advisory: true },
    ]);
    const definition = {
      nodes: [
        { id: 'n-classify', type: 'lados.qs.classify_trade', config: { knowledgePackRefs: [TRADE_TAXONOMY_REF] } },
        { id: 'n-value', type: 'lados.qs.value_variation', config: { rateLibraryRefs: [RATE_LIBRARY_REF] } },
      ],
      connections: [],
    } as unknown as Parameters<DataPacksService['resolveRuntimeUsagesForDefinition']>[0];

    const usages = await svc.resolveRuntimeUsagesForDefinition(definition);
    expect(usages.get('n-classify')).toEqual([{ itemId: TRADE_TAXONOMY_REF, packSlug: 'lados.trade-taxonomy', advisory: true }]);
    expect(usages.get('n-value')).toEqual([{ itemId: RATE_LIBRARY_REF, packSlug: 'lados.qs-rate-library', advisory: true }]);
  });
});
