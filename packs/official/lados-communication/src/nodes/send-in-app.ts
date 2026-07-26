import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IInAppNotificationService } from '../types';

export async function sendInApp(
  ctx: NodeContext,
  notificationService?: IInAppNotificationService,
): Promise<NodeExecuteResult> {
  const emptyOutput = { notification: { notified: false, notificationIds: [], userIds: [] } };
  if (!notificationService) {
    return { status: 'failure', outputs: emptyOutput, error: { code: 'NO_SERVICE', message: 'NotificationService not injected' } };
  }

  const context = ((ctx.inputs as Record<string, unknown>)['context'] as Record<string, unknown> | undefined) ?? {};
  const config = ctx.config as Record<string, unknown>;
  const userId = (context['userId'] ?? config['userId']) as string | undefined;
  const role = (context['role'] ?? config['role']) as string | undefined;
  const title = (context['title'] ?? config['title']) as string | undefined;
  const body = (context['body'] ?? config['body']) as string | undefined;
  const severity = (context['severity'] ?? config['severity']) as string | undefined;

  if (!userId && !role) {
    return { status: 'failure', outputs: emptyOutput, error: { code: 'MISSING_INPUT', message: 'lados.communication.send_in_app: userId or role is required' } };
  }
  if (!title) {
    return { status: 'failure', outputs: emptyOutput, error: { code: 'MISSING_INPUT', message: 'lados.communication.send_in_app: title is required' } };
  }

  try {
    if (role && !notificationService.resolveRecipients) {
      return { status: 'failure', outputs: emptyOutput, error: { code: 'RECIPIENT_RESOLVER_NOT_CONFIGURED', message: 'Notification recipient resolver is not injected' } };
    }
    const userIds = notificationService.resolveRecipients
      ? await notificationService.resolveRecipients({ orgId: ctx.organizationId, userId, role })
      : userId ? [userId] : [];
    if (!userIds.length) {
      return { status: 'failure', outputs: emptyOutput, error: { code: 'RECIPIENTS_NOT_FOUND', message: `No notification recipients found${role ? ` for role "${role}"` : ''}` } };
    }

    ctx.logger.info(`lados.communication.send_in_app recipients:${userIds.join(',')} title:"${title}"`);
    const notificationIds = await Promise.all(userIds.map((recipientId) => notificationService.notify({
      userId: recipientId,
      orgId: ctx.organizationId,
      type: 'system',
      title,
      body,
      idempotencyKey: ctx.idempotencyKey ? `${ctx.idempotencyKey}:${recipientId}` : undefined,
      metadata: {
        severity: severity ?? null,
        role: role ?? null,
        workflowId: ctx.workflowId,
        executionId: ctx.executionId,
        attempt: ctx.attempt ?? 1,
      },
    })));

    return {
      status: 'success',
      outputs: { notification: {
        notified: true,
        notificationId: notificationIds[0] ?? null,
        notificationIds,
        userId: userIds[0] ?? null,
        userIds,
        role: role ?? null,
      } },
      summary: `In-app notification sent to ${userIds.length} recipient(s): "${title}"`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.communication.send_in_app failed: ${message}`);
    return { status: 'failure', outputs: emptyOutput, error: { code: 'NOTIFICATION_FAILED', message } };
  }
}
