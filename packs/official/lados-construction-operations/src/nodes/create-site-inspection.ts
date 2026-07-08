/**
 * lados.construction.create_site_inspection — Phase 21 S6 (Wave 4)
 *
 * Creates a site inspection Workspace Resource (`lados_resources` type
 * `site_inspection`, already permitted per migration
 * 0041_construction_resources.sql), optionally as a child of a project
 * (config.projectId → parentId). `checklistRefs`/`standardsRefs` are
 * Knowledge Pack reference pass-throughs only; the framework logs any
 * item UUIDs referenced in config automatically.
 *
 * Creates inspection work only; acceptance/signoff must be a separate
 * step (lados.construction.submit_inspection_report + a human decision).
 *
 * Config/Inputs:
 *   inspectionType — required
 *   site.location, inspector, inspectionDate — optional
 *   projectId — optional parent project resourceId
 *   checklistRefs, standardsRefs — optional KP ref pass-through
 *
 * Outputs:
 *   inspection — { inspectionId, inspectionType, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function createSiteInspection(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { inspection: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const siteInput = (inp['site'] as Record<string, unknown> | undefined) ?? {};

  const inspectionType = (siteInput['inspectionType'] ?? cfg['inspectionType']) as string | undefined;
  const location = (siteInput['location'] ?? cfg['location']) as string | undefined;
  const inspector = (siteInput['inspector'] ?? cfg['inspector']) as string | undefined;
  const inspectionDate = ((siteInput['inspectionDate'] ?? cfg['inspectionDate']) as string | undefined) ?? new Date().toISOString();
  const projectId = (siteInput['projectId'] ?? cfg['projectId']) as string | undefined;
  const checklistRefs = cfg['checklistRefs'] as unknown[] | undefined;
  const standardsRefs = cfg['standardsRefs'] as unknown[] | undefined;

  if (!inspectionType) {
    return {
      status: 'failure',
      outputs: { inspection: null },
      error: { code: 'MISSING_INPUT', message: 'lados.construction.create_site_inspection: inspectionType is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { inspection: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.construction.create_site_inspection: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.construction.create_site_inspection → type:${inspectionType} location:${location ?? 'n/a'}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'site_inspection',
    name: `Inspection — ${inspectionType}`,
    data: {
      inspectionType,
      location: location ?? null,
      inspector: inspector ?? null,
      inspectionDate,
      checklistRefs: checklistRefs ?? [],
      standardsRefs: standardsRefs ?? [],
    },
    parentId: projectId,
    createdBy: actorId,
    initialState: 'scheduled',
  });

  return {
    status: 'success',
    outputs: { inspection: { inspectionId: record.id, inspectionType, status: record.state } },
    summary: `Site inspection created: ${inspectionType}`,
  };
}
