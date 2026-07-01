import { WORKFLOW_SCHEMA_VERSION } from './constants';
import type { ValidationResult, ValidationError } from './types';
import type { QSWorkflowDefinition } from '@lados/shared-types';

/**
 * Validates a raw JSON object against the QS-OS Workflow JSON schema (v1.0).
 *
 * This is a structural validator — it checks required fields, types, and
 * referential integrity (connection node IDs must exist in nodes[]).
 * It does NOT validate node config schemas (that is the execution engine's job).
 */
export function validateWorkflow(json: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { valid: false, errors: [{ field: 'root', message: 'Must be a JSON object' }] };
  }

  const doc = json as Record<string, unknown>;

  // ── schemaVersion — optional, warn but don't fail ─────────────────────────
  // The workflow metadata (id, name, status, etc.) lives in the workflows table.
  // The definition JSON only needs to be structurally valid (nodes + connections).

  // ── nodes ──────────────────────────────────────────────────────────────────
  if (!Array.isArray(doc['nodes'])) {
    errors.push({ field: 'nodes', message: 'Must be an array' });
  } else {
    const nodeIds = new Set<string>();
    (doc['nodes'] as unknown[]).forEach((node, i) => {
      const n = node as Record<string, unknown>;
      if (!n['id']) errors.push({ field: `nodes[${i}].id`, message: 'Required' });
      else nodeIds.add(n['id'] as string);
      if (!n['type']) errors.push({ field: `nodes[${i}].type`, message: 'Required' });
      if (!n['position'] || typeof n['position'] !== 'object') {
        errors.push({ field: `nodes[${i}].position`, message: 'Required {x, y} object' });
      }
    });

    // ── connections ─────────────────────────────────────────────────────────
    if (!Array.isArray(doc['connections'])) {
      errors.push({ field: 'connections', message: 'Must be an array' });
    } else {
      (doc['connections'] as unknown[]).forEach((conn, i) => {
        const c = conn as Record<string, unknown>;
        if (!c['id']) errors.push({ field: `connections[${i}].id`, message: 'Required' });
        if (!c['sourceNodeId']) errors.push({ field: `connections[${i}].sourceNodeId`, message: 'Required' });
        if (!c['targetNodeId']) errors.push({ field: `connections[${i}].targetNodeId`, message: 'Required' });
        if (!c['sourcePortId']) errors.push({ field: `connections[${i}].sourcePortId`, message: 'Required' });
        if (!c['targetPortId']) errors.push({ field: `connections[${i}].targetPortId`, message: 'Required' });

        // Referential integrity
        if (c['sourceNodeId'] && !nodeIds.has(c['sourceNodeId'] as string)) {
          errors.push({
            field: `connections[${i}].sourceNodeId`,
            message: `Node "${String(c['sourceNodeId'])}" not found in nodes[]`,
          });
        }
        if (c['targetNodeId'] && !nodeIds.has(c['targetNodeId'] as string)) {
          errors.push({
            field: `connections[${i}].targetNodeId`,
            message: `Node "${String(c['targetNodeId'])}" not found in nodes[]`,
          });
        }
      });
    }
  }

  const ui = doc['ui'];
  if (ui !== undefined) {
    if (!ui || typeof ui !== 'object' || Array.isArray(ui)) {
      errors.push({ field: 'ui', message: 'Must be an object when provided' });
    } else {
      const groups = (ui as Record<string, unknown>)['groups'];
      if (groups !== undefined) {
        if (!Array.isArray(groups)) {
          errors.push({ field: 'ui.groups', message: 'Must be an array when provided' });
        } else {
          groups.forEach((group, i) => {
            const g = group as Record<string, unknown>;
            if (!g || typeof g !== 'object' || Array.isArray(g)) {
              errors.push({ field: `ui.groups[${i}]`, message: 'Must be an object' });
              return;
            }
            if (typeof g['id'] !== 'string') {
              errors.push({ field: `ui.groups[${i}].id`, message: 'Required string' });
            }
            if (typeof g['name'] !== 'string') {
              errors.push({ field: `ui.groups[${i}].name`, message: 'Required string' });
            }
            if (g['nodeIds'] !== undefined && !Array.isArray(g['nodeIds'])) {
              errors.push({ field: `ui.groups[${i}].nodeIds`, message: 'Must be an array' });
            }
            const bounds = g['bounds'];
            if (bounds !== undefined) {
              if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) {
                errors.push({ field: `ui.groups[${i}].bounds`, message: 'Must be an object' });
              } else {
                const b = bounds as Record<string, unknown>;
                for (const key of ['x', 'y', 'width', 'height']) {
                  if (typeof b[key] !== 'number') {
                    errors.push({ field: `ui.groups[${i}].bounds.${key}`, message: 'Must be a number' });
                  }
                }
              }
            }
          });
        }
      }

      const fastGroupBypassers = (ui as Record<string, unknown>)['fastGroupBypassers'];
      if (fastGroupBypassers !== undefined) {
        if (!Array.isArray(fastGroupBypassers)) {
          errors.push({ field: 'ui.fastGroupBypassers', message: 'Must be an array when provided' });
        } else {
          fastGroupBypassers.forEach((bypasser, i) => {
            const b = bypasser as Record<string, unknown>;
            if (!b || typeof b !== 'object' || Array.isArray(b)) {
              errors.push({ field: `ui.fastGroupBypassers[${i}]`, message: 'Must be an object' });
              return;
            }
            if (typeof b['id'] !== 'string') {
              errors.push({ field: `ui.fastGroupBypassers[${i}].id`, message: 'Required string' });
            }
            const position = b['position'];
            if (!position || typeof position !== 'object' || Array.isArray(position)) {
              errors.push({ field: `ui.fastGroupBypassers[${i}].position`, message: 'Required {x, y} object' });
            } else {
              const p = position as Record<string, unknown>;
              if (typeof p['x'] !== 'number') {
                errors.push({ field: `ui.fastGroupBypassers[${i}].position.x`, message: 'Must be a number' });
              }
              if (typeof p['y'] !== 'number') {
                errors.push({ field: `ui.fastGroupBypassers[${i}].position.y`, message: 'Must be a number' });
              }
            }
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Type-guard: validates and narrows to QSWorkflowDefinition */
export function isValidWorkflow(json: unknown): json is QSWorkflowDefinition {
  return validateWorkflow(json).valid;
}
