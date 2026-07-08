/**
 * lados.people_payroll.prepare_payroll_run — Phase 21 S6.1 (remaining Wave 4)
 *
 * Creates a `payroll_run` Workspace Resource (already permitted per
 * migration 0034_phase9_contractor_edition_m3.sql) from timesheet and
 * expense binding references. Prepares payroll data only — it never
 * approves or pays; see lados.people_payroll.record_payroll_approval for
 * the human approval boundary.
 *
 * Config/Inputs:
 *   inputs.period, employeeGroup — required
 *   timesheetBinding, expenseBinding — optional resource refs
 *   requiresReview, reviewerRole — advisory metadata only
 *
 * Outputs:
 *   payrollRun — { payrollRunId, period, employeeGroup, status }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

export async function preparePayrollRun(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  if (!createService) {
    return {
      status: 'failure',
      outputs: { payrollRun: null },
      error: { code: 'NO_SERVICE', message: 'Resource create service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const inputsIn = (inp['inputs'] as Record<string, unknown> | undefined) ?? {};

  const period = (inputsIn['period'] ?? cfg['period']) as string | undefined;
  const employeeGroup = (inputsIn['employeeGroup'] ?? cfg['employeeGroup']) as string | undefined;
  const timesheetBinding = (inputsIn['timesheetBinding'] ?? cfg['timesheetBinding']) as string | undefined;
  const expenseBinding = (inputsIn['expenseBinding'] ?? cfg['expenseBinding']) as string | undefined;
  const requiresReview = ((inputsIn['requiresReview'] ?? cfg['requiresReview']) as boolean | undefined) ?? true;
  const reviewerRole = ((inputsIn['reviewerRole'] ?? cfg['reviewerRole']) as string | undefined) ?? 'owner';

  if (!period) {
    return {
      status: 'failure',
      outputs: { payrollRun: null },
      error: { code: 'MISSING_INPUT', message: 'lados.people_payroll.prepare_payroll_run: period is required' },
    };
  }
  if (!employeeGroup) {
    return {
      status: 'failure',
      outputs: { payrollRun: null },
      error: { code: 'MISSING_INPUT', message: 'lados.people_payroll.prepare_payroll_run: employeeGroup is required' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { payrollRun: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.people_payroll.prepare_payroll_run: organizationId missing from execution context' },
    };
  }

  const actorId = ctx.userId ?? 'system';

  ctx.logger.info(`lados.people_payroll.prepare_payroll_run → period:${period} group:${employeeGroup}`);

  const record = await createService.createResource({
    orgId: ctx.organizationId,
    projectId: ctx.projectId,
    type: 'payroll_run',
    name: `Payroll Run — ${period} (${employeeGroup})`,
    data: {
      period,
      employeeGroup,
      timesheetBinding: timesheetBinding ?? null,
      expenseBinding: expenseBinding ?? null,
      requiresReview,
      reviewerRole,
      advisory: true,
    },
    createdBy: actorId,
    initialState: 'prepared',
  });

  return {
    status: 'success',
    outputs: { payrollRun: { payrollRunId: record.id, period, employeeGroup, status: record.state } },
    summary: `Payroll run prepared: ${period} / ${employeeGroup} (pending human approval)`,
  };
}
