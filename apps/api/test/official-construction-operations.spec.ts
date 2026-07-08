/**
 * Phase 21 S6 (Wave 4) — @lados/official-construction-operations.
 *
 * Covers the master-plan S6 test requirement: "TEST per node as S2" for
 * all 6 nodes (create_project, create_site_inspection,
 * submit_inspection_report, log_defect, create_site_diary,
 * run_handover_checklist). submit_inspection_report and
 * run_handover_checklist are asserted to never silently certify/sign off
 * — submission pauses when the state machine requires approval, and the
 * checklist evaluation is always advisory.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
} from '@lados/official-construction-operations';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-construction-operations/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'proj-1', state = 'active', type = 'construction_project'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type, name: 'x', state, data: {} }),
  };
}

function fakeUpdateService(): IUpdateResourceService {
  return {
    updateResource: jest.fn().mockResolvedValue({ id: 'insp-1', type: 'site_inspection', name: 'x', state: 'scheduled', data: {} }),
  };
}

function fakeTransitionService(
  outcome: { state: string; approvalRequired?: boolean; approvalTaskId?: string } = { state: 'reported' },
): ITransitionResourceService {
  return {
    transitionState: jest.fn().mockResolvedValue({
      id: 'insp-1',
      type: 'site_inspection',
      name: 'x',
      state: outcome.state,
      data: {},
      approvalRequired: outcome.approvalRequired,
      approvalTaskId: outcome.approvalTaskId,
    }),
  };
}

describe('official-construction-operations — manifest <-> executor contract', () => {
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
    expect(resolveNode()('lados.construction.does_not_exist')).toBeNull();
  });
});

describe('lados.construction.create_project', () => {
  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { project: { projectName: 'Site A' } } });
    const exec = resolveNode()('lados.construction.create_project')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('creates a project resource', async () => {
    const createService = fakeCreateService('proj-1', 'active');
    const { ctx } = createMockNodeContext({ inputs: { project: { projectName: 'Site A', client: 'Acme Corp' } } });
    const exec = resolveNode({ createService })('lados.construction.create_project')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['resource']).toMatchObject({ projectId: 'proj-1', projectName: 'Site A', status: 'active' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'construction_project' }));
  });

  it('fails when projectName is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { project: {} } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.construction.create_project')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.construction.create_site_inspection', () => {
  it('creates an inspection, optionally nested under a project', async () => {
    const createService = fakeCreateService('insp-1', 'scheduled', 'site_inspection');
    const { ctx } = createMockNodeContext({
      inputs: { site: { inspectionType: 'Quality Check', location: 'Block A', projectId: 'proj-1' } },
      config: { checklistRefs: ['checklist-ref-1'] },
    });
    const exec = resolveNode({ createService })('lados.construction.create_site_inspection')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['inspection']).toMatchObject({ inspectionId: 'insp-1', inspectionType: 'Quality Check', status: 'scheduled' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'site_inspection', parentId: 'proj-1' }));
  });

  it('fails when inspectionType is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { site: {} } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.construction.create_site_inspection')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.construction.submit_inspection_report', () => {
  it('fails with NO_SERVICE when no transition service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { inspection: { resourceId: 'insp-1', findings: 'All clear' } } });
    const exec = resolveNode()('lados.construction.submit_inspection_report')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('submits a report and transitions the inspection to reported', async () => {
    const transitionService = fakeTransitionService({ state: 'reported' });
    const { ctx } = createMockNodeContext({ inputs: { inspection: { resourceId: 'insp-1', findings: 'All clear', submittedBy: 'inspector-1' } } });
    const exec = resolveNode({ transitionService })('lados.construction.submit_inspection_report')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['report']).toMatchObject({ resourceId: 'insp-1', status: 'reported', submittedBy: 'inspector-1' });
  });

  it('pauses (never silently certifies) when submission requires approval', async () => {
    const transitionService = fakeTransitionService({ state: 'scheduled', approvalRequired: true, approvalTaskId: 'appr-constr-1' });
    const { ctx } = createMockNodeContext({ inputs: { inspection: { resourceId: 'insp-1', findings: 'Issue found' } } });
    const exec = resolveNode({ transitionService })('lados.construction.submit_inspection_report')!;
    const result = await exec(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-constr-1' });
  });

  it('fails when findings is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { inspection: { resourceId: 'insp-1' } } });
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.construction.submit_inspection_report')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.construction.log_defect', () => {
  it('logs a defect without inventing a classification engine', async () => {
    const createService = fakeCreateService('def-1', 'open', 'defect');
    const { ctx } = createMockNodeContext({
      inputs: { evidence: { location: 'Level 3', description: 'Crack in wall', severity: 'high' } },
      config: { defectRules: ['defect-rule-1'] },
    });
    const exec = resolveNode({ createService })('lados.construction.log_defect')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['defect']).toMatchObject({ defectId: 'def-1', location: 'Level 3', severity: 'high', status: 'open' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'defect' }));
  });

  it('fails when description is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { evidence: { location: 'Level 3' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.construction.log_defect')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.construction.create_site_diary', () => {
  it('creates a site diary entry', async () => {
    const createService = fakeCreateService('diary-1', 'recorded', 'site_diary');
    const { ctx } = createMockNodeContext({ inputs: { entry: { date: '2026-07-04', weather: 'Sunny', projectId: 'proj-1' } } });
    const exec = resolveNode({ createService })('lados.construction.create_site_diary')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['diary']).toMatchObject({ diaryId: 'diary-1', date: '2026-07-04', status: 'recorded' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'site_diary', parentId: 'proj-1' }));
  });

  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { entry: { date: '2026-07-04' } } });
    const exec = resolveNode()('lados.construction.create_site_diary')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });
});

describe('lados.construction.run_handover_checklist', () => {
  it('is advisory only — evaluates completion without signing off', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { checklist: { items: [{ item: 'Fire safety', complete: true }, { item: 'Electrical certificate', complete: false }] } },
      config: { checklistRefs: ['handover-sop-1'] },
    });
    const exec = resolveNode()('lados.construction.run_handover_checklist')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const checklistResult = result.outputs['result'] as { advisory: boolean; allComplete: boolean; outstandingItems: string[]; requiresSignoff: boolean };
    expect(checklistResult.advisory).toBe(true);
    expect(checklistResult.allComplete).toBe(false);
    expect(checklistResult.outstandingItems).toEqual(['Electrical certificate']);
    expect(checklistResult.requiresSignoff).toBe(true);
  });

  it('fails when checklist.items is empty', async () => {
    const { ctx } = createMockNodeContext({ inputs: { checklist: { items: [] } } });
    const exec = resolveNode()('lados.construction.run_handover_checklist')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});
