/**
 * @lados/official-commercial-finance — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not imported
 * from @lados/official-resource-operations either — same convention as
 * Task-Case: each official pack declares its own local interface,
 * satisfied by the same NestJS ResourceService via structural (duck)
 * typing). Invoices, purchase orders, and retention releases are Workspace
 * Resources (`lados_resources` types `finance_invoice` / `purchase_order` /
 * `retention_release`, already added by migration
 * 0043_finance_resource_types.sql — no new migration needed for this pack).
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
