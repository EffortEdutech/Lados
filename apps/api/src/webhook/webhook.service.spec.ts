/**
 * PD-2/PD-3 — WebhookService HMAC signature verification tests.
 * Covers the deprecated global-secret path (verifySignature) and the PD-3
 * per-org path (verifySignatureForOrg) with rotation and production guard.
 */
import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';

const SECRET = 'test-webhook-secret';

function sign(body: Buffer, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function makeService(secret: string | undefined): WebhookService {
  const config = { get: jest.fn().mockReturnValue(secret) };
  // eventBus and supabase are not touched by verifySignature
  return new WebhookService(config as never, {} as never, {} as never);
}

/** PD-3 — service whose supabase stub returns the given active org secrets. */
function makeOrgService(globalSecret: string | undefined, orgSecrets: string[]): WebhookService {
  const config = { get: jest.fn().mockReturnValue(globalSecret) };
  const supabase = {
    admin: {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({ data: orgSecrets.map((s) => ({ secret: s })) }),
          }),
        }),
      }),
    },
  };
  return new WebhookService(config as never, {} as never, supabase as never);
}

describe('WebhookService.verifySignature', () => {
  const body = Buffer.from(JSON.stringify({ event: 'invoice.submitted', amount: 100 }));

  it('accepts a valid HMAC-SHA256 signature', () => {
    const svc = makeService(SECRET);
    expect(() => svc.verifySignature(body, sign(body, SECRET))).not.toThrow();
  });

  it('rejects a missing signature header', () => {
    const svc = makeService(SECRET);
    expect(() => svc.verifySignature(body, undefined)).toThrow(UnauthorizedException);
  });

  it('rejects a signature without the sha256= prefix', () => {
    const svc = makeService(SECRET);
    const raw = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    expect(() => svc.verifySignature(body, raw)).toThrow(UnauthorizedException);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const svc = makeService(SECRET);
    expect(() => svc.verifySignature(body, sign(body, 'wrong-secret'))).toThrow(UnauthorizedException);
  });

  it('rejects a signature over a tampered body', () => {
    const svc = makeService(SECRET);
    const tampered = Buffer.from(JSON.stringify({ event: 'invoice.submitted', amount: 999999 }));
    expect(() => svc.verifySignature(tampered, sign(body, SECRET))).toThrow(UnauthorizedException);
  });

  it('rejects signatures of the wrong length (constant-time compare guard)', () => {
    const svc = makeService(SECRET);
    expect(() => svc.verifySignature(body, 'sha256=abcd')).toThrow(UnauthorizedException);
  });

  it('skips verification when WEBHOOK_SECRET is unset (documented dev-only behaviour)', () => {
    const svc = makeService(undefined);
    expect(() => svc.verifySignature(body, undefined)).not.toThrow();
  });
});

describe('WebhookService.verifySignatureForOrg (PD-3)', () => {
  const ORG = 'eeeeeeee-0001-0000-0000-000000000001';
  const body = Buffer.from(JSON.stringify({ event: 'claim.submitted' }));

  it('accepts a signature made with the org secret', async () => {
    const svc = makeOrgService(undefined, ['org-secret-1']);
    await expect(svc.verifySignatureForOrg(ORG, body, sign(body, 'org-secret-1'))).resolves.toBeUndefined();
  });

  it('accepts any active secret during rotation overlap', async () => {
    const svc = makeOrgService(undefined, ['old-secret', 'new-secret']);
    await expect(svc.verifySignatureForOrg(ORG, body, sign(body, 'old-secret'))).resolves.toBeUndefined();
    await expect(svc.verifySignatureForOrg(ORG, body, sign(body, 'new-secret'))).resolves.toBeUndefined();
  });

  it('rejects a signature made with a revoked/unknown secret', async () => {
    const svc = makeOrgService(undefined, ['current-secret']);
    await expect(svc.verifySignatureForOrg(ORG, body, sign(body, 'revoked-secret'))).rejects.toThrow(UnauthorizedException);
  });

  it('org secret takes precedence — global secret no longer accepted once org secrets exist', async () => {
    const svc = makeOrgService('global-secret', ['org-secret']);
    await expect(svc.verifySignatureForOrg(ORG, body, sign(body, 'global-secret'))).rejects.toThrow(UnauthorizedException);
  });

  it('falls back to the global secret when the org has none', async () => {
    const svc = makeOrgService('global-secret', []);
    await expect(svc.verifySignatureForOrg(ORG, body, sign(body, 'global-secret'))).resolves.toBeUndefined();
  });

  it('rejects in production when no secret is configured anywhere', async () => {
    const svc = makeOrgService(undefined, []);
    const prev = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      await expect(svc.verifySignatureForOrg(ORG, body, undefined)).rejects.toThrow(UnauthorizedException);
    } finally {
      process.env['NODE_ENV'] = prev;
    }
  });

  it('skips (with warning) in non-production when no secret is configured', async () => {
    const svc = makeOrgService(undefined, []);
    await expect(svc.verifySignatureForOrg(ORG, body, undefined)).resolves.toBeUndefined();
  });
});
