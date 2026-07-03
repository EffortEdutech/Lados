/**
 * lados.communication.send_email — Phase 21 S4 (Wave 2)
 *
 * Canonical successor to the prototype `notification.send_email`. Sends an
 * email through the injected EmailService (SMTP/Nodemailer). Delivery only
 * — it never approves, decides, or certifies anything.
 *
 * `template` (config) is accepted and logged for audit purposes but is not
 * rendered by this node — no template-rendering engine is wired yet. Pass
 * already-rendered text/html via `body`/inputs.message.body.
 *
 * Config/Inputs (message input object takes priority over config):
 *   to, cc, bcc   — recipients (comma-separated string or array)
 *   subject       — required
 *   body          — plain-text body, required
 *   template      — optional label only, not rendered
 *
 * Outputs:
 *   delivery — { sent, messageId, recipients }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IEmailService } from '../types';

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

export async function sendEmail(
  ctx: NodeContext,
  emailService?: IEmailService,
): Promise<NodeExecuteResult> {
  if (!emailService) {
    return {
      status: 'failure',
      outputs: { delivery: { sent: false, messageId: null, recipients: [] } },
      error: { code: 'NO_SERVICE', message: 'EmailService not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const msg = (inp['message'] as Record<string, unknown> | undefined) ?? {};

  const to      = msg['to']      ?? cfg['to'];
  const cc      = msg['cc']      ?? cfg['cc'];
  const bcc     = msg['bcc']     ?? cfg['bcc'];
  const subject = (msg['subject'] ?? cfg['subject']) as string | undefined;
  const body    = (msg['body']    ?? cfg['body'])    as string | undefined;
  const template = cfg['template'] as string | undefined;

  const recipients = toArray(to);

  if (!recipients.length) {
    return {
      status: 'failure',
      outputs: { delivery: { sent: false, messageId: null, recipients: [] } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_email: to is required' },
    };
  }
  if (!subject) {
    return {
      status: 'failure',
      outputs: { delivery: { sent: false, messageId: null, recipients } },
      error: { code: 'MISSING_INPUT', message: 'lados.communication.send_email: subject is required' },
    };
  }
  if (!body) {
    return {
      status: 'failure',
      outputs: { delivery: { sent: false, messageId: null, recipients } },
      error: {
        code: 'MISSING_INPUT',
        message: 'lados.communication.send_email: body is required (template rendering is not implemented — pass pre-rendered text)',
      },
    };
  }

  ctx.logger.info(
    `lados.communication.send_email → ${recipients.join(', ')} | subject:"${subject}"${template ? ` | template:${template}` : ''}`,
  );

  const result = await emailService.sendEmail({
    to: recipients,
    subject,
    text: body,
    cc: toArray(cc),
    bcc: toArray(bcc),
  });

  if (!result.sent) {
    ctx.logger.warn(`lados.communication.send_email: delivery failed — ${result.error ?? 'unknown error'}`);
  }

  return {
    status: result.sent ? 'success' : 'failure',
    outputs: {
      delivery: { sent: result.sent, messageId: result.messageId ?? null, recipients },
    },
    ...(result.sent ? {} : { error: { code: 'EMAIL_FAILED', message: result.error ?? 'Email delivery failed' } }),
    summary: result.sent
      ? `Email sent to ${recipients.join(', ')}: "${subject}"`
      : `Email failed: ${result.error}`,
  };
}
