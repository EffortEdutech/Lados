import { ConnectorOperationError, ConnectorRuntimePolicyService } from './connector-runtime-policy.service';

describe('ConnectorRuntimePolicyService', () => {
  const service = new ConnectorRuntimePolicyService();

  it('retries transient failures with one stable idempotency key', async () => {
    const attempts: Array<{ attempt: number; idempotencyKey?: string }> = [];
    const result = await service.execute(async (context) => {
      attempts.push(context);
      if (context.attempt < 3) throw { status: 429, retryAfterMs: 0, message: 'rate limited' };
      return 'ok';
    }, { maxAttempts: 3, backoffMs: 0, idempotencyKey: 'run-1:node-1' });

    expect(result).toBe('ok');
    expect(attempts).toEqual([
      { attempt: 1, idempotencyKey: 'run-1:node-1' },
      { attempt: 2, idempotencyKey: 'run-1:node-1' },
      { attempt: 3, idempotencyKey: 'run-1:node-1' },
    ]);
  });

  it('times out and returns a normalized provider failure', async () => {
    await expect(service.execute(() => new Promise(() => undefined), { timeoutMs: 5, maxAttempts: 1 }))
      .rejects.toMatchObject({ failure: { code: 'PROVIDER_TIMEOUT', retryable: true } });
  });

  it('paginates and rejects repeated cursors', async () => {
    await expect(service.paginate(async (cursor) => cursor
      ? { items: [2] }
      : { items: [1], nextCursor: 'next' })).resolves.toEqual([1, 2]);
    await expect(service.paginate(async () => ({ items: [], nextCursor: 'same' }), 3))
      .rejects.toBeInstanceOf(ConnectorOperationError);
  });

  it('redacts credential-shaped values from provider errors', () => {
    expect(service.normalizeError({ message: 'token=abc123 password=hunter2', status: 401 }).message)
      .toBe('token=[REDACTED] password=[REDACTED]');
  });
});

