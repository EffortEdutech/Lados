/**
 * lados.resource.update — Phase 21 S4 (Wave 2)
 *
 * Updates a Workspace Resource's `data` (never its `state` — use
 * lados.resource.transition for state changes, which are state-machine
 * guarded). `fieldMap` (config), when present, supports flat key-renaming
 * only from the `data` input, same convention as lados.resource.create.
 *
 * Config/Inputs:
 *   resource.resourceId | resource.id | config.resourceId — required
 *   data     — object to merge into the resource's data
 *   fieldMap — optional flat {targetKey: sourceKey} rename map
 *
 * Outputs:
 *   updated — { resourceId, state, data }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService } from '../types';

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

export async function updateResource(
  ctx: NodeContext,
  resourceService?: IUpdateResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { updated: null },
      error: { code: 'NO_SERVICE', message: 'Resource update service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const resourceInput = (inp['resource'] as Record<string, unknown> | undefined) ?? {};
  const dataInput     = (inp['data']     as Record<string, unknown> | undefined) ?? undefined;
  const fieldMap      = cfg['fieldMap'] as Record<string, string> | undefined;

  const resourceId = (resourceInput['resourceId'] ?? resourceInput['id'] ?? cfg['resourceId']) as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { updated: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.update: resourceId is required (bind a resource or provide resource.resourceId)' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { updated: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.resource.update: organizationId missing from execution context' },
    };
  }

  const data = dataInput ? applyFieldMap(dataInput, fieldMap) : undefined;
  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.resource.update → resource:${resourceId}`);

  try {
    const record = await resourceService.updateResource(resourceId, ctx.organizationId, { data }, actorId);
    return {
      status: 'success',
      outputs: { updated: { resourceId: record.id, state: record.state, data: record.data } },
      summary: `Resource ${resourceId} updated`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: { updated: null }, error: { code: 'UPDATE_FAILED', message } };
  }
}
