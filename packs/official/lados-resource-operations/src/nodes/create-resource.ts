/**
 * lados.resource.create — Phase 21 S4 (Wave 2)
 *
 * Creates a Workspace Resource (lados_resources) using config fields and
 * upstream `data`. `fieldMap` (config), when present, supports flat
 * key-renaming only (target key <- source key) from the `data` input — it
 * is not a deep/JSONPath mapping engine. `dataSource` is accepted and
 * logged for audit/traceability but is not itself fetched by this node —
 * the upstream node must already have produced the `data` input.
 *
 * Creates a record only; approval must be modeled separately.
 *
 * Config/Inputs:
 *   resourceType  — required (matches lados_resources.type — see the
 *                   pack README for the current allow-list)
 *   name          — required (from data.name or config.name)
 *   initialState  — optional override of the type's default initial state
 *   dataSource    — optional label, echoed in logs only
 *   fieldMap      — optional flat {targetKey: sourceKey} rename map
 *
 * Outputs:
 *   resource — { resourceId, type, name, state }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

function applyFieldMap(
  data: Record<string, unknown>,
  fieldMap?: Record<string, string>,
): Record<string, unknown> {
  if (!fieldMap) return data;
  const mapped: Record<string, unknown> = { ...data };
  for (const [target, source] of Object.entries(fieldMap)) {
    if (source in data) mapped[target] = data[source];
  }
  return mapped;
}

export async function createResource(
  ctx: NodeContext,
  resourceService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const inputData = (inp['data'] as Record<string, unknown> | undefined) ?? {};

  const resourceType = cfg['resourceType'] as string | undefined;
  const name         = (inputData['name'] ?? cfg['name']) as string | undefined;
  const initialState = cfg['initialState'] as string | undefined;
  const dataSource   = cfg['dataSource'] as string | undefined;
  const fieldMap     = cfg['fieldMap'] as Record<string, string> | undefined;

  if (!resourceType) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.create: resourceType is required' },
    };
  }
  if (!name) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.create: name is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.resource.create: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';
  const data = applyFieldMap(inputData, fieldMap);

  ctx.logger.info(
    `lados.resource.create → type:${resourceType} name:"${name}"${dataSource ? ` source:${dataSource}` : ''}`,
  );

  const record = await resourceService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: resourceType,
    name,
    data,
    createdBy: actorId,
    initialState,
  });

  return {
    status: 'success',
    outputs: { resource: { resourceId: record.id, type: record.type, name: record.name, state: record.state } },
    summary: `Resource created: "${name}" (${resourceType})`,
  };
}
