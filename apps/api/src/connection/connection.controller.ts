import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { ApiResponse } from '@lados/shared-types';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConnectionService } from './connection.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import type { ConnectionProfileView } from './connection.types';

@Controller('connections')
@UseGuards(SupabaseJwtGuard)
export class ConnectionController {
  constructor(private readonly connections: ConnectionService) {}

  @Get()
  async list(@Query('organizationId') orgId: string, @CurrentUser() user: User): Promise<ApiResponse<ConnectionProfileView[]>> {
    return { success: true, data: await this.connections.list(orgId, user.id), error: null };
  }

  @Post()
  async create(@Query('organizationId') orgId: string, @Body() dto: CreateConnectionDto, @CurrentUser() user: User): Promise<ApiResponse<ConnectionProfileView>> {
    return { success: true, data: await this.connections.create(orgId, user.id, dto), error: null };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Query('organizationId') orgId: string, @Body() dto: UpdateConnectionDto, @CurrentUser() user: User): Promise<ApiResponse<ConnectionProfileView>> {
    return { success: true, data: await this.connections.update(orgId, id, user.id, dto), error: null };
  }

  @Post(':id/test')
  async test(@Param('id') id: string, @Query('organizationId') orgId: string, @CurrentUser() user: User): Promise<ApiResponse<ConnectionProfileView>> {
    return { success: true, data: await this.connections.test(orgId, id, user.id), error: null };
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string, @Query('organizationId') orgId: string, @CurrentUser() user: User): Promise<ApiResponse<ConnectionProfileView>> {
    return { success: true, data: await this.connections.setStatus(orgId, id, user.id, 'disabled'), error: null };
  }

  @Post(':id/reconnect')
  async reconnect(@Param('id') id: string, @Query('organizationId') orgId: string, @CurrentUser() user: User): Promise<ApiResponse<ConnectionProfileView>> {
    return { success: true, data: await this.connections.setStatus(orgId, id, user.id, 'active'), error: null };
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string, @Query('organizationId') orgId: string, @CurrentUser() user: User): Promise<ApiResponse<ConnectionProfileView>> {
    return { success: true, data: await this.connections.setStatus(orgId, id, user.id, 'revoked'), error: null };
  }
}

