/**
 * WebhookService — Phase 5 (Event-Driven Triggers)
 *
 * Handles HMAC-SHA256 signature verification for inbound webhooks.
 *
 * Signature format (compatible with GitHub, Stripe, and most modern webhook senders):
 *   X-Lados-Signature: sha256=<hex>
 *
 * The shared secret is read from the WEBHOOK_SECRET env var.
 * If the env var is not set, signature verification is SKIPPED and a warning is
 * logged — useful for local dev but should never be the case in production.
 *
 * After verification, the service publishes a synthetic event of type
 * 'webhook.<path>' to the EventBus. Any workflow that was published with a
 * WebhookTrigger for that path will have a matching subscription and will be
 * triggered automatically via dispatchSubscriptions().
 *
 * AI guardrail: webhook delivery triggers a workflow run but never directly
 * approves, certifies, releases payment, or creates a final commercial fact.
 * Those actions still require a core.human_approval node within the triggered workflow.
 */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EventBusService } from '../event-bus/event-bus.service';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly config:   ConfigService,
    private readonly eventBus: EventBusService,
    private readonly supabase: SupabaseService,
  ) {}

  // ── HMAC verification ─────────────────────────────────────────────────────

  /**
   * Extract the hex digest from an 'sha256=<hex>' header value.
   * @throws UnauthorizedException on missing/malformed header
   */
  private parseSignatureHeader(signature: string | undefined): string {
    if (!signature) {
      throw new UnauthorizedException('Missing X-Lados-Signature header');
    }
    const prefix = 'sha256=';
    if (!signature.startsWith(prefix)) {
      throw new UnauthorizedException('X-Lados-Signature must be prefixed with "sha256="');
    }
    return signature.slice(prefix.length);
  }

  /** Constant-time HMAC-SHA256 comparison of one candidate secret. */
  private signatureMatches(rawBody: Buffer, providedHex: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const providedBuf = Buffer.from(providedHex, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
  }

  /**
   * PD-3 — Verify a webhook signature against the organization's active secrets.
   *
   * Resolution order:
   *   1. Active rows in organization_webhook_secrets (multiple allowed → rotation overlap)
   *   2. Global WEBHOOK_SECRET env var (DEPRECATED fallback, warns)
   *   3. No secret at all → REJECT in production; skip with warning in dev only
   *
   * @throws UnauthorizedException if verification fails
   */
  async verifySignatureForOrg(orgId: string, rawBody: Buffer, signature: string | undefined): Promise<void> {
    const { data: rows } = await this.supabase.admin
      .from('organization_webhook_secrets')
      .select('secret')
      .eq('organization_id', orgId)
      .is('revoked_at', null);

    const orgSecrets = (rows ?? []).map((r: { secret: string }) => r.secret);
    const globalSecret = this.config.get<string>('WEBHOOK_SECRET');
    const secrets = orgSecrets.length > 0 ? orgSecrets : globalSecret ? [globalSecret] : [];

    if (secrets.length === 0) {
      if (process.env['NODE_ENV'] === 'production') {
        throw new UnauthorizedException('No webhook secret configured for this organization');
      }
      this.logger.warn(
        `No webhook secret for org ${orgId} and WEBHOOK_SECRET unset — skipping verification (dev only)`,
      );
      return;
    }

    if (orgSecrets.length === 0) {
      this.logger.warn(
        `Org ${orgId} is using the deprecated global WEBHOOK_SECRET — create a per-org secret (POST /webhook-secrets)`,
      );
    }

    const providedHex = this.parseSignatureHeader(signature);
    for (const secret of secrets) {
      if (this.signatureMatches(rawBody, providedHex, secret)) return;
    }
    throw new UnauthorizedException('Invalid webhook signature');
  }

  /**
   * @deprecated PD-3 — retained for compatibility; verifies against the global
   * WEBHOOK_SECRET only. Use verifySignatureForOrg instead.
   */
  verifySignature(rawBody: Buffer, signature: string | undefined): void {
    const secret = this.config.get<string>('WEBHOOK_SECRET');

    if (!secret) {
      this.logger.warn(
        'WEBHOOK_SECRET is not set — skipping signature verification (unsafe for production)',
      );
      return;
    }

    const providedHex = this.parseSignatureHeader(signature);
    if (!this.signatureMatches(rawBody, providedHex, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  // ── Secret management (PD-3) ──────────────────────────────────────────────

  /** Create a new secret for an org. The raw secret is returned ONCE. */
  async createSecret(orgId: string, userId: string, label?: string) {
    await this.requireOwnerOrAdmin(userId, orgId);
    const secret = 'whsec_' + crypto.randomBytes(32).toString('hex');
    const { data, error } = await this.supabase.admin
      .from('organization_webhook_secrets')
      .insert({ organization_id: orgId, secret, label: label ?? null, created_by: userId })
      .select('id, label, created_at')
      .single();
    if (error) throw new BadRequestException(error.message);
    return { ...data, secret };
  }

  /** List secrets for an org — never returns the secret value, only last 4 chars. */
  async listSecrets(orgId: string, userId: string) {
    await this.requireOwnerOrAdmin(userId, orgId);
    const { data, error } = await this.supabase.admin
      .from('organization_webhook_secrets')
      .select('id, secret, label, created_at, revoked_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map((row: { id: string; secret: string; label: string | null; created_at: string; revoked_at: string | null }) => ({
      id: row.id,
      label: row.label,
      last4: row.secret.slice(-4),
      createdAt: row.created_at,
      revokedAt: row.revoked_at,
    }));
  }

  /** Revoke a secret (soft — sets revoked_at, keeps the audit trail). */
  async revokeSecret(orgId: string, userId: string, secretId: string) {
    await this.requireOwnerOrAdmin(userId, orgId);
    const { error } = await this.supabase.admin
      .from('organization_webhook_secrets')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', secretId)
      .eq('organization_id', orgId);
    if (error) throw new BadRequestException(error.message);
    return { revoked: true };
  }

  private async requireOwnerOrAdmin(userId: string, orgId: string): Promise<void> {
    const { data } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .maybeSingle();
    const role = data?.role as string | undefined;
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new UnauthorizedException('Webhook secret management requires owner or admin role');
    }
  }

  // ── Delivery ──────────────────────────────────────────────────────────────

  /**
   * Process an authenticated webhook delivery.
   *
   * 1. Verify the org exists.
   * 2. Publish a synthetic 'webhook.<path>' event to the EventBus.
   * 3. EventBus dispatchSubscriptions() fires any matching workflow subscriptions.
   *
   * @returns The published event id (or null on EventBus failure — non-fatal)
   */
  async deliver(params: {
    orgId:   string;
    path:    string;
    payload: Record<string, unknown>;
  }): Promise<{ received: boolean; eventId: string | null }> {
    const { orgId, path, payload } = params;

    // Validate the org exists
    const { data: org } = await this.supabase.admin
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .maybeSingle();

    if (!org) {
      throw new BadRequestException(`Organization ${orgId} not found`);
    }

    const eventType = `webhook.${path}`;

    const event = await this.eventBus.publish({
      orgId,
      type:       eventType,
      sourceType: 'system',
      sourceId:   path,
      actorId:    'webhook',
      payload,
    });

    this.logger.log(
      `Webhook delivered: ${eventType} → org ${orgId} (event=${event?.id ?? 'null'})`,
    );

    return { received: true, eventId: event?.id ?? null };
  }
}
