/**
 * @lados/official-contract-admin — Phase 21 S6.1 (remaining Wave 4)
 *
 * resolveNode(services) factory, matching the established per-pack
 * resolver pattern: returns a lookup function from nodeType string to
 * NodeExecutor, chained into
 * apps/api/src/execution/real-nodes/index.ts buildRealNodeResolver(). No
 * cross-pack imports — all local service interfaces declared in
 * ./types.ts.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type {
  ICreateResourceService,
  IUpdateResourceService,
} from './types';

import { registerInstruction } from './nodes/register-instruction';
import { prepareNotice } from './nodes/prepare-notice';
import { trackNoticeDueDate } from './nodes/track-notice-due-date';
import { lookupClauseReference } from './nodes/lookup-clause-reference';
import { linkCorrespondenceEvidence } from './nodes/link-correspondence-evidence';

export {
  type ICreateResourceService,
  type IReadResourceService,
  type IUpdateResourceService,
  type ResourceRecord,
} from './types';

export interface ContractAdminServices {
  createService?: ICreateResourceService;
  updateService?: IUpdateResourceService;
}

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export function resolveNode(services: ContractAdminServices = {}): (nodeType: string) => NodeExecutor | null {
  const { createService, updateService } = services;

  const table: Record<string, NodeExecutor> = {
    'lados.contract.register_instruction': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      registerInstruction(ctx, createService),

    'lados.contract.prepare_notice': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      prepareNotice(ctx, createService),

    'lados.contract.track_notice_due_date': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      trackNoticeDueDate(ctx, updateService),

    'lados.contract.lookup_clause_reference': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      lookupClauseReference(ctx),

    'lados.contract.link_correspondence_evidence': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      linkCorrespondenceEvidence(ctx, updateService),
  };

  return (nodeType: string): NodeExecutor | null => table[nodeType] ?? null;
}
