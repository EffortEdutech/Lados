/**
 * Phase 21 S4 (Wave 2) — @lados/official-resource-operations.
 *
 * Covers the master-plan S4 test requirement: "TEST per node as S2" for the
 * original 8 nodes (create, read, list, update, transition,
 * resolve_binding, artifact.write, artifact.read).
 *
 * Also proves the S4 skeleton-gap fix: nodes.json/manifest.json declared
 * the "resource.transition" capability with no corresponding node — this
 * suite asserts the fix (lados.resource.transition) is present, resolves,
 * and is marked implemented, alongside every other declared node.
 *
 * Phase 21 S9.1 (gap closure, 2026-07-04): added coverage for
 * `lados.resource.assign` (successor to prototype `foundation.assign_user`),
 * bringing the pack to 9 nodes for 9 capabilities.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type ICreateResourceService,
  type IReadResourceService,
  type IListResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
  type IArtifactWriteService,
  type IArtifactReadService,
} from '@lados/official-resource-operations';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}
interface PackManifestLike {
  nodes: string[];
  capabilities: string[];
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-resource-operations/nodes.json'), 'utf8'),
);
const manifest: PackManifestLike = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-resource-operations/manifest.json'), 'utf8'),
);

function fakeCreateService(): ICreateResourceService {
  return { createResource: jest.fn().mockResolvedValue({ id: 'r1', type: 'job', name: 'Job 1', state: 'draft', data: {} }) };
}
function fakeReadService(found = true): IReadResourceService {
  return {
    getResource: found
      ? jest.fn().mockResolvedValue({ id: 'r1', type: 'job', name: 'Job 1', state: 'draft', data: { foo: 'bar' } })
      : jest.fn().mockRejectedValue(new Error('not found')),
  };
}
function fakeListService(): IListResourceService {
  return {
    listResources: jest.fn().mockResolvedValue([
      { id: 'r1', type: 'job', name: 'Job 1', state: 'draft', data: {} },
      { id: 'r2', type: 'job', name: 'Job 2', state: 'active', data: {} },
    ]),
  };
}
function fakeUpdateService(): IUpdateResourceService {
  return { updateResource: jest.fn().mockResolvedValue({ id: 'r1', type: 'job', name: 'Job 1', state: 'draft', data: { a: 1 } }) };
}
function fakeTransitionService(
  outcome: { state: string; approvalRequired?: boolean; approvalTaskId?: string } = { state: 'active' },
): ITransitionResourceService {
  return {
    transitionState: jest.fn().mockResolvedValue({
      id: 'r1', type: 'job', name: 'Job 1', data: {},
      state: outcome.state, approvalRequired: outcome.approvalRequired, approvalTaskId: outcome.approvalTaskId,
    }),
  };
}
function fakeArtifactWriteService(): IArtifactWriteService {
  return { upsertArtifact: jest.fn().mockResolvedValue({ id: 'a1', artifact_key: 'k1', version: 1 }) };
}
function fakeArtifactReadService(found = true): IArtifactReadService {
  return {
    readArtifact: jest.fn().mockResolvedValue(
      found ? { id: 'a1', artifact_key: 'k1', data: { hello: 'world' }, version: 1 } : null,
    ),
  };
}

describe('official-resource-operations — manifest <-> executor contract', () => {
  it('declares 9 nodes for 9 capabilities (S4 fix: resource.transition gap closed; S9.1: resource.assign added)', () => {
    expect(manifest.capabilities).toContain('resource.transition');
    expect(manifest.nodes).toContain('lados.resource.transition');
    expect(manifest.capabilities).toContain('resource.assign');
    expect(manifest.nodes).toContain('lados.resource.assign');
    expect(manifest.nodes.length).toBe(manifest.capabilities.length);
    expect(manifests.length).toBe(9);
  });

  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      createService: fakeCreateService(),
      readService: fakeReadService(),
      listService: fakeListService(),
      updateService: fakeUpdateService(),
      transitionService: fakeTransitionService(),
      artifactWriteService: fakeArtifactWriteService(),
      artifactReadService: fakeArtifactReadService(),
      assignService: fakeUpdateService(),
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
    expect(resolveNode()('lados.resource.does_not_exist')).toBeNull();
  });
});

describe('lados.resource.create', () => {
  it('fails with NO_SERVICE when no create service is injected', async () => {
    const { ctx } = createMockNodeContext({ config: { resourceType: 'job', name: 'x' } });
    const result = await resolveNode()('lados.resource.create')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('creates a resource', async () => {
    const createService = fakeCreateService();
    const { ctx } = createMockNodeContext({ config: { resourceType: 'job' }, inputs: { data: { name: 'Job 1' } } });
    const result = await resolveNode({ createService })('lados.resource.create')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['resource']).toMatchObject({ resourceId: 'r1', type: 'job' });
  });

  it('fails when resourceType is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { data: { name: 'x' } } });
    const result = await resolveNode({ createService: fakeCreateService() })('lados.resource.create')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.resource.read', () => {
  it('reads a resource', async () => {
    const readService = fakeReadService(true);
    const { ctx } = createMockNodeContext({ config: { resourceId: 'r1' } });
    const result = await resolveNode({ readService })('lados.resource.read')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['resource']).toMatchObject({ resourceId: 'r1', data: { foo: 'bar' } });
  });

  it('fails with RESOURCE_NOT_FOUND', async () => {
    const readService = fakeReadService(false);
    const { ctx } = createMockNodeContext({ config: { resourceId: 'missing' } });
    const result = await resolveNode({ readService })('lados.resource.read')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
  });
});

describe('lados.resource.list', () => {
  it('lists resources', async () => {
    const listService = fakeListService();
    const { ctx } = createMockNodeContext({ config: { resourceType: 'job' } });
    const result = await resolveNode({ listService })('lados.resource.list')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['count']).toBe(2);
    expect((result.outputs['resources'] as unknown[]).length).toBe(2);
  });
});

describe('lados.resource.update', () => {
  it('updates a resource', async () => {
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({ inputs: { resource: { resourceId: 'r1' }, data: { a: 1 } } });
    const result = await resolveNode({ updateService })('lados.resource.update')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['updated']).toMatchObject({ resourceId: 'r1' });
  });

  it('fails when resourceId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { data: { a: 1 } } });
    const result = await resolveNode({ updateService: fakeUpdateService() })('lados.resource.update')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.resource.transition (S4 gap fix)', () => {
  it('transitions a resource', async () => {
    const transitionService = fakeTransitionService({ state: 'active' });
    const { ctx } = createMockNodeContext({ inputs: { resource: { resourceId: 'r1', toState: 'active' } } });
    const result = await resolveNode({ transitionService })('lados.resource.transition')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['transitioned']).toMatchObject({ resourceId: 'r1', state: 'active' });
  });

  it('pauses (never silently bypasses approval) when the guard requires it', async () => {
    const transitionService = fakeTransitionService({ state: 'draft', approvalRequired: true, approvalTaskId: 'appr-9' });
    const { ctx } = createMockNodeContext({ inputs: { resource: { resourceId: 'r1', toState: 'active' } } });
    const result = await resolveNode({ transitionService })('lados.resource.transition')!(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-9' });
  });

  it('fails when toState is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { resource: { resourceId: 'r1' } } });
    const result = await resolveNode({ transitionService: fakeTransitionService() })('lados.resource.transition')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.resource.resolve_binding', () => {
  it('resolves a bound resource by bindingKey', async () => {
    const readService = fakeReadService(true);
    // Simulates apps/api's resolveDefinitionBindings having already merged
    // the bound resourceId into config under the bindingKey name.
    const { ctx } = createMockNodeContext({ config: { bindingKey: 'sourceJob', sourceJob: 'r1' } });
    const result = await resolveNode({ readService })('lados.resource.resolve_binding')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['resource']).toMatchObject({ resourceId: 'r1' });
  });

  it('fails with UNRESOLVED_BINDING when nothing is bound yet', async () => {
    const { ctx } = createMockNodeContext({ config: { bindingKey: 'sourceJob' } });
    const result = await resolveNode({ readService: fakeReadService() })('lados.resource.resolve_binding')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('UNRESOLVED_BINDING');
  });

  it('fails with TYPE_MISMATCH when requiredResourceType does not match', async () => {
    const readService = fakeReadService(true); // returns type: 'job'
    const { ctx } = createMockNodeContext({
      config: { bindingKey: 'sourceJob', sourceJob: 'r1', requiredResourceType: 'invoice' },
    });
    const result = await resolveNode({ readService })('lados.resource.resolve_binding')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('TYPE_MISMATCH');
  });
});

describe('lados.artifact.write / lados.artifact.read', () => {
  it('writes an artifact', async () => {
    const artifactWriteService = fakeArtifactWriteService();
    const { ctx } = createMockNodeContext({ config: { key: 'k1' }, inputs: { value: { hello: 'world' } } });
    const result = await resolveNode({ artifactWriteService })('lados.artifact.write')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['artifact']).toMatchObject({ artifactId: 'a1', key: 'k1', version: 1 });
  });

  it('reads an artifact', async () => {
    const artifactReadService = fakeArtifactReadService(true);
    const { ctx } = createMockNodeContext({ config: { key: 'k1' } });
    const result = await resolveNode({ artifactReadService })('lados.artifact.read')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['value']).toEqual({ hello: 'world' });
    expect(result.outputs['found']).toBe(true);
  });

  it('read returns found:false (not a failure) when artifact is absent and required=false', async () => {
    const artifactReadService = fakeArtifactReadService(false);
    const { ctx } = createMockNodeContext({ config: { key: 'missing' } });
    const result = await resolveNode({ artifactReadService })('lados.artifact.read')!(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['found']).toBe(false);
  });

  it('read fails with ARTIFACT_NOT_FOUND when required=true and absent', async () => {
    const artifactReadService = fakeArtifactReadService(false);
    const { ctx } = createMockNodeContext({ config: { key: 'missing', required: true } });
    const result = await resolveNode({ artifactReadService })('lados.artifact.read')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('ARTIFACT_NOT_FOUND');
  });
});

describe('lados.resource.assign (S9.1 gap closure)', () => {
  it('fails with NO_SERVICE when no update service is injected', async () => {
    const { ctx } = createMockNodeContext({ config: { resourceId: 'r1', userId: 'u1' } });
    const result = await resolveNode()('lados.resource.assign')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('assigns a user to a resource, writing assignee + assigneeRole into data', async () => {
    const assignService = fakeUpdateService();
    const { ctx } = createMockNodeContext({
      inputs: { resource: { resourceId: 'r1' }, data: { userId: 'u1', assigneeRole: 'driver' } },
    });
    const result = await resolveNode({ assignService })('lados.resource.assign')!(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['assigned']).toMatchObject({ resourceId: 'r1', userId: 'u1', assigneeRole: 'driver' });
    expect(assignService.updateResource).toHaveBeenCalledWith(
      'r1',
      expect.any(String),
      { data: { assignee: 'u1', assigneeRole: 'driver' } },
      expect.any(String),
    );
  });

  it('falls back to the shared updateService when no dedicated assignService is injected', async () => {
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({
      inputs: { resource: { resourceId: 'r1' }, data: { userId: 'u1' } },
    });
    const result = await resolveNode({ updateService })('lados.resource.assign')!(ctx);
    expect(result.status).toBe('success');
  });

  it('fails when resourceId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { data: { userId: 'u1' } } });
    const result = await resolveNode({ assignService: fakeUpdateService() })('lados.resource.assign')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails when userId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { resource: { resourceId: 'r1' } } });
    const result = await resolveNode({ assignService: fakeUpdateService() })('lados.resource.assign')!(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});
