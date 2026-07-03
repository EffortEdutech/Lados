/**
 * Phase 21 S2 (Wave 1) — @lados/official-human-work.
 *
 * Covers the master-plan S2 test requirement: "Jest per node: manifest ↔
 * executor contract, MockNodeContext execution, pause/resume for approval"
 * for all 4 nodes (request_approval, assign_user, record_decision,
 * review_checkpoint).
 *
 * AI guardrail under test: request_approval / review_checkpoint always
 * return status:'paused' and never fabricate a decision — resumption is
 * modeled here by calling the executor a second time with the decision
 * outcome injected via ctx.inputs, exactly as record_decision expects it
 * to arrive from a human actor (never inferred).
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type IApprovalTaskService,
  type INotificationService,
  type IAssignableResourceService,
} from '@lados/official-human-work';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../../packs/official/lados-human-work/nodes.json'),
    'utf8',
  ),
);

function fakeApprovalService(taskId = 'task-001'): IApprovalTaskService {
  return {
    createTask: jest.fn().mockResolvedValue({ taskId }),
  };
}

function fakeNotificationService(): INotificationService {
  return {
    notify: jest.fn().mockResolvedValue('notif-001'),
  };
}

function fakeResourceService(): IAssignableResourceService {
  return {
    updateResource: jest.fn().mockResolvedValue({ id: 'resource-001' }),
  };
}

describe('official-human-work — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      approvalTaskService: fakeApprovalService(),
      notificationService: fakeNotificationService(),
      resourceService: fakeResourceService(),
    });

    for (const m of manifests) {
      expect(typeof resolve(m.type)).toBe('function');
    }
  });

  it('every node is marked implemented', () => {
    for (const m of manifests) {
      expect(m.executorStatus).toBe('implemented');
    }
  });

  it('unknown node types resolve to null', () => {
    const resolve = resolveNode();
    expect(resolve('lados.human.does_not_exist')).toBeNull();
  });
});

describe('lados.human.request_approval — pause/resume', () => {
  it('fails clearly with NO_SERVICE when no ApprovalTaskService is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { title: 'Approve variation #3' } });
    const exec = resolveNode()('lados.human.request_approval')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('pauses the workflow and creates an approval task — never auto-approves', async () => {
    const approvalService = fakeApprovalService('approval-task-42');
    const notificationService = fakeNotificationService();
    const { ctx } = createMockNodeContext({
      inputs: { title: 'Approve variation #3', assigneeRole: 'owner' },
    });
    const exec = resolveNode({ approvalTaskService: approvalService, notificationService })(
      'lados.human.request_approval',
    )!;

    const result = await exec(ctx);

    expect(result.status).toBe('paused');
    expect(result.pause).toMatchObject({ title: 'Approve variation #3', assigneeRole: 'owner' });
    expect(result.outputs['approvalTask']).toMatchObject({
      approvalTaskId: 'approval-task-42',
      pending: true,
    });
    expect(approvalService.createTask).toHaveBeenCalledTimes(1);
    expect(notificationService.notify).toHaveBeenCalledTimes(1);
  });

  it('fails when title is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode({ approvalTaskService: fakeApprovalService() })(
      'lados.human.request_approval',
    )!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('resume path: a human decision recorded afterwards must carry decisionBy explicitly', async () => {
    // Simulates the two-step pause/resume flow: request_approval pauses (above),
    // then once a human decides via POST /approvals/:id/decide, the workflow
    // resumes into lados.human.record_decision with the human's identity —
    // never inferred by the AI or the pause node itself.
    const { ctx } = createMockNodeContext({
      inputs: {
        decisionType: 'variation-approval',
        decisionBy: 'user-owner-001',
        evidence: { approvalTaskId: 'approval-task-42' },
      },
    });
    const exec = resolveNode()('lados.human.record_decision')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['decision']).toMatchObject({
      decisionType: 'variation-approval',
      decisionBy: 'user-owner-001',
    });
  });
});

describe('lados.human.assign_user', () => {
  it('fails with NO_SERVICE when no ResourceService is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { resourceId: 'r1', userId: 'u1' } });
    const exec = resolveNode()('lados.human.assign_user')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('assigns a user to a resource', async () => {
    const resourceService = fakeResourceService();
    const { ctx } = createMockNodeContext({
      inputs: { resourceId: 'r1', userId: 'u1', assigneeRole: 'reviewer' },
    });
    const exec = resolveNode({ resourceService })('lados.human.assign_user')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['assignment']).toMatchObject({ assigned: true, resourceId: 'r1', userId: 'u1' });
    expect(resourceService.updateResource).toHaveBeenCalledTimes(1);
  });

  it('fails when userId is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { resourceId: 'r1' } });
    const exec = resolveNode({ resourceService: fakeResourceService() })('lados.human.assign_user')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.human.record_decision', () => {
  const exec = resolveNode()('lados.human.record_decision')!;

  it('never fabricates decisionBy — fails with MISSING_HUMAN_DECISION when absent', async () => {
    const { ctx } = createMockNodeContext({ inputs: { decisionType: 'variation-approval' } });

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_HUMAN_DECISION');
  });

  it('records a full decision including evidence', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        decisionType: 'variation-approval',
        decisionBy: 'user-owner-001',
        notes: 'Approved with conditions',
        evidence: { approvalTaskId: 'approval-task-42' },
      },
    });

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['decision']).toMatchObject({
      decisionType: 'variation-approval',
      decisionBy: 'user-owner-001',
      notes: 'Approved with conditions',
      evidence: { approvalTaskId: 'approval-task-42' },
    });
  });
});

describe('lados.human.review_checkpoint — pause/resume', () => {
  it('pauses with a generic reviewer role by default', async () => {
    const approvalService = fakeApprovalService('review-task-7');
    const { ctx } = createMockNodeContext();
    const exec = resolveNode({ approvalTaskService: approvalService })('lados.human.review_checkpoint')!;

    const result = await exec(ctx);

    expect(result.status).toBe('paused');
    expect(result.pause?.assigneeRole).toBe('reviewer');
    expect(result.outputs['reviewTask']).toMatchObject({ reviewTaskId: 'review-task-7', pending: true });
  });

  it('fails with NO_SERVICE when no ApprovalTaskService is injected', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.human.review_checkpoint')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });
});
