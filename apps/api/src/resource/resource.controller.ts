/**
 * ResourceController — Phase 3
 *
 * GET    /resources             — list resources (filter by type/state/project)
 * POST   /resources             — create a resource
 * GET    /resources/:id         — get a single resource
 * PATCH  /resources/:id         — update name / data / project / parent
 * DELETE /resources/:id         — delete a resource
 * POST   /resources/:id/transition — transition resource state
 * GET    /resources/:id/events   — resource event log
 * GET    /resources/:id/history  — full state-transition history
 *
 * organizationId is passed as a required query param (matching the existing
 * pattern in LibraryController / FileController — req.user only carries id).
 */
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, UseGuards, Request, HttpCode, HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { ResourceService, ResourceType } from './resource.service';
import { StateEngineService } from '../state-engine/state-engine.service';
import { SecurityEngineService } from '../security/security.service';
import {
  CreateResourceDto, UpdateResourceDto, TransitionStateDto, ListResourcesDto,
} from './resource.dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@UseGuards(SupabaseJwtGuard)
@Controller('resources')
export class ResourceController {
  constructor(
    private readonly resources: ResourceService,
    private readonly stateEngine: StateEngineService,
    private readonly security: SecurityEngineService,
  ) {}

  /**
   * PD-3 — orgId must be present AND the caller must be a member of that org.
   * Previously only presence was checked, letting any authenticated user pass
   * an arbitrary organizationId.
   */
  private async requireOrgMember(orgId: string | undefined, userId: string): Promise<string> {
    if (!orgId) throw new BadRequestException('organizationId query param is required');
    await this.security.requireMembership(userId, orgId);
    return orgId;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  @Get()
  async list(
    @Query() q: ListResourcesDto,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.resources.listResources(await this.requireOrgMember(orgId, req.user.id), {
      type:      q.type as ResourceType | undefined,
      state:     q.state,
      projectId: q.projectId,
      parentId:  q.parentId,
    });
    return { success: true, data };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  @Post()
  async create(
    @Body() dto: CreateResourceDto,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.resources.createResource({
      orgId:     await this.requireOrgMember(orgId, req.user.id),
      projectId: dto.projectId,
      type:      dto.type as ResourceType,
      name:      dto.name,
      data:      dto.data,
      parentId:  dto.parentId,
      createdBy: req.user.id,
    });
    return { success: true, data };
  }

  // ── Get one ───────────────────────────────────────────────────────────────

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.resources.getResource(id, await this.requireOrgMember(orgId, req.user.id));
    return { success: true, data };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.resources.updateResource(id, await this.requireOrgMember(orgId, req.user.id), dto, req.user.id);
    return { success: true, data };
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.resources.deleteResource(id, await this.requireOrgMember(orgId, req.user.id), req.user.id);
  }

  // ── Transition ────────────────────────────────────────────────────────────

  @Post(':id/transition')
  async transition(
    @Param('id') id: string,
    @Body() dto: TransitionStateDto,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.resources.transitionState(
      id,
      await this.requireOrgMember(orgId, req.user.id),
      dto.toState,
      req.user.id,
    );
    return { success: true, data };
  }

  // ── Event history ─────────────────────────────────────────────────────────

  @Get(':id/events')
  async events(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.resources.getEvents(id, await this.requireOrgMember(orgId, req.user.id));
    return { success: true, data };
  }

  // ── State-transition history ───────────────────────────────────────────────

  @Get(':id/history')
  async history(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.stateEngine.getHistory(id, await this.requireOrgMember(orgId, req.user.id));
    return { success: true, data };
  }
}
