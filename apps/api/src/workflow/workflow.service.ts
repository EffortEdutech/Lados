import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { ExecutionService } from '../execution/execution.service';
import { validateWorkflow, WorkflowBuilder } from '@lados/workflow-json';
import type { WorkflowId, QSWorkflowDefinition, WorkflowTrigger } from '@lados/shared-types';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { SaveDefinitionDto } from './dto/save-definition.dto';
import { RunGroupDto } from './dto/run-group.dto';
import { extractGroupSubgraph, type GroupEntryPort } from './group-execution.helper';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly executionService: ExecutionService,
  ) {}

  /** List all workflows in a project */
  async findAllInProject(projectId: string, userId: string) {
    await this.assertProjectAccess(projectId, userId);

    const { data, error } = await this.supabase.admin
      .from('workflows')
      .select('id, name, description, status, version, tags, created_at, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /**
   * List every published workflow across every project the org can see —
   * Phase 23 S23.4 (§6). Needed because a program's (renamed from pipeline,
   * Phase 24 S24.2) "Workflow Stage" can now reference any workflow in the
   * organization, not just ones in the same project (today's
   * auto-populate-from-this-project behavior goes away, per the plan). Only
   * `status: 'published'` workflows are returned — an unpublished workflow
   * can't be triggered by ExecutionService anyway (see triggerRun's own
   * publish check), so listing drafts here would only invite a program
   * stage that fails immediately on first run.
   */
  async findAllInOrg(organizationId: string, userId: string) {
    const { data: member } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) throw new NotFoundException('Organization not found or access denied');

    const { data: projects, error: projErr } = await this.supabase.admin
      .from('projects')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (projErr) throw new Error(projErr.message);
    const projectIds = (projects ?? []).map((p) => p.id as string);
    if (projectIds.length === 0) return [];

    const projectNameById = new Map<string, string>(
      (projects ?? []).map((p) => [p.id as string, p.name as string]),
    );

    const { data: workflows, error } = await this.supabase.admin
      .from('workflows')
      .select('id, name, description, status, version, project_id, updated_at')
      .in('project_id', projectIds)
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (workflows ?? []).map((wf) => ({
      ...wf,
      project_name: projectNameById.get(wf['project_id'] as string) ?? null,
    }));
  }

  /** Get one workflow with full definition */
  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error ?? !data) throw new NotFoundException(`Workflow ${id} not found`);
    await this.assertProjectAccess(data.project_id as string, userId);
    return data;
  }

  /** Create a blank workflow (Start → End) */
  async create(projectId: string, dto: CreateWorkflowDto, userId: string) {
    await this.assertProjectAccess(projectId, userId, ['owner', 'admin', 'member']);

    // Generate a temp ID — Supabase will replace with gen_random_uuid()
    const tempId = crypto.randomUUID() as WorkflowId;
    const blankDef = WorkflowBuilder.blank(dto.name, tempId);

    const { data, error } = await this.supabase.admin
      .from('workflows')
      .insert({
        project_id: projectId,
        name: dto.name,
        description: dto.description ?? null,
        tags: dto.tags ?? [],
        definition: blankDef,
        created_by: userId,
      })
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Failed to create workflow');

    // Audit log (S10-005) — fire-and-forget
    const { data: proj } = await this.supabase.admin
      .from('projects').select('organization_id').eq('id', projectId).maybeSingle();
    if (proj) {
      void this.supabase.admin.from('audit_log').insert({
        organization_id: proj.organization_id,
        project_id:      projectId,
        actor_id:        userId,
        event_type:      'workflow.created',
        entity_type:     'workflow',
        entity_id:       (data as { id: string }).id,
        summary:         `Workflow "${dto.name}" created`,
      });
    }

    return data;
  }

  /** Update workflow metadata (not the definition) */
  async update(id: string, dto: UpdateWorkflowDto, userId: string) {
    const workflow = await this.findOne(id, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId, ['owner', 'admin', 'member']);

    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.status !== undefined) updates['status'] = dto.status;
    if (dto.tags !== undefined) updates['tags'] = dto.tags;

    const { data, error } = await this.supabase.admin
      .from('workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Update failed');
    return data;
  }

  /**
   * Save (overwrite) the workflow canvas definition.
   * Validates the Workflow JSON before writing.
   * Called by the canvas on every auto-save.
   */
  async saveDefinition(id: string, dto: SaveDefinitionDto, userId: string) {
    const workflow = await this.findOne(id, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId, ['owner', 'admin', 'member']);

    // Validate the incoming Workflow JSON
    const result = validateWorkflow(dto.definition);
    if (!result.valid) {
      const summary = result.errors.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join('; ');
      throw new BadRequestException(`Invalid Workflow JSON — ${summary}`);
    }

    const { data, error } = await this.supabase.admin
      .from('workflows')
      .update({ definition: dto.definition })
      .eq('id', id)
      .select('id, name, status, version, updated_at')
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Failed to save definition');
    return data;
  }

  /**
   * Export workflow as a portable JSON bundle.
   * Sprint 16 (S16-004).
   * Returns name, description, tags, and the full definition.
   * No run history or project-specific IDs are included — safe to share.
   */
  async exportWorkflow(id: string, userId: string) {
    const workflow = await this.findOne(id, userId);
    return {
      _export_version: '1.0',
      _exported_at:    new Date().toISOString(),
      name:            workflow.name,
      description:     workflow.description ?? '',
      tags:            workflow.tags ?? [],
      definition:      workflow.definition,
    };
  }

  async getGroupEntryPorts(workflowId: string, groupId: string, userId: string) {
    const workflow = await this.findOne(workflowId, userId);
    const { entryPorts, group } = extractGroupSubgraph(
      workflow.definition as QSWorkflowDefinition,
      groupId,
    );

    return { groupId: group.id, groupName: group.name, entryPorts };
  }

  async listGroupRunLogs(workflowId: string, userId: string) {
    const workflow = await this.findOne(workflowId, userId);

    const { data, error } = await this.supabase.admin
      .from('group_run_logs')
      .select('id, group_id, group_name, run_at, status, test_inputs, node_results, logs, duration_ms, error')
      .eq('workflow_id', workflowId)
      .order('run_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    await this.assertProjectAccess(workflow.project_id as string, userId);
    return data ?? [];
  }

  async runGroup(workflowId: string, dto: RunGroupDto, userId: string) {
    const workflow = await this.findOne(workflowId, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId, ['owner', 'admin', 'member']);

    const project = await this.getProjectOrganization(workflow.project_id as string);
    const extracted = extractGroupSubgraph(workflow.definition as QSWorkflowDefinition, dto.groupId);
    const testInputs = this.normalizeGroupTestInputs(extracted.entryPorts, dto.testInputs ?? {});
    const runStartedAt = Date.now();

    const { data: run, error: insertErr } = await this.supabase.admin
      .from('group_run_logs')
      .insert({
        workflow_id: workflowId,
        project_id: workflow.project_id,
        organization_id: project.organization_id,
        group_id: extracted.group.id,
        group_name: extracted.group.name,
        triggered_by: userId,
        status: 'running',
        test_inputs: testInputs,
      })
      .select('id')
      .single();

    if (insertErr ?? !run) {
      throw new Error(insertErr?.message ?? 'Failed to create group run log');
    }

    const runId = run.id as string;

    try {
      const result = await this.executionService.runDefinitionInline({
        executionId:    runId,
        workflowId,
        projectId:      workflow.project_id as string,
        organizationId: project.organization_id as string,
        userId,
        definition:     extracted.definition,
        inputs:         testInputs,
        variables:      {},
      });

      const nodeResults = Object.fromEntries(
        result.logs.map((log) => [
          log.nodeId,
          {
            nodeType:   log.nodeType,
            nodeName:   log.nodeName,
            status:     log.status,
            outputs:    log.outputs ?? {},
            error:      log.error ?? null,
            messages:   log.messages ?? [],
            durationMs: log.durationMs ?? null,
          },
        ]),
      );
      const status = result.status === 'completed' ? 'completed'
        : result.status === 'paused'              ? 'paused'
        : result.status === 'cancelled'           ? 'cancelled'
        : 'failed';

      await this.supabase.admin
        .from('group_run_logs')
        .update({
          status,
          node_results: nodeResults,
          logs: result.logs,
          duration_ms: result.durationMs,
          error: result.error ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId);

      return {
        runId,
        groupId: extracted.group.id,
        groupName: extracted.group.name,
        status,
        durationMs: result.durationMs,
        nodeResults,
        logs: result.logs,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const error = { code: 'GROUP_RUN_EXCEPTION', message };

      await this.supabase.admin
        .from('group_run_logs')
        .update({
          status: 'failed',
          duration_ms: Date.now() - runStartedAt,
          error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId);

      throw err;
    }
  }

  /**
   * Import a workflow JSON bundle into a project.
   * Sprint 16 (S16-004).
   * Creates a new workflow; never overwrites an existing one.
   */
  async importWorkflow(
    projectId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bundle: Record<string, any>,
    userId: string,
  ) {
    await this.assertProjectAccess(projectId, userId, ['owner', 'admin', 'member']);

    const name       = (bundle['name'] as string | undefined) ?? 'Imported Workflow';
    const description = bundle['description'] as string | undefined;
    const tags        = (bundle['tags'] as string[] | undefined) ?? [];
    const definition  = bundle['definition'];

    if (!definition) throw new BadRequestException('Bundle missing "definition" key');

    const result = validateWorkflow(definition);
    if (!result.valid) {
      const summary = result.errors
        .map((e: { field: string; message: string }) => `${e.field}: ${e.message}`)
        .join('; ');
      throw new BadRequestException(`Invalid Workflow JSON in bundle — ${summary}`);
    }

    const dto: CreateWorkflowDto = { name: `${name} (imported)`, description, tags };
    const created = await this.create(projectId, dto, userId);

    // Overwrite the blank definition with the imported one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saveDto: SaveDefinitionDto = { definition } as any;
    await this.saveDefinition((created as { id: string }).id, saveDto, userId);

    return created;
  }

  // ── S18-002: Versioning ────────────────────────────────────────────────────

  /**
   * Snapshot the current definition as a new version.
   * version_number = MAX(existing) + 1, or 1 if none yet.
   */
  async snapshotVersion(workflowId: string, userId: string, label?: string) {
    const workflow = await this.findOne(workflowId, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId, ['owner', 'admin', 'member']);

    // Compute next version number
    const { data: latest } = await this.supabase.admin
      .from('workflow_versions')
      .select('version_number')
      .eq('workflow_id', workflowId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = ((latest?.version_number as number | null) ?? 0) + 1;

    const { data, error } = await this.supabase.admin
      .from('workflow_versions')
      .insert({
        workflow_id:    workflowId,
        version_number: nextVersion,
        definition:     workflow.definition,
        label:          label ?? null,
        created_by:     userId,
      })
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Failed to create version');
    return data;
  }

  /** List all versions of a workflow, newest first */
  async listVersions(workflowId: string, userId: string) {
    const workflow = await this.findOne(workflowId, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId);

    const { data, error } = await this.supabase.admin
      .from('workflow_versions')
      .select('id, version_number, label, created_by, created_at')
      .eq('workflow_id', workflowId)
      .order('version_number', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /**
   * Publish the current workflow definition.
   *
   * 1. Snapshots the live definition into workflow_versions (labelled "Published vN").
   * 2. Sets published_version_id / published_at / published_by on the workflow row.
   *
   * Executions triggered after this point will use the published snapshot, not the
   * live draft — see ExecutionService.triggerRun().
   */
  async publish(workflowId: string, userId: string) {
    const workflow = await this.findOne(workflowId, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId, ['owner', 'admin', 'member']);

    if (!workflow.definition || !(workflow.definition as { nodes?: unknown[] }).nodes?.length) {
      throw new Error('Cannot publish a workflow with no nodes');
    }

    // Snapshot the current definition
    const version = await this.snapshotVersion(
      workflowId,
      userId,
      `Published v${(workflow as { version?: number }).version ?? 1}`,
    );

    // Mark the workflow as published
    const { data, error } = await this.supabase.admin
      .from('workflows')
      .update({
        published_version_id: version.id,
        published_at:         new Date().toISOString(),
        published_by:         userId,
        // PD-4 fix: was 'active', which violates workflows_status_check
        // ('draft'|'published'|'archived') — publish 500ed since Phase 1.
        status:               'published',
      })
      .eq('id', workflowId)
      .select('id, name, status, published_version_id, published_at')
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Publish failed');

    await this.supabase.admin.from('audit_log').insert({
      organization_id: null,   // filled by DB via project lookup if needed
      project_id:      workflow.project_id,
      actor_id:        userId,
      event_type:      'workflow.published',
      entity_type:     'workflow',
      entity_id:       workflowId,
      summary:         `Workflow "${workflow.name as string}" published (version ${version.version_number as number})`,
      metadata:        { version_id: version.id, version_number: version.version_number },
    });

    // Auto-register event subscriptions defined in the workflow's triggers array.
    // Idempotent: clear existing subscriptions for this workflow before re-registering.
    void this.syncTriggerSubscriptions(
      workflowId,
      workflow.definition as QSWorkflowDefinition,
      workflow.project_id as string,
      userId,
    );

    return { published: true, version_id: version.id, version_number: version.version_number, workflow: data };
  }

  /**
   * Sync event subscriptions for a workflow based on its trigger definitions.
   *
   * Called after publish. Fire-and-forget (wrapped in void by caller).
   * Deletes all existing subscriptions for this workflow then re-creates them
   * from the definition.triggers array so publish is always idempotent.
   *
   * Trigger types:
   *   EventTrigger   → subscribes to the given eventType with optional filter
   *   WebhookTrigger → subscribes to 'webhook.<path>' (fired by WebhookController)
   */
  private async syncTriggerSubscriptions(
    workflowId:  string,
    definition:  QSWorkflowDefinition,
    projectId:   string,
    userId:      string,
  ): Promise<void> {
    // Resolve org_id from project
    const { data: proj } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!proj) {
      this.logger.warn(`syncTriggerSubscriptions: project ${projectId} not found — skipping`);
      return;
    }

    const orgId = proj.organization_id as string;

    // 1. Remove all existing subscriptions for this workflow (idempotent re-publish)
    const { error: delErr } = await this.supabase.admin
      .from('lados_event_subscriptions')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('org_id', orgId);

    if (delErr) {
      this.logger.warn(`syncTriggerSubscriptions: failed to clear old subscriptions: ${delErr.message}`);
    }

    const triggers: WorkflowTrigger[] = definition.triggers ?? [];
    if (!triggers.length) return;

    // 2. Register a subscription for each trigger
    for (const trigger of triggers) {
      try {
        if (trigger.type === 'event') {
          await this.eventBus.subscribe({
            orgId,
            eventType:  trigger.eventType,
            workflowId,
            filter:     trigger.filter ?? {},
            createdBy:  userId,
          });
          this.logger.log(`Registered event subscription: ${trigger.eventType} → workflow ${workflowId}`);
        } else if (trigger.type === 'webhook') {
          // Webhook triggers use the synthetic event type 'webhook.<path>'
          const eventType = `webhook.${trigger.path}`;
          await this.eventBus.subscribe({
            orgId,
            eventType,
            workflowId,
            filter:    {},
            createdBy: userId,
          });
          this.logger.log(`Registered webhook subscription: ${eventType} → workflow ${workflowId}`);
        } else if (trigger.type === 'schedule') {
          // Schedule triggers — SchedulerService polls lados_event_subscriptions for 'cron_trigger'
          // and evaluates filter.cronExpression against the current time every 60s.
          await this.eventBus.subscribe({
            orgId,
            eventType:  'cron_trigger',
            workflowId,
            filter:     { cronExpression: (trigger as { cronExpression?: string }).cronExpression ?? '' },
            createdBy:  userId,
          });
          this.logger.log(`Registered schedule subscription: cron_trigger → workflow ${workflowId}`);
        }
      } catch (err) {
        this.logger.warn(`syncTriggerSubscriptions: failed to register trigger: ${(err as Error).message}`);
      }
    }
  }

  /** Restore a specific version of a workflow (rolls back live definition) */
  async restoreVersion(workflowId: string, versionId: string, userId: string) {
    const workflow = await this.findOne(workflowId, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId, ['owner', 'admin', 'member']);

    const { data: version } = await this.supabase.admin
      .from('workflow_versions')
      .select('*')
      .eq('id', versionId)
      .eq('workflow_id', workflowId)
      .maybeSingle();

    if (!version) throw new NotFoundException(`Version ${versionId} not found`);

    // Overwrite live definition
    const { data, error } = await this.supabase.admin
      .from('workflows')
      .update({ definition: version.definition })
      .eq('id', workflowId)
      .select('id, name, updated_at')
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Restore failed');
    return { restored: true, version_number: version.version_number, workflow: data };
  }

  /** Delete a workflow (owner/admin only) */
  async delete(id: string, userId: string) {
    const workflow = await this.findOne(id, userId);
    await this.assertProjectAccess(workflow.project_id as string, userId, ['owner', 'admin', 'member']);

    const { error } = await this.supabase.admin
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Audit log — fire-and-forget
    const { data: proj } = await this.supabase.admin
      .from('projects').select('organization_id').eq('id', workflow.project_id as string).maybeSingle();
    if (proj) {
      void this.supabase.admin.from('audit_log').insert({
        organization_id: proj.organization_id,
        project_id:      workflow.project_id,
        actor_id:        userId,
        event_type:      'workflow.deleted',
        entity_type:     'workflow',
        entity_id:       id,
        summary:         `Workflow "${workflow.name as string}" deleted`,
      });
    }

    return { deleted: true };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async assertProjectAccess(
    projectId: string,
    userId: string,
    roles?: string[],
  ) {
    const { data: project } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) throw new NotFoundException('Project not found');

    const { data: member } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id as string)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) throw new NotFoundException('Project not found or access denied');
    if (roles && !roles.includes(member.role as string)) {
      throw new ForbiddenException(`Requires role: ${roles.join(' or ')}`);
    }
  }

  private async getProjectOrganization(projectId: string) {
    const { data: project } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) throw new NotFoundException('Project not found');
    return project as { organization_id: string };
  }

  private normalizeGroupTestInputs(
    entryPorts: GroupEntryPort[],
    rawInputs: Record<string, unknown>,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...rawInputs };

    for (const port of entryPorts) {
      const scopedKey = `${port.nodeId}.${port.portId}`;
      const value = rawInputs[scopedKey] ?? rawInputs[port.portId];
      if (value !== undefined) {
        normalized[port.portId] = value;
        normalized[scopedKey] = value;
      }
    }

    return normalized;
  }
}
