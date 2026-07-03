/**
 * lados.case.open — Phase 21 S4 (Wave 2)
 *
 * Opens an operational case as a Workspace Resource of type "case" (via the
 * injected create-resource service — same generic lados_resources store
 * Resource Operations uses). Opens a tracking record only.
 *
 * Config/Inputs:
 *   caseType  — optional label
 *   title     — required
 *   ownerRole — optional
 *   severity  — optional
 *
 * Outputs:
 *   case — { caseId, title, status, caseType }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function openCase(
  ctx: NodeContext,
  resourceService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { case: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const source = (inp['source'] as Record<string, unknown> | undefined) ?? {};

  const caseType  = (source['caseType']  ?? cfg['caseType'])  as string | undefined;
  const title     = (source['title']     ?? cfg['title'])     as string | undefined;
  const ownerRole = (source['ownerRole'] ?? cfg['ownerRole']) as string | undefined;
  const severity  = (source['severity']  ?? cfg['severity'])  as string | undefined;

  if (!title) {
    return {
      status: 'failure',
      outputs: { case: null },
      error: { code: 'MISSING_INPUT', message: 'lados.case.open: title is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { case: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.case.open: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.case.open → "${title}"${caseType ? ` type:${caseType}` : ''}`);

  const record = await resourceService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'case',
    name: title,
    data: { caseType: caseType ?? null, ownerRole: ownerRole ?? null, severity: severity ?? null },
    createdBy: actorId,
  });

  return {
    status: 'success',
    outputs: { case: { caseId: record.id, title, status: record.state, caseType: caseType ?? null } },
    summary: `Case opened: "${title}"`,
  };
}
