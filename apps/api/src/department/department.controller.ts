import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { ApiResponse } from '@lados/shared-types';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDepartmentMemberDto } from './dto/add-department-member.dto';

/**
 * DepartmentController — Phase 22 S22.1
 *
 * All routes nested under organizations, mirroring ProjectController:
 *   GET    /api/v1/organizations/:orgId/departments
 *   POST   /api/v1/organizations/:orgId/departments
 *   GET    /api/v1/organizations/:orgId/departments/:id
 *   PATCH  /api/v1/organizations/:orgId/departments/:id
 *   GET    /api/v1/organizations/:orgId/departments/:id/members
 *   POST   /api/v1/organizations/:orgId/departments/:id/members
 *   DELETE /api/v1/organizations/:orgId/departments/:id/members/:userId
 */
@Controller('organizations/:orgId/departments')
@UseGuards(SupabaseJwtGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  async findAll(
    @Param('orgId') orgId: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown[]>> {
    const data = await this.departmentService.findAllInOrg(orgId, user.id);
    return { success: true, data, error: null };
  }

  @Get(':id')
  async findOne(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.departmentService.findOne(orgId, id, user.id);
    return { success: true, data, error: null };
  }

  @Post()
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.departmentService.create(orgId, dto, user.id);
    return { success: true, data, error: null };
  }

  @Patch(':id')
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.departmentService.update(orgId, id, dto, user.id);
    return { success: true, data, error: null };
  }

  @Get(':id/members')
  async listMembers(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown[]>> {
    const data = await this.departmentService.listMembers(orgId, id, user.id);
    return { success: true, data, error: null };
  }

  @Post(':id/members')
  async addMember(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: AddDepartmentMemberDto,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.departmentService.addMember(orgId, id, dto, user.id);
    return { success: true, data, error: null };
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.departmentService.removeMember(orgId, id, targetUserId, user.id);
    return { success: true, data, error: null };
  }
}
