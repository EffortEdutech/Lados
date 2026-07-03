/**
 * lados.task.update_status — Phase 21 S4 (Wave 2)
 *
 * Updates a task's status through the org's configured state machine (via
 * the injected transition service — StateEngineService-backed, same
 * mechanism Resource Operations' resource.transition uses). If no state
 * machine is configured for resource type "task", all transitions are
 * allowed (fallback machine — see StateEngineService.FALLBACK_MACHINE).
 * Reason/evidence are written into the task's data before transitioning so
 * they're on record even when a requires_approval guard blocks the change.
 *
 * Records task status only; approval must be modeled separately. A
 * requires_approval guard on the "task" state machine surfaces here as
 * status:'paused', mirroring lados.human.request_approval's contract.
 *
 * Config/Inputs (task input object, from an upstream node's `task` output,
 * takes priority; otherwise a bound resourceId from config is used):
 *   task.taskId | task.id | config.resourceId — required
 *   status   — target status (required)
 *   reason   — optional
 *   evidence — optional
 *
 * Outputs:
 *   updated — { taskId, status, reason } | { taskId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface UpdateTaskStatusServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

export async function updateTaskStatus(
  ctx: NodeContext,
  services: UpdateTaskStatusServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { updated: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const taskInput = (inp['task'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (taskInput['taskId'] ?? taskInput['id'] ?? cfg['resourceId']) as string | undefined;
  const status      = (taskInput['status']   ?? cfg['status'])   as string | undefined;
  const reason      = (taskInput['reason']   ?? cfg['reason'])   as string | undefined;
  const evidence    = (taskInput['evidence'] ?? cfg['evidence']) as Record<string, unknown> | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { updated: null },
      error: { code: 'MISSING_INPUT', message: 'lados.task.update_status: task resourceId is required (bind a resource or supply task.taskId)' },
    };
  }
  if (!status) {
    return {
      status: 'failure',
      outputs: { updated: null },
      error: { code: 'MISSING_INPUT', message: 'lados.task.update_status: status is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { updated: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.task.update_status: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  if (updateService && (reason ?? evidence)) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { lastStatusChangeReason: reason ?? null, lastStatusChangeEvidence: evidence ?? null } },
      actorId,
    );
  }

  ctx.logger.info(`lados.task.update_status → task:${resourceId} → ${status}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, status, actorId);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { updated: { taskId: resourceId, status: result.state, pending: true } },
        pause: {
          title: `Approve task status change to "${status}"`,
          description: reason ?? 'Status change requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: task ${resourceId} status change to "${status}" requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { updated: { taskId: resourceId, status: result.state, reason: reason ?? null } },
      summary: `Task ${resourceId} status → ${result.state}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.task.update_status failed: ${message}`);
    return { status: 'failure', outputs: { updated: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
