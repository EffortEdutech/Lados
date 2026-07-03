/**
 * EventBusController — Phase 4 / Phase 3A
 *
 * GET    /events                          — query event history
 * GET    /events/correlation/:id          — events by correlation_id
 * GET    /events/run/:runId               — events by run_id
 * GET    /events/subscriptions            — list event subscriptions
 * POST   /events/subscriptions            — create an event subscription
 * PATCH  /events/subscriptions/:id        — enable / disable a subscription
 * DELETE /events/subscriptions/:id        — delete a subscription
 *
 * PD-3 — every route verifies the caller is a member of organizationId
 * (previously only the param's presence was checked).
 */
import {
  Controller, Get, Post, Patch, Delete,
  Query, Body, Param, UseGuards, Request,
  BadRequestException,
} from '@nestjs/common';
import { IsString, IsUUID, IsOptional, IsBoolean, IsObject, MinLength } from 'class-validator';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { EventBusService } from './event-bus.service';
import { SecurityEngineService } from '../security/security.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

class CreateSubscriptionDto {
  @IsString() @MinLength(1) eventType!: string;
  @IsUUID()                 workflowId!: string;
  @IsOptional() @IsObject() filter?: Record<string, unknown>;
}

class PatchSubscriptionDto {
  @IsBoolean() active!: boolean;
}

@UseGuards(SupabaseJwtGuard)
@Controller('events')
export class EventBusController {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly security: SecurityEngineService,
  ) {}

  /** PD-3 — orgId must be present AND the caller must be a member. */
  private async requireOrgMember(orgId: string | undefined, userId: string): Promise<string> {
    if (!orgId) throw new BadRequestException('organizationId query param is required');
    await this.security.requireMembership(userId, orgId);
    return orgId;
  }

  // ── Event log ─────────────────────────────────────────────────────────────

  @Get()
  async getEvents(
    @Query('organizationId') orgId: string,
    @Request()               req: AuthenticatedRequest,
    @Query('type')           type?: string,
    @Query('sourceType')     sourceType?: string,
    @Query('sourceId')       sourceId?: string,
    @Query('actorId')        actorId?: string,
    @Query('from')           from?: string,
    @Query('to')             to?: string,
    @Query('limit')          limitStr?: string,
  ) {
    return this.eventBus.getEvents(await this.requireOrgMember(orgId, req.user.id), {
      type, sourceType, sourceId, actorId, from, to,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
    });
  }

  // ── Correlation / run shortcuts ───────────────────────────────────────────

  @Get('correlation/:correlationId')
  async getByCorrelation(
    @Param('correlationId') correlationId: string,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('limit') limitStr?: string,
  ) {
    return this.eventBus.getEvents(await this.requireOrgMember(orgId, req.user.id), {
      correlationId,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
    });
  }

  @Get('run/:runId')
  async getByRun(
    @Param('runId') runId: string,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('limit') limitStr?: string,
  ) {
    return this.eventBus.getEvents(await this.requireOrgMember(orgId, req.user.id), {
      runId,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
    });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  @Get('subscriptions')
  async listSubscriptions(
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventBus.listSubscriptions(await this.requireOrgMember(orgId, req.user.id));
  }

  @Post('subscriptions')
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventBus.subscribe({
      orgId:      await this.requireOrgMember(orgId, req.user.id),
      eventType:  dto.eventType,
      workflowId: dto.workflowId,
      filter:     dto.filter,
      createdBy:  req.user.id,
    });
  }

  @Patch('subscriptions/:id')
  async patchSubscription(
    @Param('id') id: string,
    @Body() dto: PatchSubscriptionDto,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventBus.setSubscriptionActive(id, await this.requireOrgMember(orgId, req.user.id), dto.active);
  }

  @Delete('subscriptions/:id')
  async deleteSubscription(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventBus.unsubscribe(id, await this.requireOrgMember(orgId, req.user.id));
  }
}
