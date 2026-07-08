/**
 * lados.resource.assign — Phase 21 S9.1 (gap closure)
 *
 * Official successor to the prototype `foundation.assign_user`. Assigns a
 * user to any Workspace Resource by writing `assignee` / `assigneeRole`
 * into the resource's `data` (never its `state` — this is a data update,
 * same guardrail as lados.resource.update). Generic across resource types,
 * unlike Task-Case's assignee config field which only applies to
 * `lados.task.create`.
 *
 * Config/Inputs:
 *   resource.resourceId | resource.id | config.resourceId — required
 *   userId       — required (from data input or config)
 *   assigneeRole — optional role label, e.g. "driver", "reviewer", "owner"
 *
 * Outputs:
 *   assigned — { resourceId, userId, assigneeRole }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService } from '../types';

export async function assignResource(
  ctx: NodeContext,
  resourceService?: IUpdateResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { assigned: null },
      error: { code: 'NO_SERVICE', message: 'Resource update service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const resourceInput = (inp['resource'] as Record<string, unknown> | undefined) ?? {};
  const dataInput = (inp['data'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (resourceInput['resourceId'] ?? resourceInput['id'] ?? cfg['resourceId']) as string | undefined;
  const userId = (dataInput['userId'] ?? inp['userId'] ?? cfg['userId']) as string | undefined;
  const assigneeRole = (dataInput['assigneeRole'] ?? inp['assigneeRole'] ?? cfg['assigneeRole']) as
    | string
    | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { assigned: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.assign: resourceId is required (bind a resource or provide resource.resourceId)' },
    };
  }
  if (!userId) {
    return {
      status: 'failure',
      outputs: { assigned: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.assign: userId is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { assigned: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.resource.assign: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.resource.assign → resource:${resourceId} user:${userId}${assigneeRole ? ` role:${assigneeRole}` : ''}`);

  try {
    const record = await resourceService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { assignee: userId, ...(assigneeRole ? { assigneeRole } : {}) } },
      actorId,
    );
    return {
      status: 'success',
      outputs: { assigned: { resourceId: record.id, userId, assigneeRole: assigneeRole ?? null } },
      summary: `Resource ${resourceId} assigned to ${userId}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: { assigned: null }, error: { code: 'ASSIGN_FAILED', message } };
  }
}
