/**
 * ApprovalService — Phase 1 / Phase 5
 *
 * Manages human approval tasks: list pending, decide (approve/reject),
 * and delegate resume to ExecutionService.
 *
 * Phase 5 addition: when a task has data.pendingStateTransition (set by
 * the state.change workflow node's requires_approval guard), ApprovalService
 * calls StateEngineService.applyTransition() to complete the blocked resource
 * state change after the human approves.
 */
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ExecutionService } from '../execution/execution.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { StateEngineService } from '../state-engine/state-engine.service';
import { SecurityEngineService } from '../security/security.service';
import { NotificationService } from '../notification/notification.service';
import { ApprovalTaskCreator } from './approval-task.creator';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly executionService: ExecutionService,
    private readonly eventBus: EventBusService,
    private readonly stateEngine: StateEngineService,
    private readonly security: SecurityEngineService,
    private readonly notificationService: NotificationService,
    private readonly taskCreator: ApprovalTaskCreator,
  ) {}

  /**
   * Phase 7 — IApprovalTaskService implementation.
   * Delegates to ApprovalTaskCreator (no circular dep with ExecutionService).
   * Called by foundation.request_approval workflow node.
   */
  async createTask(params: {
    executionId:  string;
    workflowId:   string;
    projectId:    string;
    nodeId:       string;
    nodeName?:    string;
    orgId:        string;
    title:        string;
    description?: string;
    assigneeRole?: string;
    data?:        Record<string, unknown>;
    assigneeUserId?: string;
    taskType?: 'approval' | 'input';
    escalateAfterMinutes?: number;
    escalatedToUserId?: string;
  }): Promise<{ taskId: string }> {
    return this.taskCreator.createTask(params);
  }

  /**
   * List all pending approval tasks visible to this user across their
   * organisations.
   *
   * Phase 22 S22.2 (§4.1) — a task is visible if EITHER:
   *   - `assignee_user_id = userId` (named-user assignment), OR
   *   - `assignee_user_id IS NULL` AND the user's role in that task's org
   *     matches `assignee_role`, OR the user is org owner/admin (the §8
   *     safety-rule override — an admin should never be blind to pending
   *     items in their own org just because they don't hold the exact
   *     assignee_role).
   * Before this, ANY org member saw EVERY pending task regardless of role —
   * matching concern #3's "one flat global inbox" limitation this sprint
   * exists to fix.
   */
  async listPending(userId: string) {
    // Get all orgs the user belongs to, with their role in each — needed
    // for the role-based visibility check above. Previously this query's
    // `error` was never checked — a transient/misconfigured failure here
    // silently fell through to `orgIds = []` and returned an empty inbox
    // with no error surfaced anywhere (found 2026-07-05 while eff was
    // chasing a live "task was created but /approvals shows none" report).
    // Now throws like every other query in this file.
    const { data: memberships, error: membershipError } = await this.supabase.admin
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId);

    if (membershipError) throw new Error(membershipError.message);

    const roleByOrg = new Map<string, string>(
      (memberships ?? []).map((m) => [m.organization_id as string, m.role as string]),
    );
    const orgIds = [...roleByOrg.keys()];
    if (orgIds.length === 0) return [];

    // Rewritten to avoid PostgREST's embedded-resource dot-notation filter
    // (`.in('execution_runs.organization_id', orgIds)` combined with
    // `execution_runs!inner(...)`) — that pattern is harder to verify
    // end-to-end without a live request trace, and a plain two-step query
    // (resolve run ids for these orgs, then filter tasks by those run ids)
    // is unambiguous and easy to reason about/test. Functionally identical
    // result set. Now also carries organization_id per run so the
    // role-based visibility check above can be applied per task.
    const { data: runs, error: runsError } = await this.supabase.admin
      .from('execution_runs')
      .select('id, organization_id')
      .in('organization_id', orgIds);

    if (runsError) throw new Error(runsError.message);

    const orgByRun = new Map<string, string>(
      (runs ?? []).map((r) => [r.id as string, r.organization_id as string]),
    );
    const runIds = [...orgByRun.keys()];
    if (runIds.length === 0) return [];

    const { data: tasks, error } = await this.supabase.admin
      .from('approval_tasks')
      .select(`
        id, title, description, data, status, assignee_role, assignee_user_id,
        task_type, submitted_data, escalate_after_minutes, escalated_at,
        delegated_from_user_id, delegated_to_user_id, delegated_at,
        created_at, node_id, node_name,
        execution_id, workflow_id, project_id
      `)
      .eq('status', 'pending')
      .in('execution_id', runIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (tasks ?? []).filter((task) => {
      const assigneeUserId = task['assignee_user_id'] as string | null;
      if (assigneeUserId) return assigneeUserId === userId;

      const orgId = orgByRun.get(task['execution_id'] as string);
      const userRole = orgId ? roleByOrg.get(orgId) : undefined;
      if (!userRole) return false;

      return userRole === task['assignee_role'] || userRole === 'owner' || userRole === 'admin';
    });
  }

  /** List all approval tasks for a specific run */
  async listForRun(runId: string, userId: string) {
    const { data: run } = await this.supabase.admin
      .from('execution_runs')
      .select('organization_id')
      .eq('id', runId)
      .single();

    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    await this.assertMembership(run.organization_id as string, userId);

    const { data: tasks, error } = await this.supabase.admin
      .from('approval_tasks')
      .select('*')
      .eq('execution_id', runId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return tasks ?? [];
  }

  /** Get a single approval task */
  async getTask(taskId: string, userId: string) {
    const { data: task, error } = await this.supabase.admin
      .from('approval_tasks')
      .select(`
        *,
        execution_runs!inner ( organization_id, status, paused_at_node_id )
      `)
      .eq('id', taskId)
      .single();

    if (error || !task) throw new NotFoundException(`Approval task ${taskId} not found`);
    const orgId = (task as { execution_runs: { organization_id: string } }).execution_runs.organization_id;
    await this.assertMembership(orgId, userId);
    return task;
  }

  /** Approve or reject an approval task, then resume the paused run */
  async decide(
    taskId: string,
    decision: 'approved' | 'rejected',
    comments: string,
    userId: string,
  ) {
    const task = await this.getTask(taskId, userId);

    if (task['status'] !== 'pending') {
      throw new BadRequestException(`Approval task is already ${task['status']}`);
    }

    const orgId = task['execution_runs']?.['organization_id'] as string | undefined;
    await this.assertCanActOnTask(task, orgId, userId);

    // Phase 5: complete a blocked resource state transition if this task was
    // created by the state.change workflow node's requires_approval guard.
    const pending = (task['data'] as Record<string, unknown> | null)?.['pendingStateTransition'] as {
      resourceId:   string;
      resourceType: string;
      fromState:    string;
      toState:      string;
      orgId:        string;
    } | undefined;

    if (pending && decision === 'approved') {
      await this.stateEngine.applyTransition({
        resourceId: pending.resourceId,
        orgId:      pending.orgId ?? orgId ?? '',
        fromState:  pending.fromState,
        toState:    pending.toState,
        actorId:    userId,
      });
    }

    // Resume the workflow execution
    const result = await this.executionService.resumeRun(
      task['execution_id'] as string,
      taskId,
      decision === 'approved',
      comments,
      userId,
    );

    if (orgId) {
      void this.eventBus.publish({
        orgId,
        type: decision === 'approved' ? 'approval.approved' : 'approval.rejected',
        sourceType: 'approval',
        sourceId: taskId,
        actorId: userId,
        payload: {
          taskId,
          executionId: task['execution_id'],
          decision,
          comments,
          ...(pending && { pendingStateTransition: pending }),
        },
      });
    }

    return result;
  }

  /**
   * Phase 22 S22.2 (§4.2) — reassign a task to another named user. Callable
   * by the task's current assignee OR an org owner/admin. Delegation is
   * logged to `audit_log` (existing append-only service — no new audit
   * mechanism needed).
   */
  async delegate(taskId: string, toUserId: string, userId: string) {
    const task = await this.getTask(taskId, userId);

    if (task['status'] !== 'pending') {
      throw new BadRequestException(`Approval task is already ${task['status']}`);
    }

    const orgId = task['execution_runs']?.['organization_id'] as string | undefined;
    if (!orgId) throw new NotFoundException('Approval task has no associated organisation');

    await this.assertCanActOnTask(task, orgId, userId);

    // The delegate target must already be a member of the org — delegation
    // narrows/redirects assignment, it doesn't grant org access.
    const { data: targetMembership } = await this.supabase.admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('user_id', toUserId)
      .maybeSingle();

    if (!targetMembership) {
      throw new BadRequestException('Delegate target must be a member of this organisation');
    }

    const currentAssignee = task['assignee_user_id'] as string | null;

    const { data: updated, error } = await this.supabase.admin
      .from('approval_tasks')
      .update({
        assignee_user_id:       toUserId,
        delegated_from_user_id: currentAssignee ?? userId,
        delegated_to_user_id:   toUserId,
        delegated_at:           new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error ?? !updated) throw new Error(error?.message ?? 'Failed to delegate approval task');

    await this.supabase.admin.from('audit_log').insert({
      organization_id: orgId,
      project_id:      task['project_id'] ?? null,
      actor_id:        userId,
      event_type:      'approval.delegated',
      entity_type:     'approval_task',
      entity_id:       taskId,
      summary:         `Approval task "${task['title']}" delegated to another user`,
      metadata:        { fromUserId: currentAssignee, toUserId, delegatedBy: userId },
    });

    void this.eventBus.publish({
      orgId,
      type: 'approval.delegated',
      sourceType: 'approval',
      sourceId: taskId,
      actorId: userId,
      payload: { taskId, fromUserId: currentAssignee, toUserId },
    });

    // Bugfix 2026-07-06: delegate() logged to audit_log and published an
    // event, but never actually told the new assignee — found while
    // smoke-testing when eff delegated a task, logged in as the delegate,
    // and the notification bell showed nothing despite the task correctly
    // appearing in their /approvals inbox. Mirrors the notify-the-new-owner
    // shape ApprovalWatchdogService already uses on escalation.
    this.notificationService
      .notify({
        userId: toUserId,
        orgId,
        type: 'approval_delegated',
        title: `Delegated to you: ${task['title']}`,
        body: `A task was reassigned to you and is waiting for your action.`,
        actionUrl: `/approvals?runId=${task['execution_id']}&taskId=${taskId}`,
        metadata: { approvalTaskId: taskId, executionId: task['execution_id'], fromUserId: currentAssignee },
      })
      .catch((err: unknown) => {
        // Non-fatal — the delegation itself already succeeded and is
        // durably recorded; a failed notification shouldn't roll it back.
        this.logger.warn(`Failed to notify delegate ${toUserId}: ${err instanceof Error ? err.message : String(err)}`);
      });

    return updated;
  }

  /**
   * Phase 22 S22.2 (§4.4) — submit structured data for a `task_type: 'input'`
   * task created by lados.human.request_input, then resume the paused run.
   * Distinct from decide() — there is no approve/reject concept here, only
   * submitted data becoming the paused node's output.
   */
  async submitInput(taskId: string, data: Record<string, unknown>, userId: string) {
    const task = await this.getTask(taskId, userId);

    if (task['task_type'] !== 'input') {
      throw new BadRequestException(`Approval task ${taskId} is not an input task (task_type: ${task['task_type']})`);
    }
    if (task['status'] !== 'pending') {
      throw new BadRequestException(`Approval task is already ${task['status']}`);
    }

    const orgId = task['execution_runs']?.['organization_id'] as string | undefined;
    await this.assertCanActOnTask(task, orgId, userId);

    // Validate required keys against the node's inputSchema (stored in the
    // generic `data` snapshot column — see request-input.ts / migration 0072).
    const inputSchema = (task['data'] as Record<string, unknown> | null)?.['inputSchema'] as
      Array<{ key: string; label: string; required?: boolean }> | undefined;

    if (inputSchema) {
      const missing = inputSchema
        .filter((field) => field.required)
        .filter((field) => data[field.key] === undefined || data[field.key] === null || data[field.key] === '')
        .map((field) => field.label ?? field.key);

      if (missing.length > 0) {
        throw new BadRequestException(`Missing required field(s): ${missing.join(', ')}`);
      }
    }

    const result = await this.executionService.resumeRunWithInput(
      task['execution_id'] as string,
      taskId,
      data,
      userId,
    );

    if (orgId) {
      void this.eventBus.publish({
        orgId,
        type: 'approval.input_submitted',
        sourceType: 'approval',
        sourceId: taskId,
        actorId: userId,
        payload: { taskId, executionId: task['execution_id'], data },
      });
    }

    return result;
  }

  /**
   * Phase 22 S22.2 (§4.1/§4.2) — shared permission check for decide()/
   * delegate()/submitInput(): only the named assignee (if one is set) OR an
   * org owner/admin may act. Nobody is ever permanently blocked by an
   * absent assignee (§8). When no assignee_user_id is set, any org member
   * whose role matches assignee_role may act (today's existing behavior).
   */
  private async assertCanActOnTask(
    task: Record<string, unknown>,
    orgId: string | undefined,
    userId: string,
  ): Promise<void> {
    if (!orgId) return;

    const assigneeUserId = task['assignee_user_id'] as string | null;
    const role = await this.security.getRole(userId, orgId);

    if (role === 'owner' || role === 'admin') return; // always-on override

    if (assigneeUserId) {
      if (assigneeUserId !== userId) {
        throw new ForbiddenException('This task is assigned to another user');
      }
      return;
    }

    // Role-only assignment (no named user) — existing behavior, unchanged.
  }

  /** Phase 6: delegates to SecurityEngineService */
  private async assertMembership(organizationId: string, userId: string): Promise<void> {
    await this.security.requireMembership(userId, organizationId);
  }
}
