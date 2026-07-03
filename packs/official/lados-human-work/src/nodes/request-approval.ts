/**
 * lados.human.request_approval — Phase 21 S2 (Wave 1)
 *
 * Canonical successor to the prototype `core.human_approval` and
 * `foundation.request_approval` (both alias/merge into this node per the
 * Phase 20B.2 compatibility plan). Pauses the workflow and creates an
 * approval task; execution resumes only after a human decides via
 * POST /approvals/:taskId/decide.
 *
 * AI guardrail (non-negotiable): AI must never resolve this pause. Only a
 * human with owner|admin role may decide — enforced at the SecurityEngine
 * layer, not here.
 *
 * Config/Inputs:
 *   title         — approval task title (required)
 *   description   — task description (optional)
 *   assigneeRole  — which org role should action this (default: 'owner')
 *   notifyUserId  — user to notify immediately (optional, falls back to ctx.userId)
 *
 * Outputs (before pause):
 *   approvalTask — { approvalTaskId, assigneeRole, pending }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

// ── Service interfaces ────────────────────────────────────────────────────────
// Declared locally (not imported from any prototype pack) — satisfied via
// structural typing by apps/api's ApprovalTaskCreator / NotificationService.

export interface IApprovalTaskService {
  createTask(params: {
    executionId: string;
    workflowId: string;
    projectId: string;
    nodeId: string;
    nodeName?: string;
    orgId: string;
    title: string;
    description?: string;
    assigneeRole?: string;
    data?: Record<string, unknown>;
  }): Promise<{ taskId: string }>;
}

export interface INotificationService {
  notify(payload: {
    userId: string;
    orgId?: string;
    type: string;
    title: string;
    body?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string | null>;
}

export async function requestApproval(
  ctx: NodeContext,
  approvalService?: IApprovalTaskService,
  notificationService?: INotificationService,
): Promise<NodeExecuteResult> {
  if (!approvalService) {
    return { status: 'failure', outputs: {}, error: { code: 'NO_SERVICE', message: 'ApprovalTaskService not injected' } };
  }

  const title = (ctx.inputs['title'] ?? ctx.config['title']) as string | undefined;
  const description = (ctx.inputs['description'] ?? ctx.config['description']) as string | undefined;
  const assigneeRole = ((ctx.inputs['assigneeRole'] ?? ctx.config['assigneeRole'] ?? 'owner') as string);
  const notifyUserId = (ctx.inputs['notifyUserId'] ?? ctx.config['notifyUserId'] ?? ctx.userId) as string | undefined;

  if (!title) {
    return { status: 'failure', outputs: {}, error: { code: 'MISSING_INPUT', message: 'title is required' } };
  }

  ctx.logger.info(`lados.human.request_approval: "${title}" — assigneeRole:${assigneeRole}`);

  const { taskId } = await approvalService.createTask({
    executionId: ctx.executionId,
    workflowId: ctx.workflowId,
    projectId: ctx.projectId ?? '',
    nodeId: ctx.nodeId ?? 'unknown',
    nodeName: title,
    orgId: ctx.organizationId ?? '',
    title,
    description: description ?? `Review required by ${assigneeRole}`,
    assigneeRole,
    data: ctx.inputs,
  });

  ctx.logger.info(`Approval task created: ${taskId} — pausing workflow`);

  if (notificationService && notifyUserId) {
    const actionUrl = `/approvals?runId=${ctx.executionId}&taskId=${taskId}`;
    notificationService
      .notify({
        userId: notifyUserId,
        orgId: ctx.organizationId,
        type: 'approval_request',
        title: `Action Required: ${title}`,
        body: description ?? 'A workflow step is waiting for your approval. Click to review and decide.',
        actionUrl,
        metadata: { workflowId: ctx.workflowId, executionId: ctx.executionId, approvalTaskId: taskId },
      })
      .catch((err: unknown) => {
        ctx.logger.warn(`Notification failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }

  return {
    status: 'paused',
    outputs: {
      approvalTask: { approvalTaskId: taskId, assigneeRole, pending: true },
    },
    pause: {
      title,
      description: description ?? `Review required by ${assigneeRole}`,
      assigneeRole,
      context: { approvalTaskId: taskId },
    },
    summary: `Paused: waiting for human approval — "${title}"`,
  };
}
