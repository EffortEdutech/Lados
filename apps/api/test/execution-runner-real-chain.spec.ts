/**
 * Phase 21 (S9 chaining fix) — real graph-based E2E test.
 *
 * Every prior wave's own "E2E test" (official-wave1-e2e.spec.ts through
 * official-wave4-1-e2e.spec.ts) is a proxy: it manually calls each node's
 * executor function in sequence, hand-reshaping data between calls. None of
 * them actually build a QSWorkflowDefinition and run it through the real
 * @lados/execution-engine Runner/GraphPlanner — so none of them could have
 * caught a bug in how the engine itself passes data from one node's outputs
 * into the next node's inputs.
 *
 * That bug existed: graph-planner.ts discarded connections' sourcePortId/
 * targetPortId entirely (only node-level dependsOn survived), and runner.ts's
 * _resolveInputs blindly flat-merged every key of every upstream dependency's
 * entire output object. Concretely, lados.qs.read_boq outputs a key called
 * "boq" ({ items, source, boqId? }), but lados.qs.normalize_boq reads
 * ctx.inputs['items'] directly, expecting a bare array — connecting them on
 * a real canvas would have silently produced zero normalized rows every
 * time, no error, nothing.
 *
 * This test builds a genuine 4-node QSWorkflowDefinition (real port ids,
 * exactly as the frontend canvas would save them) for the
 * read_boq -> normalize_boq -> classify_trade -> split_work_packages chain,
 * runs it through the real runWorkflow()/WorkflowRunner with
 * @lados/official-qs-commercial's real resolveNode(), and asserts data
 * actually flows end-to-end and produces non-empty, correctly-shaped
 * results — the thing no other test in this program has verified.
 */
import { runWorkflow } from '@lados/execution-engine';
import { resolveNode as resolveQsCommercial } from '@lados/official-qs-commercial';
import type { QSWorkflowDefinition } from '@lados/shared-types';

function buildBoqChainDefinition(): QSWorkflowDefinition {
  return {
    schemaVersion: '1.0',
    workflow: {
      id: 'wf-real-chain-test' as QSWorkflowDefinition['workflow']['id'],
      name: 'Real chain test',
      version: '1.0.0',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    nodes: [
      { id: 'n-read', type: 'lados.qs.read_boq', position: { x: 0, y: 0 }, config: {} },
      { id: 'n-normalize', type: 'lados.qs.normalize_boq', position: { x: 200, y: 0 }, config: {} },
      { id: 'n-classify', type: 'lados.qs.classify_trade', position: { x: 400, y: 0 }, config: {} },
      { id: 'n-split', type: 'lados.qs.split_work_packages', position: { x: 600, y: 0 }, config: {} },
    ] as unknown as QSWorkflowDefinition['nodes'],
    connections: [
      // Real port ids, exactly as declared in each node's nodes.json —
      // deliberately NOT the generic 'out'/'in' placeholder, so the runner's
      // port-aware overlay actually engages.
      { id: 'c1', sourceNodeId: 'n-read', sourcePortId: 'boq', targetNodeId: 'n-normalize', targetPortId: 'items' },
      { id: 'c2', sourceNodeId: 'n-normalize', sourcePortId: 'normalized', targetNodeId: 'n-classify', targetPortId: 'items' },
      { id: 'c3', sourceNodeId: 'n-classify', sourcePortId: 'classified', targetNodeId: 'n-split', targetPortId: 'items' },
    ] as unknown as QSWorkflowDefinition['connections'],
  };
}

describe('Real graph run — BOQ chain (read_boq -> normalize_boq -> classify_trade -> split_work_packages)', () => {
  const rows = [
    { itemNo: '1', description: 'Reinforced concrete slab to first floor', unit: 'm3', quantity: 10, rate: 250 },
    { itemNo: '2', description: 'Supply and erect structural steel beam', unit: 'kg', quantity: 500, rate: 5.2 },
    { itemNo: '3', description: 'Supply and lay floor tiling', unit: 'm2', quantity: 80, rate: 45 },
  ];

  it('flows real data through every node via the actual Runner, not a proxy', async () => {
    const result = await runWorkflow({
      workflowId: 'wf-real-chain-test',
      projectId: 'proj-test',
      organizationId: 'org-test',
      userId: 'user-test',
      definition: buildBoqChainDefinition(),
      inputs: { source: { rows } },
      nodeResolver: resolveQsCommercial(),
    });

    expect(result.status).toBe('completed');

    const readLog = result.logs.find((l) => l.nodeId === 'n-read');
    const normalizeLog = result.logs.find((l) => l.nodeId === 'n-normalize');
    const classifyLog = result.logs.find((l) => l.nodeId === 'n-classify');
    const splitLog = result.logs.find((l) => l.nodeId === 'n-split');

    expect(readLog?.status).toBe('completed');
    expect(normalizeLog?.status).toBe('completed');
    expect(classifyLog?.status).toBe('completed');
    expect(splitLog?.status).toBe('completed');

    // This is the crux of the whole regression: before the fix, normalize
    // would have received {} (no "items" key at all in a flat merge of
    // read_boq's {boq:{...}} output), so normalized.items would be [].
    const normalizedOutputs = normalizeLog?.outputs as { normalized?: { items?: unknown[] } } | undefined;
    expect(normalizedOutputs?.normalized?.items).toHaveLength(3);

    const classifiedOutputs = classifyLog?.outputs as { classified?: Array<{ trade: string }> } | undefined;
    expect(classifiedOutputs?.classified).toHaveLength(3);
    const trades = (classifiedOutputs?.classified ?? []).map((c) => c.trade);
    expect(trades).toContain('Concrete Works');
    expect(trades).toContain('Structural Steel');
    expect(trades).toContain('Flooring');

    const splitOutputs = splitLog?.outputs as { workPackages?: { packages: Array<{ key: string; itemCount: number }> } } | undefined;
    const packages = splitOutputs?.workPackages?.packages ?? [];
    expect(packages.length).toBeGreaterThan(0);
    const totalItemsAcrossPackages = packages.reduce((sum, p) => sum + p.itemCount, 0);
    expect(totalItemsAcrossPackages).toBe(3);
  });

  it('regression guard: without inputBindings, the flat merge alone would NOT have produced items (documents the original bug)', async () => {
    // Same definition, but connections stripped down to the generic 'out'/'in'
    // placeholder (what every workflow saved before real port ids existed
    // actually has) — this must fall back to legacy flat-merge behavior,
    // which is exactly the buggy path that silently produced zero rows.
    const definition = buildBoqChainDefinition();
    definition.connections = definition.connections.map((c) => ({ ...c, sourcePortId: 'out', targetPortId: 'in' }));

    const result = await runWorkflow({
      workflowId: 'wf-real-chain-test-legacy',
      projectId: 'proj-test',
      organizationId: 'org-test',
      userId: 'user-test',
      definition,
      inputs: { source: { rows } },
      nodeResolver: resolveQsCommercial(),
    });

    const normalizeLog = result.logs.find((l) => l.nodeId === 'n-normalize');
    const normalizedOutputs = normalizeLog?.outputs as { normalized?: { items?: unknown[] } } | undefined;
    // read_boq's flat-merged output is { boq: {...} } — there is no top-level
    // "items" key at all, so normalize_boq's own defensive resolveItemsInput
    // correctly falls back to [] here too. This documents (rather than
    // silently hides) that legacy/placeholder connections still depend on
    // each node's own leniency, not on the port-aware fix.
    expect(normalizedOutputs?.normalized?.items).toEqual([]);
  });
});
