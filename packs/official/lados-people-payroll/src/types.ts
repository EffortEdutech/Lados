/**
 * @lados/official-people-payroll — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not
 * imported from any other official pack — same convention as every
 * other official pack). This pack is the official successor to
 * Contractor Edition's payroll/expense-approval capabilities (see
 * compatibilityAliases in nodes.json, e.g. "contractor.approve_payroll")
 * and fully reuses their existing Workspace Resource types —
 * `payroll_run` (migration 0034_phase9_contractor_edition_m3.sql) and
 * `expense` (migration 0032_phase9_contractor_edition.sql). No new
 * migration is needed for this pack.
 *
 * Payroll/expense approval nodes must implement the same
 * MISSING_HUMAN_DECISION contract used since S2's
 * lados.human.record_decision — approvedBy is never inferred.
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
