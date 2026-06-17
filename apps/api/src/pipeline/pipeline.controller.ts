/**
 * PipelineController
 *
 * GET /api/v1/projects/:projectId/pipeline  — load pipeline layout
 * PUT /api/v1/projects/:projectId/pipeline  — save pipeline layout
 * Sprint 11 (S11-002)
 */
import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { PipelineService, PipelineLayout } from './pipeline.service';

@Controller('projects/:projectId/pipeline')
@UseGuards(SupabaseJwtGuard)
export class PipelineController {
  constructor(private readonly pipeline: PipelineService) {}

  @Get()
  async get(@Param('projectId') projectId: string) {
    const data = await this.pipeline.get(projectId);
    return { success: true, data, error: null };
  }

  @Put()
  async upsert(
    @Param('projectId') projectId: string,
    @Body() layout: PipelineLayout,
  ) {
    const data = await this.pipeline.upsert(projectId, layout);
    return { success: true, data, error: null };
  }
}
