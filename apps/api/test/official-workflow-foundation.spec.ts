/**
 * Phase 21 S2 (Wave 1) — @lados/official-workflow-foundation.
 *
 * Covers the master-plan S2 test requirement: "Jest per node: manifest ↔
 * executor contract, MockNodeContext execution" for all 7 nodes in this
 * pack (trigger_manual, trigger_schedule, condition, parallel, merge,
 * delay, write_log). No external services are required for this pack.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import { resolveNode } from '@lados/official-workflow-foundation';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../../packs/official/lados-workflow-foundation/nodes.json'),
    'utf8',
  ),
);

describe('official-workflow-foundation — manifest <-> executor contract', () => {
  const resolve = resolveNode();

  it('every node declared in nodes.json resolves to a real executor', () => {
    for (const m of manifests) {
      expect(typeof resolve(m.type)).toBe('function');
    }
  });

  it('every node is marked implemented (no silent stubs in this pack)', () => {
    for (const m of manifests) {
      expect(m.executorStatus).toBe('implemented');
    }
  });

  it('unknown node types resolve to null', () => {
    expect(resolve('lados.workflow.does_not_exist')).toBeNull();
  });
});

describe('lados.workflow.trigger_manual', () => {
  it('returns success with manual trigger metadata', async () => {
    const { ctx } = createMockNodeContext({ config: { label: 'Kickoff' } });
    const resolve = resolveNode();
    const exec = resolve('lados.workflow.trigger_manual')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['trigger']).toMatchObject({ triggerType: 'manual', label: 'Kickoff' });
  });
});

describe('lados.workflow.trigger_schedule', () => {
  it('fails clearly when cronExpression is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.workflow.trigger_schedule')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_CRON_EXPRESSION');
  });

  it('describes a daily cron expression in human terms', async () => {
    const { ctx } = createMockNodeContext({ config: { cronExpression: '0 8 * * *' } });
    const exec = resolveNode()('lados.workflow.trigger_schedule')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['trigger']).toMatchObject({ triggerType: 'schedule', cronExpression: '0 8 * * *' });
    expect((result.outputs['trigger'] as { scheduleLabel: string }).scheduleLabel).toContain('08:00');
  });
});

describe('lados.workflow.condition', () => {
  const exec = resolveNode()('lados.workflow.condition')!;

  it('routes to true when the expression matches', async () => {
    const { ctx } = createMockNodeContext({ config: { expression: 'value >= 100' }, inputs: { value: 150 } });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['true']).toBe(150);
    expect(result.outputs['false']).toBeNull();
  });

  it('routes to false when the expression does not match', async () => {
    const { ctx } = createMockNodeContext({ config: { expression: 'value == "approved"' }, inputs: { value: 'rejected' } });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['false']).toBe('rejected');
    expect(result.outputs['true']).toBeNull();
  });

  it('fails when expression config is missing', async () => {
    const { ctx } = createMockNodeContext();
    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_CONFIG');
  });
});

describe('lados.workflow.parallel', () => {
  it('reports the configured branch count', async () => {
    const { ctx } = createMockNodeContext({ config: { branchCount: 3 }, inputs: { value: 'x' } });
    const exec = resolveNode()('lados.workflow.parallel')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['branches']).toMatchObject({ parallelStart: true, branchCount: 3, value: 'x' });
  });
});

describe('lados.workflow.merge', () => {
  it('shallow-merges all upstream branch outputs', async () => {
    const { ctx } = createMockNodeContext({
      upstream: { nodeA: { foo: 1 }, nodeB: { bar: 2 } },
    });
    const exec = resolveNode()('lados.workflow.merge')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['merged']).toEqual({ foo: 1, bar: 2 });
  });

  it('deep-merges nested objects when mergeStrategy is "deep"', async () => {
    const { ctx } = createMockNodeContext({
      config: { mergeStrategy: 'deep' },
      upstream: {
        nodeA: { nested: { a: 1 } },
        nodeB: { nested: { b: 2 } },
      },
    });
    const exec = resolveNode()('lados.workflow.merge')!;

    const result = await exec(ctx);

    expect(result.outputs['merged']).toEqual({ nested: { a: 1, b: 2 } });
  });
});

describe('lados.workflow.delay', () => {
  it('fails when delayMs is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.workflow.delay')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('resumes after a short real delay', async () => {
    const { ctx, warnLogs } = createMockNodeContext({ inputs: { delayMs: 5 } });
    const exec = resolveNode()('lados.workflow.delay')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['resumed']).toBe(true);
    expect(warnLogs()).toEqual([]); // under the 5-minute ceiling — no clamp warning
  });

  it('clamps a requested delay above the 5-minute ceiling and warns', async () => {
    // Fake timers so the clamped 300_000ms sleep resolves instantly instead
    // of actually blocking the test suite for 5 minutes.
    jest.useFakeTimers();
    try {
      const { ctx, warnLogs } = createMockNodeContext({ inputs: { delayMs: 300_001 } });
      const exec = resolveNode()('lados.workflow.delay')!;

      const resultPromise = exec(ctx);
      await jest.advanceTimersByTimeAsync(300_000);
      const result = await resultPromise;

      expect(result.status).toBe('success');
      expect(warnLogs().some((l) => l.message.includes('clamped'))).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('lados.workflow.write_log', () => {
  it('logs the configured message and returns logged:true', async () => {
    const { ctx, infoLogs } = createMockNodeContext({ config: { message: 'Checkpoint A' } });
    const exec = resolveNode()('lados.workflow.write_log')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['logged']).toBe(true);
    expect(infoLogs().some((l) => l.message === 'Checkpoint A')).toBe(true);
  });
});
