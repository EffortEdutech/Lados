/**
 * lados.communication.send_reminder — Phase 21 S4 (Wave 2)
 *
 * Sends a reminder message immediately, at the moment this node executes.
 * It does NOT itself defer delivery until `dueDate`/`offset` — scheduling a
 * reminder for a future moment is the workflow's responsibility (compose
 * with `lados.workflow.delay` or `lados.workflow.trigger_schedule` upstream
 * of this node). `dueDate`/`offset`/`timezone` are accepted and echoed back
 * in the output for audit/display purposes only — they are not evaluated.
 *
 * Reminder delivery does not make the pending decision it's reminding about.
 *
 * Config/Inputs:
 *   channel  — 'in_app' (default) | 'email'
 *   userId   — required when channel='in_app'
 *   email    — required when channel='email'
 *   title    — required
 *   body     — optional
 *   dueDate, offset, timezone — echoed only, not evaluated
 *
 * Outputs:
 *   reminder — { sent, channel, dueDate, offset }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IInAppNotificationService, IEmailService } from '../types';

export interface SendReminderServices {
  inAppService?: IInAppNotificationService;
  emailService?: IEmailService;
}

export async function sendReminder(
  ctx: NodeContext,
  services: SendReminderServices = {},
): Promise<NodeExecuteResult> {
  const { inAppService, emailService } = services;

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const target = (inp['target'] as Record<string, unknown> | undefined) ?? {};

  const channel = ((target['channel'] ?? cfg['channel']) as string | undefined) ?? 'in_app';
  const title   = (target['title']   ?? cfg['title'])   as string | undefined;
  const body    = (target['body']    ?? cfg['body'])    as string | undefined;
  const userId  = (target['userId']  ?? cfg['userId'])  as string | undefined;
  const email   = (target['email']   ?? cfg['email'])   as string | undefined;
  const dueDate = (target['dueDate'] ?? cfg['dueDate'])  as string | undefined;
  const offset  = (target['offset']  ?? cfg['offset'])   as string | undefined;

  if (!title) {
    return {
      status: 'failure',
      outputs: { reminder: { sent: false, channel, dueDate: dueDate ?? null, offset: offset ?? null } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_reminder: title is required' },
    };
  }

  ctx.logger.info(
    `lados.communication.send_reminder → channel:${channel} title:"${title}"${dueDate ? ` dueDate:${dueDate}` : ''}`,
  );

  if (channel === 'email') {
    if (!emailService) {
      return {
        status: 'failure',
        outputs: { reminder: { sent: false, channel, dueDate: dueDate ?? null, offset: offset ?? null } },
        error: { code: 'NO_SERVICE', message: 'EmailService not injected' },
      };
    }
    if (!email) {
      return {
        status: 'failure',
        outputs: { reminder: { sent: false, channel, dueDate: dueDate ?? null, offset: offset ?? null } },
        error: { code: 'MISSING_INPUT', message: 'lados.communication.send_reminder: email is required when channel="email"' },
      };
    }

    const result = await emailService.sendEmail({ to: email, subject: title, text: body ?? title });

    return {
      status: result.sent ? 'success' : 'failure',
      outputs: { reminder: { sent: result.sent, channel, dueDate: dueDate ?? null, offset: offset ?? null } },
      ...(result.sent ? {} : { error: { code: 'REMINDER_FAILED', message: result.error ?? 'Email delivery failed' } }),
      summary: result.sent ? `Reminder emailed: "${title}"` : `Reminder email failed: ${result.error}`,
    };
  }

  // default: in_app
  if (!inAppService) {
    return {
      status: 'failure',
      outputs: { reminder: { sent: false, channel, dueDate: dueDate ?? null, offset: offset ?? null } },
      error: { code: 'NO_SERVICE', message: 'NotificationService not injected' },
    };
  }
  if (!userId) {
    return {
      status: 'failure',
      outputs: { reminder: { sent: false, channel, dueDate: dueDate ?? null, offset: offset ?? null } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_reminder: userId is required when channel="in_app"' },
    };
  }

  const notificationId = await inAppService.notify({
    userId,
    orgId: ctx.organizationId,
    type: 'system',
    title,
    body,
    metadata: { dueDate: dueDate ?? null, offset: offset ?? null, workflowId: ctx.workflowId, executionId: ctx.executionId },
  });

  return {
    status: 'success',
    outputs: {
      reminder: { sent: true, notificationId: notificationId ?? null, channel, dueDate: dueDate ?? null, offset: offset ?? null },
    },
    summary: `Reminder sent (${channel}): "${title}"`,
  };
}
