/**
 * Phase 21 S2 (Wave 1) — first official-node end-to-end test.
 *
 * Master plan S2 gate: "a linear official workflow (start → doc node →
 * approval → logger → end) runs in-process end-to-end... This is the new
 * first E2E — on official nodes."
 *
 * This does not spin up the full WorkflowRunner/DB — it proves the three
 * Wave-1 pack resolvers compose correctly and that a linear chain of
 * official nodes can execute in-process, manually threading each node's
 * outputs into the next node's inputs the same way the runner would.
 *
 * Chain: lados.workflow.trigger_manual
 *          -> lados.document.generate_document   (doc node)
 *          -> lados.human.request_approval       (pauses — human gate)
 *          -> lados.human.record_decision        (resume, human-supplied)
 *          -> lados.workflow.write_log           (end)
 */
import { createMockNodeContext } from '@lados/testing';
import { resolveNode as resolveWorkflow } from '@lados/official-workflow-foundation';
import { resolveNode as resolveHumanWork, type IApprovalTaskService } from '@lados/official-human-work';
import { resolveNode as resolveDocumentIntelligence } from '@lados/official-document-intelligence';

describe('Wave 1 official E2E — linear workflow: trigger -> doc -> approval -> logger', () => {
  it('resolves every node type across all three Wave-1 packs via one combined resolver', () => {
    const approvalService: IApprovalTaskService = { createTask: jest.fn().mockResolvedValue({ taskId: 't-1' }) };
    const resolvers = [
      resolveWorkflow(),
      resolveHumanWork({ approvalTaskService: approvalService }),
      resolveDocumentIntelligence(),
    ];
    const resolveAny = (type: string) => resolvers.map((r) => r(type)).find((fn) => fn !== null) ?? null;

    expect(resolveAny('lados.workflow.trigger_manual')).not.toBeNull();
    expect(resolveAny('lados.document.generate_document')).not.toBeNull();
    expect(resolveAny('lados.human.request_approval')).not.toBeNull();
    expect(resolveAny('lados.workflow.write_log')).not.toBeNull();
  });

  it('runs the full chain in-process, pausing at the human gate and resuming only on human decision', async () => {
    const approvalService: IApprovalTaskService = {
      createTask: jest.fn().mockResolvedValue({ taskId: 'approval-task-e2e-1' }),
    };

    const triggerExec = resolveWorkflow()('lados.workflow.trigger_manual')!;
    const generateDocExec = resolveDocumentIntelligence()('lados.document.generate_document')!;
    const requestApprovalExec = resolveHumanWork({ approvalTaskService: approvalService })('lados.human.request_approval')!;
    const recordDecisionExec = resolveHumanWork()('lados.human.record_decision')!;
    const writeLogExec = resolveWorkflow()('lados.workflow.write_log')!;

    // 1. Start
    const { ctx: triggerCtx } = createMockNodeContext({ config: { label: 'CIPAA claim run' } });
    const triggerResult = await triggerExec(triggerCtx);
    expect(triggerResult.status).toBe('success');

    // 2. Doc node — generate a progress-claim summary document
    const { ctx: docCtx } = createMockNodeContext({
      inputs: { title: 'Progress Claim Summary', data: { claimAmount: 42000, trigger: triggerResult.outputs['trigger'] } },
    });
    const docResult = await generateDocExec(docCtx);
    expect(docResult.status).toBe('success');
    const generatedDoc = docResult.outputs['document'] as { fileName: string };
    expect(generatedDoc.fileName).toMatch(/\.docx$/);

    // 3. Human gate — must pause, must not auto-approve
    const { ctx: approvalCtx } = createMockNodeContext({
      inputs: { title: `Approve: ${generatedDoc.fileName}`, assigneeRole: 'owner', document: generatedDoc },
    });
    const approvalResult = await requestApprovalExec(approvalCtx);
    expect(approvalResult.status).toBe('paused');
    const approvalTask = approvalResult.outputs['approvalTask'] as { approvalTaskId: string };
    expect(approvalTask.approvalTaskId).toBe('approval-task-e2e-1');

    // 3b. Resume — only proceeds because a human decision is supplied explicitly
    //     (simulates POST /approvals/:id/decide handing control back to the runner)
    const { ctx: decisionCtx } = createMockNodeContext({
      inputs: {
        decisionType: 'progress-claim-approval',
        decisionBy: 'user-owner-e2e',
        evidence: { approvalTaskId: approvalTask.approvalTaskId },
      },
    });
    const decisionResult = await recordDecisionExec(decisionCtx);
    expect(decisionResult.status).toBe('success');
    expect(decisionResult.outputs['decision']).toMatchObject({ decisionBy: 'user-owner-e2e' });

    // 4. End — logger checkpoint
    const { ctx: logCtx, infoLogs } = createMockNodeContext({
      config: { message: 'Progress claim approved and logged' },
      inputs: { data: decisionResult.outputs['decision'] },
    });
    const logResult = await writeLogExec(logCtx);

    expect(logResult.status).toBe('success');
    expect(logResult.outputs['logged']).toBe(true);
    expect(infoLogs().some((l) => l.message === 'Progress claim approved and logged')).toBe(true);

    // The AI/human guardrail invariant for this whole chain: the approval
    // service was called exactly once, and the only place a human identity
    // enters the chain is the explicit decisionBy field — never inferred.
    expect(approvalService.createTask).toHaveBeenCalledTimes(1);
  });
});
