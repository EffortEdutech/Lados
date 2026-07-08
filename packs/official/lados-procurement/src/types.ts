/**
 * @lados/official-procurement — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not imported
 * from @lados/official-resource-operations or @lados/official-commercial-
 * finance either — same convention as every other official pack: each
 * declares its own local interface, satisfied by the same NestJS
 * ResourceService via structural (duck) typing). RFQs, quotations, and PO
 * requests are Workspace Resources (`lados_resources` types `rfq` /
 * `quotation` / `po_request`, added by migration
 * 0058_procurement_resource_types.sql).
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

export interface ITransitionResourceService {
  transitionState(
    id: string,
    orgId: string,
    toState: string,
    actorId: string,
  ): Promise<ResourceRecord & { approvalRequired?: boolean; approvalTaskId?: string }>;
}
