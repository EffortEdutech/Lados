import {
  Controller, Get, Post, Patch, Put,
  Param, Body, UseGuards,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { ApiResponse } from '@qsos/shared-types';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { SaveDefinitionDto } from './dto/save-definition.dto';

/**
 * WorkflowController
 *
 * GET    /api/v1/projects/:projectId/workflows
 * POST   /api/v1/projects/:projectId/workflows
 * GET    /api/v1/projects/:projectId/workflows/:id
 * PATCH  /api/v1/projects/:projectId/workflows/:id
 * PUT    /api/v1/projects/:projectId/workflows/:id/definition  ← canvas auto-save
 */
@Controller('projects/:projectId/workflows')
@UseGuards(SupabaseJwtGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown[]>> {
    const data = await this.workflowService.findAllInProject(projectId, user.id);
    return { success: true, data, error: null };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.workflowService.findOne(id, user.id);
    return { success: true, data, error: null };
  }

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.workflowService.create(projectId, dto, user.id);
    return { success: true, data, error: null };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.workflowService.update(id, dto, user.id);
    return { success: true, data, error: null };
  }

  /** Canvas auto-save — PUT replaces the full definition */
  @Put(':id/definition')
  async saveDefinition(
    @Param('id') id: string,
    @Body() dto: SaveDefinitionDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.workflowService.saveDefinition(id, dto, user.id);
    return { success: true, data, error: null };
  }
}
