/**
 * Phase 21 S7 (UI Alignment) — official-pack-loader.service.ts's
 * config_schema/ui_schema derivation.
 *
 * Covers the S7.3 finding: every official node was previously loaded with
 * a hardcoded `config_schema: []`, so PropertyPanel rendered "This skill
 * has no configuration" for every S2-S6.1 node regardless of executor
 * status. deriveConfigSchema() mechanically derives a generic
 * `type:'string'` ConfigField per declared configGroups field key (never
 * guessing richer widget types the manifest doesn't specify), plus
 * ui_schema.sections mirroring each node's configGroups so
 * PropertyPanel/ManifestSection still group fields the way the manifest
 * author organized them.
 */
import { deriveConfigSchema, humanizeFieldKey } from '../src/pack/official-pack-loader.service';
import { loadOfficialPackSkeletons } from '../src/pack/official-pack-loader';
import type { OfficialNodeManifest } from '@lados/pack-sdk';

function baseNode(overrides: Partial<OfficialNodeManifest> = {}): OfficialNodeManifest {
  return {
    type: 'lados.test.example_node',
    displayName: 'Example Node',
    canonicalCapability: 'test.example.run',
    ownerPack: 'lados.test-pack',
    category: 'Test',
    icon: 'Box',
    status: 'draft',
    intent: 'Example node for config schema derivation tests.',
    inputPattern: ['inspector'],
    outputPattern: 'example result',
    ports: { inputs: [], outputs: [] },
    configGroups: [],
    resourceBindings: { supported: false, required: false },
    knowledgePackRequirements: { required: [], recommended: [] },
    humanDecisionBoundary: 'n/a',
    aiBoundary: 'none',
    canvasUx: { minWidth: 260, minHeight: 100, maxVisiblePortsPerSide: 3 },
    compatibilityAliases: [],
    executorStatus: 'implemented',
    ...overrides,
  } as OfficialNodeManifest;
}

describe('humanizeFieldKey', () => {
  it('splits camelCase into title-cased words', () => {
    expect(humanizeFieldKey('clearedBy')).toBe('Cleared By');
    expect(humanizeFieldKey('instructionDate')).toBe('Instruction Date');
  });

  it('splits snake_case and kebab-case into title-cased words', () => {
    expect(humanizeFieldKey('cleared_by')).toBe('Cleared By');
    expect(humanizeFieldKey('cleared-by')).toBe('Cleared By');
  });

  it('handles a single lowercase word', () => {
    expect(humanizeFieldKey('period')).toBe('Period');
  });
});

describe('deriveConfigSchema', () => {
  it('produces one generic string field per declared configGroups field key', () => {
    const node = baseNode({
      configGroups: [
        { id: 'instruction', label: 'Instruction', fields: ['instructionDate', 'issuer', 'reference'] },
      ],
    });

    const { configSchema } = deriveConfigSchema(node);

    expect(configSchema).toHaveLength(3);
    expect(configSchema).toEqual([
      { key: 'instructionDate', label: 'Instruction Date', type: 'string', required: false },
      { key: 'issuer', label: 'Issuer', type: 'string', required: false },
      { key: 'reference', label: 'Reference', type: 'string', required: false },
    ]);
  });

  it('dedupes a field key that appears in more than one group', () => {
    const node = baseNode({
      configGroups: [
        { id: 'a', label: 'A', fields: ['shared', 'onlyA'] },
        { id: 'b', label: 'B', fields: ['shared', 'onlyB'] },
      ],
    });

    const { configSchema } = deriveConfigSchema(node);
    const keys = configSchema.map((f) => f.key);
    expect(keys).toEqual(['shared', 'onlyA', 'onlyB']); // 'shared' only once, first occurrence wins
  });

  it('maps configGroups 1:1 onto ui_schema.sections so grouping is preserved', () => {
    const node = baseNode({
      configGroups: [
        { id: 'payroll', label: 'Payroll', fields: ['period', 'employeeGroup'] },
        { id: 'review', label: 'Review', fields: ['requiresReview', 'reviewerRole'] },
      ],
    });

    const { uiSchema } = deriveConfigSchema(node);
    expect(uiSchema.sections).toEqual([
      { title: 'Payroll', fieldKeys: ['period', 'employeeGroup'] },
      { title: 'Review', fieldKeys: ['requiresReview', 'reviewerRole'] },
    ]);
  });

  it('returns an empty schema for a node with no configGroups (e.g. a pure computation node)', () => {
    const node = baseNode({ configGroups: [] });
    const { configSchema, uiSchema } = deriveConfigSchema(node);
    expect(configSchema).toEqual([]);
    expect(uiSchema.sections).toEqual([]);
  });

  it('never invents a richer widget type — every derived field is type:"string"', () => {
    const node = baseNode({
      configGroups: [{ id: 'g', label: 'G', fields: ['amount', 'isApproved', 'dueDate', 'clauseRefs'] }],
    });
    const { configSchema } = deriveConfigSchema(node);
    expect(configSchema.every((f) => f.type === 'string')).toBe(true);
  });
});

describe('deriveConfigSchema — runs cleanly over every real official pack node', () => {
  it('produces a valid, non-throwing schema for every node in packs/official/*', () => {
    const { packs } = loadOfficialPackSkeletons();
    for (const { nodes } of packs) {
      for (const node of nodes) {
        const { configSchema, uiSchema } = deriveConfigSchema(node);
        // every field key referenced in a section must exist in configSchema
        const schemaKeys = new Set(configSchema.map((f) => f.key));
        for (const section of uiSchema.sections) {
          for (const key of section.fieldKeys) {
            expect(schemaKeys.has(key)).toBe(true);
          }
        }
      }
    }
  });
});
