/**
 * ProgramWatchdogService — Phase 23 S23.2 (§4.2), renamed from
 * PipelineWatchdogService in Phase 24 S24.1/S24.2.
 *
 * 5th poll-based watchdog in this program's now-established family
 * (RunWatchdogService, ApprovalWatchdogService, AnalyticsRollupService,
 * RetentionService) — single setInterval, no cron library, non-fatal
 * try/catch per tick and per item.
 *
 * Three responsibilities per tick:
 *  1. Advance running/paused program_runs whose current workflow-type
 *     stage(s) have reached a terminal execution_runs status.
 *  2. Tally votes on pending stage_gate tasks against vote_threshold;
 *     resolve + advance/fail the parent program_run once the outcome is
 *     mathematically certain (§3.5's resolution rule).
 *  3. Escalate stage_gate tasks past their escalate_after_minutes window
 *     by notifying non-voters — NOT a reassignment (a quorum vote can't be
 *     handed to one delegate), a genuinely different code path from
 *     ApprovalWatchdogService's single-assignee escalation (§3.5).
 *
 * Implementation note (not explicitly spec'd by the plan, a judgment call
 * flagged here rather than assumed silently): the plan's §4.1 says opening
 * a gate "sets program_runs.status = 'paused'". This watchdog scans BOTH
 * 'running' AND 'paused' program_runs for workflow-stage advancement —
 * not just 'running' — because a DAG can have a workflow branch still
 * actively running in parallel with another branch waiting at a gate; if
 * only 'running' rows were scanned, that parallel branch's completion
 * would never be picked up while the run is labelled 'paused'. Status is
 * recomputed after every advance: 'paused' only when every current stage
 * is a still-pending gate, 'running' when at least one stage can still
 * make progress on its own, 'completed' when no stages remain.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { NotificationService } from '../notification/notification.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { ProgramExecutionService } from './program-execution.service';
import { findNextStages, findStageNode, type ProgramLayout } from './program-layout.types';

const POLL_INTERVAL_MS = 60_000; // matches every other watchdog's cadence

interface ProgramRunRow {
  id: string;
  organization_id: string;
  program_id: string;
  program_snapshot: ProgramLayout;
  status: string;
  current_stage_ids: string[];
  started_by: string | null;
}

interface PendingGate {
  id: string;
  program_run_id: string;
  voter_user_ids: string[];
  vote_threshold: number;
  title: string;
  data: Record<string, unknown> | null;
  created_at: string;
  escalate_after_minutes: number | null;
  escalated_at: string | null;
}

@Injectable()
export class ProgramWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProgramWatchdogService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notificationService: NotificationService,
    private readonly eventBus: EventBusService,
    private readonly programExecution: ProgramExecutionService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`ProgramWatchdogService: starting (poll ${POLL_INTERVAL_MS}ms)`);
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    try {
      await this.advanceRunningPrograms();
    } catch (err: unknown) {
      this.logger.error(`ProgramWatchdogService: advance error — ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      await this.resolveGates();
    } catch (err: unknown) {
      this.logger.error(`ProgramWatchdogService: resolveGates error — ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      await this.escalateOverdueGates();
    } catch (err: unknown) {
      this.logger.error(`ProgramWatchdogService: escalate error — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 1. Advance workflow-stage completions ────────────────────────────────

  private async advanceRunningPrograms(): Promise<void> {
    const { data: runs, error } = await this.supabase.admin
      .from('program_runs')
      .select('id, organization_id, program_id, program_snapshot, status, current_stage_ids, started_by')
      .in('status', ['running', 'paused']);

    if (error) {
      this.logger.warn(`ProgramWatchdogService: program_runs query failed — ${error.message}`);
      return;
    }
    if (!runs?.length) return;

    for (const run of runs as ProgramRunRow[]) {
      await this.advanceOneRun(run).catch((err: unknown) => {
        this.logger.error(`ProgramWatchdogService: failed to advance run ${run.id} — ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  private async advanceOneRun(run: ProgramRunRow): Promise<void> {
    const layout = run.program_snapshot;
    const currentStageIds = run.current_stage_ids ?? [];
    if (currentStageIds.length === 0) return;

    const stillActive: string[] = [];
    const newlyCompleted: { stageId: string; executionRunId: string }[] = [];
    let anyFailed: { stageId: string; message: string } | null = null;

    for (const stageId of currentStageIds) {
      const node = findStageNode(layout, stageId);
      if (!node) continue; // orphaned stage id — skip, nothing to check

      if (node.type === 'gateNode') {
        stillActive.push(stageId); // gates are resolved separately, see resolveGates()
        continue;
      }

      const { data: execRun } = await this.supabase.admin
        .from('execution_runs')
        .select('id, status, error')
        .eq('program_run_id', run.id)
        .eq('program_stage_id', stageId)
        .maybeSingle();

      if (!execRun) {
        stillActive.push(stageId); // race — triggerRun() hasn't committed yet
        continue;
      }

      if (execRun['status'] === 'completed') {
        newlyCompleted.push({ stageId, executionRunId: execRun['id'] as string });
      } else if (['failed', 'timed_out', 'cancelled'].includes(execRun['status'] as string)) {
        anyFailed = { stageId, message: (execRun['error'] as { message?: string } | null)?.message ?? `Stage ${stageId} failed` };
        break; // default behavior: a failed stage halts the whole program (matches old PipelineRunner)
      } else {
        stillActive.push(stageId); // still running/queued/paused (an inner approval inside that workflow)
      }
    }

    if (anyFailed) {
      await this.failRun(run, `Program stage "${anyFailed.stageId}" failed: ${anyFailed.message}`);
      return;
    }

    if (newlyCompleted.length === 0) return; // nothing changed this tick

    const nextStageIds = new Set(stillActive);
    for (const { stageId, executionRunId } of newlyCompleted) {
      await this.programExecution.appendStageHistory(run.id, {
        stageNodeId: stageId,
        type: 'workflow',
        executionRunId,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      for (const next of findNextStages(layout, stageId)) {
        nextStageIds.add(next);
      }
    }

    await this.commitAdvance(run, layout, [...nextStageIds], stillActive);
  }

  /** Starts any genuinely-new stages, then persists current_stage_ids + recomputed status. */
  private async commitAdvance(
    run: ProgramRunRow,
    layout: ProgramLayout,
    nextStageIds: string[],
    alreadyActiveStageIds: string[],
  ): Promise<void> {
    if (nextStageIds.length === 0) {
      await this.supabase.admin
        .from('program_runs')
        .update({ status: 'completed', current_stage_ids: [], completed_at: new Date().toISOString() })
        .eq('id', run.id)
        .in('status', ['running', 'paused']);

      void this.eventBus.publish({
        orgId: run.organization_id,
        type: 'program.completed',
        sourceType: 'program',
        sourceId: run.program_id,
        actorId: run.started_by ?? 'system',
        payload: { programRunId: run.id },
      });
      return;
    }

    for (const stageId of nextStageIds) {
      if (alreadyActiveStageIds.includes(stageId)) continue; // already running/pending, no-op
      await this.programExecution.startStage(
        run as unknown as Record<string, unknown>,
        layout,
        stageId,
        run.started_by ?? 'system',
      );
    }

    const status = this.computeRunStatus(layout, nextStageIds);
    await this.supabase.admin
      .from('program_runs')
      .update({ current_stage_ids: nextStageIds, status })
      .eq('id', run.id)
      .in('status', ['running', 'paused']);
  }

  /** 'paused' only when every current stage is a gate (nothing can progress
   *  without a human); 'running' whenever at least one stage can still make
   *  progress on its own. */
  private computeRunStatus(layout: ProgramLayout, stageIds: string[]): string {
    if (stageIds.length === 0) return 'completed';
    const allGates = stageIds.every((id) => findStageNode(layout, id)?.type === 'gateNode');
    return allGates ? 'paused' : 'running';
  }

  private async failRun(run: ProgramRunRow, message: string): Promise<void> {
    const { data: updated } = await this.supabase.admin
      .from('program_runs')
      .update({
        status: 'failed',
        error: { code: 'STAGE_FAILED', message },
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)
      .in('status', ['running', 'paused'])
      .select('id');

    if (!updated?.length) return; // raced with a legitimate completion

    this.logger.error(`ProgramWatchdogService: program run ${run.id} FAILED — ${message}`);

    void this.eventBus.publish({
      orgId: run.organization_id,
      type: 'program.failed',
      sourceType: 'program',
      sourceId: run.program_id,
      actorId: run.started_by ?? 'system',
      payload: { programRunId: run.id, error: { code: 'STAGE_FAILED', message } },
    });
  }

  // ── 2. Resolve pending Stage Gates (§3.5 quorum rule) ────────────────────

  private async resolveGates(): Promise<void> {
    const { data: gates, error } = await this.supabase.admin
      .from('approval_tasks')
      .select('id, program_run_id, voter_user_ids, vote_threshold, title, data, created_at, escalate_after_minutes, escalated_at')
      .eq('task_type', 'stage_gate')
      .eq('status', 'pending');

    if (error) {
      this.logger.warn(`ProgramWatchdogService: gate query failed — ${error.message}`);
      return;
    }
    if (!gates?.length) return;

    for (const gate of gates as PendingGate[]) {
      await this.resolveOneGate(gate).catch((err: unknown) => {
        this.logger.error(`ProgramWatchdogService: failed to resolve gate ${gate.id} — ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  private async resolveOneGate(gate: PendingGate): Promise<void> {
    const { data: votes, error } = await this.supabase.admin
      .from('stage_gate_votes')
      .select('decision')
      .eq('approval_task_id', gate.id);

    if (error) {
      this.logger.warn(`ProgramWatchdogService: votes query failed for gate ${gate.id} — ${error.message}`);
      return;
    }

    const approvedCount = (votes ?? []).filter((v) => v['decision'] === 'approved').length;
    const rejectedCount = (votes ?? []).filter((v) => v['decision'] === 'rejected').length;
    const voterCount = gate.voter_user_ids?.length ?? 0;
    const threshold = gate.vote_threshold;

    let resolution: 'approved' | 'rejected' | null = null;
    if (approvedCount >= threshold) resolution = 'approved';
    else if (rejectedCount > voterCount - threshold) resolution = 'rejected';
    if (!resolution) return; // still genuinely undecided — leave pending

    const tallyNote = `Quorum ${resolution} — ${approvedCount} approved / ${rejectedCount} rejected of ${voterCount} voters (threshold ${threshold}).`;

    // Race-guard: another tick (or a fast-resolving concurrent vote) may have
    // already resolved this gate between our SELECT and this UPDATE.
    const { data: updated } = await this.supabase.admin
      .from('approval_tasks')
      .update({ status: resolution, decision_at: new Date().toISOString(), comments: tallyNote })
      .eq('id', gate.id)
      .eq('status', 'pending')
      .select('id');

    if (!updated?.length) return; // raced — someone else resolved it

    this.logger.log(`ProgramWatchdogService: gate ${gate.id} resolved ${resolution} — ${tallyNote}`);

    await this.advanceProgramAfterGate(gate, resolution);
  }

  private async advanceProgramAfterGate(gate: PendingGate, resolution: 'approved' | 'rejected'): Promise<void> {
    const { data: run } = await this.supabase.admin
      .from('program_runs')
      .select('id, organization_id, program_id, program_snapshot, status, current_stage_ids, started_by')
      .eq('id', gate.program_run_id)
      .maybeSingle();

    if (!run) return; // orphaned gate — nothing to advance

    const runRow = run as ProgramRunRow;
    const layout = runRow.program_snapshot;
    const stageId = (gate.data as { programStageId?: string } | null)?.programStageId;

    if (stageId) {
      await this.programExecution.appendStageHistory(runRow.id, {
        stageNodeId: stageId,
        type: 'gate',
        approvalTaskId: gate.id,
        status: resolution,
        completedAt: new Date().toISOString(),
      });
    }

    if (resolution === 'rejected') {
      await this.failRun(runRow, `Stage gate "${gate.title}" was rejected by quorum vote`);
      return;
    }

    const remaining = (runRow.current_stage_ids ?? []).filter((id) => id !== stageId);
    const nextStageIds = stageId ? findNextStages(layout, stageId) : [];
    const merged = new Set([...remaining, ...nextStageIds]);

    await this.commitAdvance(runRow, layout, [...merged], remaining);
  }

  // ── 3. Escalate overdue gates (notify non-voters — §3.5, distinct from ApprovalWatchdogService) ──

  private async escalateOverdueGates(): Promise<void> {
    const { data: candidates, error } = await this.supabase.admin
      .from('approval_tasks')
      .select('id, program_run_id, voter_user_ids, title, created_at, escalate_after_minutes')
      .eq('task_type', 'stage_gate')
      .eq('status', 'pending')
      .not('escalate_after_minutes', 'is', null)
      .is('escalated_at', null);

    if (error) {
      this.logger.warn(`ProgramWatchdogService: escalation query failed — ${error.message}`);
      return;
    }
    if (!candidates?.length) return;

    const now = Date.now();
    for (const gate of candidates) {
      const windowMs = (gate['escalate_after_minutes'] as number) * 60_000;
      if (now - new Date(gate['created_at'] as string).getTime() < windowMs) continue;
      await this.escalateOneGate(gate as PendingGate).catch((err: unknown) => {
        this.logger.error(`ProgramWatchdogService: failed to escalate gate ${gate['id']} — ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  private async escalateOneGate(gate: PendingGate): Promise<void> {
    const { data: votes } = await this.supabase.admin
      .from('stage_gate_votes')
      .select('voter_user_id')
      .eq('approval_task_id', gate.id);

    const votedIds = new Set((votes ?? []).map((v) => v['voter_user_id'] as string));
    const nonVoters = (gate.voter_user_ids ?? []).filter((id) => !votedIds.has(id));
    if (nonVoters.length === 0) return; // everyone already voted — resolveGates() will catch up next tick

    const { data: run } = await this.supabase.admin
      .from('program_runs')
      .select('organization_id')
      .eq('id', gate.program_run_id)
      .maybeSingle();
    const orgId = run?.['organization_id'] as string | undefined;

    // Race-guard: only proceed if we win the stamp.
    const { data: updated } = await this.supabase.admin
      .from('approval_tasks')
      .update({ escalated_at: new Date().toISOString() })
      .eq('id', gate.id)
      .eq('status', 'pending')
      .is('escalated_at', null)
      .select('id');

    if (!updated?.length) return; // raced with another tick

    const message = `Stage gate "${gate.title}" is still awaiting your vote — please cast it.`;
    this.logger.warn(`ProgramWatchdogService: gate ${gate.id} escalated — notifying ${nonVoters.length} non-voter(s)`);

    for (const userId of nonVoters) {
      this.notificationService
        .notify({
          userId,
          orgId: orgId ?? '',
          type: 'stage_gate_escalated',
          title: `Vote needed: ${gate.title}`,
          body: message,
          actionUrl: `/approvals?taskId=${gate.id}`,
          metadata: { approvalTaskId: gate.id, programRunId: gate.program_run_id },
        })
        .catch((err: unknown) => {
          this.logger.warn(`ProgramWatchdogService: notify failed for user ${userId} — ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    if (orgId) {
      void this.eventBus.publish({
        orgId,
        type: 'program.gate_escalated',
        sourceType: 'approval',
        sourceId: gate.id,
        actorId: 'system',
        payload: { taskId: gate.id, programRunId: gate.program_run_id, nonVoterUserIds: nonVoters },
      });
    }
  }
}
