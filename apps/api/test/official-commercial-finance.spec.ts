/**
 * Phase 21 S5 (Wave 3) — @lados/official-commercial-finance.
 *
 * Covers the master-plan S5 test requirement: "TEST per node as S2 + provenance
 * assertions" for all 8 nodes (submit_invoice, verify_invoice,
 * record_invoice_approval, record_payment, create_purchase_order,
 * record_purchase_order_approval, claim_retention_release,
 * record_retention_release). Every commercial fact must be gated behind a
 * Human Work approval — this suite proves record_invoice_approval and
 * record_purchase_order_approval never fabricate `approvedBy`, and that
 * verify_invoice is advisory only (never itself approves).
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type IReadResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
} from '@lados/official-commercial-finance';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-commercial-finance/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'res-1', state = 'submitted'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type: 'finance_invoice', name: 'x', state, data: {} }),
  };
}

function fakeReadService(overrides: Record<string, unknown> = {}): IReadResourceService {
  return {
    getResource: jest.fn().mockResolvedValue({
      id: 'po-1', type: 'purchase_order', name: 'x', state: 'approved', data: { amount: 1000 }, ...overrides,
    }),
  };
}

function fakeUpdateService(): IUpdateResourceService {
  return {
    updateResource: jest.fn().mockResolvedValue({ id: 'res-1', type: 'finance_invoice', name: 'x', state: 'submitted', data: {} }),
  };
}

function fakeTransitionService(
  outcome: { state: string; approvalRequired?: boolean; approvalTaskId?: string } = { state: 'approved' },
): ITransitionResourceService {
  return {
    transitionState: jest.fn().mockResolvedValue({
      id: 'res-1',
      type: 'finance_invoice',
      name: 'x',
      state: outcome.state,
      data: {},
      approvalRequired: outcome.approvalRequired,
      approvalTaskId: outcome.approvalTaskId,
    }),
  };
}

describe('official-commercial-finance — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      createService: fakeCreateService(),
      readService: fakeReadService(),
      updateService: fakeUpdateService(),
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
    expect(resolveNode()('lados.finance.does_not_exist')).toBeNull();
  });
});

describe('lados.finance.submit_invoice', () => {
  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { invoice: { supplier: 'Acme', amount: 500 } } });
    const exec = resolveNode()('lados.finance.submit_invoice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('submits an invoice and carries knowledgePackRefs through for provenance', async () => {
    const createService = fakeCreateService('inv-1', 'submitted');
    const kpRefId = '11111111-2222-4333-8444-555555555555';
    const { ctx } = createMockNodeContext({
      inputs: { invoice: { supplier: 'Acme', amount: 500, currency: 'MYR' } },
      config: { knowledgePackRefs: [kpRefId] },
    });
    const exec = resolveNode({ createService })('lados.finance.submit_invoice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['submission']).toMatchObject({ invoiceId: 'inv-1', supplier: 'Acme', amount: 500 });
    expect(createService.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'finance_invoice',
        data: expect.objectContaining({ knowledgePackRefs: [kpRefId] }),
      }),
    );
  });

  it('fails when supplier is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { invoice: { amount: 500 } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.finance.submit_invoice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.finance.verify_invoice', () => {
  it('is advisory only — never approves, only flags', async () => {
    const readService = fakeReadService({ data: { amount: 1000 } });
    const { ctx } = createMockNodeContext({
      inputs: { invoice: { amount: 1000 } },
      config: { poBinding: 'po-1', invoiceRules: ['inv-rule-ref-1'] },
    });
    const exec = resolveNode({ readService })('lados.finance.verify_invoice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const verification = result.outputs['verification'] as Record<string, unknown>;
    expect(verification['advisory']).toBe(true);
    expect(verification['passed']).toBe(true);
    expect(verification['invoiceRulesReferenced']).toEqual(['inv-rule-ref-1']);
  });

  it('flags amounts that exceed tolerance against the bound PO', async () => {
    const readService = fakeReadService({ data: { amount: 1000 } });
    const { ctx } = createMockNodeContext({
      inputs: { invoice: { amount: 2000 } },
      config: { poBinding: 'po-1', tolerance: 0.05 },
    });
    const exec = resolveNode({ readService })('lados.finance.verify_invoice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const verification = result.outputs['verification'] as Record<string, unknown>;
    expect(verification['passed']).toBe(false);
    expect(verification['requiresReview']).toBe(true);
    expect(verification['flags']).toContain('AMOUNT_EXCEEDS_TOLERANCE');
  });

  it('fails when amount is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.finance.verify_invoice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.finance.record_invoice_approval', () => {
  it('never fabricates approvedBy — fails with MISSING_HUMAN_DECISION when absent', async () => {
    const { ctx } = createMockNodeContext({ inputs: { decision: { resourceId: 'inv-1', decision: 'approved' } } });
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.finance.record_invoice_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_HUMAN_DECISION');
  });

  it('records an approval decision with an explicit human actor', async () => {
    const transitionService = fakeTransitionService({ state: 'approved' });
    const { ctx } = createMockNodeContext({
      inputs: { decision: { resourceId: 'inv-1', approvedBy: 'user-owner-1', decision: 'approved' } },
    });
    const exec = resolveNode({ transitionService })('lados.finance.record_invoice_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['approval']).toMatchObject({ resourceId: 'inv-1', status: 'approved', approvedBy: 'user-owner-1' });
    expect(transitionService.transitionState).toHaveBeenCalledWith('inv-1', expect.any(String), 'approved', 'user-owner-1');
  });

  it('pauses (never silently auto-approves) when the state machine requires further approval', async () => {
    const transitionService = fakeTransitionService({ state: 'submitted', approvalRequired: true, approvalTaskId: 'appr-fin-1' });
    const { ctx } = createMockNodeContext({
      inputs: { decision: { resourceId: 'inv-1', approvedBy: 'user-owner-1', decision: 'approved' } },
    });
    const exec = resolveNode({ transitionService })('lados.finance.record_invoice_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-fin-1' });
  });
});

describe('lados.finance.record_payment', () => {
  it('fails with NO_SERVICE when no transition service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { payment: { resourceId: 'inv-1', paidAmount: 500 } } });
    const exec = resolveNode()('lados.finance.record_payment')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('records a payment and transitions the resource to paid', async () => {
    const transitionService = fakeTransitionService({ state: 'paid' });
    const { ctx } = createMockNodeContext({ inputs: { payment: { resourceId: 'inv-1', paidAmount: 500, reference: 'TXN-1' } } });
    const exec = resolveNode({ transitionService })('lados.finance.record_payment')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['record']).toMatchObject({ resourceId: 'inv-1', status: 'paid', paidAmount: 500 });
    expect(transitionService.transitionState).toHaveBeenCalledWith('inv-1', expect.any(String), 'paid', expect.any(String));
  });

  it('fails when paidAmount is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { payment: { resourceId: 'inv-1' } } });
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.finance.record_payment')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.finance.create_purchase_order', () => {
  it('creates a PO directly from explicit config', async () => {
    const createService = fakeCreateService('po-1', 'draft');
    const { ctx } = createMockNodeContext({ inputs: { request: { supplier: 'Acme', amount: 1000 } } });
    const exec = resolveNode({ createService })('lados.finance.create_purchase_order')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['po']).toMatchObject({ poId: 'po-1', supplier: 'Acme', amount: 1000, status: 'draft' });
  });

  it('pulls defaults from an approvedRequest (procurement PO request) when supplied', async () => {
    const createService = fakeCreateService('po-2', 'draft');
    const readService = fakeReadService({ id: 'req-1', type: 'po_request', data: { supplier: 'Beta Supplies', amount: 750 } });
    const { ctx } = createMockNodeContext({ inputs: { request: { requestId: 'req-1' } } });
    const exec = resolveNode({ createService, readService })('lados.finance.create_purchase_order')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['po']).toMatchObject({ poId: 'po-2', supplier: 'Beta Supplies', amount: 750 });
  });

  it('falls back to explicit config gracefully when the approvedRequest lookup fails', async () => {
    const createService = fakeCreateService('po-3', 'draft');
    const readService: IReadResourceService = { getResource: jest.fn().mockRejectedValue(new Error('not found')) };
    const { ctx } = createMockNodeContext({
      inputs: { request: { requestId: 'missing-req', supplier: 'Fallback Co', amount: 300 } },
    });
    const exec = resolveNode({ createService, readService })('lados.finance.create_purchase_order')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['po']).toMatchObject({ poId: 'po-3', supplier: 'Fallback Co', amount: 300 });
  });

  it('fails when supplier cannot be resolved from any source', async () => {
    const { ctx } = createMockNodeContext({ inputs: { request: { amount: 300 } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.finance.create_purchase_order')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.finance.record_purchase_order_approval', () => {
  it('never fabricates approvedBy — fails with MISSING_HUMAN_DECISION when absent', async () => {
    const { ctx } = createMockNodeContext({ inputs: { decision: { resourceId: 'po-1', decision: 'approved' } } });
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.finance.record_purchase_order_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_HUMAN_DECISION');
  });

  it('records a PO approval decision with an explicit human actor', async () => {
    const transitionService = fakeTransitionService({ state: 'approved' });
    const { ctx } = createMockNodeContext({
      inputs: { decision: { resourceId: 'po-1', approvedBy: 'user-owner-2', decision: 'approved' } },
    });
    const exec = resolveNode({ transitionService })('lados.finance.record_purchase_order_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['approval']).toMatchObject({ resourceId: 'po-1', status: 'approved', approvedBy: 'user-owner-2' });
  });
});

describe('lados.finance.claim_retention_release', () => {
  it('creates a retention release claim', async () => {
    const createService = fakeCreateService('ret-1', 'claimed');
    const { ctx } = createMockNodeContext({ inputs: { claim: { contractReference: 'CTR-001', claimedAmount: 5000 } } });
    const exec = resolveNode({ createService })('lados.finance.claim_retention_release')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['retention']).toMatchObject({ retentionId: 'ret-1', contractReference: 'CTR-001', claimedAmount: 5000 });
  });

  it('fails when contractReference is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { claim: { claimedAmount: 5000 } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.finance.claim_retention_release')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.finance.record_retention_release', () => {
  it('never fabricates releasedBy — fails with MISSING_HUMAN_DECISION when absent', async () => {
    const { ctx } = createMockNodeContext({ inputs: { release: { resourceId: 'ret-1', releasedAmount: 5000 } } });
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.finance.record_retention_release')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_HUMAN_DECISION');
  });

  it('records a retention release with an explicit human actor', async () => {
    const transitionService = fakeTransitionService({ state: 'released' });
    const { ctx } = createMockNodeContext({
      inputs: { release: { resourceId: 'ret-1', releasedAmount: 5000, releasedBy: 'user-owner-3' } },
    });
    const exec = resolveNode({ transitionService })('lados.finance.record_retention_release')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['record']).toMatchObject({ resourceId: 'ret-1', status: 'released', releasedBy: 'user-owner-3' });
  });
});
