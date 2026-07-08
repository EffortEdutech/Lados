/**
 * @lados/official-asset-fleet — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack, and not imported
 * from any other official pack either — same convention as every other
 * official pack). This pack is the official successor to Contractor
 * Edition's job/trip/fuel-receipt/maintenance capabilities (see
 * compatibilityAliases in nodes.json, e.g. "contractor.create_job") and
 * fully reuses their existing Workspace Resource types — `job` / `trip` /
 * `fuel_receipt` / `maintenance_record`, all already permitted by
 * migration 0032_phase9_contractor_edition.sql. No new migration is
 * needed for this pack.
 *
 * IAiVisionService mirrors the real NestJS AiService's actual shape
 * (isConfigured getter + runVision(systemPrompt, userText, imageUrl,
 * options)) — the same already-integrated capability
 * contractor-pack's real contractor.extract_fuel_data node uses for this
 * exact purpose (read for reference only, never imported).
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

export interface IAiVisionService {
  isConfigured: boolean;
  runVision(
    systemPrompt: string,
    userText: string,
    imageUrl: string,
    options?: { model?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<string>;
}
