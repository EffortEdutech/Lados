/**
 * lados.resource.list — Phase 21 S4 (Wave 2)
 *
 * Lists Workspace Resources for the current organization, optionally
 * filtered by type/state, scoped to the current project when set.
 *
 * Outputs:
 *   resources — array of { resourceId, type, name, state }
 *   count     — number of resources returned
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IListResourceService } from '../types';

export async function listResources(
  ctx: NodeContext,
  resourceService?: IListResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { resources: [], count: 0 },
      error: { code: 'NO_SERVICE', message: 'Resource list service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const filter = (inp['filter'] as Record<string, unknown> | undefined) ?? {};

  const resourceType = (filter['resourceType'] ?? cfg['resourceType']) as string | undefined;
  const state        = (filter['state']        ?? cfg['state'])        as string | undefined;
  const limit        = (filter['limit']        ?? cfg['limit'])        as number | undefined;

  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { resources: [], count: 0 },
      error: { code: 'MISSING_CONTEXT', message: 'lados.resource.list: organizationId missing from execution context' },
    };
  }

  const records = await resourceService.listResources(ctx.organizationId, {
    type: resourceType,
    state,
    projectId: ctx.projectId,
    limit,
  });

  ctx.logger.info(
    `lados.resource.list → ${records.length} resource(s)${resourceType ? ` type:${resourceType}` : ''}${state ? ` state:${state}` : ''}`,
  );

  return {
    status: 'success',
    outputs: {
      resources: records.map((r) => ({ resourceId: r.id, type: r.type, name: r.name, state: r.state })),
      count: records.length,
    },
    summary: `Listed ${records.length} resource(s)${resourceType ? ` of type "${resourceType}"` : ''}`,
  };
}
