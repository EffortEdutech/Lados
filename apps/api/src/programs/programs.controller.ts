import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { ApiResponse } from '@lados/shared-types';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

/**
 * ProgramsController — Phase 23 S23.1, renamed from PipelinesController in
 * Phase 24 S24.1/S24.2.
 *
 * Org-level program definitions (workflows + stage gates + data handoff),
 * distinct from the old project-scoped `PipelineController`
 * (apps/api/src/pipeline/), which is left running unwired (not deleted)
 * since S23.4.
 *
 *   GET    /api/v1/organizations/:orgId/programs
 *   GET    /api/v1/organizations/:orgId/programs?departmentId=...
 *   GET    /api/v1/organizations/:orgId/programs/:id
 *   POST   /api/v1/organizations/:orgId/programs
 *   PATCH  /api/v1/organizations/:orgId/programs/:id
 *
 * No execution endpoints here — triggering/running a program is
 * ProgramExecutionService (ProgramExecutionController).
 */
@Controller('organizations/:orgId/programs')
@UseGuards(SupabaseJwtGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  async findAll(
    @Param('orgId') orgId: string,
    @Query('departmentId') departmentId: string | undefined,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown[]>> {
    const data = await this.programsService.findAllInOrg(orgId, user.id, departmentId);
    return { success: true, data, error: null };
  }

  @Get(':id')
  async findOne(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.programsService.findOne(orgId, id, user.id);
    return { success: true, data, error: null };
  }

  @Post()
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateProgramDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.programsService.create(orgId, dto, user.id);
    return { success: true, data, error: null };
  }

  @Patch(':id')
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.programsService.update(orgId, id, dto, user.id);
    return { success: true, data, error: null };
  }
}
