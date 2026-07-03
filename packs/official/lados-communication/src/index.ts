/**
 * @lados/official-communication
 *
 * Phase 21 S4 (Wave 2) — real executors for the `lados.communication`
 * official Capability Pack (L1). Registry metadata lives in ../manifest.json
 * + ../nodes.json (read by OfficialPackLoaderService); this package supplies
 * runtime behavior only.
 *
 * Honesty note: send_sms is a STUB — it is wired correctly end-to-end but no
 * SMS provider is configured anywhere in this repo yet (see send-sms.ts).
 * Its nodes.json entry is marked `executorStatus: "stub"` and the pack's
 * overall `runtimeStatus` is `stub_executors`, not `runtime_enabled`.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { sendEmail } from './nodes/send-email';
import { sendSms } from './nodes/send-sms';
import { sendInApp } from './nodes/send-in-app';
import { sendReminder, type SendReminderServices } from './nodes/send-reminder';

export { sendEmail, sendSms, sendInApp, sendReminder };
export {
  type IEmailService,
  type ISmsService,
  type IInAppNotificationService,
  type NotificationType,
  type EmailPayload,
  type EmailResult,
  type SmsPayload,
  type SmsResult,
  type InAppNotifyPayload,
} from './types';
export { type SendReminderServices } from './nodes/send-reminder';

export const PACK_ID = 'lados.communication' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface CommunicationServices {
  emailService?: import('./types').IEmailService;
  smsService?: import('./types').ISmsService;
  notificationService?: import('./types').IInAppNotificationService;
}

const NO_SERVICE = (code: string, message: string): NodeExecuteResult => ({
  status: 'failure',
  outputs: {},
  error: { code, message },
});

/**
 * Returns the real executor for a lados.communication node type, or null if
 * unknown. Call once in buildRealNodeResolver, injecting NestJS services.
 */
export function resolveNode(
  services: CommunicationServices = {},
): (nodeType: string) => NodeExecutor | null {
  const { emailService, smsService, notificationService } = services;

  const reminderServices: SendReminderServices = {
    inAppService: notificationService,
    emailService,
  };

  const nodes: Record<string, NodeExecutor> = {
    'lados.communication.send_email': (ctx) =>
      emailService
        ? sendEmail(ctx, emailService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'EmailService not injected')),

    'lados.communication.send_sms': (ctx) =>
      smsService
        ? sendSms(ctx, smsService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'SmsService not injected')),

    'lados.communication.send_in_app': (ctx) =>
      notificationService
        ? sendInApp(ctx, notificationService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'NotificationService not injected')),

    'lados.communication.send_reminder': (ctx) => sendReminder(ctx, reminderServices),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
