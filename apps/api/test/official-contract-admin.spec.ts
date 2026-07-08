/**
 * Phase 21 S6.1 (remaining Wave 4) — @lados/official-contract-admin.
 *
 * Covers the master-plan test requirement: "TEST per node as S2" for all
 * 5 nodes (register_instruction, prepare_notice, track_notice_due_date,
 * lookup_clause_reference, link_correspondence_evidence).
 * lookup_clause_reference is asserted to never fabricate a match when no
 * candidate clause source is supplied; prepare_notice/track_notice_due_date
 * are asserted to always be advisory (requires human review), never a
 * legal determination.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type IUpdateResourceService,
} from '@lados/official-contract-admin';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-contract-admin/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'inst-1', state = 'registered', type = 'contract_instruction'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type, name: 'x', state, data: {} }),
  };
}

function fakeUpdateService(): IUpdateResourceService {
  return {
    updateResource: jest.fn().mockResolvedValue({ id: 'notice-1', type: 'contract_notice', name: 'x', state: 'draft', data: {} }),
  };
}

describe('official-contract-admin — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({ createService: fakeCreateService(), updateService: fakeUpdateService() });
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
    expect(resolveNode()('lados.contract.does_not_exist')).toBeNull();
  });
});

describe('lados.contract.register_instruction', () => {
  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { instruction: { instructionDate: '2026-07-01', issuer: 'Consultant', reference: 'CI-001' } } });
    const exec = resolveNode()('lados.contract.register_instruction')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('registers an instruction record', async () => {
    const createService = fakeCreateService('inst-1', 'registered');
    const { ctx } = createMockNodeContext({ inputs: { instruction: { instructionDate: '2026-07-01', issuer: 'Consultant', reference: 'CI-001' } } });
    const exec = resolveNode({ createService })('lados.contract.register_instruction')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['entry']).toMatchObject({ instructionId: 'inst-1', reference: 'CI-001', status: 'registered' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'contract_instruction' }));
  });

  it('fails when reference is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { instruction: { instructionDate: '2026-07-01', issuer: 'Consultant' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.contract.register_instruction')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.contract.prepare_notice', () => {
  it('is advisory only — never issues a legal or contractual determination', async () => {
    const createService = fakeCreateService('notice-1', 'draft', 'contract_notice');
    const { ctx } = createMockNodeContext({
      inputs: { event: { noticeType: 'Extension of Time', recipient: 'Employer' } },
    });
    const exec = resolveNode({ createService })('lados.contract.prepare_notice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['notice']).toMatchObject({ noticeId: 'notice-1', noticeType: 'Extension of Time', status: 'draft' });
    expect(createService.createResource).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'contract_notice', data: expect.objectContaining({ requiresContractAdminReview: true }) }),
    );
  });

  it('fails when recipient is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { event: { noticeType: 'Extension of Time' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.contract.prepare_notice')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.contract.track_notice_due_date', () => {
  it('computes due date and reminder date deterministically, always requiring review', async () => {
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({
      inputs: { notice: { resourceId: 'notice-1', baseDate: '2026-07-01T00:00:00.000Z' } },
      config: { dueDateRule: 14, reminderOffsetDays: 3 },
    });
    const exec = resolveNode({ updateService })('lados.contract.track_notice_due_date')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const tracking = result.outputs['tracking'] as { dueDate: string; reminderDate: string; requiresReview: boolean };
    expect(tracking.requiresReview).toBe(true);
    expect(tracking.dueDate).toBe('2026-07-15T00:00:00.000Z');
    expect(tracking.reminderDate).toBe('2026-07-12T00:00:00.000Z');
    expect(updateService.updateResource).toHaveBeenCalled();
  });

  it('fails when baseDate is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { notice: { resourceId: 'notice-1' } } });
    const exec = resolveNode()('lados.contract.track_notice_due_date')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.contract.lookup_clause_reference', () => {
  it('is a deterministic keyword match, not AI or a real KP search — never fabricates a match when no candidates are supplied', async () => {
    const { ctx } = createMockNodeContext({ inputs: { query: 'extension of time' } });
    const exec = resolveNode()('lados.contract.lookup_clause_reference')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['clauses']).toEqual([]);
    expect(result.logs).toContain('NO_CLAUSE_SOURCE_SUPPLIED');
  });

  it('scores and ranks candidate clauses by keyword match', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        query: 'extension of time',
        availableClauses: [
          { clauseRef: 'Clause 40', text: 'Extension of time for completion' },
          { clauseRef: 'Clause 5', text: 'Unrelated payment terms' },
        ],
      },
    });
    const exec = resolveNode()('lados.contract.lookup_clause_reference')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const clauses = result.outputs['clauses'] as Array<{ clauseRef: string }>;
    expect(clauses[0]?.clauseRef).toBe('Clause 40');
  });

  it('fails when query is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const exec = resolveNode()('lados.contract.lookup_clause_reference')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.contract.link_correspondence_evidence', () => {
  it('links evidence without judging sufficiency', async () => {
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({
      inputs: { evidence: { resourceBinding: 'notice-1', documentRefs: ['doc-1'], correspondenceRefs: [] } },
    });
    const exec = resolveNode({ updateService })('lados.contract.link_correspondence_evidence')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['link']).toMatchObject({ resourceId: 'notice-1', documentRefs: ['doc-1'] });
  });

  it('fails when neither documentRefs nor correspondenceRefs are supplied', async () => {
    const { ctx } = createMockNodeContext({ inputs: { evidence: { resourceBinding: 'notice-1' } } });
    const exec = resolveNode({ updateService: fakeUpdateService() })('lados.contract.link_correspondence_evidence')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with NO_SERVICE when no update service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { evidence: { resourceBinding: 'notice-1', documentRefs: ['doc-1'] } } });
    const exec = resolveNode()('lados.contract.link_correspondence_evidence')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });
});
