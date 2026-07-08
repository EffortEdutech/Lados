/**
 * @lados/official-construction-operations — Phase 21 S6 (Wave 4)
 *
 * resolveNode(services) factory, matching the established per-pack
 * resolver pattern (S2/S4/S5): returns a lookup function from nodeType
 * string to NodeExecutor, chained into
 * apps/api/src/execution/real-nodes/index.ts buildRealNodeResolver(). No
 * cross-pack imports — all local service interfaces declared in
 * ./types.ts.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type {
  ICreateResourceService,
  IUpdateResourceService,
  ITransitionResourceService,
} from './types';

import { createProject } from './nodes/create-project';
import { createSiteInspection } from './nodes/create-site-inspection';
import { submitInspectionReport } from './nodes/submit-inspection-report';
import { logDefect } from './nodes/log-defect';
import { createSiteDiary } from './nodes/create-site-diary';
import { runHandoverChecklist } from './nodes/run-handover-checklist';

export {
  type ICreateResourceService,
  type IUpdateResourceService,
  type ITransitionResourceService,
  type ResourceRecord,
} from './types';

export interface ConstructionOperationsServices {
  createService?: ICreateResourceService;
  updateService?: IUpdateResourceService;
  transitionService?: ITransitionResourceService;
}

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export function resolveNode(services: ConstructionOperationsServices = {}): (nodeType: string) => NodeExecutor | null {
  const { createService, updateService, transitionService } = services;

  const table: Record<string, NodeExecutor> = {
    'lados.construction.create_project': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      createProject(ctx, createService),

    'lados.construction.create_site_inspection': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      createSiteInspection(ctx, createService),

    'lados.construction.submit_inspection_report': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      submitInspectionReport(ctx, { updateService, transitionService }),

    'lados.construction.log_defect': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      logDefect(ctx, createService),

    'lados.construction.create_site_diary': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      createSiteDiary(ctx, createService),

    'lados.construction.run_handover_checklist': (ctx: NodeContext): Promise<NodeExecuteResult> =>
      runHandoverChecklist(ctx),
  };

  return (nodeType: string): NodeExecutor | null => table[nodeType] ?? null;
}
