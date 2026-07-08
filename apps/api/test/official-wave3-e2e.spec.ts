/**
 * Phase 21 S5 (Wave 3) — official-node end-to-end test across
 * lados-commercial-finance + lados-procurement.
 *
 * Master plan S5 gate: "invoice_approval.submit_invoice_to_approval and
 * procurement_rfq.rfq_to_quotation_comparison run E2E with provenance
 * blocks visible." Those named templates are a templates-wave deliverable
 * (S5/S6 — every pack's `verification.templates` is still "not_started"),
 * so as a proxy — same approach used for the Wave 1+2 E2E test — this
 * suite chains the two flows in-process against the real resolvers, then
 * separately proves "provenance blocks visible" by running the REAL
 * DataPacksService.resolveRuntimeUsagesForDefinition (DB access stubbed at
 * its own boundary, exactly as data-packs.service.provenance.spec.ts does)
 * over node configs shaped like the ones these executors actually produce.
 *
 *   Flow A (invoice_approval.submit_invoice_to_approval):
 *     finance.submit_invoice -> finance.verify_invoice -> finance.record_invoice_approval
 *
 *   Flow B (procurement_rfq.rfq_to_quotation_comparison):
 *     procurement.create_rfq -> procurement.issue_rfq -> procurement.receive_quotation (x2)
 *       -> procurement.compare_quotations -> procurement.recommend_award
 *       -> procurement.generate_po_request -> finance.create_purchase_order
 */
import { resolveNode as resolveFinance, type ICreateResourceService as IFinanceCreateService, type IReadResourceService, type IUpdateResourceService, type ITransitionResourceService as IFinanceTransitionService } from '@lados/official-commercial-finance';
import { resolveNode as resolveProcurement, type ICreateResourceService as IProcCreateService, type ITransitionResourceService as IProcTransitionService } from '@lados/official-procurement';
import { createMockNodeContext } from '@lados/testing';
import { DataPacksService } from '../src/data-packs/data-packs.service';

const INVOICE_RULE_REF = '44444444-4444-4444-8444-444444444444';
const PROCUREMENT_SOP_REF = '55555555-5555-4555-8555-555555555555';

describe('Wave 3 official E2E — invoice approval + RFQ-to-quotation-comparison proxy chains', () => {
  it('resolves every node across both packs via one combined resolver', () => {
    const createService: IFinanceCreateService = { createResource: jest.fn() };
    const transitionService: IFinanceTransitionService = { transitionState: jest.fn() };
    const procCreateService: IProcCreateService = { createResource: jest.fn() };
    const procTransitionService: IProcTransitionService = { transitionState: jest.fn() };

    const resolvers = [
      resolveFinance({ createService, transitionService }),
      resolveProcurement({ createService: procCreateService, transitionService: procTransitionService }),
    ];
    const resolveAny = (type: string) => resolvers.map((r) => r(type)).find((fn) => fn !== null) ?? null;

    expect(resolveAny('lados.finance.submit_invoice')).not.toBeNull();
    expect(resolveAny('lados.finance.verify_invoice')).not.toBeNull();
    expect(resolveAny('lados.finance.record_invoice_approval')).not.toBeNull();
    expect(resolveAny('lados.procurement.create_rfq')).not.toBeNull();
    expect(resolveAny('lados.procurement.compare_quotations')).not.toBeNull();
    expect(resolveAny('lados.procurement.recommend_award')).not.toBeNull();
  });

  it('Flow A — submit_invoice_to_approval: pauses at the human gate, never fabricates the decision', async () => {
    const createService: IFinanceCreateService = {
      createResource: jest.fn().mockResolvedValue({ id: 'inv-w3e2e-1', type: 'finance_invoice', name: 'x', state: 'submitted', data: {} }),
    };
    const readService: IReadResourceService = {
      getResource: jest.fn().mockResolvedValue({ id: 'po-w3e2e-1', type: 'purchase_order', name: 'x', state: 'approved', data: { amount: 10000 } }),
    };
    const transitionService: IFinanceTransitionService = {
      transitionState: jest.fn().mockResolvedValue({ id: 'inv-w3e2e-1', type: 'finance_invoice', name: 'x', state: 'submitted', data: {}, approvalRequired: true, approvalTaskId: 'appr-w3e2e-1' }),
    };

    const submitExec = resolveFinance({ createService })('lados.finance.submit_invoice')!;
    const verifyExec = resolveFinance({ readService })('lados.finance.verify_invoice')!;
    const approvalExec = resolveFinance({ transitionService })('lados.finance.record_invoice_approval')!;

    // 1. Submit
    const { ctx: submitCtx } = createMockNodeContext({
      inputs: { invoice: { supplier: 'Acme Steel', amount: 9800, currency: 'MYR', poReference: 'po-w3e2e-1' } },
      config: { knowledgePackRefs: [INVOICE_RULE_REF] },
    });
    const submitResult = await submitExec(submitCtx);
    expect(submitResult.status).toBe('success');
    const submission = submitResult.outputs['submission'] as { invoiceId: string };
    expect(submission.invoiceId).toBe('inv-w3e2e-1');

    // 2. Verify (advisory) against the bound PO
    const { ctx: verifyCtx } = createMockNodeContext({
      inputs: { invoice: { amount: 9800 } },
      config: { poBinding: 'po-w3e2e-1', invoiceRules: [INVOICE_RULE_REF], tolerance: 0.05 },
    });
    const verifyResult = await verifyExec(verifyCtx);
    expect(verifyResult.status).toBe('success');
    const verification = verifyResult.outputs['verification'] as { advisory: boolean; passed: boolean };
    expect(verification.advisory).toBe(true);
    expect(verification.passed).toBe(true);

    // 3. Human gate — must pause, must not auto-approve
    const { ctx: approvalCtx } = createMockNodeContext({
      inputs: { decision: { resourceId: submission.invoiceId, approvedBy: 'user-owner-w3e2e', decision: 'approved' } },
    });
    const approvalResult = await approvalExec(approvalCtx);
    expect(approvalResult.status).toBe('paused');
    expect(approvalResult.pause?.context).toMatchObject({ approvalTaskId: 'appr-w3e2e-1' });

    // Guardrail: the only human identity in this chain is the explicit
    // approvedBy field — never inferred.
    expect(transitionService.transitionState).toHaveBeenCalledWith(
      'inv-w3e2e-1', expect.any(String), 'approved', 'user-owner-w3e2e',
    );
  });

  it('Flow B — rfq_to_quotation_comparison: ranks quotations and hands off to Finance, recommend_award never decides itself', async () => {
    const procCreateService: IProcCreateService = {
      createResource: jest.fn()
        .mockResolvedValueOnce({ id: 'rfq-w3e2e-1', type: 'rfq', name: 'x', state: 'draft', data: {} })
        .mockResolvedValueOnce({ id: 'quote-w3e2e-1', type: 'quotation', name: 'x', state: 'received', data: {} })
        .mockResolvedValueOnce({ id: 'quote-w3e2e-2', type: 'quotation', name: 'x', state: 'received', data: {} })
        .mockResolvedValueOnce({ id: 'req-w3e2e-1', type: 'po_request', name: 'x', state: 'pending_finance_review', data: {} }),
    };
    const procTransitionService: IProcTransitionService = {
      transitionState: jest.fn().mockResolvedValue({ id: 'rfq-w3e2e-1', type: 'rfq', name: 'x', state: 'issued', data: {} }),
    };
    const financeCreateService: IFinanceCreateService = {
      createResource: jest.fn().mockResolvedValue({ id: 'po-w3e2e-2', type: 'purchase_order', name: 'x', state: 'draft', data: {} }),
    };

    const createRfqExec = resolveProcurement({ createService: procCreateService })('lados.procurement.create_rfq')!;
    const issueRfqExec = resolveProcurement({ transitionService: procTransitionService })('lados.procurement.issue_rfq')!;
    const receiveQuoteExec = resolveProcurement({ createService: procCreateService })('lados.procurement.receive_quotation')!;
    const compareExec = resolveProcurement()('lados.procurement.compare_quotations')!;
    const recommendExec = resolveProcurement()('lados.procurement.recommend_award')!;
    const generatePoRequestExec = resolveProcurement({ createService: procCreateService })('lados.procurement.generate_po_request')!;
    const createPoExec = resolveFinance({ createService: financeCreateService })('lados.finance.create_purchase_order')!;

    // 1. Create the RFQ
    const { ctx: rfqCtx } = createMockNodeContext({
      inputs: { rfq: { title: 'Steel supply Q3', scope: 'Q3 steel delivery, 200 tonnes' } },
      config: { knowledgePackRefs: [PROCUREMENT_SOP_REF] },
    });
    const rfqResult = await createRfqExec(rfqCtx);
    expect(rfqResult.status).toBe('success');
    const rfq = rfqResult.outputs['rfq'] as { rfqId: string };

    // 2. Issue it
    const { ctx: issueCtx } = createMockNodeContext({ inputs: { rfq: { resourceId: rfq.rfqId } } });
    const issueResult = await issueRfqExec(issueCtx);
    expect(issueResult.status).toBe('success');

    // 3. Receive two quotations
    const { ctx: quote1Ctx } = createMockNodeContext({ inputs: { quotation: { rfqId: rfq.rfqId, supplier: 'Acme Steel', amount: 12000 } } });
    const quote1Result = await receiveQuoteExec(quote1Ctx);
    expect(quote1Result.status).toBe('success');

    const { ctx: quote2Ctx } = createMockNodeContext({ inputs: { quotation: { rfqId: rfq.rfqId, supplier: 'Beta Metals', amount: 10000 } } });
    const quote2Result = await receiveQuoteExec(quote2Ctx);
    expect(quote2Result.status).toBe('success');

    // 4. Compare (advisory)
    const { ctx: compareCtx } = createMockNodeContext({
      inputs: {
        quotations: [
          { quotationId: 'quote-w3e2e-1', supplier: 'Acme Steel', amount: 12000 },
          { quotationId: 'quote-w3e2e-2', supplier: 'Beta Metals', amount: 10000 },
        ],
      },
      config: { comparisonRules: ['cmp-rule-w3e2e'], supplierCatalogueRefs: ['cat-ref-w3e2e'] },
    });
    const compareResult = await compareExec(compareCtx);
    expect(compareResult.status).toBe('success');
    const comparison = compareResult.outputs['comparison'] as { ranked: Array<{ supplier: string; amount: number }>; advisory: boolean };
    expect(comparison.advisory).toBe(true);
    expect(comparison.ranked[0].supplier).toBe('Beta Metals');

    // 5. Recommend award — advisory only, always requires approval, never decides
    const { ctx: recommendCtx } = createMockNodeContext({ inputs: { comparison } });
    const recommendResult = await recommendExec(recommendCtx);
    expect(recommendResult.status).toBe('success');
    const recommendation = recommendResult.outputs['recommendation'] as { advisory: boolean; requiresApproval: boolean; recommendedSupplier: string };
    expect(recommendation.advisory).toBe(true);
    expect(recommendation.requiresApproval).toBe(true);
    expect(recommendation.recommendedSupplier).toBe('Beta Metals');
    expect(procTransitionService.transitionState).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'approved', expect.anything());

    // 6. Generate PO request handoff to Finance
    const { ctx: poReqCtx } = createMockNodeContext({
      inputs: { request: { supplier: recommendation.recommendedSupplier, amount: comparison.ranked[0].amount, sourceRfqId: rfq.rfqId } },
    });
    const poReqResult = await generatePoRequestExec(poReqCtx);
    expect(poReqResult.status).toBe('success');
    const poRequest = poReqResult.outputs['poRequest'] as { poRequestId: string };
    expect(poRequest.poRequestId).toBe('req-w3e2e-1');

    // 7. Finance creates the PO from the handed-off request
    const { ctx: createPoCtx } = createMockNodeContext({ inputs: { request: { requestId: poRequest.poRequestId, supplier: 'Beta Metals', amount: 10000 } } });
    const createPoResult = await createPoExec(createPoCtx);
    expect(createPoResult.status).toBe('success');
    expect(createPoResult.outputs['po']).toMatchObject({ supplier: 'Beta Metals', amount: 10000 });
  });
});

describe('Wave 3 provenance — Knowledge Pack item refs are visible via the real DataPacksService', () => {
  function makeProvenanceService(resolved: Array<{ itemId: string; packSlug: string; advisory: boolean }>): DataPacksService {
    const svc = new DataPacksService({} as never, {} as never);
    // Stub only the DB boundary (same technique as data-packs.service.provenance.spec.ts)
    // — resolveRuntimeUsagesForDefinition itself runs for real.
    (svc as unknown as { resolveRuntimeUsages: (ids: string[]) => Promise<typeof resolved> }).resolveRuntimeUsages =
      jest.fn().mockImplementation(async (ids: string[]) => resolved.filter((u) => ids.includes(u.itemId)));
    return svc;
  }

  it('logs provenance for finance.submit_invoice + finance.verify_invoice from their knowledgePackRefs/invoiceRules config fields', async () => {
    const svc = makeProvenanceService([
      { itemId: INVOICE_RULE_REF, packSlug: 'lados.invoice-validation-rules', advisory: true },
    ]);
    const definition = {
      nodes: [
        { id: 'n-submit', type: 'lados.finance.submit_invoice', config: { knowledgePackRefs: [INVOICE_RULE_REF] } },
        { id: 'n-verify', type: 'lados.finance.verify_invoice', config: { invoiceRules: [INVOICE_RULE_REF] } },
      ],
      connections: [],
    } as unknown as Parameters<DataPacksService['resolveRuntimeUsagesForDefinition']>[0];

    const usages = await svc.resolveRuntimeUsagesForDefinition(definition);
    expect(usages.get('n-submit')).toEqual([{ itemId: INVOICE_RULE_REF, packSlug: 'lados.invoice-validation-rules', advisory: true }]);
    expect(usages.get('n-verify')).toEqual([{ itemId: INVOICE_RULE_REF, packSlug: 'lados.invoice-validation-rules', advisory: true }]);
  });

  it('logs provenance for procurement.create_rfq + compare_quotations from their KP ref config fields', async () => {
    const svc = makeProvenanceService([
      { itemId: PROCUREMENT_SOP_REF, packSlug: 'lados.procurement-sop', advisory: true },
    ]);
    const definition = {
      nodes: [
        { id: 'n-rfq', type: 'lados.procurement.create_rfq', config: { knowledgePackRefs: [PROCUREMENT_SOP_REF] } },
        { id: 'n-compare', type: 'lados.procurement.compare_quotations', config: { comparisonRules: [PROCUREMENT_SOP_REF] } },
      ],
      connections: [],
    } as unknown as Parameters<DataPacksService['resolveRuntimeUsagesForDefinition']>[0];

    const usages = await svc.resolveRuntimeUsagesForDefinition(definition);
    expect(usages.get('n-rfq')).toEqual([{ itemId: PROCUREMENT_SOP_REF, packSlug: 'lados.procurement-sop', advisory: true }]);
    expect(usages.get('n-compare')).toEqual([{ itemId: PROCUREMENT_SOP_REF, packSlug: 'lados.procurement-sop', advisory: true }]);
  });
});
