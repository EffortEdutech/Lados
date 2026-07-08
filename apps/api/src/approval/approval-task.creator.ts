/**
 * ApprovalTaskCreator — Phase 7
 *
 * Thin service that creates approval_task rows in Supabase.
 * Extracted from ApprovalService to avoid the circular dependency:
 *
 *   ApprovalService → ExecutionService (resumeRun)
 *   ExecutionService → ApprovalService (createTask) ← would be circular
 *
 * Solution: ApprovalTaskCreator has no ExecutionService dependency.
 * Both ApprovalService and buildRealNodeResolver inject this instead.
 *
 * This is the NestJS concrete implementation of IApprovalTaskService
 * defined in what was @lados/foundation-pack (now archived — the
 * approval_tasks table/contract itself is unaffected, defined by migration,
 * not by any pack source).
 */

import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class ApprovalTaskCreator {
  constructor(private readonly supabase: SupabaseService) {}

  async createTask(params: {
    executionId:   string;
    workflowId:    string;
    projectId:     string;
    nodeId:        string;
    nodeName?:     string;
    orgId:         string;
    title:         string;
    description?:  string;
    assigneeRole?: string;
    data?:         Record<string, unknown>;
    /** Phase 22 S22.2 — named-user assignment, alongside/instead of assigneeRole (§4.1). */
    assigneeUserId?: string;
    /** Phase 22 S22.2 — 'input' for lados.human.request_input; defaults to 'approval' (§4.4). */
    taskType?: 'approval' | 'input';
    /** Phase 22 S22.2 — escalation window in minutes, polled by ApprovalWatchdogService (§4.3). */
    escalateAfterMinutes?: number;
    /** Phase 22 S22.2 — who to reassign to on escalation, if configured (§4.3). */
    escalatedToUserId?: string;
  }): Promise<{ taskId: string }> {
    const { data: task, error } = await this.supabase.admin
      .from('approval_tasks')
      .insert({
        execution_id:  params.executionId,
        workflow_id:   params.workflowId,
        project_id:    params.projectId || null,
        node_id:       params.nodeId,
        node_name:     params.nodeName ?? params.title,
        title:         params.title,
        description:   params.description ?? `Review required by ${params.assigneeRole ?? 'owner'}`,
        data:          params.data ?? {},
        status:        'pending',
        assignee_role: params.assigneeRole ?? 'owner',
        // `|| null` (not `??`), deliberately — assignee_user_id/
        // escalated_to_user_id are uuid columns; the canvas inspector's
        // generic TextField (deriveConfigSchema(), S7.3 — every declared
        // config field renders as plain text with no per-field type) saves
        // an unfilled field as `""`, not undefined. `?? null` only replaces
        // null/undefined, so `""` would pass straight through into a uuid
        // column and fail with "invalid input syntax for type uuid: ''" —
        // found via eff's first live request_input run, 2026-07-06.
        assignee_user_id:       params.assigneeUserId || null,
        task_type:              params.taskType ?? 'approval',
        escalate_after_minutes: params.escalateAfterMinutes ?? null,
        escalated_to_user_id:   params.escalatedToUserId || null,
      })
      .select('id')
      .single();

    if (error || !task) {
      throw new Error(error?.message ?? 'Failed to create approval task');
    }

    return { taskId: task['id'] as string };
  }
}
