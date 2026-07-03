/**
 * WebhookController — Phase 5 (Event-Driven Triggers)
 *
 * Public endpoint that receives inbound webhook deliveries and turns them into
 * EventBus events → workflow triggers.
 *
 * Route:  POST /api/v1/webhooks/:orgId/:path
 *
 * No JWT auth — the webhook sender authenticates via HMAC-SHA256 signature.
 *
 * Security:
 *   - X-Lados-Signature: sha256=<hex> HMAC-SHA256 over the raw body using WEBHOOK_SECRET
 *   - Org ID validated against the organizations table
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  Req,
  HttpCode,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { WebhookService } from './webhook.service';

/**
 * WebhookController — no JWT guard.
 * Authentication is via HMAC-SHA256 (X-Lados-Signature header), not Bearer tokens.
 * PD-3 — public endpoint: 60 req/min per IP, overriding the global 120/min.
 */
@Throttle({ default: { ttl: 60_000, limit: 60 } })
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * POST /api/v1/webhooks/:orgId/:path
   *
   * Receives a webhook payload, verifies HMAC, and dispatches to matching workflows.
   * Returns 200 immediately — processing is async and non-blocking.
   */
  @Post(':orgId/:path')
  @HttpCode(200)
  async receive(
    @Param('orgId')  orgId: string,
    @Param('path')   path:  string,
    @Headers('x-lados-signature') signature: string | undefined,
    @Req() req: Request,
  ): Promise<{ received: boolean; eventId: string | null }> {
    // PD-3 — rawBody is buffered by the json() verify hook in main.ts.
    // If it is missing we REJECT: verifying a re-serialized body would let
    // key-order/whitespace differences silently break or weaken the HMAC.
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw request body unavailable — signature cannot be verified');
    }

    // Verify HMAC against the org's active secrets (global secret = deprecated fallback)
    await this.webhookService.verifySignatureForOrg(orgId, rawBody, signature);

    // Parse payload (already parsed by NestJS body middleware)
    const payload = (req.body ?? {}) as Record<string, unknown>;

    return this.webhookService.deliver({ orgId, path, payload });
  }
}

/**
 * WebhookSecretsController — PD-3
 *
 * Owner/admin management of per-org webhook secrets.
 *   POST   /webhook-secrets?organizationId=  — create (raw secret returned once)
 *   GET    /webhook-secrets?organizationId=  — list (label + last4 only)
 *   DELETE /webhook-secrets/:id?organizationId= — revoke (soft)
 */
@UseGuards(SupabaseJwtGuard)
@Controller('webhook-secrets')
export class WebhookSecretsController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async create(
    @Query('organizationId') orgId: string,
    @Body() body: { label?: string },
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.webhookService.createSecret(orgId, req.user.id, body?.label);
    return { success: true, data, error: null };
  }

  @Get()
  async list(
    @Query('organizationId') orgId: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.webhookService.listSecrets(orgId, req.user.id);
    return { success: true, data, error: null };
  }

  @Delete(':id')
  async revoke(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Req() req: { user: { id: string } },
  ) {
    const data = await this.webhookService.revokeSecret(orgId, req.user.id, id);
    return { success: true, data, error: null };
  }
}
