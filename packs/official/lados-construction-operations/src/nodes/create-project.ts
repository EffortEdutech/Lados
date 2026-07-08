/**
 * lados.construction.create_project — Phase 21 S6 (Wave 4)
 *
 * Creates a construction project / site operation Workspace Resource
 * (`lados_resources` type `construction_project`, already a permitted
 * type per migration 0041_construction_resources.sql). Creates a site or
 * project record only.
 *
 * Config/Inputs:
 *   project.projectName — required
 *   project.site, project.client, project.startDate — optional
 *
 * Outputs:
 *   resource — { projectId, projectName, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function createProject(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const projectInput = (inp['project'] as Record<string, unknown> | undefined) ?? {};

  const projectName = (projectInput['projectName'] ?? cfg['projectName']) as string | undefined;
  const site = (projectInput['site'] ?? cfg['site']) as string | undefined;
  const client = (projectInput['client'] ?? cfg['client']) as string | undefined;
  const startDate = (projectInput['startDate'] ?? cfg['startDate']) as string | undefined;

  if (!projectName) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_INPUT', message: 'lados.construction.create_project: projectName is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.construction.create_project: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.construction.create_project → ${projectName}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'construction_project',
    name: projectName,
    data: { projectName, site: site ?? null, client: client ?? null, startDate: startDate ?? null },
    createdBy: actorId,
    initialState: 'active',
  });

  return {
    status: 'success',
    outputs: { resource: { projectId: record.id, projectName, status: record.state } },
    summary: `Construction project created: ${projectName}`,
  };
}
