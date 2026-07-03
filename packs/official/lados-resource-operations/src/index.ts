/**
 * @lados/official-resource-operations
 *
 * Phase 21 S4 (Wave 2) — real executors for the `lados.resource-operations`
 * official Capability Pack (L0). Registry metadata lives in ../manifest.json
 * + ../nodes.json (read by OfficialPackLoaderService); this package
 * supplies runtime behavior only.
 *
 * Honesty note: the S4 skeleton declared 8 capabilities (including
 * "resource.transition") but only 7 nodes and was missing a corresponding
 * node for the transition capability. `lados.resource.transition` was
 * added (to manifest.json, nodes.json, and here) to close that gap — see
 * transition-resource.ts for detail. The pack now has 8 nodes for 8
 * capabilities.
 *
 * All 8 nodes are backed by the same underlying NestJS ResourceService /
 * ArtifactService, injected here via small structurally-typed interfaces
 * (../types.ts) — no NestJS or prototype-pack imports in this package.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { createResource } from './nodes/create-resource';
import { readResource } from './nodes/read-resource';
import { listResources } from './nodes/list-resources';
import { updateResource } from './nodes/update-resource';
import { transitionResource } from './nodes/transition-resource';
import { resolveBinding } from './nodes/resolve-binding';
import { writeArtifact } from './nodes/write-artifact';
import { readArtifact } from './nodes/read-artifact';

export {
  createResource,
  readResource,
  listResources,
  updateResource,
  transitionResource,
  resolveBinding,
  writeArtifact,
  readArtifact,
};
export {
  type ResourceRecord,
  type ICreateResourceService,
  type IReadResourceService,
  type IListResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
  type IArtifactWriteService,
  type IArtifactReadService,
} from './types';

export const PACK_ID = 'lados.resource-operations' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface ResourceOperationsServices {
  createService?: import('./types').ICreateResourceService;
  readService?: import('./types').IReadResourceService;
  listService?: import('./types').IListResourceService;
  updateService?: import('./types').IUpdateResourceService;
  transitionService?: import('./types').ITransitionResourceService;
  artifactWriteService?: import('./types').IArtifactWriteService;
  artifactReadService?: import('./types').IArtifactReadService;
}

const NO_SERVICE = (code: string, message: string): NodeExecuteResult => ({
  status: 'failure',
  outputs: {},
  error: { code, message },
});

/**
 * Returns the real executor for a lados.resource-operations node type, or
 * null if unknown. Call once in buildRealNodeResolver, injecting NestJS
 * services (in practice ResourceService satisfies create/read/list/update/
 * transition all at once via structural typing, and ArtifactService
 * satisfies both artifact interfaces).
 */
export function resolveNode(
  services: ResourceOperationsServices = {},
): (nodeType: string) => NodeExecutor | null {
  const {
    createService,
    readService,
    listService,
    updateService,
    transitionService,
    artifactWriteService,
    artifactReadService,
  } = services;

  const nodes: Record<string, NodeExecutor> = {
    'lados.resource.create': (ctx) =>
      createService
        ? createResource(ctx, createService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource create service not injected')),

    'lados.resource.read': (ctx) =>
      readService
        ? readResource(ctx, readService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource read service not injected')),

    'lados.resource.list': (ctx) =>
      listService
        ? listResources(ctx, listService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource list service not injected')),

    'lados.resource.update': (ctx) =>
      updateService
        ? updateResource(ctx, updateService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource update service not injected')),

    'lados.resource.transition': (ctx) =>
      transitionService
        ? transitionResource(ctx, transitionService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource transition service not injected')),

    'lados.resource.resolve_binding': (ctx) =>
      readService
        ? resolveBinding(ctx, readService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource read service not injected')),

    'lados.artifact.write': (ctx) =>
      artifactWriteService
        ? writeArtifact(ctx, artifactWriteService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Artifact write service not injected')),

    'lados.artifact.read': (ctx) =>
      artifactReadService
        ? readArtifact(ctx, artifactReadService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Artifact read service not injected')),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
