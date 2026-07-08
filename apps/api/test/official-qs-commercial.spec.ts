/**
 * Phase 21 S6 (Wave 4) — @lados/official-qs-commercial.
 *
 * Covers the master-plan S6 test requirement: "TEST per node as S2" for
 * all 7 nodes (read_boq, normalize_boq, classify_trade,
 * split_work_packages, value_variation, assess_progress_claim,
 * reconcile_final_account). classify_trade/value_variation/
 * assess_progress_claim/reconcile_final_account are all deterministic
 * rules-based advisory computations — this suite asserts they never
 * silently certify/approve (always advisory / requiresReview), and that
 * read_boq/assess_progress_claim never fabricate data when a dependency
 * is missing.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type IReadResourceService,
} from '@lados/official-qs-commercial';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-qs-commercial/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'boq-1', state = 'normalized'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type: 'boq', name: 'x', state, data: {} }),
  };
}

function fakeReadService(overrides: Record<string, unknown> = {}): IReadResourceService {
  return {
    getResource: jest.fn().mockResolvedValue({
      id: 'claim-1', type: 'progress_claim', name: 'x', state: 'submitted', data: { claimedAmount: 1000 }, ...overrides,
    }),
  };
}

describe('official-qs-commercial — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({ createService: fakeCreateService(), readService: fakeReadService() });
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
    expect(resolveNode()('lados.qs.does_not_exist')).toBeNull();
  });
});

describe('lados.qs.read_boq', () => {
  it('parses raw rows using the column mapping', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { source: { rows: [{ itemNo: '1', description: 'Concrete works', unit: 'm3', quantity: 10, rate: 250 }] } },
    });
    const exec = resolveNode()('lados.qs.read_boq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const boq = result.outputs['boq'] as { items: unknown[]; source: string };
    expect(boq.source).toBe('rows');
    expect(boq.items).toHaveLength(1);
  });

  it('fails with NO_SERVICE when sourceType is "resource" but no read service is injected', async () => {
    const { ctx } = createMockNodeContext({ config: { sourceType: 'resource', bindingKey: 'boqResourceId', boqResourceId: 'boq-1' } });
    const exec = resolveNode()('lados.qs.read_boq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('reads items from a bound resource', async () => {
    const readService: IReadResourceService = {
      getResource: jest.fn().mockResolvedValue({ id: 'boq-1', type: 'boq', name: 'x', state: 'normalized', data: { items: [{ itemNo: '1' }] } }),
    };
    const { ctx } = createMockNodeContext({ config: { sourceType: 'resource', bindingKey: 'boqResourceId', boqResourceId: 'boq-1' } });
    const exec = resolveNode({ readService })('lados.qs.read_boq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const boq = result.outputs['boq'] as { items: unknown[]; source: string; boqId: string };
    expect(boq.source).toBe('resource');
    expect(boq.boqId).toBe('boq-1');
  });
});

describe('lados.qs.normalize_boq', () => {
  it('cleans rows, flags issues, and dedupes item numbers', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        items: [
          { itemNo: '1', description: 'Concrete', quantity: 10, rate: 250 },
          { itemNo: '1', description: 'Duplicate', quantity: 5, rate: 100 },
          { itemNo: '2', description: '', quantity: 3, rate: 50 },
        ],
      },
    });
    const exec = resolveNode()('lados.qs.normalize_boq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const normalized = result.outputs['normalized'] as { items: unknown[]; issues: string[] };
    expect(normalized.items).toHaveLength(2); // duplicate dropped
    expect(normalized.issues.some((i) => i.startsWith('DUPLICATE_ITEM_NO'))).toBe(true);
    expect(normalized.issues.some((i) => i.startsWith('MISSING_DESCRIPTION'))).toBe(true);
  });

  it('fails with NO_SERVICE when persist:true but no create service is injected', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { items: [{ itemNo: '1', description: 'x', quantity: 1, rate: 1 }] },
      config: { persist: true },
    });
    const exec = resolveNode()('lados.qs.normalize_boq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('persists a boq resource when persist:true and a create service is injected', async () => {
    const createService = fakeCreateService('boq-2', 'normalized');
    const { ctx } = createMockNodeContext({
      inputs: { items: [{ itemNo: '1', description: 'x', quantity: 1, rate: 1 }] },
      config: { persist: true, boqName: 'Test BOQ' },
    });
    const exec = resolveNode({ createService })('lados.qs.normalize_boq')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const normalized = result.outputs['normalized'] as { boqId: string };
    expect(normalized.boqId).toBe('boq-2');
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'boq' }));
  });
});

describe('lados.qs.classify_trade', () => {
  it('is a deterministic keyword classifier, not AI — flags low-confidence items for review', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        items: [
          { itemNo: '1', description: 'Reinforced concrete slab' },
          { itemNo: '2', description: 'Mystery item with no keyword match' },
        ],
      },
    });
    const exec = resolveNode()('lados.qs.classify_trade')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const classified = result.outputs['classified'] as Array<{ trade: string; confidence: number; requiresReview: boolean }>;
    expect(classified[0]?.trade).toBe('Concrete Works');
    expect(classified[1]?.trade).toBe('Uncategorized');
    expect(classified[1]?.requiresReview).toBe(true);
  });

  it('fails when items array is empty', async () => {
    const { ctx } = createMockNodeContext({ inputs: { items: [] } });
    const exec = resolveNode()('lados.qs.classify_trade')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.qs.split_work_packages', () => {
  it('groups items by trade with quantity totals', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        items: [
          { trade: 'Concrete Works', quantity: 5 },
          { trade: 'Concrete Works', quantity: 3 },
          { trade: 'Electrical', quantity: 2 },
        ],
      },
    });
    const exec = resolveNode()('lados.qs.split_work_packages')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const workPackages = result.outputs['workPackages'] as { packages: Array<{ key: string; itemCount: number; totalQuantity: number }> };
    const concrete = workPackages.packages.find((p) => p.key === 'Concrete Works');
    expect(concrete).toMatchObject({ itemCount: 2, totalQuantity: 8 });
  });

  it('fails when items array is empty', async () => {
    const { ctx } = createMockNodeContext({ inputs: { items: [] } });
    const exec = resolveNode()('lados.qs.split_work_packages')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.qs.value_variation', () => {
  it('is advisory only — always requiresReview, flags unresolved rates ("rate check")', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        variation: { items: [{ description: 'Extra concrete', quantity: 4, rate: 250 }, { description: 'No rate item', quantity: 2 }] },
        rateLookup: {},
      },
    });
    const exec = resolveNode()('lados.qs.value_variation')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const valuation = result.outputs['valuation'] as { advisory: boolean; requiresReview: boolean; unresolvedCount: number; totalValue: number };
    expect(valuation.advisory).toBe(true);
    expect(valuation.requiresReview).toBe(true);
    expect(valuation.unresolvedCount).toBe(1);
    expect(valuation.totalValue).toBe(1000);
  });

  it('resolves rate from the rate lookup map when no explicit rate is given', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        variation: { items: [{ description: 'Extra bricks', quantity: 10 }] },
        rateLookup: { 'Extra bricks': 20 },
      },
    });
    const exec = resolveNode()('lados.qs.value_variation')!;
    const result = await exec(ctx);
    const valuation = result.outputs['valuation'] as { unresolvedCount: number; totalValue: number };
    expect(valuation.unresolvedCount).toBe(0);
    expect(valuation.totalValue).toBe(200);
  });

  it('fails when variation.items is empty', async () => {
    const { ctx } = createMockNodeContext({ inputs: { variation: { items: [] } } });
    const exec = resolveNode()('lados.qs.value_variation')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.qs.assess_progress_claim', () => {
  it('fails with NO_SERVICE when no read service is injected', async () => {
    const { ctx } = createMockNodeContext({ config: { claimBinding: 'claim-1' } });
    const exec = resolveNode()('lados.qs.assess_progress_claim')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('is advisory only — flags low evidence coverage for review', async () => {
    const readService = fakeReadService({ data: { claimedAmount: 1000 } });
    const { ctx } = createMockNodeContext({
      config: { claimBinding: 'claim-1', claimEvidenceRules: ['rule-ref-1'] },
      inputs: { evidence: [{ amount: 200 }] },
    });
    const exec = resolveNode({ readService })('lados.qs.assess_progress_claim')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const assessment = result.outputs['assessment'] as { advisory: boolean; requiresReview: boolean; flags: string[] };
    expect(assessment.advisory).toBe(true);
    expect(assessment.requiresReview).toBe(true);
    expect(assessment.flags).toContain('EVIDENCE_COVERAGE_BELOW_THRESHOLD');
  });

  it('fails when claimBinding is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode({ readService: fakeReadService() })('lados.qs.assess_progress_claim')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.qs.reconcile_final_account', () => {
  it('is the advisory cost summary node — aggregates work packages + variations and flags variance', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        summary: {
          workPackages: [{ totalValue: 5000 }, { totalValue: 3000 }],
          variations: [{ totalValue: 1000 }],
          budget: 8000,
        },
      },
      config: { tolerancePercent: 5 },
    });
    const exec = resolveNode()('lados.qs.reconcile_final_account')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const costSummary = result.outputs['costSummary'] as { advisory: boolean; totalValue: number; withinTolerance: boolean; requiresReview: boolean };
    expect(costSummary.advisory).toBe(true);
    expect(costSummary.requiresReview).toBe(true);
    expect(costSummary.totalValue).toBe(9000);
    expect(costSummary.withinTolerance).toBe(false); // 9000 vs 8000 budget = 12.5% variance > 5% tolerance
  });

  it('fails when neither workPackages nor variations are supplied', async () => {
    const { ctx } = createMockNodeContext({ inputs: { summary: {} } });
    const exec = resolveNode()('lados.qs.reconcile_final_account')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});
