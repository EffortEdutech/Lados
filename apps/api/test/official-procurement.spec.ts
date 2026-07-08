/**
 * Phase 21 S5 (Wave 3) — @lados/official-procurement.
 *
 * Covers the master-plan S5 test requirement: "TEST per node as S2 + provenance
 * assertions" for all 6 nodes (create_rfq, issue_rfq, receive_quotation,
 * compare_quotations, recommend_award, generate_po_request). Restricted
 * maturity guardrail: recommend_award must never itself approve or
 * transition a resource — approval is mandatory and happens elsewhere.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type ITransitionResourceService,
} from '@lados/official-procurement';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-procurement/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'rfq-1', state = 'draft', type = 'rfq'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type, name: 'x', state, data: {} }),
  };
}

function fakeTransitionService(
  outcome: { state: string; approvalRequired?: boolean; approvalTaskId?: string } = { state: 'issued' },
): ITransitionResourceService {
  return {
    transitionState: jest.fn().mockResolvedValue({
      id: 'rfq-1',
      type: 'rfq',
      name: 'x',
      state: outcome.state,
      data: {},
      approvalRequired: outcome.approvalRequired,
      approvalTaskId: outcome.approvalTaskId,
    }),
  };
}

describe('official-procurement — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      createService: fakeCreateService(),
      transitionService: fakeTransitionService(),
    });
    for (const m of manifests) {
      expect(typeof resolve(m.type)).toBe('function');
    }
  });

  it('every node is marked implemented', () => {
    for (const m of manifests) {
      expect(m.executorStatus).toBe('implemented');
    }
  });

  it('unknown node types resolve to null', () => {
    expect(resolveNode()('lados.procurement.does_not_exist')).toBeNull();
  });
});

describe('lados.procurement.create_rfq', () => {
  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { rfq: { title: 'Steel supply', scope: 'Q3 steel' } } });
    const exec = resolveNode()('lados.procurement.create_rfq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('creates an RFQ and carries knowledgePackRefs through for provenance', async () => {
    const createService = fakeCreateService('rfq-1', 'draft');
    const kpRefId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const { ctx } = createMockNodeContext({
      inputs: { rfq: { title: 'Steel supply', scope: 'Q3 steel delivery' } },
      config: { knowledgePackRefs: [kpRefId] },
    });
    const exec = resolveNode({ createService })('lados.procurement.create_rfq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['rfq']).toMatchObject({ rfqId: 'rfq-1', title: 'Steel supply', status: 'draft' });
    expect(createService.createResource).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rfq', data: expect.objectContaining({ knowledgePackRefs: [kpRefId] }) }),
    );
  });

  it('fails when scope is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { rfq: { title: 'Steel supply' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.procurement.create_rfq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.procurement.issue_rfq', () => {
  it('fails with NO_SERVICE when no transition service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { rfq: { resourceId: 'rfq-1' } } });
    const exec = resolveNode()('lados.procurement.issue_rfq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('issues an RFQ', async () => {
    const transitionService = fakeTransitionService({ state: 'issued' });
    const { ctx } = createMockNodeContext({ inputs: { rfq: { resourceId: 'rfq-1' } } });
    const exec = resolveNode({ transitionService })('lados.procurement.issue_rfq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['rfq']).toMatchObject({ resourceId: 'rfq-1', status: 'issued' });
    expect(transitionService.transitionState).toHaveBeenCalledWith('rfq-1', expect.any(String), 'issued', expect.any(String));
  });

  it('pauses (never silently auto-approves) when issuing requires approval', async () => {
    const transitionService = fakeTransitionService({ state: 'draft', approvalRequired: true, approvalTaskId: 'appr-proc-1' });
    const { ctx } = createMockNodeContext({ inputs: { rfq: { resourceId: 'rfq-1' } } });
    const exec = resolveNode({ transitionService })('lados.procurement.issue_rfq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-proc-1' });
  });
});

describe('lados.procurement.receive_quotation', () => {
  it('records a quotation as a child of the RFQ', async () => {
    const createService = fakeCreateService('quote-1', 'received', 'quotation');
    const { ctx } = createMockNodeContext({
      inputs: { quotation: { rfqId: 'rfq-1', supplier: 'Acme Steel', amount: 12000 } },
    });
    const exec = resolveNode({ createService })('lados.procurement.receive_quotation')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['quotation']).toMatchObject({ quotationId: 'quote-1', rfqId: 'rfq-1', supplier: 'Acme Steel', amount: 12000 });
    expect(createService.createResource).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'quotation', parentId: 'rfq-1' }),
    );
  });

  it('fails when rfqId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { quotation: { supplier: 'Acme Steel', amount: 12000 } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.procurement.receive_quotation')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.procurement.compare_quotations', () => {
  it('is advisory only, deterministic lowest-price-wins, and never decides an award', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        quotations: [
          { quotationId: 'q1', supplier: 'Acme Steel', amount: 12000 },
          { quotationId: 'q2', supplier: 'Beta Metals', amount: 10000 },
          { quotationId: 'q3', supplier: 'Gamma Corp', amount: 15000 },
        ],
      },
      config: { comparisonRules: ['cmp-rule-ref-1'], supplierCatalogueRefs: ['cat-ref-1'] },
    });
    const exec = resolveNode()('lados.procurement.compare_quotations')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const comparison = result.outputs['comparison'] as { advisory: boolean; ranked: Array<{ supplier: string }>; requiresReview: boolean };
    expect(comparison.advisory).toBe(true);
    expect(comparison.requiresReview).toBe(true);
    expect(comparison.ranked[0].supplier).toBe('Beta Metals'); // lowest price ranks first
    expect((result.outputs['comparison'] as Record<string, unknown>)['comparisonRulesReferenced']).toEqual(['cmp-rule-ref-1']);
  });

  it('fails when quotations array is empty', async () => {
    const { ctx } = createMockNodeContext({ inputs: { quotations: [] } });
    const exec = resolveNode()('lados.procurement.compare_quotations')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.procurement.recommend_award', () => {
  it('recommends the top-ranked quotation and always requires approval — never decides itself', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        comparison: {
          ranked: [
            { quotationId: 'q2', supplier: 'Beta Metals', amount: 10000, score: 1 },
            { quotationId: 'q1', supplier: 'Acme Steel', amount: 12000, score: 0.83 },
          ],
        },
      },
    });
    const exec = resolveNode()('lados.procurement.recommend_award')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const recommendation = result.outputs['recommendation'] as Record<string, unknown>;
    expect(recommendation['advisory']).toBe(true);
    expect(recommendation['requiresApproval']).toBe(true);
    expect(recommendation['recommendedSupplier']).toBe('Beta Metals');
  });

  it('fails when comparison.ranked is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.procurement.recommend_award')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.procurement.generate_po_request', () => {
  it('generates a PO request handoff artifact for Commercial Finance', async () => {
    const createService = fakeCreateService('req-1', 'pending_finance_review', 'po_request');
    const { ctx } = createMockNodeContext({
      inputs: { request: { supplier: 'Beta Metals', amount: 10000, sourceRfqId: 'rfq-1', sourceQuotationId: 'q2' } },
    });
    const exec = resolveNode({ createService })('lados.procurement.generate_po_request')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['poRequest']).toMatchObject({ poRequestId: 'req-1', supplier: 'Beta Metals', amount: 10000, status: 'pending_finance_review' });
  });

  it('fails when amount is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { request: { supplier: 'Beta Metals' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.procurement.generate_po_request')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});
