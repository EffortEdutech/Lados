import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import type { ConnectionProfileRow, SecretEnvelope } from './connection.types';

const envelope: SecretEnvelope = {
  version: 1,
  algorithm: 'aes-256-gcm',
  iv: 'iv',
  tag: 'tag',
  ciphertext: 'ciphertext',
};

function row(overrides: Partial<ConnectionProfileRow> = {}): ConnectionProfileRow {
  return {
    id: 'connection-1', organization_id: 'org-1', name: 'Primary', provider: 'generic',
    connection_type: 'http', auth_type: 'api_key', status: 'active', health_status: 'untested',
    scopes: ['messages.read'], secret_envelope: envelope, metadata: {}, token_expires_at: null,
    last_verified_at: null, last_error_code: null, created_by: 'user-1', updated_by: 'user-1',
    created_at: '2026-07-26T00:00:00.000Z', updated_at: '2026-07-26T00:00:00.000Z',
    ...overrides,
  };
}

function makeService(profile: ConnectionProfileRow) {
  const query: Record<string, jest.Mock> = {};
  query['select'] = jest.fn(() => query);
  query['eq'] = jest.fn(() => query);
  query['order'] = jest.fn(async () => ({ data: [profile], error: null }));
  query['maybeSingle'] = jest.fn(async () => ({ data: profile, error: null }));
  const supabase = { admin: { from: jest.fn(() => query) } };
  const security = { requirePermission: jest.fn(async () => 'admin') };
  const crypto = { decrypt: jest.fn(() => ({ apiKey: 'plain-secret' })), encrypt: jest.fn(() => envelope) };
  const adapters = { resolve: jest.fn() };
  const service = new ConnectionService(supabase as never, security as never, crypto as never, adapters as never);
  return { service, security, crypto };
}

describe('ConnectionService secret boundary', () => {
  it('returns sanitized list records and enforces connection.view', async () => {
    const { service, security, crypto } = makeService(row());
    const result = await service.list('org-1', 'user-1');

    expect(security.requirePermission).toHaveBeenCalledWith('user-1', 'org-1', 'connection.view');
    expect(crypto.decrypt).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ id: 'connection-1', hasCredentials: true });
    expect(JSON.stringify(result)).not.toContain('secret_envelope');
    expect(JSON.stringify(result)).not.toContain('plain-secret');
    expect(JSON.stringify(result)).not.toContain('ciphertext');
  });

  it('resolves credentials only for an active profile with required scopes', async () => {
    const { service } = makeService(row());
    await expect(service.resolve('org-1', 'connection-1', ['messages.read'])).resolves.toMatchObject({
      organizationId: 'org-1', credentials: { apiKey: 'plain-secret' },
    });
  });

  it('rejects disabled, expired, and under-scoped profiles before node use', async () => {
    await expect(makeService(row({ status: 'disabled' })).service.resolve('org-1', 'connection-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(makeService(row({ token_expires_at: '2020-01-01T00:00:00.000Z' })).service.resolve('org-1', 'connection-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(makeService(row()).service.resolve('org-1', 'connection-1', ['messages.send'])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow a member to manage a connection', async () => {
    const { service, security } = makeService(row());
    security.requirePermission.mockRejectedValueOnce(new ForbiddenException('admin required'));
    await expect(service.test('org-1', 'connection-1', 'member-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(security.requirePermission).toHaveBeenCalledWith('member-1', 'org-1', 'connection.manage');
  });

  it('rejects credential-shaped values in client-visible metadata', async () => {
    const { service } = makeService(row());
    await expect(service.create('org-1', 'user-1', {
      name: 'Unsafe', provider: 'generic', connectionType: 'http', authType: 'none',
      metadata: { apiKey: 'must-not-be-here' },
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
