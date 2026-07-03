/**
 * @lados/official-task-case — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not imported
 * from @lados/official-resource-operations either — each official pack
 * declares its own local interface, satisfied by the same NestJS
 * ResourceService via structural (duck) typing, matching the precedent set
 * by contractor-pack / construction-pack / finance-pack in earlier phases).
 *
 * Tasks and Cases are modeled as Workspace Resources (lados_resources) of
 * type "task" / "case" — the same generic resource store Resource
 * Operations uses. Status/closure transitions go through the org's
 * configured state machine (StateEngineService) so a requires_approval
 * guard can route a status change to human approval exactly like any other
 * guarded resource transition.
 */

export interface ResourceRecord {
  id: string;
  type: string;
  name: string;
  state: string;
  data: Record<string, unknown>;
}

export interface ICreateResourceService {
  createResource(params: {
    orgId: string;
    projectId?: string;
    type: string;
    name: string;
    data?: Record<string, unknown>;
    parentId?: string;
    createdBy: string;
  }): Promise<ResourceRecord>;
}

export interface IUpdateResourceService {
  updateResource(
    id: string,
    orgId: string,
    updates: { data?: Record<string, unknown> },
    actorId: string,
  ): Promise<ResourceRecord>;
}

export interface ITransitionResourceService {
  transitionState(
    id: string,
    orgId: string,
    toState: string,
    actorId: string,
  ): Promise<ResourceRecord & { approvalRequired?: boolean; approvalTaskId?: string }>;
}
