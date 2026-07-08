/**
 * Phase 21 S6.1 (remaining Wave 4) — @lados/official-people-payroll.
 *
 * Covers the master-plan test requirement: "TEST per node as S2" for all
 * 3 nodes (prepare_payroll_run, record_payroll_approval,
 * record_expense_approval). Both approval nodes are asserted to fail
 * with MISSING_HUMAN_DECISION when approvedBy is absent — the system
 * must never approve payroll or expenses itself.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type IUpdateResourceService,
} from '@lados/official-people-payroll';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-people-payroll/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'payroll-1', state = 'prepared', type = 'payroll_run'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type, name: 'x', state, data: {} }),
  };
}

function fakeUpdateService(): IUpdateResourceService {
  return {
    updateResource: jest.fn().mockResolvedValue({ id: 'x', type: 'payroll_run', name: 'x', state: 'prepared', data: {} }),
  };
}

describe('official-people-payroll — manifest <-> executor contract', () => {
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
    expect(resolveNode({})('lados.people_payroll.does_not_exist')).toBeNull();
  });
});

describe('lados.people_payroll.prepare_payroll_run', () => {
  it('prepares payroll data only — never approves or pays', async () => {
    const createService = fakeCreateService('payroll-1', 'prepared');
    const { ctx } = createMockNodeContext({ inputs: { inputs: { period: '2026-07', employeeGroup: 'Site Crew' } } });
    const exec = resolveNode({ createService })('lados.people_payroll.prepare_payroll_run')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['payrollRun']).toMatchObject({ payrollRunId: 'payroll-1', period: '2026-07', status: 'prepared' });
    expect(createService.createResource).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payroll_run', data: expect.objectContaining({ advisory: true }) }),
    );
  });

  it('fails when employeeGroup is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { inputs: { period: '2026-07' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.people_payroll.prepare_payroll_run')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { inputs: { period: '2026-07', employeeGroup: 'Site Crew' } } });
    const exec = resolveNode({})('lados.people_payroll.prepare_payroll_run')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });
});

describe('lados.people_payroll.record_payroll_approval', () => {
  it('fails with MISSING_HUMAN_DECISION when approvedBy is absent — the system must not approve payroll', async () => {
    const { ctx } = createMockNodeContext({ inputs: { decision: { resourceId: 'payroll-1', decision: 'approved' } } });
    const exec = resolveNode({ updateService: fakeUpdateService() })('lados.people_payroll.record_payroll_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_HUMAN_DECISION');
  });

  it('records a human payroll approval decision', async () => {
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({ inputs: { decision: { resourceId: 'payroll-1', decision: 'approved', approvedBy: 'owner-1' } } });
    const exec = resolveNode({ updateService })('lados.people_payroll.record_payroll_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['approval']).toMatchObject({ resourceId: 'payroll-1', decision: 'approved', approvedBy: 'owner-1' });
  });

  it('fails when decision value is not approved/rejected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { decision: { resourceId: 'payroll-1', decision: 'maybe', approvedBy: 'owner-1' } } });
    const exec = resolveNode({ updateService: fakeUpdateService() })('lados.people_payroll.record_payroll_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.people_payroll.record_expense_approval', () => {
  it('fails with MISSING_HUMAN_DECISION when approvedBy is absent — AI may not approve expenses', async () => {
    const { ctx } = createMockNodeContext({ inputs: { expense: { resourceId: 'exp-1', decision: 'approved' } } });
    const exec = resolveNode({ updateService: fakeUpdateService() })('lados.people_payroll.record_expense_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_HUMAN_DECISION');
  });

  it('records a human expense approval decision', async () => {
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({ inputs: { expense: { resourceId: 'exp-1', decision: 'approved', approvedBy: 'owner-1', policyRefs: ['policy-1'] } } });
    const exec = resolveNode({ updateService })('lados.people_payroll.record_expense_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['approval']).toMatchObject({ resourceId: 'exp-1', decision: 'approved', approvedBy: 'owner-1' });
  });

  it('fails with NO_SERVICE when no update service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { expense: { resourceId: 'exp-1', decision: 'approved', approvedBy: 'owner-1' } } });
    const exec = resolveNode({})('lados.people_payroll.record_expense_approval')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });
});
