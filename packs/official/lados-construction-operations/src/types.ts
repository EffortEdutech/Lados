/**
 * @lados/official-construction-operations — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not imported
 * from any other official pack either — same convention as every other
 * official pack). Projects, site inspections, and defects are Workspace
 * Resources reusing types added by migration
 * 0041_construction_resources.sql (`construction_project` /
 * `site_inspection` / `defect`). Site diaries use the new `site_diary`
 * type added by migration 0059_construction_site_diary_resource_type.sql.
 * lados.construction.run_handover_checklist is deliberately stateless and
 * never calls any of these services.
 */

export interface ResourceRecord {
  id: string;
  type: string;
  name: string;
  state: string;
  data: Record<string, unknown>;
  parentId?: string | null;
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
    initialState?: string;
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
