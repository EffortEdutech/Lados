/**
 * Phase 21 S2 (Wave 1) — @lados/official-workflow-foundation.
 *
 * Covers the master-plan S2 test requirement: "Jest per node: manifest ↔
 * executor contract, MockNodeContext execution" for all 7 original nodes in
 * this pack (trigger_manual, trigger_schedule, condition, parallel, merge,
 * delay, write_log). No external services are required for those 7 nodes.
 *
 * Phase 21 S9.1 (gap closure, 2026-07-04): added coverage for `loop`
 * (successor to prototype `core.loop`) and `publish_event` (successor to
 * prototype `event.publish`, closing the "declared but unbuilt"
 * workflow.event.publish capability gap). publish_event is the only node in
 * this pack that needs an injected service (a fake IEventBusService).
 *
 * Phase 22 S22.4 (Branching Expressiveness, 2026-07-06): added coverage for
 * condition's extended grammar (named fields + AND/OR combinator, backward
 * compatible with every S2 test above) and the new `switch` node (true
 * multi-way routing, 5 fixed case slots + default).
 *
 * Phase 23 S23.3 (Data Handoff Nodes, 2026-07-08): added coverage for
 * `pipeline_save_artifact` / `pipeline_read_artifact` — the two nodes that
 * let a pipeline stage write/read keyed handoff data scoped to one
 * pipeline_run_id (ctx.pipelineRunId, threaded by PipelineExecutionService
 * via S23.2). Both fail clearly with NOT_IN_PIPELINE_CONTEXT for a
 * standalone (non-pipeline) run — the manifest node count moves 10 -> 12.
 *
 * Phase 24 S24.3 (Node Type Rename, 2026-07-11): renamed throughout to
 * `program_save_artifact` / `program_read_artifact`, `ctx.programRunId` /
 * `ctx.programStageId`, `NOT_IN_PROGRAM_CONTEXT`, `IProgramArtifactService` —
 * matches the pack-layer rename (Pipeline→Program). Node count unchanged.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type IEventBusService,
  type IProgramArtifactService,
} from '@lados/official-workflow-foundation';

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

function fakeEventBusService(id: string | null = 'evt-1'): IEventBusService {
  return { publish: jest.fn().mockResolvedValue(id ? { id } : null) };
}

function fakeProgramArtifactService(
  readResult: { value: unknown; found: boolean } = { value: null, found: false },
): IProgramArtifactService {
  return {
    saveArtifact: jest.fn().mockResolvedValue({ id: 'art-1' }),
    readArtifact: jest.fn().mockResolvedValue(readResult),
  };
}

describe('official-workflow-foundation — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      eventBusService: fakeEventBusService(),
      programArtifactService: fakeProgramArtifactService(),
    });
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
    expect(resolveNode()('lados.workflow.does_not_exist')).toBeNull();
  });

  it('declares 12 nodes for the 12 capabilities that have a backing node (workflow.trigger.event is capability-only by design)', () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../../../packs/official/lados-workflow-foundation/manifest.json'),
        'utf8',
      ),
    ) as { capabilities: string[]; nodes: string[] };
    expect(manifest.nodes).toContain('lados.workflow.loop');
    expect(manifest.nodes).toContain('lados.workflow.publish_event');
    expect(manifest.nodes).toContain('lados.workflow.switch');
    expect(manifest.nodes).toContain('lados.workflow.program_save_artifact');
    expect(manifest.nodes).toContain('lados.workflow.program_read_artifact');
    expect(manifest.capabilities).toContain('workflow.control.loop');
    expect(manifest.capabilities).toContain('workflow.event.publish');
    expect(manifest.capabilities).toContain('workflow.control.switch');
    expect(manifest.capabilities).toContain('workflow.program.save_artifact');
    expect(manifest.capabilities).toContain('workflow.program.read_artifact');
    expect(manifest.nodes.length).toBe(12);
    expect(manifests.length).toBe(12);
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

  it('additively emits the full input set on the new context output', async () => {
    const { ctx } = createMockNodeContext({ config: { expression: 'value >= 100' }, inputs: { value: 150, extra: 'x' } });
    const result = await exec(ctx);

    expect(result.outputs['context']).toEqual({ value: 150, extra: 'x' });
  });

  describe('S22.4 — named fields + AND/OR', () => {
    it('evaluates a named field (not just "value")', async () => {
      const { ctx } = createMockNodeContext({ config: { expression: 'amount >= 1000' }, inputs: { amount: 1500 } });
      const result = await exec(ctx);

      expect(result.status).toBe('success');
      expect(result.summary).toContain('TRUE');
    });

    it('combines two named-field clauses with AND', async () => {
      const { ctx } = createMockNodeContext({
        config: { expression: 'amount >= 1000 AND status == "approved"' },
        inputs: { amount: 1500, status: 'approved', value: 'passthrough' },
      });
      const result = await exec(ctx);

      expect(result.status).toBe('success');
      expect(result.outputs['true']).toBe('passthrough');
    });

    it('routes to false when one AND clause fails', async () => {
      const { ctx } = createMockNodeContext({
        config: { expression: 'amount >= 1000 AND status == "approved"' },
        inputs: { amount: 1500, status: 'rejected' },
      });
      const result = await exec(ctx);

      expect(result.status).toBe('success');
      expect(result.outputs['false']).not.toBeNull();
      expect(result.outputs['true']).toBeNull();
    });

    it('combines clauses with OR', async () => {
      const { ctx } = createMockNodeContext({
        config: { expression: 'priority == "low" OR priority == "normal"' },
        inputs: { priority: 'normal', value: 'x' },
      });
      const result = await exec(ctx);

      expect(result.status).toBe('success');
      expect(result.outputs['true']).toBe('x');
    });

    it('rejects mixing AND and OR in one expression', async () => {
      const { ctx } = createMockNodeContext({
        config: { expression: 'a == 1 AND b == 2 OR c == 3' },
        inputs: { a: 1, b: 2, c: 3 },
      });
      const result = await exec(ctx);

      expect(result.status).toBe('failure');
      expect(result.error?.code).toBe('EXPRESSION_ERROR');
      expect(result.error?.message).toContain('mixes AND and OR');
    });

    it('fails clearly when a named field is not among the inputs', async () => {
      const { ctx } = createMockNodeContext({ config: { expression: 'nonexistent >= 1' }, inputs: { amount: 5 } });
      const result = await exec(ctx);

      expect(result.status).toBe('failure');
      expect(result.error?.code).toBe('EXPRESSION_ERROR');
      expect(result.error?.message).toContain('nonexistent');
    });

    it('still evaluates every Phase 21 single-field "value" expression identically (backward compatibility)', async () => {
      const { ctx } = createMockNodeContext({ config: { expression: 'value == "approved"' }, inputs: { value: 'approved' } });
      const result = await exec(ctx);

      expect(result.status).toBe('success');
      expect(result.outputs['true']).toBe('approved');
    });
  });
});

describe('lados.workflow.switch (S22.4)', () => {
  const exec = resolveNode()('lados.workflow.switch')!;

  it('routes to the first matching case', async () => {
    const { ctx } = createMockNodeContext({
      config: {
        cases: [
          { expression: 'amount >= 10000', label: 'High' },
          { expression: 'amount >= 1000', label: 'Medium' },
        ],
      },
      inputs: { amount: 5000, value: 'payload' },
    });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['case1']).toBeNull();
    expect(result.outputs['case2']).toBe('payload');
    expect(result.outputs['matchedCase']).toBe('Medium');
  });

  it('routes to default when no case matches', async () => {
    const { ctx } = createMockNodeContext({
      config: { cases: [{ expression: 'amount >= 10000', label: 'High' }] },
      inputs: { amount: 5, value: 'payload' },
    });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['default']).toBe('payload');
    expect(result.outputs['matchedCase']).toBe('default');
  });

  it('accepts a JSON-string cases config (canvas inspector floor, same pattern as request_input.inputSchema)', async () => {
    const { ctx } = createMockNodeContext({
      config: { cases: '[{"expression":"status == \\"urgent\\"","label":"Urgent"}]' },
      inputs: { status: 'urgent', value: 'x' },
    });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['case1']).toBe('x');
  });

  it('fails with MISSING_CONFIG when cases is absent', async () => {
    const { ctx } = createMockNodeContext();
    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_CONFIG');
  });

  it('fails with MAX_CASES_EXCEEDED beyond 5 cases', async () => {
    const { ctx } = createMockNodeContext({
      config: { cases: Array.from({ length: 6 }, (_, i) => ({ expression: `x == ${i}` })) },
      inputs: { x: 0 },
    });
    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MAX_CASES_EXCEEDED');
  });

  it('emits the full input context alongside the matched case', async () => {
    const { ctx } = createMockNodeContext({
      config: { cases: [{ expression: 'flag == true' }] },
      inputs: { flag: true, other: 'data' },
    });
    const result = await exec(ctx);

    expect(result.outputs['context']).toEqual({ flag: true, other: 'data' });
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

describe('lados.workflow.loop (S9.1 gap closure)', () => {
  const exec = resolveNode()('lados.workflow.loop')!;

  it('processes an array passed via the items input', async () => {
    const { ctx } = createMockNodeContext({ inputs: { items: [1, 2, 3] } });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['results']).toEqual([1, 2, 3]);
    expect(result.outputs['count']).toBe(3);
    expect(result.outputs['first']).toBe(1);
    expect(result.outputs['last']).toBe(3);
  });

  it('extracts a sub-key from each item when extract_key is configured', async () => {
    const { ctx } = createMockNodeContext({
      config: { extract_key: 'id' },
      inputs: { items: [{ id: 'a' }, { id: 'b' }] },
    });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['results']).toEqual(['a', 'b']);
  });

  it('reads the array from upstream output when items_key matches', async () => {
    const { ctx } = createMockNodeContext({
      config: { items_key: 'rows' },
      upstream: { nodeA: { rows: [10, 20] } },
    });
    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['count']).toBe(2);
  });

  it('fails with LOOP_NO_ARRAY when nothing resolves to an array', async () => {
    const { ctx } = createMockNodeContext();
    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('LOOP_NO_ARRAY');
  });
});

describe('lados.workflow.publish_event (S9.1 gap closure)', () => {
  it('fails with NO_SERVICE when no event bus service is injected', async () => {
    const { ctx } = createMockNodeContext({ config: { eventType: 'event.custom' } });
    const result = await resolveNode()('lados.workflow.publish_event')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('publishes an event and returns its id', async () => {
    const eventBusService = fakeEventBusService('evt-42');
    const { ctx } = createMockNodeContext({
      config: { eventType: 'event.custom' },
      inputs: { payload: { hello: 'world' } },
    });
    const result = await resolveNode({ eventBusService })('lados.workflow.publish_event')!(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['eventId']).toBe('evt-42');
    expect(result.outputs['published']).toBe(true);
    expect(eventBusService.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'event.custom', payload: { hello: 'world' } }),
    );
  });

  it('fails with MISSING_INPUT when eventType is missing', async () => {
    const eventBusService = fakeEventBusService();
    const { ctx } = createMockNodeContext();
    const result = await resolveNode({ eventBusService })('lados.workflow.publish_event')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('reports published:false (not thrown) when the event bus returns null', async () => {
    const eventBusService = fakeEventBusService(null);
    const { ctx } = createMockNodeContext({ config: { eventType: 'event.custom' } });
    const result = await resolveNode({ eventBusService })('lados.workflow.publish_event')!(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['eventId']).toBeNull();
    expect(result.outputs['published']).toBe(false);
  });
});

describe('lados.workflow.program_save_artifact (S23.3, renamed S24.3)', () => {
  it('fails with NOT_IN_PROGRAM_CONTEXT for a standalone (non-program) run', async () => {
    const programArtifactService = fakeProgramArtifactService();
    const { ctx } = createMockNodeContext({ config: { artifactKey: 'quote' } });
    const result = await resolveNode({ programArtifactService })('lados.workflow.program_save_artifact')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NOT_IN_PROGRAM_CONTEXT');
    expect(programArtifactService.saveArtifact).not.toHaveBeenCalled();
  });

  it('fails with NO_SERVICE when running as a program stage but no service is injected', async () => {
    const { ctx } = createMockNodeContext({
      programRunId: 'run-1',
      programStageId: 'stage-1',
      config: { artifactKey: 'quote' },
    });
    const result = await resolveNode()('lados.workflow.program_save_artifact')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('fails with MISSING_INPUT when artifactKey is absent', async () => {
    const programArtifactService = fakeProgramArtifactService();
    const { ctx } = createMockNodeContext({ programRunId: 'run-1', programStageId: 'stage-1' });
    const result = await resolveNode({ programArtifactService })('lados.workflow.program_save_artifact')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('saves the artifact scoped to the program run and stage', async () => {
    const programArtifactService = fakeProgramArtifactService();
    const { ctx } = createMockNodeContext({
      programRunId: 'run-1',
      programStageId: 'stage-1',
      executionId: 'exec-1',
      inputs: { artifactKey: 'quote', value: { amount: 500 } },
    });
    const result = await resolveNode({ programArtifactService })('lados.workflow.program_save_artifact')!(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['saved']).toBe(true);
    expect(result.outputs['artifactKey']).toBe('quote');
    expect(programArtifactService.saveArtifact).toHaveBeenCalledWith({
      programRunId: 'run-1',
      sourceStageId: 'stage-1',
      sourceRunId: 'exec-1',
      artifactKey: 'quote',
      value: { amount: 500 },
    });
  });
});

describe('lados.workflow.program_read_artifact (S23.3, renamed S24.3)', () => {
  it('fails with NOT_IN_PROGRAM_CONTEXT for a standalone (non-program) run', async () => {
    const programArtifactService = fakeProgramArtifactService();
    const { ctx } = createMockNodeContext({ config: { artifactKey: 'quote' } });
    const result = await resolveNode({ programArtifactService })('lados.workflow.program_read_artifact')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NOT_IN_PROGRAM_CONTEXT');
  });

  it('fails with NO_SERVICE when running as a program stage but no service is injected', async () => {
    const { ctx } = createMockNodeContext({ programRunId: 'run-1', config: { artifactKey: 'quote' } });
    const result = await resolveNode()('lados.workflow.program_read_artifact')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('fails with MISSING_INPUT when artifactKey is absent', async () => {
    const programArtifactService = fakeProgramArtifactService();
    const { ctx } = createMockNodeContext({ programRunId: 'run-1' });
    const result = await resolveNode({ programArtifactService })('lados.workflow.program_read_artifact')!(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('returns found:false (not a failure) when the key has not been written yet', async () => {
    const programArtifactService = fakeProgramArtifactService({ value: null, found: false });
    const { ctx } = createMockNodeContext({ programRunId: 'run-1', config: { artifactKey: 'quote' } });
    const result = await resolveNode({ programArtifactService })('lados.workflow.program_read_artifact')!(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['found']).toBe(false);
    expect(result.outputs['value']).toBeNull();
  });

  it('reads back a previously saved value', async () => {
    const programArtifactService = fakeProgramArtifactService({ value: { amount: 500 }, found: true });
    const { ctx } = createMockNodeContext({ programRunId: 'run-1', inputs: { artifactKey: 'quote' } });
    const result = await resolveNode({ programArtifactService })('lados.workflow.program_read_artifact')!(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['found']).toBe(true);
    expect(result.outputs['value']).toEqual({ amount: 500 });
    expect(programArtifactService.readArtifact).toHaveBeenCalledWith({
      programRunId: 'run-1',
      artifactKey: 'quote',
    });
  });
});
