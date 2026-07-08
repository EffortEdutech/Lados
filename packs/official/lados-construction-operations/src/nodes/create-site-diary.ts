/**
 * lados.construction.create_site_diary — Phase 21 S6 (Wave 4)
 *
 * Creates a site diary Workspace Resource (`lados_resources` type
 * `site_diary` — new, added by migration
 * 0059_construction_site_diary_resource_type.sql), optionally as a child
 * of a project (config.projectId). Records site facts and notes only;
 * later use as progress-claim evidence requires separate QS review
 * (lados.qs.assess_progress_claim consumes this data as an evidence
 * input, not automatically).
 *
 * Config/Inputs:
 *   entry.date — required
 *   weather, labour, plant, events — optional
 *   projectId — optional parent project resourceId
 *
 * Outputs:
 *   diary — { diaryId, date, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function createSiteDiary(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { diary: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const entryInput = (inp['entry'] as Record<string, unknown> | undefined) ?? {};

  const date = ((entryInput['date'] ?? cfg['date']) as string | undefined) ?? new Date().toISOString().slice(0, 10);
  const weather = (entryInput['weather'] ?? cfg['weather']) as string | undefined;
  const labour = (entryInput['labour'] ?? cfg['labour']) as unknown;
  const plant = (entryInput['plant'] ?? cfg['plant']) as unknown;
  const events = (entryInput['events'] ?? cfg['events']) as unknown[] | undefined;
  const projectId = (entryInput['projectId'] ?? cfg['projectId']) as string | undefined;

  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { diary: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.construction.create_site_diary: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.construction.create_site_diary → date:${date}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'site_diary',
    name: `Site Diary — ${date}`,
    data: {
      date,
      weather: weather ?? null,
      labour: labour ?? null,
      plant: plant ?? null,
      events: events ?? [],
    },
    parentId: projectId,
    createdBy: actorId,
    initialState: 'recorded',
  });

  return {
    status: 'success',
    outputs: { diary: { diaryId: record.id, date, status: record.state } },
    summary: `Site diary recorded: ${date}`,
  };
}
