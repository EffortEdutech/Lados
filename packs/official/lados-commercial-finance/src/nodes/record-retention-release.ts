/**
 * lados.finance.record_retention_release — Phase 21 S5 (Wave 3)
 *
 * Records that a retention claim has been released, transitioning the
 * retention_release Workspace Resource to `released` through the
 * state-machine-guarded transition path. Never fabricates `releasedBy` —
 * same MISSING_HUMAN_DECISION contract as the other Wave 3 approval/record
 * nodes. Records release only; does not itself authorize release.
 *
 * Config/Inputs (release input object takes priority over config):
 *   resourceId, releasedAmount — required
 *   releasedBy — human actor identity (required, never inferred; defaults
 *                to ctx.userId only if explicitly present there)
 *   releaseDate, reference — optional
 *
 * Outputs:
 *   record — { resourceId, status, releasedAmount, releaseDate, reference, releasedBy }
 *          | { resourceId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface RecordRetentionReleaseServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

export async function recordRetentionRelease(
  ctx: NodeContext,
  services: RecordRetentionReleaseServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const releaseInput = (inp['release'] as Record<string, unknown> | undefined) ?? {};

  const resourceId     = (releaseInput['resourceId']     ?? cfg['resourceId']) as string | undefined;
  const releasedAmount = (releaseInput['releasedAmount'] ?? cfg['releasedAmount']) as number | undefined;
  const releaseDate    = ((releaseInput['releaseDate']   ?? cfg['releaseDate']) as string | undefined)
    ?? new Date().toISOString();
  const reference      = (releaseInput['reference']  ?? cfg['reference'])  as string | undefined;
  const releasedBy     = (releaseInput['releasedBy'] ?? cfg['releasedBy']) as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.record_retention_release: resourceId is required' },
    };
  }
  if (releasedAmount == null) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'MISSING_INPUT', message: 'lados.finance.record_retention_release: releasedAmount is required' },
    };
  }
  if (!releasedBy) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: {
        code: 'MISSING_HUMAN_DECISION',
        message: 'releasedBy is required — the value must come from a human actor, never inferred automatically.',
      },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { record: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.finance.record_retention_release: organizationId missing from execution context' },
    };
  }

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { releasedAmount, releaseDate, reference: reference ?? null } },
      releasedBy,
    );
  }

  ctx.logger.info(`lados.finance.record_retention_release → resource:${resourceId} amount:${releasedAmount} by:${releasedBy}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, 'released', releasedBy);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { record: { resourceId, status: result.state, pending: true } },
        pause: {
          title: 'Approve retention release',
          description: 'Recording this retention release requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: retention release ${resourceId} requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: {
        record: { resourceId, status: result.state, releasedAmount, releaseDate, reference: reference ?? null, releasedBy },
      },
      summary: `Retention release recorded for ${resourceId}: ${releasedAmount}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.finance.record_retention_release failed: ${message}`);
    return { status: 'failure', outputs: { record: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
