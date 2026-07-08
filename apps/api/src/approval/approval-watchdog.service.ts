/**
 * ApprovalWatchdogService — Phase 22 S22.2 (§4.3)
 *
 * Escalation for approval/input tasks: mirrors RunWatchdogService's
 * poll-based architecture (same 60s-interval style already proven in
 * production for stuck runs — see execution/run-watchdog.service.ts).
 *
 * Unlike RunWatchdogService's single global timeout, each task carries its
 * own `escalate_after_minutes` (set via the request_approval/request_input
 * node's config), so the cutoff can't be pushed into a single `.lt()`
 * filter — candidates are fetched (pending, escalation configured, not yet
 * escalated) and the per-row window is checked in application code.
 *
 * On escalation: if the task has `escalated_to_user_id` configured,
 * reassign to them (recorded the same way as an explicit delegation);
 * otherwise notify every org owner/admin so the task doesn't sit invisible
 * in a single person's inbox forever. Either way `escalated_at` is stamped
 * so the same task is never escalated twice.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { NotificationService } from '../notification/notification.service';
import { EventBusService } from '../event-bus/event-bus.service';

const POLL_INTERVAL_MS = 60_000; // matches RunWatchdogService/SchedulerService cadence

interface EscalationCandidate {
  id: string;
  execution_id: string;
  project_id: string | null;
  title: string;
  assignee_role: string | null;
  assignee_user_id: string | null;
  escalate_after_minutes: number;
  escalated_to_user_id: string | null;
  created_at: string;
}

@Injectable()
export class ApprovalWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApprovalWatchdogService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notificationService: NotificationService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`ApprovalWatchdogService: starting (poll ${POLL_INTERVAL_MS}ms)`);
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ── Internal tick ─────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    try {
      const { data: candidates, error } = await this.supabase.admin
        .from('approval_tasks')
        .select('id, execution_id, project_id, title, assignee_role, assignee_user_id, escalate_after_minutes, escalated_to_user_id, created_at')
        .eq('status', 'pending')
        .not('escalate_after_minutes', 'is', null)
        .is('escalated_at', null);

      if (error) {
        this.logger.warn(`ApprovalWatchdogService: query failed — ${error.message}`);
        return;
      }
      if (!candidates?.length) return;

      const now = Date.now();
      const due = (candidates as EscalationCandidate[]).filter((task) => {
        const windowMs = task.escalate_after_minutes * 60_000;
        return now - new Date(task.created_at).getTime() >= windowMs;
      });

      for (const task of due) {
        await this.escalateTask(task);
      }
    } catch (err: unknown) {
      this.logger.error(`ApprovalWatchdogService: tick error — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Escalate a single overdue task ───────────────────────────────────────

  private async escalateTask(task: EscalationCandidate): Promise<void> {
    const { data: run } = await this.supabase.admin
      .from('execution_runs')
      .select('organization_id')
      .eq('id', task.execution_id)
      .maybeSingle();

    const orgId = run?.['organization_id'] as string | undefined;
    if (!orgId) return; // orphaned task — nothing sensible to notify

    const ageMinutes = Math.round((Date.now() - new Date(task.created_at).getTime()) / 60_000);

    // Re-assert status/escalated_at in the WHERE clause — guards against a
    // race where the task was decided/escalated between our SELECT and
    // this UPDATE (same pattern as RunWatchdogService.timeoutRun()).
    const updatePayload: Record<string, unknown> = { escalated_at: new Date().toISOString() };
    let notifyUserIds: string[] = [];

    if (task.escalated_to_user_id) {
      updatePayload['assignee_user_id']       = task.escalated_to_user_id;
      updatePayload['delegated_from_user_id'] = task.assignee_user_id;
      updatePayload['delegated_to_user_id']   = task.escalated_to_user_id;
      updatePayload['delegated_at']           = new Date().toISOString();
      notifyUserIds = [task.escalated_to_user_id];
    } else {
      const { data: admins } = await this.supabase.admin
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .in('role', ['owner', 'admin']);
      notifyUserIds = (admins ?? []).map((m) => m['user_id'] as string);
    }

    const { data: updated, error: updateErr } = await this.supabase.admin
      .from('approval_tasks')
      .update(updatePayload)
      .eq('id', task.id)
      .eq('status', 'pending')
      .is('escalated_at', null)
      .select('id');

    if (updateErr) {
      this.logger.error(`ApprovalWatchdogService: failed to escalate task ${task.id} — ${updateErr.message}`);
      return;
    }
    if (!updated?.length) return; // raced with a decision/other escalation — nothing to do

    const message = task.escalated_to_user_id
      ? `Task "${task.title}" was reassigned after ${ageMinutes}m with no response (escalation window: ${task.escalate_after_minutes}m).`
      : `Task "${task.title}" has been pending for ${ageMinutes}m (escalation window: ${task.escalate_after_minutes}m) — notifying org admins.`;

    this.logger.warn(`ApprovalWatchdogService: task ${task.id} ESCALATED — ${message}`);

    for (const userId of notifyUserIds) {
      this.notificationService
        .notify({
          userId,
          orgId,
          type: 'approval_escalated',
          title: `Escalated: ${task.title}`,
          body: message,
          actionUrl: `/approvals?runId=${task.execution_id}&taskId=${task.id}`,
          metadata: { approvalTaskId: task.id, executionId: task.execution_id },
        })
        .catch((err: unknown) => {
          this.logger.warn(`ApprovalWatchdogService: notify failed for user ${userId} — ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    await this.supabase.admin.from('audit_log').insert({
      organization_id: orgId,
      project_id:      task.project_id,
      actor_id:         null, // system-initiated, not a human action
      event_type:      'approval.escalated',
      entity_type:     'approval_task',
      entity_id:       task.id,
      summary:         message,
      metadata:        { escalatedToUserId: task.escalated_to_user_id, ageMinutes },
    });

    void this.eventBus.publish({
      orgId,
      type: 'approval.escalated',
      sourceType: 'approval',
      sourceId: task.id,
      actorId: 'system',
      payload: { taskId: task.id, executionId: task.execution_id, escalatedToUserId: task.escalated_to_user_id },
    });
  }
}
