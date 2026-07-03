/**
 * Phase 21 S1 — Official Runtime Foundation.
 *
 * Covers the three S1 checklist test items:
 *   1. the loader reads + validates every official skeleton pack cleanly
 *   2. the official validator rejects a deliberately broken manifest
 *   3. compatibility alias resolution
 * Plus the S1 manifest-contract extension: node-level `events` declarations.
 */
import {
  loadOfficialPackSkeletons,
} from '../src/pack/official-pack-loader';
import {
  assertOfficialCapabilityPackManifest,
  resolveOfficialCompatibilityAlias,
  validateOfficialCapabilityPackManifest,
  validateOfficialNodeManifests,
} from '@lados/pack-sdk';

function baseNode(overrides: Record<string, unknown> = {}) {
  return {
    type: 'lados.workflow.trigger_manual',
    displayName: 'Manual Trigger',
    canonicalCapability: 'workflow.trigger.manual',
    ownerPack: 'lados.workflow-foundation',
    category: 'Workflow Foundation',
    icon: 'Workflow',
    status: 'skeleton',
    intent: 'Start a workflow from a manual operator action.',
    inputPattern: ['inspector'],
    outputPattern: 'trigger context object',
    ports: { inputs: [], outputs: [{ id: 'trigger', label: 'Trigger', dataType: 'object' }] },
    configGroups: [],
    resourceBindings: { supported: false, required: false },
    knowledgePackRequirements: { required: [], recommended: [] },
    humanDecisionBoundary: 'Starts execution only; does not approve or certify anything.',
    aiBoundary: 'none',
    canvasUx: { minWidth: 220, minHeight: 96, maxVisiblePortsPerSide: 3 },
    compatibilityAliases: [],
    executorStatus: 'not_started',
    ...overrides,
  };
}

describe('loadOfficialPackSkeletons', () => {
  it('loads every packs/official/* skeleton with zero validation issues', () => {
    const { packs, issues } = loadOfficialPackSkeletons();

    expect(issues).toEqual([]);
    expect(packs.length).toBeGreaterThan(0);

    const ids = packs.map((p) => p.manifest.id);
    expect(ids).toContain('lados.workflow-foundation');
    expect(new Set(ids).size).toBe(ids.length); // no duplicate pack ids
  });

  it('every loaded pack only declares nodes it owns', () => {
    const { packs } = loadOfficialPackSkeletons();
    for (const { manifest, nodes } of packs) {
      for (const node of nodes) {
        expect(node.ownerPack).toBe(manifest.id);
        expect(manifest.nodes).toContain(node.type);
      }
    }
  });
});

describe('validateOfficialCapabilityPackManifest — rejects broken manifests', () => {
  it('flags a manifest missing required fields', () => {
    const broken = {
      contractVersion: 'lados.capability-pack.v1',
      id: 'not-a-lados-pack', // wrong format — must start with "lados."
      // missing version, displayName, layer, status, runtimeStatus, etc.
    };

    const result = validateOfficialCapabilityPackManifest(broken);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.field === 'id')).toBe(true);
    expect(result.issues.some((i) => i.field === 'layer')).toBe(true);
  });

  it('assertOfficialCapabilityPackManifest throws on the same broken manifest', () => {
    expect(() => assertOfficialCapabilityPackManifest({ id: 'nope' })).toThrow(
      /Invalid OfficialCapabilityPackManifest/,
    );
  });
});

describe('compatibility alias resolution', () => {
  it('resolves a known prototype -> official alias', () => {
    const alias = resolveOfficialCompatibilityAlias('core.condition');
    expect(alias).toBeDefined();
    expect(alias?.officialType).toBe('lados.workflow.condition');
    expect(alias?.status).toBe('planned');
  });

  it('returns undefined for an unknown prototype node type', () => {
    expect(resolveOfficialCompatibilityAlias('does.not.exist')).toBeUndefined();
  });
});

describe('official node manifest contract — events declarations (S1)', () => {
  it('accepts a node with a well-formed events array', () => {
    const node = baseNode({
      events: [
        { eventType: 'workflow.RunStarted', description: 'Fires when the trigger starts a run.' },
      ],
    });

    const result = validateOfficialNodeManifests([node]);
    expect(result.valid).toBe(true);
  });

  it('rejects an event missing eventType', () => {
    const node = baseNode({ events: [{ description: 'no eventType here' }] });

    const result = validateOfficialNodeManifests([node]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field.includes('events[0].eventType'))).toBe(true);
  });

  it('rejects duplicate event types on the same node', () => {
    const node = baseNode({
      events: [
        { eventType: 'workflow.RunStarted' },
        { eventType: 'workflow.RunStarted' },
      ],
    });

    const result = validateOfficialNodeManifests([node]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('Duplicate event type'))).toBe(true);
  });

  it('remains valid when events is omitted entirely (optional field)', () => {
    const node = baseNode();
    const result = validateOfficialNodeManifests([node]);
    expect(result.valid).toBe(true);
  });
});
