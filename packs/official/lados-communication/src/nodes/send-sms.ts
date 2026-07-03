/**
 * lados.communication.send_sms — Phase 21 S4 (Wave 2) — STUB
 *
 * Canonical successor to the prototype `notification.send_sms`. Wired
 * correctly end-to-end to ISmsService, but NO SMS provider is configured
 * anywhere in this repo yet: apps/api's SmsService
 * (apps/api/src/notification/sms.service.ts) is itself a Phase 10 stub that
 * always returns { sent: false, error: 'SMS provider not configured' }.
 *
 * Per the S4 master-plan instruction ("SMS stub clearly marked"), this
 * node's nodes.json entry is marked `executorStatus: "stub"` — do not build
 * production templates that depend on this node actually delivering an SMS
 * until a real provider (Twilio/MSG91) is wired into SmsService.
 *
 * Config/Inputs:
 *   phoneNumbers — one or more E.164 numbers (required)
 *   message      — SMS text (required)
 *   template     — optional label only, not rendered
 *
 * Outputs:
 *   delivery — { sent, messageId, recipients }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ISmsService } from '../types';

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [String(value)];
}

export async function sendSms(
  ctx: NodeContext,
  smsService?: ISmsService,
): Promise<NodeExecuteResult> {
  if (!smsService) {
    return {
      status: 'failure',
      outputs: { delivery: { sent: false, messageId: null, recipients: [] } },
      error: { code: 'NO_SERVICE', message: 'SmsService not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const msg = (inp['message'] as Record<string, unknown> | undefined) ?? {};

  const phoneNumbers = msg['phoneNumbers'] ?? cfg['phoneNumbers'];
  const text = (msg['text'] ?? cfg['message']) as string | undefined;

  const recipients = toArray(phoneNumbers);

  if (!recipients.length) {
    return {
      status: 'failure',
      outputs: { delivery: { sent: false, messageId: null, recipients: [] } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_sms: phoneNumbers is required' },
    };
  }
  if (!text) {
    return {
      status: 'failure',
      outputs: { delivery: { sent: false, messageId: null, recipients } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_sms: message is required' },
    };
  }

  ctx.logger.info(`lados.communication.send_sms → ${recipients.join(', ')} | message length:${text.length}`);

  const results = await Promise.all(recipients.map((to) => smsService.sendSms({ to, message: text })));
  const allSent = results.every((r) => r.sent);
  const firstError = results.find((r) => !r.sent)?.error;

  if (!allSent) {
    ctx.logger.warn(
      `lados.communication.send_sms: no SMS provider configured — ${firstError ?? 'delivery unavailable'}`,
    );
  }

  return {
    status: allSent ? 'success' : 'failure',
    outputs: { delivery: { sent: allSent, messageId: null, recipients } },
    ...(allSent ? {} : {
      error: { code: 'SMS_NOT_CONFIGURED', message: firstError ?? 'SMS provider not configured' },
    }),
    summary: allSent
      ? `SMS sent to ${recipients.join(', ')}`
      : `SMS not sent (no provider configured): ${recipients.join(', ')}`,
  };
}
