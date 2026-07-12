/**
 * ProgramExecutionService — Phase 23 S23.2 (§4.1), renamed from
 * PipelineExecutionService in Phase 24 S24.1/S24.2.
 *
 * Server-side durable program execution — the core architectural fix over
 * the old client-side-only `PipelineRunner.ts` (Sprint 12), which held a
 * browser tab open for the entire run and left zero server record if the
 * tab closed. Every stage transition here is a DB write; nothing is held
 * open in-process waiting for a stage to finish. Stage advancement is
 * detected asynchronously by ProgramWatchdogService, not by an in-process
 * await — see its file for the tick logic.
 *
 * Mirrors ExecutionService's shape (triggerRun ~= triggerProgram) but is
 * deliberately a separate service/module — a program run's lifecycle is
 * fundamentally different (spans multiple workflow runs and/or stage
 * gates, can be paused for days), not a thin wrapper.
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ExecutionService } from '../execution/execution.service';
import { ApprovalTaskCreator } from '../approval/approval-task.creator';
import { SecurityEngineService } from '../security/security.service';
import { EventBusService } from '../event-bus/event-bus.service';
import {
  findEntryStages,
  findStageNode,
  type ProgramLayout,
  type WorkflowStageData,
  type GateStageData,
} from './program-layout.types';

export interface StageHistoryEntry {
  stageNodeId: string;
  type: 'workflow' | 'gate';
  executionRunId?: string;
  approvalTaskId?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
}

@Injectable()
export class ProgramExecutionService {
  private readonly logger = new Logger(ProgramExecutionService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly executionService: ExecutionService,
    private readonly approvalTaskCreator: ApprovalTaskCreator,
    private readonly security: SecurityEngineService,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Trigger ────────────────────────────────────────────────────────────────

  async triggerProgram(programId: string, userId: string) {
    const { data: program, error } = await this.supabase.admin
      .from('programs')
      .select('*')
      .eq('id', programId)
      .maybeSingle();

    if (error ?? !program) throw new NotFoundException(`Program ${programId} not found`);

    await this.security.requireMembership(userId, program['organization_id'] as string);

    if (program['status'] !== 'published') {
      throw new BadRequestException('Program must be published before it can be run');
    }

    const layout = program['layout'] as ProgramLayout;
    if (!layout?.nodes?.length) {
      throw new BadRequestException('Program has no stages');
    }

    const entryStageIds = findEntryStages(layout);
    if (entryStageIds.length === 0) {
      throw new BadRequestException(
        'Program has no entry point — wire at least one stage with no incoming connection.',
      );
    }

    this.validateGateConfigs(layout);

    const { data: run, error: runErr } = await this.supabase.admin
      .from('program_runs')
      .insert({
        program_id:       programId,
        organization_id:  program['organization_id'],
        department_id:    program['department_id'],
        program_snapshot: layout, // immutable at trigger time — §8 safety rule
        status:            'running',
        current_stage_ids: entryStageIds,
        stage_history:     [],
        started_by:        userId,
        started_at:        new Date().toISOString(),
      })
      .select()
      .single();

    if (runErr ?? !run) throw new Error(runErr?.message ?? 'Failed to create program run');

    void this.eventBus.publish({
      orgId:      program['organization_id'] as string,
      type:       'program.started',
      sourceType: 'program',
      sourceId:   programId,
      actorId:    userId,
      payload:    { programRunId: run['id'], programName: program['name'] },
    });

    for (const stageId of entryStageIds) {
      await this.startStage(run, layout, stageId, userId);
    }

    return { programRunId: run['id'] as string, status: 'running' };
  }

  /** Fail fast at trigger time rather than at DB-constraint time. */
  private validateGateConfigs(layout: ProgramLayout): void {
    for (const node of layout.nodes) {
      if (node.type !== 'gateNode') continue;
      const data = node.data as GateStageData;
      const voterCount = data.voterUserIds?.length ?? 0;
      if (voterCount === 0) {
        throw new BadRequestException(`Stage Gate "${node.id}" has no voters configured`);
      }
      if (!Number.isInteger(data.voteThreshold) || data.voteThreshold < 1 || data.voteThreshold > voterCount) {
        throw new BadRequestException(
          `Stage Gate "${node.id}" has an invalid vote_threshold (must be between 1 and ${voterCount})`,
        );
      }
    }
  }

  // ── Start a single stage (called at trigger time and by the watchdog on advance) ──

  async startStage(
    run: Record<string, unknown>,
    layout: ProgramLayout,
    stageId: string,
    userId: string,
  ): Promise<void> {
    const node = findStageNode(layout, stageId);
    if (!node) {
      this.logger.warn(`ProgramExecutionService: stage ${stageId} not found in layout — skipping`);
      return;
    }

    if (node.type === 'workflowNode') {
      await this.startWorkflowStage(run, node.data as WorkflowStageData, stageId, userId);
    } else if (node.type === 'gateNode') {
      await this.startGateStage(run, node.data as GateStageData, stageId, userId);
    }
  }

  private async startWorkflowStage(
    run: Record<string, unknown>,
    data: WorkflowStageData,
    stageId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.executionService.triggerRun(
      data.workflowId,
      { inputs: {}, variables: {} },
      userId,
      { programRunId: run['id'] as string, programStageId: stageId },
    );

    const resultRow = result as { runId?: string; id?: string };
    const executionRunId = resultRow.runId ?? resultRow.id;

    await this.appendStageHistory(run['id'] as string, {
      stageNodeId: stageId,
      type: 'workflow',
      executionRunId,
      status: 'started',
      startedAt: new Date().toISOString(),
    });
  }

  private async startGateStage(
    run: Record<string, unknown>,
    data: GateStageData,
    stageId: string,
    userId: string,
  ): Promise<void> {
    const { taskId } = await this.approvalTaskCreator.createStageGate({
      programRunId:  run['id'] as string,
      programStageId: stageId,
      title:           data.label ?? 'Stage Gate',
      voterUserIds:    data.voterUserIds,
      voteThreshold:   data.voteThreshold,
      escalateAfterMinutes: data.escalateAfterMinutes,
    });

    await this.appendStageHistory(run['id'] as string, {
      stageNodeId: stageId,
      type: 'gate',
      approvalTaskId: taskId,
      status: 'pending',
      startedAt: new Date().toISOString(),
    });

    void this.eventBus.publish({
      orgId:      run['organization_id'] as string,
      type:       'program.gate_opened',
      sourceType: 'program',
      sourceId:   run['program_id'] as string,
      actorId:    userId,
      payload:    { programRunId: run['id'], stageId, taskId, voterUserIds: data.voterUserIds, voteThreshold: data.voteThreshold },
    });
  }

  /** Append-only — stage_history never mutates an existing entry, it records
   *  one entry per lifecycle event (started, then a separate completed/
   *  approved/rejected entry later). Matches migration 0075's doc comment. */
  async appendStageHistory(programRunId: string, entry: StageHistoryEntry): Promise<void> {
    const { data: run } = await this.supabase.admin
      .from('program_runs')
      .select('stage_history')
      .eq('id', programRunId)
      .maybeSingle();

    const history = (run?.['stage_history'] as StageHistoryEntry[] | null) ?? [];

    await this.supabase.admin
      .from('program_runs')
      .update({ stage_history: [...history, entry] })
      .eq('id', programRunId);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async listRunsForProgram(programId: string, userId: string) {
    const { data: program } = await this.supabase.admin
      .from('programs')
      .select('organization_id')
      .eq('id', programId)
      .maybeSingle();

    if (!program) throw new NotFoundException(`Program ${programId} not found`);
    await this.security.requireMembership(userId, program['organization_id'] as string);

    const { data: runs, error } = await this.supabase.admin
      .from('program_runs')
      .select('id, status, current_stage_ids, started_by, started_at, completed_at, error, created_at')
      .eq('program_id', programId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return runs ?? [];
  }

  async getRun(runId: string, userId: string) {
    const { data: run, error } = await this.supabase.admin
      .from('program_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle();

    if (error ?? !run) throw new NotFoundException(`Program run ${runId} not found`);
    await this.security.requireMembership(userId, run['organization_id'] as string);
    return run;
  }
}
