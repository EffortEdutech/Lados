/**
 * @lados/official-qs-commercial — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not imported
 * from @lados/official-resource-operations or any other official pack
 * either — same convention as every other official pack: each declares its
 * own local interface, satisfied by the same NestJS ResourceService via
 * structural (duck) typing). BOQs, progress claims, and variations are
 * Workspace Resources (`lados_resources` types `boq` / `progress_claim` /
 * `variation`, already added by migration 0041_construction_resources.sql —
 * no new migration needed for this pack). split_work_packages and
 * reconcile_final_account are deliberately stateless/advisory — they never
 * call any of these services.
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

export interface IReadResourceService {
  getResource(id: string, orgId: string): Promise<ResourceRecord>;
}

export interface IUpdateResourceService {
  updateResource(
    id: string,
    orgId: string,
    updates: { data?: Record<string, unknown> },
    actorId: string,
  ): Promise<ResourceRecord>;
}
