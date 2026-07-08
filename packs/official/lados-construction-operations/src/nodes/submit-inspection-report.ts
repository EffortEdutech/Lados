/**
 * lados.construction.submit_inspection_report — Phase 21 S6 (Wave 4)
 *
 * Records a completed inspection report against an existing
 * `site_inspection` Workspace Resource — updates its data with findings/
 * photos/submittedBy, then transitions it to 'reported' through the
 * state-machine-guarded transition path (same mechanism as every other
 * transition node since S4 — a requires_approval guard surfaces as
 * status:'paused', never a silent auto-approval).
 *
 * Submission does not certify acceptance unless a separate human decision
 * record is attached (lados.human.record_decision) — this node never
 * certifies itself.
 *
 * Config/Inputs (report input object takes priority over config):
 *   resourceId  — the site_inspection resourceId (required)
 *   findings    — required
 *   photos, submittedBy, reviewRequired — optional
 *
 * Outputs:
 *   report — { resourceId, status, findings, submittedBy }
 *          | { resourceId, status, pending } on pause
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService, ITransitionResourceService } from '../types';

export interface SubmitInspectionReportServices {
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

export async function submitInspectionReport(
  ctx: NodeContext,
  services: SubmitInspectionReportServices = {},
): Promise<NodeExecuteResult> {
  const { updateService, transitionService } = services;

  if (!transitionService) {
    return {
      status: 'failure',
      outputs: { report: null },
      error: { code: 'NO_SERVICE', message: 'Resource transition service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const reportInput = (inp['inspection'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (reportInput['resourceId'] ?? cfg['resourceId']) as string | undefined;
  const findings = (reportInput['findings'] ?? cfg['findings']) as string | undefined;
  const photos = (reportInput['photos'] ?? cfg['photos']) as unknown[] | undefined;
  const submittedBy = (reportInput['submittedBy'] ?? cfg['submittedBy']) as string | undefined;
  const reviewRequired = (reportInput['reviewRequired'] ?? cfg['reviewRequired']) as boolean | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { report: null },
      error: { code: 'MISSING_INPUT', message: 'lados.construction.submit_inspection_report: resourceId is required' },
    };
  }
  if (!findings) {
    return {
      status: 'failure',
      outputs: { report: null },
      error: { code: 'MISSING_INPUT', message: 'lados.construction.submit_inspection_report: findings is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { report: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.construction.submit_inspection_report: organizationId missing from execution context' },
    };
  }

  const actorId = submittedBy ?? ctx.userId ?? 'system';

  if (updateService) {
    await updateService.updateResource(
      resourceId,
      ctx.organizationId,
      { data: { findings, photos: photos ?? [], submittedBy: actorId, reviewRequired: reviewRequired ?? false } },
      actorId,
    );
  }

  ctx.logger.info(`lados.construction.submit_inspection_report → inspection:${resourceId} by:${actorId}`);

  try {
    const result = await transitionService.transitionState(resourceId, ctx.organizationId, 'reported', actorId);

    if (result.approvalRequired) {
      return {
        status: 'paused',
        outputs: { report: { resourceId, status: result.state, pending: true } },
        pause: {
          title: 'Approve inspection report submission',
          description: 'Submitting this inspection report requires approval',
          assigneeRole: 'owner',
          context: { approvalTaskId: result.approvalTaskId },
        },
        summary: `Paused: inspection report for ${resourceId} requires approval`,
      };
    }

    return {
      status: 'success',
      outputs: { report: { resourceId, status: result.state, findings, submittedBy: actorId } },
      summary: `Inspection report submitted for ${resourceId}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`lados.construction.submit_inspection_report failed: ${message}`);
    return { status: 'failure', outputs: { report: null }, error: { code: 'TRANSITION_FAILED', message } };
  }
}
