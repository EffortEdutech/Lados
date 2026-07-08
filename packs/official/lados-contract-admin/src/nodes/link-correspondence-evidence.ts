/**
 * lados.contract.link_correspondence_evidence — Phase 21 S6.1 (remaining Wave 4)
 *
 * Links correspondence/document references onto an already-bound
 * Workspace Resource (any type — this node is generic, matching its
 * `resourceBinding` config field rather than a fixed resource type).
 * Links evidence only; it does not judge whether evidence is sufficient.
 *
 * Config/Inputs:
 *   resourceBinding — the bound resourceId (required)
 *   documentRefs, correspondenceRefs — arrays of reference ids/urls, at least one required
 *
 * Outputs:
 *   link — { resourceId, documentRefs, correspondenceRefs }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IUpdateResourceService } from '../types';

export async function linkCorrespondenceEvidence(
  ctx: NodeContext,
  updateService?: IUpdateResourceService,
): Promise<NodeExecuteResult> {
  if (!updateService) {
    return {
      status: 'failure',
      outputs: { link: null },
      error: { code: 'NO_SERVICE', message: 'Resource update service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const evidenceInput = (inp['evidence'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (evidenceInput['resourceBinding'] ?? cfg['resourceBinding']) as string | undefined;
  const documentRefs = ((evidenceInput['documentRefs'] ?? cfg['documentRefs']) as unknown[] | undefined) ?? [];
  const correspondenceRefs = ((evidenceInput['correspondenceRefs'] ?? cfg['correspondenceRefs']) as unknown[] | undefined) ?? [];

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { link: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.link_correspondence_evidence: resourceBinding is required' },
    };
  }
  if (documentRefs.length === 0 && correspondenceRefs.length === 0) {
    return {
      status: 'failure',
      outputs: { link: null },
      error: { code: 'MISSING_INPUT', message: 'lados.contract.link_correspondence_evidence: at least one of documentRefs or correspondenceRefs is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { link: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.contract.link_correspondence_evidence: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.contract.link_correspondence_evidence → resource:${resourceId} docs:${documentRefs.length} correspondence:${correspondenceRefs.length}`);

  await updateService.updateResource(
    resourceId,
    ctx.organizationId,
    { data: { documentRefs, correspondenceRefs, evidenceLinkedAt: new Date().toISOString() } },
    actorId,
  );

  return {
    status: 'success',
    outputs: { link: { resourceId, documentRefs, correspondenceRefs } },
    summary: `Linked ${documentRefs.length} document ref(s) and ${correspondenceRefs.length} correspondence ref(s) to ${resourceId}`,
  };
}
