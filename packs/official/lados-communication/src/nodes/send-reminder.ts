import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IInAppNotificationService, IEmailService } from '../types';

export interface SendReminderServices {
  inAppService?: IInAppNotificationService;
  emailService?: IEmailService;
}

export async function sendReminder(ctx: NodeContext, services: SendReminderServices = {}): Promise<NodeExecuteResult> {
  const target = ((ctx.inputs as Record<string, unknown>)['target'] as Record<string, unknown> | undefined) ?? {};
  const config = ctx.config as Record<string, unknown>;
  const channel = ((target['channel'] ?? config['channel']) as string | undefined) ?? 'in_app';
  const title = (target['title'] ?? config['title']) as string | undefined;
  const body = (target['body'] ?? config['body']) as string | undefined;
  const userId = (target['userId'] ?? config['userId']) as string | undefined;
  const role = (target['role'] ?? config['role']) as string | undefined;
  const email = (target['email'] ?? config['email']) as string | undefined;
  const dueDate = (target['dueDate'] ?? config['dueDate']) as string | undefined;
  const offset = (target['offset'] ?? config['offset']) as string | undefined;
  const outputBase = { channel, dueDate: dueDate ?? null, offset: offset ?? null };

  if (!title) return { status: 'failure', outputs: { reminder: { sent: false, ...outputBase } }, error: { code: 'MISSING_INPUT', message: 'lados.communication.send_reminder: title is required' } };

  if (channel === 'email') {
    if (!services.emailService) return { status: 'failure', outputs: { reminder: { sent: false, ...outputBase } }, error: { code: 'NO_SERVICE', message: 'EmailService not injected' } };
    if (!email) return { status: 'failure', outputs: { reminder: { sent: false, ...outputBase } }, error: { code: 'MISSING_INPUT', message: 'lados.communication.send_reminder: email is required when channel="email"' } };
    const result = await services.emailService.sendEmail({ to: email, subject: title, text: body ?? title });
    return {
      status: result.sent ? 'success' : 'failure',
      outputs: { reminder: { sent: result.sent, ...outputBase } },
      ...(result.sent ? {} : { error: { code: 'REMINDER_FAILED', message: result.error ?? 'Email delivery failed' } }),
      summary: result.sent ? `Reminder emailed: "${title}"` : `Reminder email failed: ${result.error}`,
    };
  }

  if (!services.inAppService) return { status: 'failure', outputs: { reminder: { sent: false, ...outputBase } }, error: { code: 'NO_SERVICE', message: 'NotificationService not injected' } };
  if (!userId && !role) return { status: 'failure', outputs: { reminder: { sent: false, ...outputBase } }, error: { code: 'MISSING_INPUT', message: 'lados.communication.send_reminder: userId or role is required when channel="in_app"' } };
  if (role && !services.inAppService.resolveRecipients) return { status: 'failure', outputs: { reminder: { sent: false, ...outputBase } }, error: { code: 'RECIPIENT_RESOLVER_NOT_CONFIGURED', message: 'Notification recipient resolver is not injected' } };

  const userIds = services.inAppService.resolveRecipients
    ? await services.inAppService.resolveRecipients({ orgId: ctx.organizationId, userId, role })
    : userId ? [userId] : [];
  if (!userIds.length) return { status: 'failure', outputs: { reminder: { sent: false, ...outputBase } }, error: { code: 'RECIPIENTS_NOT_FOUND', message: `No reminder recipients found${role ? ` for role "${role}"` : ''}` } };

  const notificationIds = await Promise.all(userIds.map((recipientId) => services.inAppService!.notify({
    userId: recipientId,
    orgId: ctx.organizationId,
    type: 'system',
    title,
    body,
    idempotencyKey: ctx.idempotencyKey ? `${ctx.idempotencyKey}:${recipientId}` : undefined,
    metadata: {
      dueDate: dueDate ?? null,
      offset: offset ?? null,
      role: role ?? null,
      workflowId: ctx.workflowId,
      executionId: ctx.executionId,
      attempt: ctx.attempt ?? 1,
    },
  })));
  return {
    status: 'success',
    outputs: { reminder: { sent: true, notificationId: notificationIds[0] ?? null, notificationIds, userIds, ...outputBase } },
    summary: `Reminder sent (${channel}) to ${userIds.length} recipient(s): "${title}"`,
  };
}
