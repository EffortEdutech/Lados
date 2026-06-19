/**
 * NotificationService — Sprint 14 (S14-004)
 *
 * Stub implementation: writes notification rows to the `notifications`
 * table (created in migration 0016). Full email + webhook delivery
 * is planned for Sprint 19.
 *
 * Usage:
 *   await notificationService.notify({
 *     userId,
 *     orgId,
 *     type: 'approval_request',
 *     title: 'Approval Required',
 *     body: 'Review BOQ classification before RFQ generation.',
 *     metadata: { workflowId, executionId, approvalTaskId },
 *   });
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

export type NotificationType =
  | 'approval_request'
  | 'execution_complete'
  | 'execution_failed'
  | 'data_pack_update'
  | 'quota_warning'
  | 'system';

export interface NotifyPayload {
  userId: string;
  orgId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** Link to the relevant resource in the UI */
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Create a notification for a user.
   * Sprint 14: writes to `notifications` table only (in-app).
   * Sprint 19: will also send email / webhook based on user preferences.
   */
  async notify(payload: NotifyPayload): Promise<string | null> {
    const { userId, orgId, type, title, body, actionUrl, metadata } = payload;

    this.logger.log(`Notify [${type}] → user ${userId}: ${title}`);

    const { data, error } = await this.supabase.admin
      .from('notifications')
      .insert({
        user_id:    userId,
        org_id:     orgId ?? null,
        type,
        title,
        body:       body ?? null,
        action_url: actionUrl ?? null,
        metadata:   metadata ?? {},
        is_read:    false,
      })
      .select('id')
      .single();

    if (error) {
      this.logger.warn(`Failed to persist notification: ${error.message}`);
      return null;
    }

    return data?.id ?? null;
  }

  /** Fetch unread notifications for a user */
  async getUnread(userId: string, limit = 20) {
    const { data, error } = await this.supabase.admin
      .from('notifications')
      .select('id, type, title, body, action_url, metadata, created_at')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Fetch all notifications (read + unread) for a user */
  async getAll(userId: string, limit = 50) {
    const { data, error } = await this.supabase.admin
      .from('notifications')
      .select('id, type, title, body, action_url, metadata, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Mark a single notification as read */
  async markRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);   // ownership check

    if (error) throw new Error(error.message);
  }

  /** Mark all notifications as read for a user */
  async markAllRead(userId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
  }
}
