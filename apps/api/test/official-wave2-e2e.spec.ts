/**
 * Phase 21 S4 (Wave 2) — official-node end-to-end test across Wave 1 + Wave 2.
 *
 * Master plan S4 gate: "template document_control.review_and_signoff
 * (Production-ready target) runs E2E on official nodes." That named
 * template itself is a templates-wave deliverable (S5/S6 — every pack's
 * `verification.templates` is still "not_started", Wave 2 included), so it
 * cannot run for real yet. As a proxy — same approach S2 used for its own
 * first official E2E before templates existed — this test chains a
 * representative flow across all 4 packs shipped so far (Workflow
 * Foundation, Human Work, Task/Case, Communication) to prove the resolvers
 * compose correctly in-process:
 *
 *   trigger -> case.open -> human.request_approval (pauses)
 *          -> human.record_decision (resume, human-supplied)
 *          -> task.update_status (case resource -> in progress)
 *          -> communication.send_in_app (notify requester)
 *          -> workflow.write_log
 */
import { createMockNodeContext } from '@lados/testing';
import { resolveNode as resolveWorkflow } from '@lados/official-workflow-foundation';
import { resolveNode as resolveHumanWork, type IApprovalTaskService } from '@lados/official-human-work';
import { resolveNode as resolveTaskCase, type ITransitionResourceService } from '@lados/official-task-case';
import { resolveNode as resolveCommunication, type IInAppNotificationService } from '@lados/official-communication';
import type { ICreateResourceService } from '@lados/official-task-case';

describe('Wave 1 + Wave 2 official E2E — case review-and-signoff proxy chain', () => {
  it('resolves nodes across all four packs via one combined resolver', () => {
    const approvalService: IApprovalTaskService = { createTask: jest.fn().mockResolvedValue({ taskId: 't-1' }) };
    const createService: ICreateResourceService = {
      createResource: jest.fn().mockResolvedValue({ id: 'case-1', type: 'case', name: 'x', state: 'open', data: {} }),
    };
    const resolvers = [
      resolveWorkflow(),
      resolveHumanWork({ approvalTaskService: approvalService }),
      resolveTaskCase({ createService }),
      resolveCommunication({}),
    ];
    const resolveAny = (type: string) => resolvers.map((r) => r(type)).find((fn) => fn !== null) ?? null;

    expect(resolveAny('lados.workflow.trigger_manual')).not.toBeNull();
    expect(resolveAny('lados.case.open')).not.toBeNull();
    expect(resolveAny('lados.human.request_approval')).not.toBeNull();
    expect(resolveAny('lados.task.update_status')).not.toBeNull();
    expect(resolveAny('lados.communication.send_in_app')).not.toBeNull();
    expect(resolveAny('lados.workflow.write_log')).not.toBeNull();
  });

  it('runs the full chain in-process, pausing at the human gate and never fabricating the decision', async () => {
    const approvalService: IApprovalTaskService = {
      createTask: jest.fn().mockResolvedValue({ taskId: 'approval-task-w2e2e-1' }),
    };
    const createService: ICreateResourceService = {
      createResource: jest.fn().mockResolvedValue({ id: 'case-w2e2e-1', type: 'case', name: 'Defect #12', state: 'open', data: {} }),
    };
    const transitionService: ITransitionResourceService = {
      transitionState: jest.fn().mockResolvedValue({
        id: 'case-w2e2e-1', type: 'case', name: 'Defect #12', state: 'in_review', data: {},
      }),
    };
    const notificationService: IInAppNotificationService = { notify: jest.fn().mockResolvedValue('notif-w2e2e-1') };

    const triggerExec        = resolveWorkflow()('lados.workflow.trigger_manual')!;
    const openCaseExec       = resolveTaskCase({ createService })('lados.case.open')!;
    const requestApprovalExec = resolveHumanWork({ approvalTaskService: approvalService })('lados.human.request_approval')!;
    const recordDecisionExec = resolveHumanWork()('lados.human.record_decision')!;
    const updateStatusExec   = resolveTaskCase({ transitionService })('lados.task.update_status')!;
    const sendInAppExec      = resolveCommunication({ notificationService })('lados.communication.send_in_app')!;
    const writeLogExec       = resolveWorkflow()('lados.workflow.write_log')!;

    // 1. Start
    const { ctx: triggerCtx } = createMockNodeContext({ config: { label: 'Defect review-and-signoff run' } });
    const triggerResult = await triggerExec(triggerCtx);
    expect(triggerResult.status).toBe('success');

    // 2. Open a case for the defect
    const { ctx: caseCtx } = createMockNodeContext({ inputs: { source: { title: 'Defect #12', caseType: 'defect' } } });
    const caseResult = await openCaseExec(caseCtx);
    expect(caseResult.status).toBe('success');
    const openedCase = caseResult.outputs['case'] as { caseId: string; title: string };
    expect(openedCase.caseId).toBe('case-w2e2e-1');

    // 3. Human gate — must pause, must not auto-approve
    const { ctx: approvalCtx } = createMockNodeContext({
      inputs: { title: `Review: ${openedCase.title}`, assigneeRole: 'owner', case: openedCase },
    });
    const approvalResult = await requestApprovalExec(approvalCtx);
    expect(approvalResult.status).toBe('paused');
    const approvalTask = approvalResult.outputs['approvalTask'] as { approvalTaskId: string };
    expect(approvalTask.approvalTaskId).toBe('approval-task-w2e2e-1');

    // 3b. Resume — only proceeds because a human decision is supplied explicitly
    const { ctx: decisionCtx } = createMockNodeContext({
      inputs: {
        decisionType: 'defect-review',
        decisionBy: 'user-owner-w2e2e',
        evidence: { approvalTaskId: approvalTask.approvalTaskId },
      },
    });
    const decisionResult = await recordDecisionExec(decisionCtx);
    expect(decisionResult.status).toBe('success');
    expect(decisionResult.outputs['decision']).toMatchObject({ decisionBy: 'user-owner-w2e2e' });

    // 4. Move the case forward now that a human has decided
    const { ctx: statusCtx } = createMockNodeContext({
      inputs: { task: { taskId: openedCase.caseId, status: 'in_review', reason: 'Approved for review' } },
    });
    const statusResult = await updateStatusExec(statusCtx);
    expect(statusResult.status).toBe('success');
    expect(statusResult.outputs['updated']).toMatchObject({ taskId: 'case-w2e2e-1', status: 'in_review' });

    // 5. Notify the requester
    const { ctx: notifyCtx } = createMockNodeContext({
      inputs: { context: { userId: 'requester-1', title: 'Your defect is under review', body: 'Case #12 moved to in_review.' } },
    });
    const notifyResult = await sendInAppExec(notifyCtx);
    expect(notifyResult.status).toBe('success');
    expect(notifyResult.outputs['notification']).toMatchObject({ notified: true, userId: 'requester-1' });

    // 6. End — logger checkpoint
    const { ctx: logCtx, infoLogs } = createMockNodeContext({
      config: { message: 'Defect review-and-signoff chain complete' },
      inputs: { data: statusResult.outputs['updated'] },
    });
    const logResult = await writeLogExec(logCtx);
    expect(logResult.status).toBe('success');
    expect(logResult.outputs['logged']).toBe(true);
    expect(infoLogs().some((l) => l.message === 'Defect review-and-signoff chain complete')).toBe(true);

    // The AI/human guardrail invariant for this whole chain: the approval
    // service was called exactly once, and the only place a human identity
    // enters the chain is the explicit decisionBy field — never inferred.
    expect(approvalService.createTask).toHaveBeenCalledTimes(1);
  });
});
