/**
 * ProgramExecutionController — Phase 23 S23.2 (§4.4), renamed from
 * PipelineExecutionController in Phase 24 S24.1/S24.2.
 *
 *   POST /programs/:id/run     — trigger, mirrors POST /workflows/:id/run
 *   GET  /programs/:id/runs    — list, mirrors GET /workflows/:id/runs
 *   GET  /program-runs/:runId  — status + stage_history, mirrors GET /runs/:runId
 *
 * Deliberately top-level (not nested under /organizations/:orgId/), matching
 * ExecutionController's own convention — the program row itself carries
 * organization_id, so membership is checked in the service layer, not via
 * a URL param the way ProgramsController's CRUD routes are.
 */
import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import type { ApiResponse } from '@lados/shared-types';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { ProgramExecutionService } from './program-execution.service';

@Controller()
@UseGuards(SupabaseJwtGuard)
export class ProgramExecutionController {
  constructor(private readonly programExecutionService: ProgramExecutionService) {}

  @Post('programs/:id/run')
  async triggerProgram(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<ApiResponse<unknown>> {
    const data = await this.programExecutionService.triggerProgram(id, req.user.id);
    return { success: true, data, error: null };
  }

  @Get('programs/:id/runs')
  async listRuns(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<ApiResponse<unknown[]>> {
    const data = await this.programExecutionService.listRunsForProgram(id, req.user.id);
    return { success: true, data, error: null };
  }

  @Get('program-runs/:runId')
  async getRun(
    @Param('runId') runId: string,
    @Request() req: { user: { id: string } },
  ): Promise<ApiResponse<unknown>> {
    const data = await this.programExecutionService.getRun(runId, req.user.id);
    return { success: true, data, error: null };
  }
}
