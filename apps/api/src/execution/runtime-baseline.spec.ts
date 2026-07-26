import { runWorkflow } from '@lados/execution-engine';
import { resolveExecutionMode } from './execution-mode';
import { buildRuntimeReadinessReport } from './runtime-readiness';

const definition = {
  schemaVersion: '1.0',
  workflow: {
    id: 'strict-test', name: 'Strict test', version: '1.0.0', status: 'draft',
    tags: [], createdAt: '2026-07-22T00:00:00.000Z', updatedAt: '2026-07-22T00:00:00.000Z', createdBy: 'test',
  },
  nodes: [{ id: 'unknown-1', type: 'lados.unknown.node', label: 'Unknown', position: { x: 0, y: 0 }, config: {} }],
  edges: [],
};

describe('Phase 27 runtime baseline', () => {
  it('defaults non-development environments to production strict', () => {
    expect(resolveExecutionMode({ NODE_ENV: 'production' })).toBe('production-strict');
    expect(resolveExecutionMode({})).toBe('production-strict');
    expect(resolveExecutionMode({ NODE_ENV: 'development' })).toBe('development-simulation');
    expect(resolveExecutionMode({ NODE_ENV: 'test' })).toBe('test');
  });

  it('fails an unresolved node instead of reporting mock success in strict mode', async () => {
    const result = await runWorkflow({
      workflowId: 'strict-test', projectId: 'project-1', organizationId: 'org-1', userId: 'user-1',
      definition: definition as never,
      executionMode: 'production-strict',
      nodeResolver: () => null,
    });

    expect(result.status).toBe('failed');
    expect(result.logs[0]).toMatchObject({
      status: 'failed',
      error: { code: 'EXECUTOR_NOT_AVAILABLE' },
    });
  });

  it('watermarks generic development simulation output', async () => {
    const result = await runWorkflow({
      workflowId: 'simulation-test', projectId: 'project-1', organizationId: 'org-1', userId: 'user-1',
      definition: definition as never,
      executionMode: 'development-simulation',
      nodeResolver: () => null,
    });

    expect(result.status).toBe('completed');
    expect(result.logs[0]?.executionSource).toBe('simulated');
    expect(result.logs[0]?.messages.join(' ')).toContain('not production execution evidence');
  });

  it('allows only explicitly registered mocks in test mode', async () => {
    const registeredDefinition = {
      ...definition,
      nodes: [{ ...definition.nodes[0], type: 'core.manual_trigger' }],
    };
    const registered = await runWorkflow({
      workflowId: 'registered-mock', projectId: 'project-1', organizationId: 'org-1', userId: 'user-1',
      definition: registeredDefinition as never, executionMode: 'test', nodeResolver: () => null,
    });
    const unknown = await runWorkflow({
      workflowId: 'unknown-mock', projectId: 'project-1', organizationId: 'org-1', userId: 'user-1',
      definition: definition as never, executionMode: 'test', nodeResolver: () => null,
    });

    expect(registered.logs[0]?.executionSource).toBe('test_mock');
    expect(registered.status).toBe('completed');
    expect(unknown.logs[0]?.error?.code).toBe('EXECUTOR_NOT_AVAILABLE');
  });

  it('reports manifest, resolver, and stub contradictions', () => {
    const report = buildRuntimeReadinessReport([
      {
        manifest: {
          id: 'lados.test', displayName: 'Test', layer: 'L1', runtimeStatus: 'runtime_enabled',
        },
        nodes: [
          { type: 'lados.test.missing', executorStatus: 'implemented' },
          { type: 'lados.test.stub', executorStatus: 'stub' },
        ],
      } as never,
    ], (nodeType) => nodeType.endsWith('.stub') ? (async () => ({ status: 'success', outputs: {} })) : null);

    expect(report.packs[0]?.state).toBe('blocked');
    expect(report.contradictions).toHaveLength(2);
  });

  it('retries matching structured failures with a stable idempotency key', async () => {
    const attempts: Array<{ attempt?: number; key?: string }> = [];
    const retryDefinition = {
      ...definition,
      executionPolicy: { retryPolicy: { maxAttempts: 3, backoffSeconds: 0, retryOn: ['TRANSIENT'] } },
    };
    const result = await runWorkflow({
      executionId: 'run-retry', workflowId: 'retry', projectId: 'project-1', organizationId: 'org-1', userId: 'user-1',
      definition: retryDefinition as never,
      nodeResolver: () => async (ctx) => {
        attempts.push({ attempt: ctx.attempt, key: ctx.idempotencyKey });
        return attempts.length < 3
          ? { status: 'failure', outputs: {}, error: { code: 'TRANSIENT', message: 'try again' } }
          : { status: 'success', outputs: { ok: true } };
      },
    });

    expect(result.status).toBe('completed');
    expect(attempts).toEqual([
      { attempt: 1, key: 'run-retry:unknown-1' },
      { attempt: 2, key: 'run-retry:unknown-1' },
      { attempt: 3, key: 'run-retry:unknown-1' },
    ]);
    expect(result.logs[0]?.messages.join(' ')).toContain('retrying attempt 2/3');
  });

  it('passes host connection resolution to real nodes without workflow credentials', async () => {
    const connectionResolver = { resolve: jest.fn() };
    const executor = jest.fn(async (ctx) => ({
      status: 'success' as const,
      outputs: { hasResolver: ctx.services?.['connectionResolver'] === connectionResolver },
    }));
    const result = await runWorkflow({
      executionId: 'run-connection', workflowId: 'connection', projectId: 'project-1',
      organizationId: 'org-1', userId: 'user-1', definition: definition as never,
      services: { connectionResolver }, nodeResolver: () => executor,
    });

    expect(result.status).toBe('completed');
    expect(result.outputs).toEqual({ hasResolver: true });
    expect(executor.mock.calls[0]?.[0].config).toEqual({});
  });

  it('does not retry an error excluded by retryOn', async () => {
    const executor = jest.fn().mockResolvedValue({ status: 'failure', outputs: {}, error: { code: 'VALIDATION_FAILED', message: 'bad input' } });
    const result = await runWorkflow({
      executionId: 'run-no-retry', workflowId: 'no-retry', projectId: 'project-1', organizationId: 'org-1', userId: 'user-1',
      definition: { ...definition, executionPolicy: { retryPolicy: { maxAttempts: 3, backoffSeconds: 0, retryOn: ['TRANSIENT'] } } } as never,
      nodeResolver: () => executor,
    });
    expect(result.status).toBe('failed');
    expect(executor).toHaveBeenCalledTimes(1);
    expect(result.logs[0]?.error?.code).toBe('VALIDATION_FAILED');
  });

  it('fails a node with EXECUTION_TIMEOUT when the run deadline expires', async () => {
    const result = await runWorkflow({
      executionId: 'run-timeout', workflowId: 'timeout', projectId: 'project-1', organizationId: 'org-1', userId: 'user-1',
      definition: { ...definition, executionPolicy: { timeoutSeconds: 0.01 } } as never,
      nodeResolver: () => async () => new Promise(() => undefined),
    });
    expect(result.status).toBe('timed_out');
    expect(result.logs[0]?.error?.code).toBe('EXECUTION_TIMEOUT');
  });
});
