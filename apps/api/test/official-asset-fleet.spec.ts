/**
 * Phase 21 S6.1 (remaining Wave 4) — @lados/official-asset-fleet.
 *
 * Covers the master-plan test requirement: "TEST per node as S2" for all
 * 7 nodes (create_job, dispatch_trip, complete_trip, upload_fuel_receipt,
 * extract_fuel_receipt, create_maintenance_record, clear_maintenance).
 * complete_trip and clear_maintenance are asserted to pause (never
 * silently certify) when the state machine requires approval;
 * clear_maintenance additionally enforces MISSING_HUMAN_DECISION on
 * clearedBy; extract_fuel_receipt is asserted to be advisory-only
 * (approvedByHuman always false) both when AI is configured and when it
 * is not (honest stub, not a fabricated extraction).
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
  type IAiVisionService,
} from '@lados/official-asset-fleet';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../packs/official/lados-asset-fleet/nodes.json'), 'utf8'),
);

function fakeCreateService(id = 'job-1', state = 'open', type = 'job'): ICreateResourceService {
  return {
    createResource: jest.fn().mockResolvedValue({ id, type, name: 'x', state, data: {} }),
  };
}

function fakeReadService(overrides: Record<string, unknown> = {}): IReadResourceService {
  return {
    getResource: jest.fn().mockResolvedValue({
      id: 'receipt-1', type: 'fuel_receipt', name: 'x', state: 'pending_review', data: {}, ...overrides,
    }),
  };
}

function fakeUpdateService(): IUpdateResourceService {
  return {
    updateResource: jest.fn().mockResolvedValue({ id: 'trip-1', type: 'trip', name: 'x', state: 'dispatched', data: {} }),
  };
}

function fakeTransitionService(
  outcome: { state: string; approvalRequired?: boolean; approvalTaskId?: string } = { state: 'completed' },
): ITransitionResourceService {
  return {
    transitionState: jest.fn().mockResolvedValue({
      id: 'x', type: 'trip', name: 'x', state: outcome.state, data: {},
      approvalRequired: outcome.approvalRequired, approvalTaskId: outcome.approvalTaskId,
    }),
  };
}

function fakeAiService(configured = true, response = '{"amount":50.5,"liters":30,"fuelType":"diesel","stationName":"Petronas","receiptDate":"2026-07-01","vehicleReg":"ABC123","confidence":0.9}'): IAiVisionService {
  return {
    isConfigured: configured,
    runVision: jest.fn().mockResolvedValue(response),
  };
}

describe('official-asset-fleet — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      createService: fakeCreateService(),
      readService: fakeReadService(),
      updateService: fakeUpdateService(),
      transitionService: fakeTransitionService(),
      aiService: fakeAiService(),
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
    expect(resolveNode({})('lados.asset_fleet.does_not_exist')).toBeNull();
  });
});

describe('lados.asset_fleet.create_job', () => {
  it('creates a fleet job resource', async () => {
    const createService = fakeCreateService('job-1', 'open', 'job');
    const { ctx } = createMockNodeContext({ inputs: { request: { customer: 'Acme Corp', asset: 'Truck-01' } } });
    const exec = resolveNode({ createService })('lados.asset_fleet.create_job')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['job']).toMatchObject({ jobId: 'job-1', customer: 'Acme Corp', status: 'open' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'job' }));
  });

  it('fails when customer is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { request: {} } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.asset_fleet.create_job')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.asset_fleet.dispatch_trip', () => {
  it('dispatches a trip, optionally nested under a job', async () => {
    const createService = fakeCreateService('trip-1', 'dispatched', 'trip');
    const { ctx } = createMockNodeContext({ inputs: { job: { vehicle: 'Truck-01', driver: 'Ali', destination: 'Site A', jobId: 'job-1' } } });
    const exec = resolveNode({ createService })('lados.asset_fleet.dispatch_trip')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['dispatch']).toMatchObject({ tripId: 'trip-1', vehicle: 'Truck-01', driver: 'Ali' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'trip', parentId: 'job-1' }));
  });

  it('fails when driver is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { job: { vehicle: 'Truck-01' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.asset_fleet.dispatch_trip')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.asset_fleet.complete_trip', () => {
  it('fails with NO_SERVICE when no transition service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { dispatch: { resourceId: 'trip-1', mileage: 120 } } });
    const exec = resolveNode({})('lados.asset_fleet.complete_trip')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('completes a trip', async () => {
    const transitionService = fakeTransitionService({ state: 'completed' });
    const { ctx } = createMockNodeContext({ inputs: { dispatch: { resourceId: 'trip-1', mileage: 120 } } });
    const exec = resolveNode({ transitionService, updateService: fakeUpdateService() })('lados.asset_fleet.complete_trip')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['completion']).toMatchObject({ resourceId: 'trip-1', status: 'completed', mileage: 120 });
  });

  it('pauses (never silently certifies) when completion requires approval', async () => {
    const transitionService = fakeTransitionService({ state: 'dispatched', approvalRequired: true, approvalTaskId: 'appr-trip-1' });
    const { ctx } = createMockNodeContext({ inputs: { dispatch: { resourceId: 'trip-1' } } });
    const exec = resolveNode({ transitionService })('lados.asset_fleet.complete_trip')!;
    const result = await exec(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-trip-1' });
  });

  it('fails when resourceId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { dispatch: {} } });
    const exec = resolveNode({ transitionService: fakeTransitionService() })('lados.asset_fleet.complete_trip')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.asset_fleet.upload_fuel_receipt', () => {
  it('uploads a fuel receipt, optionally nested under a trip', async () => {
    const createService = fakeCreateService('receipt-1', 'pending_review', 'fuel_receipt');
    const { ctx } = createMockNodeContext({ inputs: { file: { fileRef: 'file-1', vehicle: 'Truck-01', trip: 'trip-1' } } });
    const exec = resolveNode({ createService })('lados.asset_fleet.upload_fuel_receipt')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['receipt']).toMatchObject({ receiptId: 'receipt-1', fileRef: 'file-1' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'fuel_receipt', parentId: 'trip-1' }));
  });

  it('fails when fileRef is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { file: {} } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.asset_fleet.upload_fuel_receipt')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.asset_fleet.extract_fuel_receipt', () => {
  it('is honest reuse of the real AiService, not fabrication — writes a confidence:0 advisory stub when AI is not configured', async () => {
    const readService = fakeReadService();
    const updateService = fakeUpdateService();
    const aiService = fakeAiService(false);
    const { ctx } = createMockNodeContext({ inputs: { receipt: { resourceId: 'receipt-1' } } });
    const exec = resolveNode({ readService, updateService, aiService })('lados.asset_fleet.extract_fuel_receipt')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const extraction = result.outputs['extraction'] as { advisory: boolean; confidence: number; approvedByHuman: boolean };
    expect(extraction.advisory).toBe(true);
    expect(extraction.confidence).toBe(0);
    expect(extraction.approvedByHuman).toBe(false);
  });

  it('extracts fields via vision when configured — always advisory, approvedByHuman always false', async () => {
    const readService = fakeReadService();
    const updateService = fakeUpdateService();
    const aiService = fakeAiService(true);
    const { ctx } = createMockNodeContext({
      inputs: { receipt: { resourceId: 'receipt-1', imageData: 'data:image/png;base64,abc123' } },
    });
    const exec = resolveNode({ readService, updateService, aiService })('lados.asset_fleet.extract_fuel_receipt')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const extraction = result.outputs['extraction'] as { advisory: boolean; amount: number; approvedByHuman: boolean };
    expect(extraction.advisory).toBe(true);
    expect(extraction.amount).toBe(50.5);
    expect(extraction.approvedByHuman).toBe(false);
    expect(aiService.runVision).toHaveBeenCalled();
  });

  it('fails when resource type is not fuel_receipt', async () => {
    const readService = fakeReadService({ type: 'job' });
    const { ctx } = createMockNodeContext({ inputs: { receipt: { resourceId: 'job-1' } } });
    const exec = resolveNode({ readService, aiService: fakeAiService(false) })('lados.asset_fleet.extract_fuel_receipt')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_RESOURCE_TYPE');
  });

  it('fails when resourceId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { receipt: {} } });
    const exec = resolveNode({})('lados.asset_fleet.extract_fuel_receipt')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.asset_fleet.create_maintenance_record', () => {
  it('creates a maintenance record', async () => {
    const createService = fakeCreateService('maint-1', 'open', 'maintenance_record');
    const { ctx } = createMockNodeContext({ inputs: { issue: { asset: 'Truck-01', issueType: 'Brake wear', priority: 'high' } } });
    const exec = resolveNode({ createService })('lados.asset_fleet.create_maintenance_record')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['maintenance']).toMatchObject({ maintenanceId: 'maint-1', asset: 'Truck-01', status: 'open' });
    expect(createService.createResource).toHaveBeenCalledWith(expect.objectContaining({ type: 'maintenance_record' }));
  });

  it('fails when issueType is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { issue: { asset: 'Truck-01' } } });
    const exec = resolveNode({ createService: fakeCreateService() })('lados.asset_fleet.create_maintenance_record')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.asset_fleet.clear_maintenance', () => {
  it('fails with MISSING_HUMAN_DECISION when clearedBy is not supplied — never fabricates the actor', async () => {
    const transitionService = fakeTransitionService({ state: 'cleared' });
    const { ctx } = createMockNodeContext({ inputs: { maintenance: { resourceId: 'maint-1' } } });
    const exec = resolveNode({ transitionService })('lados.asset_fleet.clear_maintenance')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_HUMAN_DECISION');
  });

  it('clears maintenance when a human actor is recorded', async () => {
    const transitionService = fakeTransitionService({ state: 'cleared' });
    const updateService = fakeUpdateService();
    const { ctx } = createMockNodeContext({ inputs: { maintenance: { resourceId: 'maint-1', clearedBy: 'supervisor-1' } } });
    const exec = resolveNode({ transitionService, updateService })('lados.asset_fleet.clear_maintenance')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['clearance']).toMatchObject({ resourceId: 'maint-1', status: 'cleared', clearedBy: 'supervisor-1' });
  });

  it('pauses (never silently certifies) when clearance requires approval', async () => {
    const transitionService = fakeTransitionService({ state: 'open', approvalRequired: true, approvalTaskId: 'appr-maint-1' });
    const { ctx } = createMockNodeContext({ inputs: { maintenance: { resourceId: 'maint-1', clearedBy: 'supervisor-1' } } });
    const exec = resolveNode({ transitionService })('lados.asset_fleet.clear_maintenance')!;
    const result = await exec(ctx);
    expect(result.status).toBe('paused');
    expect(result.pause?.context).toMatchObject({ approvalTaskId: 'appr-maint-1' });
  });

  it('fails with NO_SERVICE when no transition service is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { maintenance: { resourceId: 'maint-1', clearedBy: 'supervisor-1' } } });
    const exec = resolveNode({})('lados.asset_fleet.clear_maintenance')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });
});
