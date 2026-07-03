/**
 * lados.communication.send_in_app — Phase 21 S4 (Wave 2)
 *
 * Canonical successor to the prototype `notification.send_in_app` and
 * `foundation.send_notification` (both merge into this node per the
 * compatibility alias map). Delivers an in-app notification to a single
 * user via the injected NotificationService. Informs only — it does not
 * assign or approve work.
 *
 * Role/organization-scope broadcast (config.role / config.organizationScope)
 * is accepted but NOT YET implemented — there is no org-member-by-role
 * lookup service wired into this pack. If `role` is supplied without a
 * concrete `userId`, this node fails clearly with NOT_IMPLEMENTED rather
 * than silently no-op'ing or guessing a recipient.
 *
 * Config/Inputs:
 *   userId   — target user (required unless role broadcast — see above)
 *   role     — org role to broadcast to (not yet implemented)
 *   title    — required
 *   body     — optional
 *   severity — free-form label, carried in metadata (not a NotificationType)
 *
 * Outputs:
 *   notification — { notified, notificationId, userId }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IInAppNotificationService } from '../types';

export async function sendInApp(
  ctx: NodeContext,
  notificationService?: IInAppNotificationService,
): Promise<NodeExecuteResult> {
  if (!notificationService) {
    return {
      status: 'failure',
      outputs: { notification: { notified: false, notificationId: null, userId: null } },
      error: { code: 'NO_SERVICE', message: 'NotificationService not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const context = (inp['context'] as Record<string, unknown> | undefined) ?? {};

  const userId   = (context['userId']   ?? cfg['userId'])   as string | undefined;
  const role     = (context['role']     ?? cfg['role'])     as string | undefined;
  const title    = (context['title']    ?? cfg['title'])    as string | undefined;
  const body     = (context['body']     ?? cfg['body'])     as string | undefined;
  const severity = (context['severity'] ?? cfg['severity']) as string | undefined;

  if (!userId) {
    if (role) {
      return {
        status: 'failure',
        outputs: { notification: { notified: false, notificationId: null, userId: null } },
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'lados.communication.send_in_app: role-based broadcast is not implemented — provide a concrete userId',
        },
      };
    }
    return {
      status: 'failure',
      outputs: { notification: { notified: false, notificationId: null, userId: null } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_in_app: userId is required' },
    };
  }
  if (!title) {
    return {
      status: 'failure',
      outputs: { notification: { notified: false, notificationId: null, userId } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_in_app: title is required' },
    };
  }

  ctx.logger.info(`lados.communication.send_in_app → user:${userId} title:"${title}"`);

  try {
    const notificationId = await notificationService.notify({
      userId,
      orgId: ctx.organizationId,
      type: 'system',
      title,
      body,
      metadata: {
        severity: severity ?? null,
        workflowId: ctx.workflowId,
        executionId: ctx.executionId,
      },
    });

    return {
      status: 'success',
      outputs: { notification: { notified: true, notificationId: notificationId ?? null, userId } },
      summary: `In-app notification sent to user ${userId}: "${title}"`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.communication.send_in_app failed: ${message}`);
    return {
      status: 'failure',
      outputs: { notification: { notified: false, notificationId: null, userId } },
      error: { code: 'NOTIFICATION_FAILED', message },
    };
  }
}
