/**
 * @lados/official-people-payroll — resolver entrypoint
 *
 * Official successor to Contractor Edition's payroll/expense-approval
 * capabilities (see compatibilityAliases in nodes.json). Reuses existing
 * Workspace Resource types (`payroll_run`/`expense`) already permitted
 * by migrations 0032/0034_phase9_contractor_edition*.sql — no new
 * migration needed.
 *
 * Services are declared locally per the program-wide convention: never
 * import service interfaces from another official pack or from any
 * prototype pack.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService, IReadResourceService, IUpdateResourceService } from './types';
import { preparePayrollRun } from './nodes/prepare-payroll-run';
import { recordPayrollApproval } from './nodes/record-payroll-approval';
import { recordExpenseApproval } from './nodes/record-expense-approval';

export interface PeoplePayrollServices {
  createService?: ICreateResourceService;
  readService?: IReadResourceService;
  updateService?: IUpdateResourceService;
}

// Local type alias — NOT imported from @lados/execution-engine, which does
// not export a member by this name (only MockNodeExecutor exists there).
// See every sibling official pack's src/index.ts for the same pattern.
type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export function resolveNode(services: PeoplePayrollServices): (nodeType: string) => NodeExecutor | null {
  return (nodeType: string): NodeExecutor | null => {
    switch (nodeType) {
      case 'lados.people_payroll.prepare_payroll_run':
        return (ctx: NodeContext) => preparePayrollRun(ctx, services.createService);
      case 'lados.people_payroll.record_payroll_approval':
        return (ctx: NodeContext) => recordPayrollApproval(ctx, services.updateService);
      case 'lados.people_payroll.record_expense_approval':
        return (ctx: NodeContext) => recordExpenseApproval(ctx, services.updateService);
      default:
        return null;
    }
  };
}

export {
  type ICreateResourceService,
  type IReadResourceService,
  type IUpdateResourceService,
  type ResourceRecord,
} from './types';
