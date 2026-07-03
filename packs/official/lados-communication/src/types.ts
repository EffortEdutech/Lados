/**
 * @lados/official-communication — shared service interfaces & payload types
 *
 * Declared locally (not imported from any prototype pack) — satisfied by
 * apps/api's EmailService / SmsService / NotificationService via structural
 * (duck) typing. See ../README.md for the pack's ownership boundary.
 */

export type NotificationType =
  | 'approval_request'
  | 'execution_complete'
  | 'execution_failed'
  | 'data_pack_update'
  | 'quota_warning'
  | 'system';

// ── Email ─────────────────────────────────────────────────────────────────────

export interface EmailPayload {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  sent: boolean;
  messageId: string | null;
  error?: string;
}

/** Minimal interface — NestJS EmailService satisfies this via duck typing. */
export interface IEmailService {
  sendEmail(payload: EmailPayload): Promise<EmailResult>;
}

// ── SMS ───────────────────────────────────────────────────────────────────────

export interface SmsPayload {
  to: string;
  message: string;
  from?: string;
}

export interface SmsResult {
  sent: boolean;
  messageId: string | null;
  error?: string;
}

/** Minimal interface — NestJS SmsService satisfies this via duck typing. */
export interface ISmsService {
  sendSms(payload: SmsPayload): Promise<SmsResult>;
}

// ── In-app ────────────────────────────────────────────────────────────────────

export interface InAppNotifyPayload {
  userId: string;
  orgId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Minimal interface — NestJS NotificationService satisfies this via duck typing. */
export interface IInAppNotificationService {
  notify(payload: InAppNotifyPayload): Promise<string | null>;
}
