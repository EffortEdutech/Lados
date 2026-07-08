/**
 * @lados/official-contract-admin — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not imported
 * from any other official pack either — same convention as every other
 * official pack). Instructions and notices are Workspace Resources
 * (`lados_resources` types `contract_instruction` / `contract_notice`,
 * added by migration 0060_contract_admin_resource_types.sql).
 * lados.contract.lookup_clause_reference is deliberately stateless and
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
