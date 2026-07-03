/**
 * @lados/pack-sdk - Pack manifest validators.
 */

import type {
  OfficialCapabilityPackManifest,
  OfficialNodeManifest,
  PackManifest,
  PackValidationIssue,
  PackValidationResult,
} from './types';

export function validatePackManifest(manifest: unknown): PackValidationResult {
  const issues: PackValidationIssue[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, issues: [{ field: 'root', message: 'Manifest must be an object' }] };
  }

  const m = manifest as Record<string, unknown>;

  if (!m['id'] || typeof m['id'] !== 'string') {
    issues.push({ field: 'id', message: 'Pack id is required and must be a string' });
  } else if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(m['id'] as string)) {
    issues.push({ field: 'id', message: 'Pack id must follow dotted-path format e.g. "lados.qs-pack"' });
  }

  if (!m['version'] || typeof m['version'] !== 'string') {
    issues.push({ field: 'version', message: 'Pack version is required' });
  }

  if (!m['displayName'] || typeof m['displayName'] !== 'string') {
    issues.push({ field: 'displayName', message: 'Pack displayName is required' });
  }

  if (!Array.isArray(m['nodes'])) {
    issues.push({ field: 'nodes', message: 'Pack nodes must be an array of node type IDs' });
  } else if ((m['nodes'] as unknown[]).some((n) => typeof n !== 'string')) {
    issues.push({ field: 'nodes', message: 'All entries in nodes must be strings' });
  }

  if (m['stateMachines'] !== undefined) {
    if (!Array.isArray(m['stateMachines'])) {
      issues.push({ field: 'stateMachines', message: 'stateMachines must be an array' });
    } else {
      (m['stateMachines'] as unknown[]).forEach((sm, i) => {
        const s = sm as Record<string, unknown>;
        if (!s['resourceType'] || typeof s['resourceType'] !== 'string') {
          issues.push({ field: `stateMachines[${i}].resourceType`, message: 'resourceType is required' });
        }
        if (!s['initial'] || typeof s['initial'] !== 'string') {
          issues.push({ field: `stateMachines[${i}].initial`, message: 'initial state is required' });
        }
        if (!Array.isArray(s['states']) || (s['states'] as unknown[]).length === 0) {
          issues.push({ field: `stateMachines[${i}].states`, message: 'states must be a non-empty array' });
        }
        if (!Array.isArray(s['transitions'])) {
          issues.push({ field: `stateMachines[${i}].transitions`, message: 'transitions must be an array' });
        }
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function assertPackManifest(manifest: unknown): PackManifest {
  const result = validatePackManifest(manifest);
  if (!result.valid) {
    const summary = result.issues.map((i) => `${i.field}: ${i.message}`).join('; ');
    throw new Error(`Invalid PackManifest - ${summary}`);
  }
  return manifest as PackManifest;
}

const OFFICIAL_CONTRACT_VERSION = 'lados.capability-pack.v1';
const OFFICIAL_LAYERS = new Set(['L0', 'L1', 'L2', 'L3', 'L4', 'L5']);
const OFFICIAL_STATUSES = new Set(['skeleton', 'draft', 'verified', 'retired']);
const OFFICIAL_RUNTIME_STATUSES = new Set([
  'manifest_only',
  'stub_executors',
  'runtime_enabled',
  'retired',
]);
const OFFICIAL_INPUT_PATTERNS = new Set([
  'ports',
  'inspector',
  'resource_binding',
  'knowledge_reference',
]);
const OFFICIAL_AI_BOUNDARIES = new Set(['none', 'advisory', 'requires_human_review']);
const OFFICIAL_EXECUTOR_STATUSES = new Set(['not_started', 'planned', 'stub', 'implemented']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  issues: PackValidationIssue[],
): string | undefined {
  const value = record[field];
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({ field, message: `${field} is required and must be a non-empty string` });
    return undefined;
  }
  return value;
}

function requireStringArray(
  record: Record<string, unknown>,
  field: string,
  issues: PackValidationIssue[],
): string[] {
  const value = record[field];
  if (!isStringArray(value)) {
    issues.push({ field, message: `${field} is required and must be an array of strings` });
    return [];
  }
  return value;
}

function validateKnowledgePackRequirements(
  value: unknown,
  field: string,
  issues: PackValidationIssue[],
): void {
  if (!isRecord(value)) {
    issues.push({ field, message: `${field} is required and must be an object` });
    return;
  }
  if (!isStringArray(value['required'])) {
    issues.push({ field: `${field}.required`, message: 'required must be an array of strings' });
  }
  if (!isStringArray(value['recommended'])) {
    issues.push({ field: `${field}.recommended`, message: 'recommended must be an array of strings' });
  }
}

export function validateOfficialCapabilityPackManifest(manifest: unknown): PackValidationResult {
  const issues: PackValidationIssue[] = [];

  if (!isRecord(manifest)) {
    return { valid: false, issues: [{ field: 'root', message: 'Manifest must be an object' }] };
  }

  const id = requireString(manifest, 'id', issues);
  requireString(manifest, 'version', issues);
  requireString(manifest, 'displayName', issues);

  if (manifest['contractVersion'] !== OFFICIAL_CONTRACT_VERSION) {
    issues.push({ field: 'contractVersion', message: `contractVersion must be ${OFFICIAL_CONTRACT_VERSION}` });
  }

  if (id && !/^lados(\.[a-z][a-z0-9-]*)+$/.test(id)) {
    issues.push({ field: 'id', message: 'Official pack id must start with lados.* dotted-path format' });
  }

  if (!OFFICIAL_LAYERS.has(String(manifest['layer']))) {
    issues.push({ field: 'layer', message: 'layer must be L0, L1, L2, L3, L4, or L5' });
  }

  if (!OFFICIAL_STATUSES.has(String(manifest['status']))) {
    issues.push({ field: 'status', message: 'status must be skeleton, draft, verified, or retired' });
  }

  if (!OFFICIAL_RUNTIME_STATUSES.has(String(manifest['runtimeStatus']))) {
    issues.push({
      field: 'runtimeStatus',
      message: 'runtimeStatus must be manifest_only, stub_executors, runtime_enabled, or retired',
    });
  }

  const capabilities = requireStringArray(manifest, 'capabilities', issues);
  const nodes = requireStringArray(manifest, 'nodes', issues);
  requireStringArray(manifest, 'ownerBoundary', issues);
  requireStringArray(manifest, 'mustNotOwn', issues);
  requireStringArray(manifest, 'dependencies', issues);
  requireStringArray(manifest, 'guardrails', issues);
  requireStringArray(manifest, 'prototypeReferences', issues);
  validateKnowledgePackRequirements(manifest['knowledgePacks'], 'knowledgePacks', issues);

  if (capabilities.length === 0) {
    issues.push({ field: 'capabilities', message: 'Official packs must declare at least one capability' });
  }
  if (nodes.length === 0) {
    issues.push({ field: 'nodes', message: 'Official packs must declare at least one node' });
  }

  const duplicateCapabilities = capabilities.filter((capability, index) => capabilities.indexOf(capability) !== index);
  if (duplicateCapabilities.length > 0) {
    issues.push({
      field: 'capabilities',
      message: `Duplicate capabilities: ${[...new Set(duplicateCapabilities)].join(', ')}`,
    });
  }

  const duplicateNodes = nodes.filter((node, index) => nodes.indexOf(node) !== index);
  if (duplicateNodes.length > 0) {
    issues.push({ field: 'nodes', message: `Duplicate nodes: ${[...new Set(duplicateNodes)].join(', ')}` });
  }

  if (!isRecord(manifest['verification'])) {
    issues.push({ field: 'verification', message: 'verification is required and must be an object' });
  } else {
    for (const key of ['manifest', 'runtime', 'canvas', 'templates']) {
      if (typeof manifest['verification'][key] !== 'string') {
        issues.push({ field: `verification.${key}`, message: `${key} verification status is required` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export function assertOfficialCapabilityPackManifest(
  manifest: unknown,
): OfficialCapabilityPackManifest {
  const result = validateOfficialCapabilityPackManifest(manifest);
  if (!result.valid) {
    const summary = result.issues.map((i) => `${i.field}: ${i.message}`).join('; ');
    throw new Error(`Invalid OfficialCapabilityPackManifest - ${summary}`);
  }
  return manifest as OfficialCapabilityPackManifest;
}

export function validateOfficialNodeManifests(
  nodes: unknown,
  packManifest?: OfficialCapabilityPackManifest,
): PackValidationResult {
  const issues: PackValidationIssue[] = [];

  if (!Array.isArray(nodes)) {
    return { valid: false, issues: [{ field: 'nodes', message: 'nodes must be an array' }] };
  }

  const seenTypes = new Set<string>();
  const seenCapabilities = new Set<string>();

  nodes.forEach((node, index) => {
    const prefix = `nodes[${index}]`;
    if (!isRecord(node)) {
      issues.push({ field: prefix, message: 'node manifest must be an object' });
      return;
    }

    const type = requireString(node, 'type', issues);
    const capability = requireString(node, 'canonicalCapability', issues);
    const ownerPack = requireString(node, 'ownerPack', issues);
    requireString(node, 'displayName', issues);
    requireString(node, 'intent', issues);
    requireString(node, 'outputPattern', issues);
    requireString(node, 'humanDecisionBoundary', issues);

    if (!OFFICIAL_STATUSES.has(String(node['status']))) {
      issues.push({ field: `${prefix}.status`, message: 'status must be skeleton, draft, verified, or retired' });
    }
    if (!OFFICIAL_AI_BOUNDARIES.has(String(node['aiBoundary']))) {
      issues.push({ field: `${prefix}.aiBoundary`, message: 'aiBoundary is invalid' });
    }
    if (!OFFICIAL_EXECUTOR_STATUSES.has(String(node['executorStatus']))) {
      issues.push({ field: `${prefix}.executorStatus`, message: 'executorStatus is invalid' });
    }

    const inputPattern = node['inputPattern'];
    if (!isStringArray(inputPattern) || inputPattern.length === 0) {
      issues.push({ field: `${prefix}.inputPattern`, message: 'inputPattern must be a non-empty array of strings' });
    } else {
      for (const pattern of inputPattern) {
        if (!OFFICIAL_INPUT_PATTERNS.has(pattern)) {
          issues.push({ field: `${prefix}.inputPattern`, message: `Invalid input pattern: ${pattern}` });
        }
      }
    }

    if (!isRecord(node['ports'])) {
      issues.push({ field: `${prefix}.ports`, message: 'ports is required' });
    } else {
      if (!Array.isArray(node['ports']['inputs'])) {
        issues.push({ field: `${prefix}.ports.inputs`, message: 'ports.inputs must be an array' });
      }
      if (!Array.isArray(node['ports']['outputs']) || node['ports']['outputs'].length === 0) {
        issues.push({ field: `${prefix}.ports.outputs`, message: 'ports.outputs must be a non-empty array' });
      }
    }

    if (!Array.isArray(node['configGroups'])) {
      issues.push({ field: `${prefix}.configGroups`, message: 'configGroups must be an array' });
    }

    if (!isRecord(node['resourceBindings'])) {
      issues.push({ field: `${prefix}.resourceBindings`, message: 'resourceBindings is required' });
    } else {
      if (typeof node['resourceBindings']['supported'] !== 'boolean') {
        issues.push({ field: `${prefix}.resourceBindings.supported`, message: 'supported must be boolean' });
      }
      if (typeof node['resourceBindings']['required'] !== 'boolean') {
        issues.push({ field: `${prefix}.resourceBindings.required`, message: 'required must be boolean' });
      }
    }

    validateKnowledgePackRequirements(
      node['knowledgePackRequirements'],
      `${prefix}.knowledgePackRequirements`,
      issues,
    );

    if (!isRecord(node['canvasUx'])) {
      issues.push({ field: `${prefix}.canvasUx`, message: 'canvasUx is required' });
    } else {
      for (const key of ['minWidth', 'minHeight', 'maxVisiblePortsPerSide']) {
        if (typeof node['canvasUx'][key] !== 'number') {
          issues.push({ field: `${prefix}.canvasUx.${key}`, message: `${key} must be a number` });
        }
      }
    }

    if (!isStringArray(node['compatibilityAliases'])) {
      issues.push({ field: `${prefix}.compatibilityAliases`, message: 'compatibilityAliases must be an array of strings' });
    }

    if (type) {
      if (!type.startsWith('lados.')) {
        issues.push({ field: `${prefix}.type`, message: 'Official node type must start with lados.' });
      }
      if (seenTypes.has(type)) {
        issues.push({ field: `${prefix}.type`, message: `Duplicate node type: ${type}` });
      }
      seenTypes.add(type);
      if (packManifest && !packManifest.nodes.includes(type)) {
        issues.push({ field: `${prefix}.type`, message: `${type} is not declared in pack manifest nodes` });
      }
    }

    if (capability) {
      if (seenCapabilities.has(capability)) {
        issues.push({ field: `${prefix}.canonicalCapability`, message: `Duplicate canonical capability: ${capability}` });
      }
      seenCapabilities.add(capability);
      if (packManifest && !packManifest.capabilities.includes(capability)) {
        issues.push({
          field: `${prefix}.canonicalCapability`,
          message: `${capability} is not declared in pack manifest capabilities`,
        });
      }
    }

    if (packManifest && ownerPack && ownerPack !== packManifest.id) {
      issues.push({ field: `${prefix}.ownerPack`, message: `ownerPack must match ${packManifest.id}` });
    }
  });

  return { valid: issues.length === 0, issues };
}

export function assertOfficialNodeManifests(
  nodes: unknown,
  packManifest?: OfficialCapabilityPackManifest,
): OfficialNodeManifest[] {
  const result = validateOfficialNodeManifests(nodes, packManifest);
  if (!result.valid) {
    const summary = result.issues.map((i) => `${i.field}: ${i.message}`).join('; ');
    throw new Error(`Invalid OfficialNodeManifest[] - ${summary}`);
  }
  return nodes as OfficialNodeManifest[];
}
