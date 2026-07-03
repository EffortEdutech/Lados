/**
 * lados.task.create — Phase 21 S4 (Wave 2)
 *
 * Creates an operational task as a Workspace Resource of type "task" (via
 * the injected create-resource service — the same generic lados_resources
 * store Resource Operations uses). Creates work for humans; it does not
 * approve the work — pair with lados.human.request_approval for gates.
 *
 * Config/Inputs:
 *   title        — required
 *   description  — optional
 *   priority     — optional
 *   assignee     — optional user id
 *   role         — optional org role label
 *   dueDate      — optional
 *
 * Outputs:
 *   task — { taskId, title, status, assignee, dueDate }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function createTask(
  ctx: NodeContext,
  resourceService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { task: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const context = (inp['context'] as Record<string, unknown> | undefined) ?? {};

  const title       = (context['title']       ?? cfg['title'])       as string | undefined;
  const description = (context['description'] ?? cfg['description']) as string | undefined;
  const priority    = (context['priority']    ?? cfg['priority'])    as string | undefined;
  const assignee    = (context['assignee']    ?? cfg['assignee'])    as string | undefined;
  const role        = (context['role']        ?? cfg['role'])        as string | undefined;
  const dueDate     = (context['dueDate']     ?? cfg['dueDate'])     as string | undefined;

  if (!title) {
    return {
      status: 'failure',
      outputs: { task: null },
      error: { code: 'MISSING_INPUT', message: 'lados.task.create: title is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { task: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.task.create: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(
    `lados.task.create → "${title}"${assignee ? ` assignee:${assignee}` : ''}${role ? ` role:${role}` : ''}`,
  );

  const record = await resourceService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'task',
    name: title,
    data: {
      description: description ?? null,
      priority: priority ?? null,
      assignee: assignee ?? null,
      role: role ?? null,
      dueDate: dueDate ?? null,
    },
    createdBy: actorId,
  });

  return {
    status: 'success',
    outputs: {
      task: { taskId: record.id, title, status: record.state, assignee: assignee ?? null, dueDate: dueDate ?? null },
    },
    summary: `Task created: "${title}"`,
  };
}
