/**
 * ApprovalController — Phase 1 / Phase 22 S22.2
 *
 * GET  /approvals                    — list pending approval tasks for current user
 * GET  /approvals/run/:runId         — list all tasks for a specific run
 * GET  /approvals/:taskId            — get a single task with its data snapshot
 * POST /approvals/:taskId/decide     — approve or reject; resumes the paused run
 * POST /approvals/:taskId/delegate   — reassign to another named user (§4.2)
 * POST /approvals/:taskId/submit-input — submit structured data for a
 *                                        task_type:'input' task; resumes the
 *                                        paused run (§4.4)
 */
import {
  Controller, Get, Post, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsUuidLike } from '../common/validators/is-uuid-like.validator';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { ApprovalService } from './approval.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import type { ApiResponse } from '@lados/shared-types';

class DecideDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

class DelegateDto {
  @IsUuidLike()
  toUserId!: string;
}

class SubmitInputDto {
  @IsObject()
  @IsNotEmpty()
  data!: Record<string, unknown>;
}

class CastVoteDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

@UseGuards(SupabaseJwtGuard)
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  // Phase 21 S9.2 (2026-07-05) — every method here used to return the raw
  // service result directly instead of the `{ success, data, error }`
  // ApiResponse<T> shape every other controller in this app uses (see
  // workflow.controller.ts for the established pattern). The frontend's
  // apiClient always parses responses as ApiResponse<T> and reads `.data`,
  // so a bare array/object came through as `res.data === undefined` — the
  // API was genuinely returning the pending task, the response shape was
  // just wrong, which is why /approvals silently stayed empty.

  @Get()
  async listPending(@Request() req: AuthenticatedRequest): Promise<ApiResponse<unknown[]>> {
    const data = await this.approvalService.listPending(req.user.id);
    return { success: true, data, error: null };
  }

  @Get('run/:runId')
  async listForRun(
    @Param('runId') runId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown[]>> {
    const data = await this.approvalService.listForRun(runId, req.user.id);
    return { success: true, data, error: null };
  }

  @Get(':taskId')
  async getTask(
    @Param('taskId') taskId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.approvalService.getTask(taskId, req.user.id);
    return { success: true, data, error: null };
  }

  @Post(':taskId/decide')
  async decide(
    @Param('taskId') taskId: string,
    @Body() dto: DecideDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.approvalService.decide(
      taskId,
      dto.decision,
      dto.comments ?? '',
      req.user.id,
    );
    return { success: true, data, error: null };
  }

  @Post(':taskId/delegate')
  async delegate(
    @Param('taskId') taskId: string,
    @Body() dto: DelegateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.approvalService.delegate(taskId, dto.toUserId, req.user.id);
    return { success: true, data, error: null };
  }

  @Post(':taskId/submit-input')
  async submitInput(
    @Param('taskId') taskId: string,
    @Body() dto: SubmitInputDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.approvalService.submitInput(taskId, dto.data, req.user.id);
    return { success: true, data, error: null };
  }

  /**
   * Phase 23 S23.2 (§4.4) — cast one committee member's vote on a
   * stage_gate task (renamed from pipeline_gate, Phase 24 S24.2). Distinct
   * from /decide, which stays exactly as-is for approval/input tasks.
   */
  @Post(':taskId/vote')
  async castVote(
    @Param('taskId') taskId: string,
    @Body() dto: CastVoteDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.approvalService.castVote(taskId, dto.decision, dto.comments, req.user.id);
    return { success: true, data, error: null };
  }
}
