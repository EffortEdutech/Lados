/**
 * SmsService — Phase 10
 *
 * Phase 10 stub: logs the SMS payload and returns { sent: false }.
 * Wire a real provider in a future sprint:
 *   - Twilio: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 *   - MSG91:  set MSG91_API_KEY, MSG91_SENDER_ID
 *
 * Satisfies ISmsService from @lados/official-communication via duck typing.
 * (Phase 21 S9 prototype-pack removal: switched from the archived
 * notifications-pack's identical SmsPayload/SmsResult shape to the
 * official pack's own copy — this service never needed the prototype
 * pack itself, just its type shape.)
 */

import { Injectable, Logger } from '@nestjs/common';
import type { SmsPayload, SmsResult } from '@lados/official-communication';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async sendSms(payload: SmsPayload): Promise<SmsResult> {
    const { to, message, from } = payload;

    this.logger.warn(
      `SmsService (stub): [to=${to}] [from=${from ?? 'default'}] [msg length=${message.length}] ` +
      '— SMS delivery not configured. Set SMS provider env vars to enable.',
    );

    return {
      sent:      false,
      messageId: null,
      error:     'SMS provider not configured',
    };
  }
}
