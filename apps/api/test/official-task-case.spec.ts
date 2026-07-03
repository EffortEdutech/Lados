/**
 * Phase 21 S4 (Wave 2) — @lados/official-task-case.
 *
 * Covers the master-plan S4 test requirement: "TEST per node as S2" for all
 * 4 nodes (create, update_status, open, close). Tasks/Cases are Workspace
 * Resources (type "task"/"case"); status/closure changes go through the
 * same guarded transitionState() mechanism, so this suite also proves the
 * requires_approval guard surfaces as status:'paused', never a silent
 * auto-approval.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
} from '@lados/official-task-case';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-task-case/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'res-1', state = 'open'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type: 'task', name: 'x', state, data: {} }),
  };
}

function fakeUpdateService(): IUpdateResourceService {
  return {
    updateResource: jest.fn().mockResolvedValue({ id: 'res-1', type: 'task', name: 'x', state: 'open', data: {} }),
  };
}

function fakeTransitionService(
  outcome: { state: string; approvalRequired?: boolean; approvalTaskId?: string } = { state: 'done' },
): ITransitionResourceService {
  return {
    transitionState: jest.fn().mockResolvedValue({
      id: 'res-1',
      type: 'task',
      name: 'x',
      state: outcome.state,
      data: {},
      approvalRequired: outcome.approvalRequired,
      approvalTaskId: outcome.approvalTaskId,
    }),
  };
}

describe('official-task-case — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      createService: fakeCreateService(),
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
    expect(resolveNode()('lados.task.does_not_exist')).toBeNull();
  });
});

describe('lados.task.create', () => {
  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { context: { title: 'Do the thing' } } });
    const exec = resolveNode()('lados.task.create')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('creates a task resource', async () => {
    const createService = fakeCreateService('task-1', 'open');
    const { ctx } = createMockNodeContext({ inputs: { context: { title: 'Do the thing', assignee: 'u1' } } });
    const exec = resolveNode({ createService })('lados.task.create')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['task']).toMatchObject({ taskId: 'task-1', title: 'Do the thing', status: 'open' });
    expect(createService.createResource).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'task', name: 'Do the thing' }),
    );
  });

  it('fails when title is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode({ createService: fakeCreateService() })('lados.task.create')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.task.update_status', () => {
  it('fails with NO_SERVICE when no transition service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { task: { taskId: 't1', status: 'done' } } });
    const exec = resolveNode()('lados.task.update_status')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('transitions a task status', async () => {
    const transitionService = fakeTransitionService({ state: 'done' });
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({ inputs: { task: { taskId: 't1', status: 'done', reason: 'finished' } } });
    const exec = resolveNode({ transitionService, updateService })('lados.task.update_status')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['updated']).toMatchObject({ taskId: 't1', status: 'done' });
    expect(transitionService.transitionState).toHaveBeenCalledWith('t1', expect.any(String), 'done', expect.any(String));
  });

  it('pauses (never silently auto-approves) when the state machine requires approval', async () => {
    const transitionService = fakeTransitionService({ state: 'open', approvalRequired: true, approvalTaskId: 'appr-1' });
    const { ctx } = createMockNodeContext({ inputs: { task: { taskId: 't1', status: 'closed' } } });
    const exec = resolveNode({ transitionService })('lados.task.update_status')!;
    const result = await exec(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-1' });
  });

  it('fails when resourceId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { task: { status: 'done' } } });
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.task.update_status')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.case.open', () => {
  it('opens a case resource', async () => {
    const createService = fakeCreateService('case-1', 'open');
    const { ctx } = createMockNodeContext({ inputs: { source: { title: 'Defect #4', caseType: 'defect' } } });
    const exec = resolveNode({ createService })('lados.case.open')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['case']).toMatchObject({ caseId: 'case-1', title: 'Defect #4', status: 'open' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'case' }));
  });

  it('fails when title is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode({ createService: fakeCreateService() })('lados.case.open')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.case.close', () => {
  it('closes a case', async () => {
    const transitionService = fakeTransitionService({ state: 'closed' });
    const { ctx } = createMockNodeContext({ inputs: { case: { caseId: 'case-1', reason: 'resolved' } } });
    const exec = resolveNode({ transitionService })('lados.case.close')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['closed']).toMatchObject({ caseId: 'case-1', status: 'closed' });
    expect(transitionService.transitionState).toHaveBeenCalledWith('case-1', expect.any(String), 'closed', expect.any(String));
  });

  it('pauses when closure requires approval', async () => {
    const transitionService = fakeTransitionService({ state: 'open', approvalRequired: true, approvalTaskId: 'appr-2' });
    const { ctx } = createMockNodeContext({ inputs: { case: { caseId: 'case-1' } } });
    const exec = resolveNode({ transitionService })('lados.case.close')!;
    const result = await exec(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-2' });
  });

  it('fails when case resourceId is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.case.close')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});
