/**
 * ArtifactController
 *
 * GET  /api/v1/projects/:projectId/artifacts       — list all artifacts
 * GET  /api/v1/projects/:projectId/artifacts/:key  — get single artifact
 * POST /api/v1/projects/:projectId/artifacts       — upsert artifact
 * Sprint 11 (S11-003)
 */
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { ArtifactService } from './artifact.service';

interface UpsertArtifactDto {
  key: string;
  value: Record<string, unknown>;
  sourceWorkflowId?: string;
  executionRunId?: string;
}

@Controller('projects/:projectId/artifacts')
@UseGuards(SupabaseJwtGuard)
export class ArtifactController {
  constructor(private readonly artifacts: ArtifactService) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    const data = await this.artifacts.list(projectId);
    return { success: true, data, error: null };
  }

  @Get(':key')
  async get(
    @Param('projectId') projectId: string,
    @Param('key') key: string,
  ) {
    const data = await this.artifacts.get(projectId, key);
    return { success: true, data, error: null };
  }

  @Post()
  async upsert(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertArtifactDto,
  ) {
    const data = await this.artifacts.upsert(projectId, dto.key, dto.value, {
      sourceWorkflowId: dto.sourceWorkflowId,
      executionRunId: dto.executionRunId,
    });
    return { success: true, data, error: null };
  }
}
