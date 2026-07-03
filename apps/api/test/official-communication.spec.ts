/**
 * Phase 21 S4 (Wave 2) — @lados/official-communication.
 *
 * Covers the master-plan S4 test requirement: "TEST per node as S2" for all
 * 4 nodes (send_email, send_sms, send_in_app, send_reminder).
 *
 * Honesty note under test: send_sms is a stub — this suite asserts it is
 * still marked `executorStatus: "stub"` in nodes.json (not "implemented"),
 * and that it fails clearly (SMS_NOT_CONFIGURED) rather than silently
 * pretending to have sent anything, since no SMS provider is configured.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type IEmailService,
  type ISmsService,
  type IInAppNotificationService,
} from '@lados/official-communication';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../../packs/official/lados-communication/nodes.json'),
    'utf8',
  ),
);

function fakeEmailService(sent = true): IEmailService {
  return {
    sendEmail: jest.fn().mockResolvedValue(
      sent ? { sent: true, messageId: 'msg-1' } : { sent: false, messageId: null, error: 'SMTP down' },
    ),
  };
}

function fakeSmsService(sent = false): ISmsService {
  return {
    sendSms: jest.fn().mockResolvedValue(
      sent ? { sent: true, messageId: 'sms-1' } : { sent: false, messageId: null, error: 'SMS provider not configured' },
    ),
  };
}

function fakeNotificationService(): IInAppNotificationService {
  return { notify: jest.fn().mockResolvedValue('notif-1') };
}

describe('official-communication — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({
      emailService: fakeEmailService(),
      smsService: fakeSmsService(),
      notificationService: fakeNotificationService(),
    });

    for (const m of manifests) {
      expect(typeof resolve(m.type)).toBe('function');
    }
  });

  it('send_sms is honestly marked as a stub (no SMS provider configured anywhere)', () => {
    const smsNode = manifests.find((m) => m.type === 'lados.communication.send_sms')!;
    expect(smsNode.executorStatus).toBe('stub');
  });

  it('send_email / send_in_app / send_reminder are marked implemented', () => {
    for (const type of ['lados.communication.send_email', 'lados.communication.send_in_app', 'lados.communication.send_reminder']) {
      const node = manifests.find((m) => m.type === type)!;
      expect(node.executorStatus).toBe('implemented');
    }
  });

  it('unknown node types resolve to null', () => {
    const resolve = resolveNode();
    expect(resolve('lados.communication.does_not_exist')).toBeNull();
  });
});

describe('lados.communication.send_email', () => {
  it('fails with NO_SERVICE when no EmailService is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { message: { to: 'a@b.com', subject: 'Hi', body: 'text' } } });
    const exec = resolveNode()('lados.communication.send_email')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('sends an email successfully', async () => {
    const emailService = fakeEmailService(true);
    const { ctx } = createMockNodeContext({
      inputs: { message: { to: 'a@b.com', cc: 'c@d.com', subject: 'Hi', body: 'text' } },
    });
    const exec = resolveNode({ emailService })('lados.communication.send_email')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['delivery']).toMatchObject({ sent: true, messageId: 'msg-1' });
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('fails when to is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { message: { subject: 'Hi', body: 'text' } } });
    const exec = resolveNode({ emailService: fakeEmailService() })('lados.communication.send_email')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});

describe('lados.communication.send_sms — stub honesty', () => {
  it('fails with NO_SERVICE when no SmsService is injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { message: { phoneNumbers: '+60123', text: 'hi' } } });
    const exec = resolveNode()('lados.communication.send_sms')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('reports SMS_NOT_CONFIGURED rather than pretending to send', async () => {
    const smsService = fakeSmsService(false);
    const { ctx } = createMockNodeContext({ inputs: { message: { phoneNumbers: '+60123456789', text: 'reminder' } } });
    const exec = resolveNode({ smsService })('lados.communication.send_sms')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('SMS_NOT_CONFIGURED');
    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
  });
});

describe('lados.communication.send_in_app', () => {
  it('fails with NOT_IMPLEMENTED when only a role is given (no member-lookup service)', async () => {
    const { ctx } = createMockNodeContext({ inputs: { context: { role: 'owner', title: 'Hi' } } });
    const exec = resolveNode({ notificationService: fakeNotificationService() })('lados.communication.send_in_app')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NOT_IMPLEMENTED');
  });

  it('sends an in-app notification to a concrete user', async () => {
    const notificationService = fakeNotificationService();
    const { ctx } = createMockNodeContext({ inputs: { context: { userId: 'u1', title: 'Hi', body: 'body' } } });
    const exec = resolveNode({ notificationService })('lados.communication.send_in_app')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['notification']).toMatchObject({ notified: true, userId: 'u1' });
  });
});

describe('lados.communication.send_reminder', () => {
  it('sends via in_app by default', async () => {
    const notificationService = fakeNotificationService();
    const { ctx } = createMockNodeContext({ inputs: { target: { userId: 'u1', title: 'Due soon', dueDate: '2026-08-01' } } });
    const exec = resolveNode({ notificationService })('lados.communication.send_reminder')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['reminder']).toMatchObject({ sent: true, channel: 'in_app', dueDate: '2026-08-01' });
  });

  it('sends via email when channel="email"', async () => {
    const emailService = fakeEmailService(true);
    const { ctx } = createMockNodeContext({
      inputs: { target: { channel: 'email', email: 'a@b.com', title: 'Due soon' } },
    });
    const exec = resolveNode({ emailService })('lados.communication.send_reminder')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['reminder']).toMatchObject({ sent: true, channel: 'email' });
  });

  it('fails when title is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { target: {} } });
    const exec = resolveNode()('lados.communication.send_reminder')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });
});
