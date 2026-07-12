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

    // Phase 23 S23.4 fix: this used to `return []` immediately here when an
    // org had zero execution_runs — but a stage_gate task (renamed from
    // pipeline_gate, Phase 24 S24.2) never has an execution_id at all
    // (program_run_id set instead, per the XOR constraint), so an org that
    // only runs programs and no standalone workflows would have
    // runIds.length === 0 while still having real gate tasks pending. Skip
    // only the execution-scoped query, don't short-circuit the whole method.
    let visibleTasks: Record<string, unknown>[] = [];
    if (runIds.length > 0) {
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

      visibleTasks = (tasks ?? []).filter((task) => {
        const assigneeUserId = task['assignee_user_id'] as string | null;
        if (assigneeUserId) return assigneeUserId === userId;

        const orgId = orgByRun.get(task['execution_id'] as string);
        const userRole = orgId ? roleByOrg.get(orgId) : undefined;
        if (!userRole) return false;

        return userRole === task['assignee_role'] || userRole === 'owner' || userRole === 'admin';
      });
    }

    // Phase 23 S23.4 (§6) — stage_gate tasks (renamed from pipeline_gate,
    // Phase 24 S24.2) are structurally excluded from the query above: they
    // have execution_id NULL (program_run_id set instead, per the XOR
    // constraint added in migration 0075/0076, renamed by 0079), so the
    // `.in('execution_id', runIds)` filter can never match them. Found
    // while wiring the /approvals third task_type branch — without this,
    // GateVoteCard would have nothing to render no matter how it's built.
    // Fetched separately and merged in below.
    const gateTasks = await this.listPendingGateTasksForVoter(userId, orgIds);

    return [...visibleTasks, ...gateTasks];
  }

  /**
   * Pending Stage Gate tasks where the caller is on the voter roster.
   * Attaches program/stage display context and the live vote tally so
   * GateVoteCard doesn't need a second round trip. Stays visible (even
   * after the caller has voted) until ProgramWatchdogService resolves the
   * gate — resolution intentionally never happens here, matching castVote()
   * and the watchdog's own division of responsibility (§4.3). Renamed from
   * this method's own pipeline-prefixed field/table vocabulary in Phase 24
   * S24.2 — the method name itself is unchanged.
   */
  private async listPendingGateTasksForVoter(userId: string, orgIds: string[]) {
    if (orgIds.length === 0) return [];

    const { data: tasks, error } = await this.supabase.admin
      .from('approval_tasks')
      .select(`
        id, title, description, status, task_type,
        voter_user_ids, vote_threshold, escalate_after_minutes, escalated_at,
        created_at, node_id, node_name, program_run_id
      `)
      .eq('task_type', 'stage_gate')
      .eq('status', 'pending')
      // voter_user_ids is JSONB (migration 0075). Supabase's `.contains()`
      // array overload serialises for Postgres arrays, which PostgREST then
      // rejects for JSONB with "invalid input syntax for type json".
      .filter('voter_user_ids', 'cs', JSON.stringify([userId]));

    if (error) throw new Error(error.message);
    if (!tasks || tasks.length === 0) return [];

    const runIds = [...new Set(tasks.map((t) => t['program_run_id'] as string))];
    const { data: runs } = await this.supabase.admin
      .from('program_runs')
      .select('id, organization_id, program_id')
      .in('id', runIds);

    const runById = new Map((runs ?? []).map((r) => [r.id as string, r]));
    const programIds = [...new Set((runs ?? []).map((r) => r['program_id'] as string))];
    const { data: programs } = programIds.length
      ? await this.supabase.admin.from('programs').select('id, name').in('id', programIds)
      : { data: [] as { id: string; name: string }[] };
    const programNameById = new Map((programs ?? []).map((p) => [p.id as string, p.name as string]));

    // Only tasks whose parent run actually belongs to an org the caller is
    // a member of — contains() alone can't express that join.
    const inOrgTasks = tasks.filter((t) => {
      const run = runById.get(t['program_run_id'] as string);
      return run && orgIds.includes(run['organization_id'] as string);
    });
    if (inOrgTasks.length === 0) return [];

    const taskIds = inOrgTasks.map((t) => t.id as string);
    const { data: votes } = await this.supabase.admin
      .from('stage_gate_votes')
      .select('approval_task_id, voter_user_id, decision')
      .in('approval_task_id', taskIds);

    const votesByTask = new Map<string, { voter_user_id: string; decision: string }[]>();
    for (const v of votes ?? []) {
      const key = v['approval_task_id'] as string;
      const list = votesByTask.get(key) ?? [];
      list.push({ voter_user_id: v['voter_user_id'] as string, decision: v['decision'] as string });
      votesByTask.set(key, list);
    }

    return inOrgTasks.map((task) => {
      const run = runById.get(task['program_run_id'] as string);
      const taskVotes = votesByTask.get(task.id as string) ?? [];
      const voterUserIds = (task['voter_user_ids'] as string[] | null) ?? [];
      return {
        ...task,
        program_id: run?.['program_id'] ?? null,
        program_name: run ? (programNameById.get(run['program_id'] as string) ?? null) : null,
        votes: taskVotes,
        hasVoted: taskVotes.some((v) => v.voter_user_id === userId),
        approvedCount: taskVotes.filter((v) => v.decision === 'approved').length,
        rejectedCount: taskVotes.filter((v) => v.decision === 'rejected').length,
        voterCount: voterUserIds.length,
      };
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

  /**
   * Phase 23 S23.2 (§4.3) — cast one committee member's vote on a
   * stage_gate task (renamed from pipeline_gate, Phase 24 S24.2). Distinct
   * from decide(): a gate isn't decided by one call, it accumulates votes.
   * Resolution/tally-checking is deliberately NOT done here — that stays in
   * ProgramWatchdogService (§4.2, renamed from PipelineWatchdogService) so
   * it's evaluated consistently regardless of which vote arrives last, not
   * duplicated into this endpoint too. Returns the live tally so the
   * frontend can show "X of N voted, Y needed to pass" immediately.
   */
  async castVote(
    taskId: string,
    decision: 'approved' | 'rejected',
    comments: string | undefined,
    userId: string,
  ) {
    const { data: task, error } = await this.supabase.admin
      .from('approval_tasks')
      .select('id, task_type, status, voter_user_ids, vote_threshold, program_run_id')
      .eq('id', taskId)
      .maybeSingle();

    if (error ?? !task) throw new NotFoundException(`Approval task ${taskId} not found`);

    if (task['task_type'] !== 'stage_gate') {
      throw new BadRequestException(`Approval task ${taskId} is not a Stage Gate (task_type: ${task['task_type']})`);
    }
    if (task['status'] !== 'pending') {
      throw new BadRequestException(`Stage Gate is already ${task['status']}`);
    }

    const { data: run } = await this.supabase.admin
      .from('program_runs')
      .select('organization_id')
      .eq('id', task['program_run_id'] as string)
      .maybeSingle();

    const orgId = run?.['organization_id'] as string | undefined;
    if (orgId) await this.assertMembership(orgId, userId);

    // Product Safety Rule (§8): only named humans on the roster may vote —
    // enforced server-side here, not just hidden client-side.
    const voterUserIds = (task['voter_user_ids'] as string[] | null) ?? [];
    if (!voterUserIds.includes(userId)) {
      throw new ForbiddenException("You are not on this Stage Gate's voter roster");
    }

    const { error: insertErr } = await this.supabase.admin
      .from('stage_gate_votes')
      .insert({
        approval_task_id: taskId,
        voter_user_id: userId,
        decision,
        comments: comments || null,
      });

    if (insertErr) {
      // stage_gate_votes_one_per_voter — a retried/duplicate vote request
      // must not double-count (§8's "one person, one vote" rule).
      if (insertErr.code === '23505') {
        throw new BadRequestException('You have already voted on this Stage Gate');
      }
      throw new Error(insertErr.message);
    }

    const { data: votes } = await this.supabase.admin
      .from('stage_gate_votes')
      .select('decision')
      .eq('approval_task_id', taskId);

    const approvedCount = (votes ?? []).filter((v) => v['decision'] === 'approved').length;
    const rejectedCount = (votes ?? []).filter((v) => v['decision'] === 'rejected').length;

    if (orgId) {
      void this.eventBus.publish({
        orgId,
        type: 'program.gate_vote_cast',
        sourceType: 'approval',
        sourceId: taskId,
        actorId: userId,
        payload: { taskId, decision, approvedCount, rejectedCount, voterCount: voterUserIds.length },
      });
    }

    return {
      taskId,
      decision,
      votedCount: approvedCount + rejectedCount,
      voterCount: voterUserIds.length,
      approvedCount,
      rejectedCount,
      voteThreshold: task['vote_threshold'] as number,
    };
  }

  /** Phase 6: delegates to SecurityEngineService */
  private async assertMembership(organizationId: string, userId: string): Promise<void> {
    await this.security.requireMembership(userId, organizationId);
  }
}
