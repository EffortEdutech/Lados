/**
 * lados.construction.log_defect — Phase 21 S6 (Wave 4)
 *
 * Creates a defect Workspace Resource (`lados_resources` type `defect`,
 * already permitted per migration 0041_construction_resources.sql),
 * optionally as a child of a project/inspection (config.parentId).
 * `defectRules`/`standardsRefs` are Knowledge Pack reference pass-throughs
 * only — this node does NOT run an automatic defect classification engine
 * (severity/category come directly from the caller); no fabricated AI
 * capability, consistent with the established discipline.
 *
 * Logs a defect only; acceptance/closeout must be human-reviewed where
 * required (config.reviewRequired is recorded but does not itself pause
 * this node — closeout is a separate step).
 *
 * Config/Inputs:
 *   evidence.location, description — required
 *   severity, responsibleParty — optional
 *   parentId — optional parent project/inspection resourceId
 *   defectRules, standardsRefs — optional KP ref pass-through
 *   reviewRequired — default true
 *
 * Outputs:
 *   defect — { defectId, location, severity, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function logDefect(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { defect: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const evidenceInput = (inp['evidence'] as Record<string, unknown> | undefined) ?? {};

  const location = (evidenceInput['location'] ?? cfg['location']) as string | undefined;
  const description = (evidenceInput['description'] ?? cfg['description']) as string | undefined;
  const severity = ((evidenceInput['severity'] ?? cfg['severity']) as string | undefined) ?? 'unclassified';
  const responsibleParty = (evidenceInput['responsibleParty'] ?? cfg['responsibleParty']) as string | undefined;
  const parentId = (evidenceInput['parentId'] ?? cfg['parentId']) as string | undefined;
  const defectRules = cfg['defectRules'] as unknown[] | undefined;
  const standardsRefs = cfg['standardsRefs'] as unknown[] | undefined;
  const reviewRequired = (cfg['reviewRequired'] as boolean | undefined) ?? true;

  if (!location) {
    return {
      status: 'failure',
      outputs: { defect: null },
      error: { code: 'MISSING_INPUT', message: 'lados.construction.log_defect: location is required' },
    };
  }
  if (!description) {
    return {
      status: 'failure',
      outputs: { defect: null },
      error: { code: 'MISSING_INPUT', message: 'lados.construction.log_defect: description is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { defect: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.construction.log_defect: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.construction.log_defect → location:${location} severity:${severity}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'defect',
    name: `Defect — ${location}`,
    data: {
      location,
      description,
      severity,
      responsibleParty: responsibleParty ?? null,
      defectRules: defectRules ?? [],
      standardsRefs: standardsRefs ?? [],
      reviewRequired,
    },
    parentId,
    createdBy: actorId,
    initialState: 'open',
  });

  return {
    status: 'success',
    outputs: { defect: { defectId: record.id, location, severity, status: record.state } },
    summary: `Defect logged: ${location} (${severity})`,
  };
}
