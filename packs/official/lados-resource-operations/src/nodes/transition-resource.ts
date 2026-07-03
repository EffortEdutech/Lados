/**
 * lados.resource.transition — Phase 21 S4 (Wave 2)
 *
 * Honesty note: the S4 manifest skeleton declared the capability
 * "resource.transition" but had no corresponding node in manifest.json's
 * `nodes` list or in nodes.json — a gap between the declared capability set
 * and the declared node set. This node closes that gap (added alongside
 * the fix in manifest.json/nodes.json), since the master plan explicitly
 * requires "state transition (state-machine-guarded)" for this pack.
 *
 * Transitions a Workspace Resource's state through the org's configured
 * state machine (StateEngineService, via the injected transition service —
 * same guarded mechanism lados.task.update_status and lados.case.close
 * use). If no state machine is configured for the resource's type, all
 * transitions are allowed (fallback machine). Transition nodes must not
 * bypass human approval rules declared by domain packs — a
 * requires_approval guard surfaces here as status:'paused'.
 *
 * Config/Inputs:
 *   resource.resourceId | resource.id | config.resourceId — required
 *   resource.toState | config.toState — required
 *
 * Outputs:
 *   transitioned — { resourceId, state } | { resourceId, state, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITransitionResourceService } from '../types';

export async function transitionResource(
  ctx: NodeContext,
  transitionService?: ITransitionResourceService,
): Promise<NodeExecuteResult> {
  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { transitioned: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const resourceInput = (inp['resource'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (resourceInput['resourceId'] ?? resourceInput['id'] ?? cfg['resourceId']) as string | undefined;
  const toState     = (resourceInput['toState']    ?? cfg['toState'])                            as string | undefined;

  if (!resourceId || !toState) {
    return {
      status: 'failure',
      outputs: { transitioned: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.transition: resourceId and toState are required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { transitioned: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.resource.transition: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.resource.transition → resource:${resourceId} → ${toState}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, toState, actorId);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { transitioned: { resourceId, state: result.state, pending: true } },
        pause: {
          title: `Approve transition to "${toState}"`,
          description: `Resource ${resourceId} transition requires approval`,
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: resource ${resourceId} transition to "${toState}" requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { transitioned: { resourceId, state: result.state } },
      summary: `Resource ${resourceId} transitioned to "${result.state}"`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.resource.transition failed: ${message}`);
    return { status: 'failure', outputs: { transitioned: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
