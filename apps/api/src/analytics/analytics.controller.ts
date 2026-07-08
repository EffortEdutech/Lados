/**
 * AnalyticsController — Phase 22 S22.3 (§5)
 *
 * GET /analytics/workflow-runs?organizationId=<uuid>[&departmentId=][&workflowId=][&dateFrom=][&dateTo=]
 * GET /analytics/node-stats?organizationId=<uuid>[&departmentId=][&workflowId=][&dateFrom=][&dateTo=]
 *
 * Reads the daily rollup tables (migration 0073) populated by
 * AnalyticsRollupService. Additive to, not a replacement for, the existing
 * per-run ExecutionLogPanel/SSE live view — that stays the detail
 * drill-down; this is the cross-run "how's everything doing" view.
 */
import { Controller, Get, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { AnalyticsService } from './analytics.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import type { ApiResponse } from '@lados/shared-types';

@UseGuards(SupabaseJwtGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('workflow-runs')
  async getWorkflowRunStats(
    @Query('organizationId') orgId: string,
    @Query('departmentId') departmentId: string | undefined,
    @Query('workflowId') workflowId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown[]>> {
    if (!orgId) throw new BadRequestException('organizationId query param is required');
    const data = await this.analytics.getWorkflowRunStats(orgId, req.user.id, { departmentId, workflowId, dateFrom, dateTo });
    return { success: true, data, error: null };
  }

  @Get('node-stats')
  async getNodeExecutionStats(
    @Query('organizationId') orgId: string,
    @Query('departmentId') departmentId: string | undefined,
    @Query('workflowId') workflowId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown[]>> {
    if (!orgId) throw new BadRequestException('organizationId query param is required');
    const data = await this.analytics.getNodeExecutionStats(orgId, req.user.id, { departmentId, workflowId, dateFrom, dateTo });
    return { success: true, data, error: null };
  }
}
