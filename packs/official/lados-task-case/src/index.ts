/**
 * @lados/official-task-case
 *
 * Phase 21 S4 (Wave 2) — real executors for the `lados.task-case` official
 * Capability Pack (L1). Registry metadata lives in ../manifest.json +
 * ../nodes.json (read by OfficialPackLoaderService); this package supplies
 * runtime behavior only.
 *
 * Tasks and Cases are modeled as Workspace Resources (lados_resources) of
 * type "task" / "case" — the same generic resource store
 * @lados/official-resource-operations exposes to canvas users. Status and
 * closure changes go through the org's configured state machine
 * (StateEngineService), so a requires_approval guard can route either to
 * human approval (status:'paused'), exactly like lados.human.request_approval.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { createTask } from './nodes/create-task';
import { updateTaskStatus, type UpdateTaskStatusServices } from './nodes/update-task-status';
import { openCase } from './nodes/open-case';
import { closeCase, type CloseCaseServices } from './nodes/close-case';

export { createTask, updateTaskStatus, openCase, closeCase };
export {
  type ICreateResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
  type ResourceRecord,
} from './types';
export { type UpdateTaskStatusServices } from './nodes/update-task-status';
export { type CloseCaseServices } from './nodes/close-case';

export const PACK_ID = 'lados.task-case' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface TaskCaseServices {
  createService?: import('./types').ICreateResourceService;
  updateService?: import('./types').IUpdateResourceService;
  transitionService?: import('./types').ITransitionResourceService;
}

const NO_SERVICE = (code: string, message: string): NodeExecuteResult => ({
  status: 'failure',
  outputs: {},
  error: { code, message },
});

/**
 * Returns the real executor for a lados.task-case node type, or null if
 * unknown. Call once in buildRealNodeResolver, injecting NestJS services
 * (in practice all three service params are satisfied by the same
 * ResourceService instance via structural typing).
 */
export function resolveNode(
  services: TaskCaseServices = {},
): (nodeType: string) => NodeExecutor | null {
  const { createService, updateService, transitionService } = services;

  const transitionBundle: UpdateTaskStatusServices | CloseCaseServices = { updateService, transitionService };

  const nodes: Record<string, NodeExecutor> = {
    'lados.task.create': (ctx) =>
      createService
        ? createTask(ctx, createService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource create service not injected')),

    'lados.task.update_status': (ctx) => updateTaskStatus(ctx, transitionBundle),

    'lados.case.open': (ctx) =>
      createService
        ? openCase(ctx, createService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Resource create service not injected')),

    'lados.case.close': (ctx) => closeCase(ctx, transitionBundle),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
