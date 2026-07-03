/**
 * @lados/official-resource-operations — shared service interfaces
 *
 * Declared locally (not imported from any prototype pack) — satisfied by
 * apps/api's ResourceService / ArtifactService via structural (duck)
 * typing. Resource Operations is the L0 pack every other Wave-2 pack
 * (Task-Case, Communication) builds on: Workspace Resources are the
 * generic CRUD substrate for tasks, cases, and any domain resource.
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
    /** Overrides the resource type's default initial state, if the caller has one. */
    initialState?: string;
  }): Promise<ResourceRecord>;
}

export interface IReadResourceService {
  getResource(id: string, orgId: string): Promise<ResourceRecord>;
}

export interface IListResourceService {
  listResources(
    orgId: string,
    filters: {
      type?: string;
      state?: string;
      projectId?: string;
      parentId?: string;
      limit?: number;
    },
  ): Promise<ResourceRecord[]>;
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

export interface IArtifactWriteService {
  upsertArtifact(params: {
    organisationId: string;
    projectId: string;
    key: string;
    type?: 'json' | 'text' | 'file';
    data?: Record<string, unknown>;
    fileUrl?: string;
    workflowId?: string;
    runId?: string;
    createdBy?: string;
  }): Promise<{ id: string; artifact_key: string; version: number }>;
}

export interface IArtifactReadService {
  readArtifact(
    projectId: string,
    key: string,
    required?: boolean,
  ): Promise<{ id: string; artifact_key: string; data: Record<string, unknown> | null; version: number } | null>;
}
