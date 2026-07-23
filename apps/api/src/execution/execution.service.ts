/**
 * ExecutionService — Phase 12 (Async Execution Queue)
 *
 * - Creates run records and enqueues jobs via ExecutionQueueService
 * - Falls back to in-process execution when Redis is not available (dev without Redis)
 * - All actual runner logic lives in ExecutionWorker (queue path) or _executeAndPersist (fallback)
 * - Sprint 6 (S6-003) · Phase 12 (S12-004)
 *
 * Security note: AI is advisory only. AI must not approve, certify, decide
 * entitlement, or impersonate a registered Professional Quantity Surveyor.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../common/supabase/supabase.service';
import { FileService } from '../file/file.service';
import { LibraryService } from '../library/library.service';
import { AiService } from '../ai/ai.service';
import { DocumentService } from '../document/document.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService }        from '../notification/email.service';   // Phase 10
import { SmsService }          from '../notification/sms.service';     // Phase 10
import { ResourceService } from '../resource/resource.service';
import { ResourceBindingsService } from '../resource-bindings/resource-bindings.service';
import { DataPacksService } from '../data-packs/data-packs.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { StateEngineService } from '../state-engine/state-engine.service';
import { SecurityEngineService } from '../security/security.service';
import { ApprovalTaskCreator } from '../approval/approval-task.creator';
import { ArtifactService }     from '../artifact/artifact.service';
import { ProgramArtifactService } from '../program-artifact/program-artifact.service'; // Phase 23 S23.3, renamed Phase 24 S24.2
import { ReligiousSourceService } from '../religious-source/religious-source.service'; // Phase B (QMCP)
import { CurrentIssueResearchService } from '../current-issue-research/current-issue-research.service'; // Phase D (QMCP)
import { ExecutionQueueService } from '../queue/execution-queue.service';
import { RUN_EVENT } from '../queue/queue.constants';
import { PackRegistryService }   from '../pack/pack-registry.service';
import { buildRealNodeResolver } from './real-nodes';
import { runWorkflow } from '@lados/execution-engine';
import type { ExecutionResult, RunnerOptions, SkipNodeSpec, NodeProgressEvent } from '@lados/execution-engine';
import { resolveExecutionMode } from './execution-mode';
import { loadOfficialPackSkeletons } from '../pack/official-pack-loader';
import { buildRuntimeReadinessReport } from './runtime-readiness';
import type { QSWorkflowDefinition } from '@lados/shared-types';
import type { TriggerRunDto } from './dto/trigger-run.dto';

/** Params for the shared enqueue-or-fallback helper — see enqueueOrRunInline(). */
interface EnqueueOrRunInlineParams {
  runId: string;
  workflowId: string;
  projectId: string;
  orgId: string;
  userId: string;
  definition: QSWorkflowDefinition;
  inputs?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  skipNodes?: SkipNodeSpec[];
  resumeFromCheckpoint?: RunnerOptions['resumeFromCheckpoint'];
  /** Passed through to _executeAndPersist for audit-log/event naming only. */
  workflow?: Record<string, unknown> | null;
  project?: Record<string, unknown> | null;
  /** Phase 23 S23.2/S23.3 — threaded into RunnerOptions so every node's
   *  NodeContext carries program context (only the in-process fallback path
   *  needs this passed explicitly; the BullMQ path has ExecutionWorker
   *  re-read the same two columns off the execution_runs row itself).
   *  Renamed from pipelineRunId/pipelineStageId in Phase 24 S24.2. */
  programRunId?: string;
  programStageId?: string;
}

@Injectable()
export class ExecutionService implements OnModuleInit {
  private readonly logger = new Logger(ExecutionService.name);
  private readonly nodeResolver: ReturnType<typeof buildRealNodeResolver>;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly fileService: FileService,
    private readonly libraryService: LibraryService,
    private readonly aiService: AiService,
    private readonly documentService: DocumentService,
    private readonly notificationService: NotificationService,
    private readonly resourceService: ResourceService,
    private readonly eventBus: EventBusService,
    private readonly stateEngine: StateEngineService,
    private readonly security: SecurityEngineService,
    private readonly approvalTaskCreator: ApprovalTaskCreator,
    private readonly artifactService: ArtifactService,
    private readonly executionQueue: ExecutionQueueService,
    private readonly packRegistry: PackRegistryService,
    private readonly resourceBindings: ResourceBindingsService,
    private readonly dataPacks: DataPacksService,
    private readonly emailService: EmailService,    // Phase 10
    private readonly smsService: SmsService,        // Phase 10
    private readonly emitter: EventEmitter2,        // Phase 21 S3 (D4) — SSE node progress
    private readonly programArtifactService: ProgramArtifactService, // Phase 23 S23.3, renamed Phase 24 S24.2
    private readonly religiousSourceService: ReligiousSourceService, // Phase B (QMCP)
    private readonly currentIssueResearchService: CurrentIssueResearchService, // Phase D (QMCP)
  ) {
    // nodeResolver used only for in-process fallback (no Redis) and executeNodeAction.
    this.nodeResolver = buildRealNodeResolver(
      this.fileService,
      this.libraryService,
      this.aiService,
      this.documentService,
      this.notificationService,
      this.resourceService,
      this.eventBus,
      this.stateEngine,
      this.approvalTaskCreator,
      this.artifactService,
      this.emailService,
      this.smsService,
      this.programArtifactService,
      this.religiousSourceService,
      this.currentIssueResearchService,
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    // Register the workflow trigger callback on EventBusService.
    // Done here (not in the constructor) to avoid circular dependency issues
    // during NestJS module initialization.
    this.eventBus.setWorkflowTrigger(
      async (workflowId, orgId, actorId, inputs) => {
        await this._triggerFromEvent(workflowId, orgId, actorId, inputs);
      },
    );

    // Phase 12 — Crash recovery:
    // Any run left in status='running' from before the API restart is now
    // orphaned (the worker process is gone). Mark them failed immediately so
    // the UI doesn't show infinite spinners and operators can resubmit.
    await this._recoverStaleRuns();
  }

  /** Phase 12 — mark runs orphaned by a previous crash as failed. */
  private async _recoverStaleRuns(): Promise<void> {
    try {
      const { data: stale, error } = await this.supabase.admin
        .from('execution_runs')
        .select('id')
        .eq('status', 'running');

      if (error) {
        this.logger.warn(`Crash recovery query failed: ${error.message}`);
        return;
      }

      if (!stale || stale.length === 0) return;

      const ids = stale.map((r: { id: string }) => r.id);
      const { error: updateErr } = await this.supabase.admin
        .from('execution_runs')
        .update({
          status:       'failed',
          error:        {
            code:    'CRASH_RECOVERY',
            message: 'API process restarted while this run was in progress. Resubmit to retry.',
          },
          completed_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (updateErr) {
        this.logger.warn(`Crash recovery update failed: ${updateErr.message}`);
        return;
      }

      this.logger.warn(
        `Crash recovery: marked ${ids.length} stale run(s) as failed — ${ids.join(', ')}`,
      );
    } catch (err: unknown) {
      // Never block startup
      this.logger.warn(
        `Crash recovery threw unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ── Shared enqueue-or-fallback helper (Phase 21 S3 / D2) ────────────────────

  /**
   * Attempts to enqueue via BullMQ; if Redis is not configured, or the
   * enqueue call itself fails or times out (ExecutionQueueService's own D2
   * hardening), runs the definition in-process instead — so a run is never
   * stranded at 'running'/'queued' with zero progress and no worker ever
   * picks it up. Shared by triggerRun/resumeRun/_triggerFromEvent, and by
   * SchedulerService (which has no node-resolver wiring of its own).
   */
  async enqueueOrRunInline(params: EnqueueOrRunInlineParams): Promise<{ enqueued: boolean }> {
    const isResume = !!params.resumeFromCheckpoint;
    let enqueued = false;

    if (this.executionQueue.isAvailable) {
      const result = isResume
        ? await this.executionQueue.enqueueResume({
            runId: params.runId,
            workflowId: params.workflowId,
            projectId: params.projectId,
            orgId: params.orgId,
            userId: params.userId,
            skipNodes: params.skipNodes,
            resumeFromCheckpoint: params.resumeFromCheckpoint,
          })
        : await this.executionQueue.enqueueTrigger({
            runId: params.runId,
            workflowId: params.workflowId,
            projectId: params.projectId,
            orgId: params.orgId,
            userId: params.userId,
            skipNodes: params.skipNodes,
          });
      enqueued = result.enqueued;
    }

    if (!enqueued) {
      if (this.executionQueue.isAvailable) {
        this.logger.warn(
          `Run ${params.runId}: BullMQ enqueue failed — falling back to in-process execution so the run isn't stranded.`,
        );
      }
      const runOptions = {
        executionId:    params.runId,
        workflowId:     params.workflowId,
        projectId:      params.projectId,
        organizationId: params.orgId,
        userId:         params.userId,
        definition:     params.definition,
        inputs:         params.inputs ?? {},
        variables:      params.variables ?? {},
        nodeResolver:   this.nodeResolver,
        executionMode:  resolveExecutionMode(),
        skipNodes:      params.skipNodes ?? [],
        // Phase 21 S3 (D4) — same SSE bridge as ExecutionWorker's queue path,
        // so in-process fallback runs also drive live node progress.
        onNodeEvent: (event: NodeProgressEvent) => {
          const eventName = event.type === 'started' ? RUN_EVENT.NODE_STARTED : RUN_EVENT.NODE_DONE;
          this.emitter.emit(eventName, { runId: params.runId, ...event });
        },
        // Phase 23 S23.2/S23.3, renamed Phase 24 S24.2
        programRunId:   params.programRunId,
        programStageId: params.programStageId,
        ...(params.resumeFromCheckpoint ? { resumeFromCheckpoint: params.resumeFromCheckpoint } : {}),
      };
      this._executeAndPersist(
        params.runId,
        params.workflow ?? null,
        params.project ?? null,
        runOptions,
      ).catch((err: unknown) => {
        this.logger.error(
          `[ExecutionService] Fallback run ${params.runId} threw: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return { enqueued };
  }

  // ── Trigger ────────────────────────────────────────────────────────────────

  /**
   * Phase 23 S23.2 (§4.1) — when triggerRun() is called by
   * ProgramExecutionService for a program stage, these tag the resulting
   * execution_runs row so ProgramWatchdogService can find it again
   * (join on program_run_id + program_stage_id) and the data-handoff nodes
   * (S23.3) can read ctx.programRunId. NOT part of TriggerRunDto — that DTO
   * is the public HTTP request body; this is an internal-caller-only param,
   * never settable by an ordinary POST /workflows/:id/run request. Renamed
   * from pipelineContext/pipelineRunId/pipelineStageId in Phase 24 S24.2.
   */
  async triggerRun(
    workflowId: string,
    dto: TriggerRunDto,
    userId: string,
    programContext?: { programRunId: string; programStageId: string },
  ) {
    // Load workflow + verify access
    const { data: workflow, error: wfErr } = await this.supabase.admin
      .from('workflows')
      .select('id, name, project_id, definition, status, published_version_id')
      .eq('id', workflowId)
      .single();

    if (wfErr ?? !workflow) throw new NotFoundException(`Workflow ${workflowId} not found`);

    const { data: project } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', workflow.project_id as string)
      .maybeSingle();

    if (!project) throw new NotFoundException('Project not found');

    await this.assertMembership(project.organization_id as string, userId);

    // Phase 22 S22.1 — idempotency check. If the caller supplied an
    // idempotencyKey and a non-failed run already exists for this
    // (workflowId, idempotencyKey) pair, return that run instead of starting
    // a duplicate — cheap short-circuit before the heavier snapshot
    // resolution/binding work below. Primarily guards webhook/scheduled
    // triggers against retries or duplicate delivery; manual UI triggers
    // typically don't pass a key, so are unaffected.
    // Note: only 'failed' is excluded (matches the Phase 22 plan as written);
    // whether a 'cancelled' run should also be excluded (i.e. allow retrying
    // a cancelled run under the same key) hasn't come up yet — revisit if it
    // does.
    if (dto.idempotencyKey) {
      const { data: existingRun } = await this.supabase.admin
        .from('execution_runs')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('idempotency_key', dto.idempotencyKey)
        .neq('status', 'failed')
        .maybeSingle();

      if (existingRun) return existingRun;
    }

    // Phase 1 immutability guard: run from the published snapshot, not the live draft.
    // If no published version exists, block execution so stale drafts are never run in production.
    let definition = workflow.definition as QSWorkflowDefinition;
    if (workflow.published_version_id) {
      const { data: snap } = await this.supabase.admin
        .from('workflow_versions')
        .select('definition')
        .eq('id', workflow.published_version_id as string)
        .single();
      if (snap?.definition) definition = snap.definition as QSWorkflowDefinition;
    } else {
      throw new BadRequestException(
        'Workflow has no published version — publish it first before triggering a run',
      );
    }

    if (!definition?.nodes?.length) {
      throw new BadRequestException('Published workflow has no nodes');
    }

    this.assertDefinitionRuntimeReady(definition);

    const resolved = await this.resolveDefinitionBindings(workflowId, definition);
    definition = resolved.definition;

    // Create execution_runs row (status = created)
    const { data: run, error: runErr } = await this.supabase.admin
      .from('execution_runs')
      .insert({
        workflow_id: workflowId,
        project_id: workflow.project_id,
        organization_id: project.organization_id,
        workflow_snapshot: definition,
        status: 'running',
        trigger_type: 'manual',
        inputs: dto.inputs ?? {},
        idempotency_key: dto.idempotencyKey ?? null,
        started_by: userId,
        started_at: new Date().toISOString(),
        ...(programContext && {
          program_run_id:   programContext.programRunId,
          program_stage_id: programContext.programStageId,
        }),
      })
      .select('id')
      .single();

    // Phase 22 S22.1 — race guard: two near-simultaneous callers with the
    // same idempotencyKey (e.g. a webhook double-delivery) can both pass the
    // pre-check above before either commits. The partial unique index on
    // (workflow_id, idempotency_key) then rejects the loser with a unique
    // violation (Postgres code 23505) instead of silently creating a
    // duplicate — catch that specific case and return the winner's run
    // instead of surfacing a 500.
    if (runErr?.code === '23505' && dto.idempotencyKey) {
      const { data: winner } = await this.supabase.admin
        .from('execution_runs')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('idempotency_key', dto.idempotencyKey)
        .maybeSingle();
      if (winner) return winner;
    }

    if (runErr ?? !run) throw new Error(runErr?.message ?? 'Failed to create run record');

    const runId = run.id as string;

    if (resolved.bindingCount > 0) {
      await this.writeBindingsResolvedAudit({
        orgId: project.organization_id as string,
        projectId: workflow.project_id as string,
        workflowId,
        runId,
        userId,
        bindingCount: resolved.bindingCount,
      });
    }

    // Publish workflow.started event (fire-and-forget — never blocks execution)
    void this.eventBus.publish({
      orgId:      project.organization_id as string,
      type:       'workflow.started',
      sourceType: 'workflow',
      sourceId:   workflowId,
      actorId:    userId,
      payload:    { runId, workflowName: workflow.name, triggerType: 'manual' },
    });

    // Phase 12: enqueue via BullMQ (falls back to in-process if Redis not available)
    // Phase 14: merge org-level disabled node types into skipNodes
    // getDisabledNodeTypes() returns type strings; convert to SkipNodeSpec[] by scanning the definition.
    const orgId = project.organization_id as string;
    const disabledNodeTypes = await this.packRegistry.getDisabledNodeTypes(orgId);
    const overrideSpecs: SkipNodeSpec[] = disabledNodeTypes.size > 0
      ? definition.nodes
          .filter((n) => disabledNodeTypes.has(n.type as string))
          .map((n) => ({ nodeId: n.id as string, reason: `Node type "${n.type}" is disabled for this org` }))
      : [];
    const skipNodes: SkipNodeSpec[] = [...(dto.skipNodes ?? []), ...overrideSpecs];

    await this.enqueueOrRunInline({
      runId,
      workflowId,
      projectId:  workflow.project_id as string,
      orgId,
      userId,
      definition,
      inputs:     dto.inputs ?? {},
      variables:  dto.variables ?? {},
      skipNodes,
      workflow,
      project: project as Record<string, unknown>,
      programRunId:   programContext?.programRunId,
      programStageId: programContext?.programStageId,
    });

    return { runId, status: 'running' };
  }

  /**
   * Sprint 14B: run an arbitrary validated definition inline.
   *
   * Used by canvas "Run Group" diagnostics, where designers execute a draft
   * subgraph without publishing or creating a normal execution_runs record.
   */
  async runDefinitionInline(
    options: Omit<RunnerOptions, 'nodeResolver'>,
  ): Promise<ExecutionResult> {
    const resolved = await this.resolveDefinitionBindings(options.workflowId, options.definition);
    return runWorkflow({
      ...options,
      definition: resolved.definition,
      nodeResolver: this.nodeResolver,
      executionMode: options.executionMode ?? resolveExecutionMode(),
    });
  }

  getRuntimeReadiness() {
    const loaded = loadOfficialPackSkeletons();
    const report = buildRuntimeReadinessReport(loaded.packs, this.nodeResolver);
    return { ...report, loadIssues: loaded.issues };
  }

  getDefinitionRuntimeReadiness(definition: QSWorkflowDefinition) {
    const report = this.getRuntimeReadiness();
    const readinessByType = new Map(
      report.packs.flatMap((pack) => pack.nodes.map((node) => [node.type, node] as const)),
    );
    const nodes = definition.nodes.map((node) => {
      const readiness = readinessByType.get(node.type);
      return readiness ?? {
        type: node.type,
        state: 'missing_executor' as const,
        declaredExecutorStatus: 'unknown',
        resolverAvailable: this.nodeResolver(node.type) !== null,
      };
    });
    return {
      ready: nodes.every((node) => node.state === 'implemented'),
      nodes,
      blockingNodes: nodes.filter((node) => node.state !== 'implemented'),
    };
  }

  assertDefinitionRuntimeReady(definition: QSWorkflowDefinition) {
    const readiness = this.getDefinitionRuntimeReadiness(definition);
    if (readiness.ready) return readiness;

    const blockers = readiness.blockingNodes
      .map((node) => `${node.type} (${node.state})`)
      .join(', ');
    throw new BadRequestException(
      `Workflow is not production-ready. Replace or configure these nodes before publishing or running: ${blockers}`,
    );
  }

  private async resolveDefinitionBindings(
    workflowId: string,
    definition: QSWorkflowDefinition,
  ): Promise<{ definition: QSWorkflowDefinition; bindingCount: number }> {
    const bindings = await this.resourceBindings.resolveBindings(workflowId);
    const bindingCount = Object.values(bindings).reduce(
      (total, nodeBindings) => total + Object.keys(nodeBindings).length,
      0,
    );

    if (bindingCount === 0) {
      return { definition, bindingCount };
    }

    const nodes = definition.nodes.map((node) => {
      const nodeBindings = bindings[node.id as string];
      if (!nodeBindings) return node;

      return {
        ...node,
        config: {
          ...(node.config ?? {}),
          ...nodeBindings,
          _bindingsResolved: Object.keys(nodeBindings),
        },
      };
    });

    return { definition: { ...definition, nodes }, bindingCount };
  }

  private async writeBindingsResolvedAudit(input: {
    orgId: string;
    projectId: string;
    workflowId: string;
    runId: string;
    userId: string;
    bindingCount: number;
  }): Promise<void> {
    await this.supabase.admin.from('audit_log').insert({
      org_id: input.orgId,
      project_id: input.projectId,
      actor_id: input.userId,
      event_type: 'execution.bindings_resolved',
      entity_type: 'execution_run',
      entity_id: input.runId,
      metadata: {
        workflowId: input.workflowId,
        bindingCount: input.bindingCount,
      },
    });
  }

  // ── Resume a paused run after human approval ────────────────────────────

  /** Shared fetch/validation for both resumeRun (decision) and resumeRunWithInput (data). */
  private async _loadPausedTask(runId: string, approvalTaskId: string, userId: string) {
    const { data: run, error: runErr } = await this.supabase.admin
      .from('execution_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runErr || !run) throw new NotFoundException(`Run ${runId} not found`);
    if (run['status'] !== 'paused') {
      throw new BadRequestException(`Run ${runId} is not paused (status: ${run['status']})`);
    }

    await this.assertMembership(run['organization_id'] as string, userId);

    const { data: task, error: taskErr } = await this.supabase.admin
      .from('approval_tasks')
      .select('*')
      .eq('id', approvalTaskId)
      .eq('execution_id', runId)
      .single();

    if (taskErr || !task) throw new NotFoundException(`Approval task ${approvalTaskId} not found for run ${runId}`);
    if (task['status'] !== 'pending') throw new BadRequestException(`Approval task already ${task['status']}`);

    return { run, task };
  }

  /**
   * Shared re-enqueue tail for both resume paths — everything after the
   * approval_tasks row itself has been updated with the decision/submission.
   */
  private async _continueRun(
    runId: string,
    run: Record<string, unknown>,
    approvalTaskId: string,
    approvalResult: {
      approved: boolean;
      rejected: boolean;
      comments: string;
      approvalTaskId: string;
      decidedBy: string;
      submittedData?: Record<string, unknown>;
    },
    userId: string,
  ) {
    // Mark run as running again
    await this.supabase.admin.from('execution_runs').update({ status: 'running' }).eq('id', runId);

    const { data: workflow } = await this.supabase.admin
      .from('workflows')
      .select('id, name, project_id, definition')
      .eq('id', run['workflow_id'] as string)
      .single();

    const { data: project } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', run['project_id'] as string)
      .maybeSingle();

    const definition = (run['workflow_snapshot'] ?? workflow?.['definition']) as QSWorkflowDefinition;

    const resumeFromCheckpoint = {
      pausedAtNodeId:    run['paused_at_node_id'] as string,
      checkpointOutputs: (run['checkpoint_outputs'] ?? {}) as Record<string, Record<string, unknown>>,
      approvalResult,
    };

    // Phase 12: re-enqueue via BullMQ (falls back to in-process if Redis not available)
    // Phase 14: apply org-level node overrides to skipNodes on resume
    const resumeOrgId = run['organization_id'] as string;
    const resumeDisabledTypes = await this.packRegistry.getDisabledNodeTypes(resumeOrgId);
    const resumeSkipNodes: SkipNodeSpec[] = resumeDisabledTypes.size > 0
      ? definition.nodes
          .filter((n) => resumeDisabledTypes.has(n.type as string))
          .map((n) => ({ nodeId: n.id as string, reason: `Node type "${n.type}" is disabled for this org` }))
      : [];

    await this.enqueueOrRunInline({
      runId,
      workflowId:  run['workflow_id'] as string,
      projectId:   run['project_id'] as string,
      orgId:       resumeOrgId,
      userId,
      definition,
      inputs:      (run['inputs'] ?? {}) as Record<string, unknown>,
      skipNodes:   resumeSkipNodes,
      resumeFromCheckpoint,
      workflow,
      project,
      programRunId:   (run['program_run_id'] as string | null) ?? undefined,
      programStageId: (run['program_stage_id'] as string | null) ?? undefined,
    });

    return { runId, status: 'running', resumed: true };
  }

  async resumeRun(
    runId: string,
    approvalTaskId: string,
    approved: boolean,
    comments: string,
    userId: string,
  ) {
    const { run } = await this._loadPausedTask(runId, approvalTaskId, userId);

    // Record the decision
    await this.supabase.admin.from('approval_tasks').update({
      status:      approved ? 'approved' : 'rejected',
      decided_by:  userId,
      decision_at: new Date().toISOString(),
      comments:    comments || (approved ? 'Approved' : 'Rejected'),
    }).eq('id', approvalTaskId);

    return this._continueRun(runId, run, approvalTaskId, {
      approved,
      rejected:  !approved,
      comments:  comments || (approved ? 'Approved' : 'Rejected'),
      approvalTaskId,
      decidedBy: userId,
    }, userId);
  }

  /**
   * Phase 22 S22.2 (§4.4) — resume a run paused at a lados.human.request_input
   * node. No approve/reject concept; the submitted data becomes that node's
   * output (`{ submittedData }`) for downstream nodes to consume.
   */
  async resumeRunWithInput(
    runId: string,
    approvalTaskId: string,
    data: Record<string, unknown>,
    userId: string,
  ) {
    const { run, task } = await this._loadPausedTask(runId, approvalTaskId, userId);

    if (task['task_type'] !== 'input') {
      throw new BadRequestException(`Approval task ${approvalTaskId} is not an input task (task_type: ${task['task_type']})`);
    }

    await this.supabase.admin.from('approval_tasks').update({
      status:         'submitted',
      decided_by:     userId,
      decision_at:    new Date().toISOString(),
      submitted_data: data,
    }).eq('id', approvalTaskId);

    return this._continueRun(runId, run, approvalTaskId, {
      approved:  true,
      rejected:  false,
      comments:  '',
      approvalTaskId,
      decidedBy: userId,
      submittedData: data,
    }, userId);
  }

  // ── Internal: run workflow and persist results ───────────────────────────

  private async _executeAndPersist(
    runId: string,
    workflow: Record<string, unknown> | null,
    project: Record<string, unknown> | null,
    options: Parameters<typeof runWorkflow>[0],
  ) {
    let result;
    try {
      result = await runWorkflow(options);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.supabase.admin.from('execution_runs').update({
        status:       'failed',
        error:        { code: 'RUNNER_EXCEPTION', message },
        completed_at: new Date().toISOString(),
      }).eq('id', runId);

      void this.eventBus.publish({
        orgId:      options.organizationId,
        type:       'workflow.failed',
        sourceType: 'workflow',
        sourceId:   options.workflowId,
        actorId:    options.userId,
        payload:    { runId, error: { code: 'RUNNER_EXCEPTION', message } },
      });
      return;
    }

    const dataPackUsages = await this.dataPacks.resolveRuntimeUsagesForDefinition(options.definition);

    if (result.logs.length > 0) {
      const logRows = result.logs.map((log) => ({
        run_id:       runId,
        node_id:      log.nodeId,
        node_type:    log.nodeType,
        node_name:    log.nodeName,
        status:       log.status,
        inputs:       log.inputs ?? null,
        outputs:      log.outputs ?? null,
        error:        log.error ?? null,
        messages:     log.messages ?? [],
        started_at:   log.startedAt ?? null,
        completed_at: log.completedAt ?? null,
        duration_ms:  log.durationMs ?? null,
        data_pack_usages: dataPackUsages.get(log.nodeId) ?? [],
      }));
      await this.supabase.admin.from('execution_logs').insert(logRows);
    }

    await this.supabase.admin.from('execution_runs').update({
      status:               result.status,
      outputs:              result.outputs ?? null,
      error:                result.error ?? null,
      completed_at:         result.status !== 'paused' ? result.completedAt : null,
      duration_ms:          result.durationMs,
      ...(result.status === 'paused' && {
        paused_at_node_id:  result.pausedAtNodeId,
        checkpoint_outputs: result.checkpointOutputs,
      }),
    }).eq('id', runId);

    // Publish workflow lifecycle event
    const lifecycleType = result.status === 'completed' ? 'workflow.completed'
      : result.status === 'paused'                      ? 'workflow.paused'
      : 'workflow.failed';
    void this.eventBus.publish({
      orgId:      options.organizationId,
      type:       lifecycleType,
      sourceType: 'workflow',
      sourceId:   options.workflowId,
      actorId:    options.userId,
      payload:    {
        runId,
        durationMs:   result.durationMs,
        nodeCount:    result.logs.length,
        ...(result.status === 'paused'  && { pausedAtNodeId: result.pausedAtNodeId }),
        ...(result.status === 'failed'  && { error: result.error }),
      },
    });

    const workflowName = (workflow?.['name'] as string | undefined) ?? 'Workflow';
    const eventType = result.status === 'completed' ? 'run.completed'
      : result.status === 'paused'                  ? 'run.paused'
      : 'run.failed';
    const summary = result.status === 'completed'
      ? `Workflow "${workflowName}" completed in ${result.durationMs}ms`
      : result.status === 'paused'
      ? `Workflow "${workflowName}" paused — awaiting human approval`
      : `Workflow "${workflowName}" failed: ${result.error?.message ?? 'unknown'}`;

    await this.supabase.admin.from('audit_log').insert({
      organization_id: project?.['organization_id'],
      project_id:      workflow?.['project_id'],
      actor_id:        options.userId,
      event_type:      eventType,
      entity_type:     'run',
      entity_id:       runId,
      summary,
      metadata: { workflow_id: options.workflowId, duration_ms: result.durationMs, node_count: result.logs.length },
    });
  }

  // ── Run details ────────────────────────────────────────────────────────────

  async getRun(runId: string, userId: string) {
    const { data: run, error } = await this.supabase.admin
      .from('execution_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error ?? !run) throw new NotFoundException(`Run ${runId} not found`);
    await this.assertMembership(run.organization_id as string, userId);
    return run;
  }

  async getRunLogs(runId: string, userId: string) {
    // Verify run access
    await this.getRun(runId, userId);

    const { data: logs, error } = await this.supabase.admin
      .from('execution_logs')
      .select('*')
      .eq('run_id', runId)
      .order('started_at', { ascending: true });

    if (error) throw new Error(error.message);
    return logs ?? [];
  }

  async listRunsForWorkflow(workflowId: string, userId: string) {
    const { data: workflow } = await this.supabase.admin
      .from('workflows')
      .select('project_id')
      .eq('id', workflowId)
      .maybeSingle();

    if (!workflow) throw new NotFoundException('Workflow not found');

    const { data: project } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', workflow.project_id as string)
      .maybeSingle();

    if (!project) throw new NotFoundException('Project not found');
    await this.assertMembership(project.organization_id as string, userId);

    const { data: runs, error } = await this.supabase.admin
      .from('execution_runs')
      .select('id, status, trigger_type, started_by, started_at, completed_at, duration_ms, error')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return runs ?? [];
  }

  /**
   * GET /execution/summary?organizationId=
   * Returns active/recent run counts for org-level dashboard cards.
   */
  async getOrgRunSummary(orgId: string, userId: string): Promise<{
    running:    number;
    failed24h:  number;
    completed7d: number;
  }> {
    await this.assertMembership(orgId, userId);

    const now   = new Date();
    const day1  = new Date(now.getTime() - 24  * 60 * 60 * 1000).toISOString();
    const day7  = new Date(now.getTime() - 7   * 24 * 60 * 60 * 1000).toISOString();

    const [runningRes, failedRes, completedRes] = await Promise.all([
      this.supabase.admin
        .from('execution_runs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'running'),

      this.supabase.admin
        .from('execution_runs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'failed')
        .gte('created_at', day1),

      this.supabase.admin
        .from('execution_runs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .gte('created_at', day7),
    ]);

    return {
      running:     runningRes.count ?? 0,
      failed24h:   failedRes.count  ?? 0,
      completed7d: completedRes.count ?? 0,
    };
  }

  /**
   * Get the most recent completed qs.read_boq output for a project.
   * Scans execution_logs for node_type = 'qs.read_boq' across all workflows
   * in the project.  Sprint 16 (S16-005).
   */
  async getLatestBoq(projectId: string, userId: string) {
    // Verify project access
    const { data: project } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle();
    if (!project) throw new NotFoundException('Project not found');
    await this.assertMembership(project.organization_id as string, userId);

    // Find most recent completed qs.read_boq node log for this project
    const { data, error } = await this.supabase.admin
      .from('execution_logs')
      .select('outputs, started_at, run_id, execution_runs!inner(workflow_id, workflows!inner(project_id))')
      .eq('node_type', 'qs.read_boq')
      .eq('status', 'completed')
      .eq('execution_runs.workflows.project_id', projectId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /** Phase 6: delegates to SecurityEngineService — enforces membership and role matrix */
  private async assertMembership(organizationId: string, userId: string): Promise<void> {
    await this.security.requireMembership(userId, organizationId);
  }

  // ── Event-triggered run (bypasses membership check) ───────────────────────

  /**
   * Called by EventBusService.dispatchSubscriptions() when a published event
   * matches an active subscription. Skips the human membership assertion because
   * the workflow was pre-validated at subscription creation time.
   */
  private async _triggerFromEvent(
    workflowId: string,
    orgId: string,
    actorId: string,
    inputs: Record<string, unknown>,
  ): Promise<void> {
    const { data: workflow } = await this.supabase.admin
      .from('workflows')
      .select('id, name, project_id, definition, published_version_id')
      .eq('id', workflowId)
      .single();

    if (!workflow?.['published_version_id']) return; // no published version — skip silently

    const { data: snap } = await this.supabase.admin
      .from('workflow_versions')
      .select('definition')
      .eq('id', workflow['published_version_id'] as string)
      .single();

    let definition = (snap?.['definition'] ?? workflow['definition']) as QSWorkflowDefinition;
    if (!definition?.nodes?.length) return;

    const resolved = await this.resolveDefinitionBindings(workflowId, definition);
    definition = resolved.definition;

    const { data: run } = await this.supabase.admin
      .from('execution_runs')
      .insert({
        workflow_id:       workflowId,
        project_id:        workflow['project_id'],
        organization_id:   orgId,
        workflow_snapshot: definition,
        status:            'running',
        trigger_type:      'event',
        inputs:            inputs ?? {},
        started_by:        actorId,
        started_at:        new Date().toISOString(),
      })
      .select('id')
      .single();

    if (!run) return;

    const runId = run['id'] as string;

    if (resolved.bindingCount > 0) {
      await this.writeBindingsResolvedAudit({
        orgId,
        projectId: workflow['project_id'] as string,
        workflowId,
        runId,
        userId: actorId,
        bindingCount: resolved.bindingCount,
      });
    }

    void this.eventBus.publish({
      orgId,
      type:       'workflow.started',
      sourceType: 'workflow',
      sourceId:   workflowId,
      actorId,
      payload:    { runId, workflowName: workflow['name'], triggerType: 'event' },
    });

    // Phase 12: enqueue (falls back to in-process if Redis not available)
    // Phase 14: apply org-level node overrides to skipNodes on event-triggered runs
    const eventDisabledTypes = await this.packRegistry.getDisabledNodeTypes(orgId);
    const eventSkipNodes: SkipNodeSpec[] = eventDisabledTypes.size > 0
      ? definition.nodes
          .filter((n) => eventDisabledTypes.has(n.type as string))
          .map((n) => ({ nodeId: n.id as string, reason: `Node type "${n.type}" is disabled for this org` }))
      : [];

    await this.enqueueOrRunInline({
      runId,
      workflowId,
      projectId:  workflow['project_id'] as string,
      orgId,
      userId:     actorId,
      definition,
      inputs:     inputs ?? {},
      skipNodes:  eventSkipNodes,
      workflow,
      project: { organization_id: orgId },
    });
  }

  // ── Direct node execution (inline actions) ─────────────────────────────────

  /**
   * Execute a single pack node directly — no workflow record required.
   *
   * Used by POST /resources/:id/execute-action so the /resources UI can trigger
   * real pack nodes (e.g. contractor.dispatch_trip) from inline action buttons
   * without requiring a pre-built, published workflow.
   *
   * Security: caller must be a member of orgId (enforced by JwtAuthGuard +
   * assertMembership). AI guardrails in each node are unchanged.
   */
  async executeNodeAction(
    nodeType: string,
    orgId: string,
    resourceId: string,
    inputs: Record<string, unknown>,
    actorId: string,
  ): Promise<{ status: string; outputs: Record<string, unknown>; error?: unknown }> {
    await this.assertMembership(orgId, actorId);

    const executor = this.nodeResolver(nodeType);
    if (!executor) {
      throw new BadRequestException(`Unknown node type: ${nodeType}`);
    }

    const ctx = {
      // V2 fields
      nodeId:         `inline-${nodeType}`,
      nodeType:       nodeType,
      upstream:       {} as Record<string, Record<string, unknown>>,
      // Core fields
      executionId:    `inline-${Date.now()}`,
      workflowId:     'inline-action',
      projectId:      'inline-action',
      organizationId: orgId,
      userId:         actorId,
      config:         {},
      inputs:         { resourceId, ...inputs },
      variables:      {},
      logger: {
        // eslint-disable-next-line no-console
        info:  (msg: string, data?: unknown) => console.log(`[NodeAction:${nodeType}] ${msg}`, data ?? ''),
        warn:  (msg: string, data?: unknown) => console.warn(`[NodeAction:${nodeType}] ${msg}`, data ?? ''),
        error: (msg: string, data?: unknown) => console.error(`[NodeAction:${nodeType}] ${msg}`, data ?? ''),
      },
    };

    try {
      const result = await executor(ctx);
      return {
        status:  result.status,
        outputs: result.outputs ?? {},
        ...(result.error ? { error: result.error } : {}),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ExecutionService] executeNodeAction() threw: ${msg}`);
      return { status: 'failure', outputs: {}, error: { code: 'NODE_EXCEPTION', message: msg } };
    }
  }
}
