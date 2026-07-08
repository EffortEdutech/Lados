/**
 * Phase 21 S6.1 (remaining Wave 4, pulled forward from Phase 22 deferral) —
 * official-node end-to-end proxy chain across lados-contract-admin,
 * lados-asset-fleet, and lados-people-payroll.
 *
 * These 3 packs were not named in a single master-plan gate template (they
 * were originally deferred to Phase 22 skeletons); this suite proves the
 * same class of "chains end-to-end without silently fabricating a human
 * decision" property the other wave-e2e suites establish, combining all
 * three packs' real resolvers in one combined lookup:
 *
 *   Asset & Fleet:    create_job -> dispatch_trip -> complete_trip
 *                     (pauses, never silently certifies, when approval required)
 *   Contract Admin:   register_instruction -> prepare_notice
 *                     -> track_notice_due_date -> lookup_clause_reference
 *                     (always advisory / requires_human_review)
 *   People & Payroll: prepare_payroll_run -> record_payroll_approval
 *                     (fails with MISSING_HUMAN_DECISION until a human
 *                     actor is supplied — the system never approves payroll)
 */
import { resolveNode as resolveAssetFleet, type ICreateResourceService as IAssetCreateService, type ITransitionResourceService as IAssetTransitionService } from '@lados/official-asset-fleet';
import { resolveNode as resolveContractAdmin, type ICreateResourceService as IContractCreateService, type IUpdateResourceService as IContractUpdateService } from '@lados/official-contract-admin';
import { resolveNode as resolvePeoplePayroll, type ICreateResourceService as IPayrollCreateService, type IUpdateResourceService as IPayrollUpdateService } from '@lados/official-people-payroll';
import { createMockNodeContext } from '@lados/testing';

describe('Wave 4.1 official E2E — asset-fleet + contract-admin + people-payroll proxy chain', () => {
  it('resolves every node across all three packs via one combined resolver', () => {
    const assetCreateService: IAssetCreateService = { createResource: jest.fn() };
    const assetTransitionService: IAssetTransitionService = { transitionState: jest.fn() };
    const contractCreateService: IContractCreateService = { createResource: jest.fn() };
    const contractUpdateService: IContractUpdateService = { updateResource: jest.fn() };
    const payrollCreateService: IPayrollCreateService = { createResource: jest.fn() };
    const payrollUpdateService: IPayrollUpdateService = { updateResource: jest.fn() };

    const resolvers = [
      resolveAssetFleet({ createService: assetCreateService, transitionService: assetTransitionService }),
      resolveContractAdmin({ createService: contractCreateService, updateService: contractUpdateService }),
      resolvePeoplePayroll({ createService: payrollCreateService, updateService: payrollUpdateService }),
    ];
    const resolveAny = (type: string) => resolvers.map((r) => r(type)).find((fn) => fn !== null) ?? null;

    expect(resolveAny('lados.asset_fleet.create_job')).not.toBeNull();
    expect(resolveAny('lados.asset_fleet.complete_trip')).not.toBeNull();
    expect(resolveAny('lados.contract.register_instruction')).not.toBeNull();
    expect(resolveAny('lados.contract.lookup_clause_reference')).not.toBeNull();
    expect(resolveAny('lados.people_payroll.prepare_payroll_run')).not.toBeNull();
    expect(resolveAny('lados.people_payroll.record_payroll_approval')).not.toBeNull();
  });

  it('Asset & Fleet: create job → dispatch trip → complete trip, pausing (never certifying) when approval is required', async () => {
    const createService: IAssetCreateService = {
      createResource: jest.fn()
        .mockResolvedValueOnce({ id: 'job-w41-1', type: 'job', name: 'x', state: 'open', data: {} })
        .mockResolvedValueOnce({ id: 'trip-w41-1', type: 'trip', name: 'x', state: 'dispatched', data: {} }),
    };
    const transitionService: IAssetTransitionService = {
      transitionState: jest.fn().mockResolvedValue({
        id: 'trip-w41-1', type: 'trip', name: 'x', state: 'dispatched', data: {},
        approvalRequired: true, approvalTaskId: 'appr-w41-1',
      }),
    };

    const createJobExec = resolveAssetFleet({ createService })('lados.asset_fleet.create_job')!;
    const dispatchTripExec = resolveAssetFleet({ createService })('lados.asset_fleet.dispatch_trip')!;
    const completeTripExec = resolveAssetFleet({ transitionService })('lados.asset_fleet.complete_trip')!;

    const { ctx: jobCtx } = createMockNodeContext({ inputs: { request: { customer: 'Acme Corp', asset: 'Truck-01' } } });
    const jobResult = await createJobExec(jobCtx);
    expect(jobResult.status).toBe('success');
    const job = jobResult.outputs['job'] as { jobId: string };

    const { ctx: dispatchCtx } = createMockNodeContext({
      inputs: { job: { vehicle: 'Truck-01', driver: 'Ali', destination: 'Site A', jobId: job.jobId } },
    });
    const dispatchResult = await dispatchTripExec(dispatchCtx);
    expect(dispatchResult.status).toBe('success');
    const dispatch = dispatchResult.outputs['dispatch'] as { tripId: string };

    const { ctx: completeCtx } = createMockNodeContext({ inputs: { dispatch: { resourceId: dispatch.tripId, mileage: 85 } } });
    const completeResult = await completeTripExec(completeCtx);
    expect(completeResult.status).toBe('paused'); // never silently certifies
    expect(completeResult.pause?.context).toMatchObject({ approvalTaskId: 'appr-w41-1' });
  });

  it('Contract Admin: register instruction → prepare notice → track due date → lookup clause, always advisory', async () => {
    const createService: IContractCreateService = {
      createResource: jest.fn()
        .mockResolvedValueOnce({ id: 'inst-w41-1', type: 'contract_instruction', name: 'x', state: 'registered', data: {} })
        .mockResolvedValueOnce({ id: 'notice-w41-1', type: 'contract_notice', name: 'x', state: 'draft', data: {} }),
    };
    const updateService: IContractUpdateService = { updateResource: jest.fn().mockResolvedValue({ id: 'notice-w41-1', type: 'contract_notice', name: 'x', state: 'draft', data: {} }) };

    const registerExec = resolveContractAdmin({ createService })('lados.contract.register_instruction')!;
    const prepareNoticeExec = resolveContractAdmin({ createService })('lados.contract.prepare_notice')!;
    const trackDueDateExec = resolveContractAdmin({ updateService })('lados.contract.track_notice_due_date')!;
    const lookupClauseExec = resolveContractAdmin()('lados.contract.lookup_clause_reference')!;

    const { ctx: instructionCtx } = createMockNodeContext({
      inputs: { instruction: { instructionDate: '2026-07-01', issuer: 'Consultant', reference: 'CI-W41-001' } },
    });
    const instructionResult = await registerExec(instructionCtx);
    expect(instructionResult.status).toBe('success');

    const { ctx: noticeCtx } = createMockNodeContext({
      inputs: { event: { noticeType: 'Extension of Time', recipient: 'Employer' } },
    });
    const noticeResult = await prepareNoticeExec(noticeCtx);
    expect(noticeResult.status).toBe('success');
    const notice = noticeResult.outputs['notice'] as { noticeId: string };

    const { ctx: trackCtx } = createMockNodeContext({
      inputs: { notice: { resourceId: notice.noticeId, baseDate: '2026-07-04T00:00:00.000Z' } },
      config: { dueDateRule: 21, reminderOffsetDays: 5 },
    });
    const trackResult = await trackDueDateExec(trackCtx);
    expect(trackResult.status).toBe('success');
    const tracking = trackResult.outputs['tracking'] as { requiresReview: boolean };
    expect(tracking.requiresReview).toBe(true); // always advisory — disputed date interpretation requires human review

    const { ctx: lookupCtx } = createMockNodeContext({ inputs: { query: 'extension of time' } });
    const lookupResult = await lookupClauseExec(lookupCtx);
    expect(lookupResult.status).toBe('success');
    expect(lookupResult.outputs['clauses']).toEqual([]); // never fabricates a match with no candidate source
  });

  it('People & Payroll: prepare payroll run → approval blocked until a human actor is supplied', async () => {
    const createService: IPayrollCreateService = {
      createResource: jest.fn().mockResolvedValue({ id: 'payroll-w41-1', type: 'payroll_run', name: 'x', state: 'prepared', data: {} }),
    };
    const updateService: IPayrollUpdateService = {
      updateResource: jest.fn().mockResolvedValue({ id: 'payroll-w41-1', type: 'payroll_run', name: 'x', state: 'prepared', data: {} }),
    };

    const prepareExec = resolvePeoplePayroll({ createService })('lados.people_payroll.prepare_payroll_run')!;
    const approveExec = resolvePeoplePayroll({ updateService })('lados.people_payroll.record_payroll_approval')!;

    const { ctx: prepareCtx } = createMockNodeContext({ inputs: { inputs: { period: '2026-07', employeeGroup: 'Site Crew' } } });
    const prepareResult = await prepareExec(prepareCtx);
    expect(prepareResult.status).toBe('success');
    const payrollRun = prepareResult.outputs['payrollRun'] as { payrollRunId: string };

    // No approvedBy supplied — must fail, never silently approve
    const { ctx: badApprovalCtx } = createMockNodeContext({ inputs: { decision: { resourceId: payrollRun.payrollRunId, decision: 'approved' } } });
    const badApprovalResult = await approveExec(badApprovalCtx);
    expect(badApprovalResult.status).toBe('failure');
    expect(badApprovalResult.error?.code).toBe('MISSING_HUMAN_DECISION');

    // Human actor supplied — now succeeds
    const { ctx: goodApprovalCtx } = createMockNodeContext({
      inputs: { decision: { resourceId: payrollRun.payrollRunId, decision: 'approved', approvedBy: 'owner-w41-1' } },
    });
    const goodApprovalResult = await approveExec(goodApprovalCtx);
    expect(goodApprovalResult.status).toBe('success');
    expect(goodApprovalResult.outputs['approval']).toMatchObject({ resourceId: payrollRun.payrollRunId, approvedBy: 'owner-w41-1' });
  });
});
