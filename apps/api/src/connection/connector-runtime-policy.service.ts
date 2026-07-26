import { Injectable } from '@nestjs/common';

export interface ConnectorPolicy {
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
  idempotencyKey?: string;
}

export interface ConnectorAttemptContext {
  attempt: number;
  idempotencyKey?: string;
}

export interface ProviderFailure {
  code: string;
  message: string;
  retryable: boolean;
  status?: number;
  retryAfterMs?: number;
}

export class ConnectorOperationError extends Error {
  constructor(readonly failure: ProviderFailure) {
    super(failure.message);
  }
}

@Injectable()
export class ConnectorRuntimePolicyService {
  async execute<T>(
    operation: (context: ConnectorAttemptContext) => Promise<T>,
    policy: ConnectorPolicy = {},
  ): Promise<T> {
    const maxAttempts = Math.max(1, policy.maxAttempts ?? 3);
    const timeoutMs = Math.max(1, policy.timeoutMs ?? 30_000);
    let lastFailure: ProviderFailure | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.withTimeout(operation({ attempt, idempotencyKey: policy.idempotencyKey }), timeoutMs);
      } catch (error) {
        lastFailure = this.normalizeError(error);
        if (!lastFailure.retryable || attempt === maxAttempts) break;
        const delayMs = lastFailure.retryAfterMs ?? (policy.backoffMs ?? 250) * 2 ** (attempt - 1);
        if (delayMs > 0) await this.delay(delayMs);
      }
    }

    throw new ConnectorOperationError(lastFailure ?? {
      code: 'PROVIDER_ERROR', message: 'Provider operation failed', retryable: false,
    });
  }

  async paginate<T>(
    loadPage: (cursor?: string) => Promise<{ items: T[]; nextCursor?: string }>,
    maxPages = 100,
  ): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page += 1) {
      const result = await loadPage(cursor);
      items.push(...result.items);
      if (!result.nextCursor) return items;
      if (result.nextCursor === cursor) {
        throw new ConnectorOperationError({ code: 'PAGINATION_LOOP', message: 'Provider repeated a page cursor', retryable: false });
      }
      cursor = result.nextCursor;
    }
    throw new ConnectorOperationError({ code: 'PAGINATION_LIMIT', message: `Provider exceeded ${maxPages} pages`, retryable: false });
  }

  normalizeError(error: unknown): ProviderFailure {
    if (error instanceof ConnectorOperationError) return error.failure;
    if (typeof error === 'object' && error !== null) {
      const value = error as Record<string, unknown>;
      const status = typeof value['status'] === 'number' ? value['status'] : undefined;
      const retryAfterMs = typeof value['retryAfterMs'] === 'number' ? value['retryAfterMs'] : undefined;
      const code = typeof value['code'] === 'string' ? value['code'] : status ? `PROVIDER_HTTP_${status}` : 'PROVIDER_ERROR';
      return {
        code,
        message: this.safeMessage(value['message']),
        retryable: Boolean(value['retryable']) || status === 408 || status === 429 || Boolean(status && status >= 500),
        ...(status !== undefined ? { status } : {}),
        ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      };
    }
    return { code: 'PROVIDER_ERROR', message: 'Provider operation failed', retryable: false };
  }

  private safeMessage(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) return 'Provider operation failed';
    return value.replace(/(token|secret|password|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi, '$1=[REDACTED]').slice(0, 500);
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new ConnectorOperationError({
            code: 'PROVIDER_TIMEOUT', message: `Provider operation exceeded ${timeoutMs}ms`, retryable: true,
          })), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

