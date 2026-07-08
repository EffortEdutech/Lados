/**
 * @lados/official-human-work
 *
 * Phase 21 S2 (Wave 1) — real executors for the `lados.human-work` official
 * Capability Pack (L0). Registry metadata lives in ../manifest.json +
 * ../nodes.json (read by OfficialPackLoaderService); this package supplies
 * runtime behavior only.
 *
 * AI guardrail (non-negotiable): request_approval and review_checkpoint
 * pause nodes may ONLY be resolved by a human with owner|admin role — the
 * SecurityEngine enforces this at /approvals/:id/decide. AI output must
 * never be treated as a human decision.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { requestApproval } from './nodes/request-approval';
import { requestInput } from './nodes/request-input';
import { assignUser } from './nodes/assign-user';
import { recordDecision } from './nodes/record-decision';
import { reviewCheckpoint } from './nodes/review-checkpoint';

export { requestApproval, requestInput, assignUser, recordDecision, reviewCheckpoint };
export { type IApprovalTaskService, type INotificationService } from './nodes/request-approval';
export { type InputFieldSpec } from './nodes/request-input';
export { type IAssignableResourceService } from './nodes/assign-user';

export const PACK_ID = 'lados.human-work' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface HumanWorkServices {
  approvalTaskService?: import('./nodes/request-approval').IApprovalTaskService;
  notificationService?: import('./nodes/request-approval').INotificationService;
  resourceService?: import('./nodes/assign-user').IAssignableResourceService;
}

const NO_SERVICE = (code: string, message: string): NodeExecuteResult => ({
  status: 'failure',
  outputs: {},
  error: { code, message },
});

/**
 * Returns the real executor for a lados.human-work node type, or null if
 * unknown. Call once in buildRealNodeResolver, injecting NestJS services.
 */
export function resolveNode(
  services: HumanWorkServices = {},
): (nodeType: string) => NodeExecutor | null {
  const { approvalTaskService, notificationService, resourceService } = services;

  const nodes: Record<string, NodeExecutor> = {
    'lados.human.request_approval': (ctx) =>
      approvalTaskService
        ? requestApproval(ctx, approvalTaskService, notificationService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'ApprovalTaskService not injected')),

    // Phase 22 S22.2 (§4.4) — generic structured-input node.
    'lados.human.request_input': (ctx) =>
      approvalTaskService
        ? requestInput(ctx, approvalTaskService, notificationService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'ApprovalTaskService not injected')),

    'lados.human.assign_user': (ctx) =>
      resourceService
        ? assignUser(ctx, resourceService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'ResourceService not injected')),

    'lados.human.record_decision': (ctx) => recordDecision(ctx),

    'lados.human.review_checkpoint': (ctx) =>
      approvalTaskService
        ? reviewCheckpoint(ctx, approvalTaskService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'ApprovalTaskService not injected')),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
