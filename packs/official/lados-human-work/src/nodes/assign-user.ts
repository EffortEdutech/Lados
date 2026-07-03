/**
 * lados.human.assign_user — Phase 21 S2 (Wave 1)
 *
 * Official successor to the prototype `foundation.assign_user`. Assigns a
 * user to a resource within a workflow. Writes the assignee into the
 * resource's data field. Assignment only — never approves or certifies.
 *
 * Config/Inputs:
 *   resourceId   — lados_resources.id (required)
 *   userId       — user to assign (required)
 *   assigneeRole — label for the assignment, e.g. 'reviewer' (optional)
 *
 * Outputs:
 *   assignment — { assigned, resourceId, userId, assigneeRole }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export interface IAssignableResourceService {
  updateResource(
    id: string,
    orgId: string,
    updates: { data?: Record<string, unknown> },
    updatedBy: string,
  ): Promise<{ id: string }>;
}

export async function assignUser(
  ctx: NodeContext,
  resourceService?: IAssignableResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { assignment: { assigned: false, resourceId: null, userId: null } },
      error: { code: 'NO_SERVICE', message: 'ResourceService not injected' },
    };
  }

  const resourceId = (ctx.inputs['resourceId'] ?? ctx.config['resourceId']) as string | undefined;
  const userId = (ctx.inputs['userId'] ?? ctx.config['userId']) as string | undefined;
  const assigneeRole = (ctx.inputs['assigneeRole'] ?? ctx.config['assigneeRole']) as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { assignment: { assigned: false, resourceId: null, userId: null } },
      error: { code: 'MISSING_INPUT', message: 'resourceId is required' },
    };
  }
  if (!userId) {
    return {
      status: 'failure',
      outputs: { assignment: { assigned: false, resourceId, userId: null } },
      error: { code: 'MISSING_INPUT', message: 'userId is required' },
    };
  }

  const orgId = ctx.organizationId;
  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.human.assign_user → resource:${resourceId} user:${userId} role:${assigneeRole ?? 'unspecified'}`);

  try {
    const dataUpdate: Record<string, unknown> = {
      assignee: userId,
      assignedAt: new Date().toISOString(),
      assignedBy: actorId,
    };
    if (assigneeRole) dataUpdate['assigneeRole'] = assigneeRole;

    await resourceService.updateResource(resourceId, orgId, { data: dataUpdate }, actorId);

    return {
      status: 'success',
      outputs: {
        assignment: { assigned: true, resourceId, userId, assigneeRole: assigneeRole ?? null },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.human.assign_user failed: ${message}`);
    return {
      status: 'failure',
      outputs: { assignment: { assigned: false, resourceId, userId } },
      error: { code: 'ASSIGN_FAILED', message },
    };
  }
}
