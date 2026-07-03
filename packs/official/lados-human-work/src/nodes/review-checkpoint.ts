/**
 * lados.human.review_checkpoint — Phase 21 S2 (Wave 1)
 *
 * A lighter-weight sibling of `lados.human.request_approval`: inserts a
 * human review point before the workflow continues. Still pauses and still
 * creates a task (per the pack guardrail — "must pause or create tasks
 * instead of silently approving workflow actions") but is framed as a
 * review/acknowledgement rather than a formal approve/reject decision, and
 * defaults to a generic reviewer role instead of requiring one to be named.
 *
 * Config/Inputs:
 *   title        — checkpoint title (default: 'Review checkpoint')
 *   description  — optional description
 *   assigneeRole — role that should review (default: 'reviewer')
 *
 * Outputs (before pause):
 *   reviewTask — { reviewTaskId, assigneeRole, pending }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IApprovalTaskService } from './request-approval';

export async function reviewCheckpoint(
  ctx: NodeContext,
  approvalService?: IApprovalTaskService,
): Promise<NodeExecuteResult> {
  if (!approvalService) {
    return { status: 'failure', outputs: {}, error: { code: 'NO_SERVICE', message: 'ApprovalTaskService not injected' } };
  }

  const title = ((ctx.inputs['title'] ?? ctx.config['title'] ?? 'Review checkpoint') as string);
  const description = (ctx.inputs['description'] ?? ctx.config['description']) as string | undefined;
  const assigneeRole = ((ctx.inputs['assigneeRole'] ?? ctx.config['assigneeRole'] ?? 'reviewer') as string);

  ctx.logger.info(`lados.human.review_checkpoint: "${title}" — assigneeRole:${assigneeRole}`);

  const { taskId } = await approvalService.createTask({
    executionId: ctx.executionId,
    workflowId: ctx.workflowId,
    projectId: ctx.projectId ?? '',
    nodeId: ctx.nodeId ?? 'unknown',
    nodeName: title,
    orgId: ctx.organizationId ?? '',
    title,
    description: description ?? `Review checkpoint for ${assigneeRole}`,
    assigneeRole,
    data: ctx.inputs,
  });

  ctx.logger.info(`Review task created: ${taskId} — pausing workflow`);

  return {
    status: 'paused',
    outputs: {
      reviewTask: { reviewTaskId: taskId, assigneeRole, pending: true },
    },
    pause: {
      title,
      description: description ?? `Review checkpoint for ${assigneeRole}`,
      assigneeRole,
      context: { reviewTaskId: taskId },
    },
    summary: `Paused: waiting for review checkpoint — "${title}"`,
  };
}
