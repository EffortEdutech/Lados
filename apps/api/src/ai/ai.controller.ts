/**
 * AiController — Phase 10 (AI Runtime)
 *
 * POST /ai/assist   — Owner assistant chat endpoint (auth required, owner|admin only)
 * GET  /ai/status   — Whether the AI service is configured (public — no auth)
 * GET  /ai/history  — Ledger rows for a session (auth required, owner|admin only)
 *
 * All success responses follow the standard ApiResponse envelope:
 *   { success: true, data: <T>, error: null }
 *
 * The assistant is READ-ONLY. It cannot approve, transition, or mutate anything.
 *
 * Sprint 10 (S10-005)
 */

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ApiResponse } from '@lados/shared-types';
import { AiService, AssistRequest, AssistResponse, ParsedCommandIntent } from './ai.service';
import { WorkflowTriggerService, WorkflowTriggerRequest } from './workflow-trigger.service';
import { WorkflowSuggestService } from './workflow-suggest.service';
import { WorkflowEditService }    from './workflow-edit.service';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ResourceService, ResourceType } from '../resource/resource.service';
import { ExecutionService } from '../execution/execution.service';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class HistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

class AssistDto {
  @IsString()
  orgId!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryMessageDto)
  history?: HistoryMessageDto[];
}

class WorkflowTriggerDto implements WorkflowTriggerRequest {
  @IsString()
  orgId!: string;

  @IsString()
  @MaxLength(2000)
  command!: string;

  @IsOptional()
  session?: WorkflowTriggerRequest['session'];

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  execute?: boolean;

  @IsOptional()
  @IsString()
  unskipNodeId?: string;
}

class WorkflowSuggestDto {
  @IsString()
  orgId!: string;

  @IsString()
  @MaxLength(500)
  description!: string;
}

class WorkflowEditNodeDto {
  @IsString() id!:    string;
  @IsString() type!:  string;
  @IsString() label!: string;
}

class WorkflowEditAvailableDto {
  @IsString()           type!:         string;
  @IsString()           name!:         string;
  @IsOptional()
  @IsString()           description?:  string;
}

class WorkflowEditDto {
  @IsString()
  orgId!: string;

  @IsString()
  @MaxLength(500)
  message!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEditNodeDto)
  currentNodes!: WorkflowEditNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEditAvailableDto)
  allAvailableNodes!: WorkflowEditAvailableDto[];
}

class WorkflowCommandDto {
  @IsString()
  orgId!: string;

  @IsString()
  @MaxLength(2000)
  command!: string;

  /** Phase B: set to true to execute the confirmed intent */
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;

  /** Phase B: the intent returned from Phase A, sent back for execution */
  @IsOptional()
  @IsObject()
  intent?: ParsedCommandIntent;
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null };
}

// ── Controller ────────────────────────────────────────────────────────────────

// PD-3 — strict rate limit: AI routes are cost-bearing (OpenAI spend).
// 20 requests/min per IP, overriding the global 120/min default.
@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai:              AiService,
    private readonly supabase:        SupabaseService,
    private readonly resources:       ResourceService,
    private readonly workflowTrigger: WorkflowTriggerService,
    private readonly workflowSuggest: WorkflowSuggestService,
    private readonly workflowEdit:    WorkflowEditService,
    private readonly executions:      ExecutionService,
  ) {}

  /**
   * GET /ai/status  — PUBLIC (no auth required)
   *
   * Returns whether the AI service is configured.
   * The dashboard widget checks this before showing the assistant panel.
   */
  @Get('status')
  status(): ApiResponse<{ configured: boolean }> {
    return ok({ configured: this.ai.isConfigured });
  }

  /**
   * POST /ai/assist  (auth required — owner|admin only)
   *
   * Body: { orgId, message, sessionId, history? }
   * Returns: { response, sessionId, ledgerId, tokensUsed }
   */
  @Post('assist')
  @UseGuards(SupabaseJwtGuard)
  async assist(
    @Body()    dto: AssistDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<AssistResponse>> {
    const actorId = req.user.id;

    const { data: member, error } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', dto.orgId)
      .eq('user_id',         actorId)
      .single();

    if (error || !member) {
      throw new ForbiddenException('Not a member of this organisation');
    }

    const role = member.role as string;
    if (!['owner', 'admin'].includes(role)) {
      throw new ForbiddenException('AI assistant is available to owners and admins only');
    }

    const assistReq: AssistRequest = {
      orgId:     dto.orgId,
      actorId,
      role,
      message:   dto.message,
      sessionId: dto.sessionId,
      history:   dto.history,
    };

    const result = await this.ai.runAssist(assistReq);
    return ok(result);
  }

  /**
   * GET /ai/history?orgId=&sessionId=  (auth required — owner|admin only)
   *
   * Returns the ledger rows for a session.
   */
  @Get('history')
  @UseGuards(SupabaseJwtGuard)
  async history(
    @Query('orgId')     orgId:     string,
    @Query('sessionId') sessionId: string,
    @Request()          req:       AuthenticatedRequest,
  ): Promise<ApiResponse<{ turns: Array<{ intent: string; response: string; created_at: string }> }>> {
    const actorId = req.user.id;

    const { data: member, error: mErr } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id',         actorId)
      .single();

    if (mErr || !member || !['owner', 'admin'].includes(member.role as string)) {
      throw new ForbiddenException('Access denied');
    }

    const { data } = await this.supabase.admin
      .from('lados_ai_outputs')
      .select('intent, response, created_at')
      .eq('org_id',    orgId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50);

    return ok({
      turns: (data ?? []) as Array<{ intent: string; response: string; created_at: string }>,
    });
  }

  /**
   * POST /ai/command  (auth required — owner|admin only)
   *
   * Two-phase natural language resource creation:
   *
   * Phase A — parse:
   *   Body: { orgId, command }
   *   Returns: { intent, parsed: true } — the caller shows a confirmation UI
   *
   * Phase B — execute:
   *   Body: { orgId, command, confirmed: true, intent }
   *   Returns: { resource, message } — resource was created in the DB
   *
   * GUARDRAILS:
   *   - Only 'create' action is executed — AI cannot transition, approve, or delete.
   *   - Financial types (invoice, payment, payroll_run) are blocked.
   *   - Human must explicitly send confirmed:true — there is no auto-execute path.
   */
  @Post('command')
  @UseGuards(SupabaseJwtGuard)
  async command(
    @Body()    dto: WorkflowCommandDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const actorId = req.user.id;

    // Verify membership and role
    const { data: member, error } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', dto.orgId)
      .eq('user_id',         actorId)
      .single();

    if (error || !member) throw new ForbiddenException('Not a member of this organisation');

    const role = member.role as string;
    if (!['owner', 'admin'].includes(role)) {
      throw new ForbiddenException('AI command bar is available to owners and admins only');
    }

    // ── Phase B: execute confirmed intent ────────────────────────────────────
    if (dto.confirmed && dto.intent) {
      const intent = dto.intent;

      if (intent.action !== 'create') {
        return ok({ success: false, message: `Cannot execute action "${intent.action}" — only resource creation is supported.` });
      }

      // Block financial resource types
      const blocked: string[] = ['invoice', 'payment', 'payroll_run'];
      if (blocked.includes(intent.resourceType)) {
        return ok({ success: false, message: `Creating "${intent.resourceType}" via AI command is not permitted. Use the platform forms.` });
      }

      const resource = await this.resources.createResource({
        orgId:     dto.orgId,
        type:      intent.resourceType as ResourceType,
        name:      intent.name || dto.command.slice(0, 60),
        data:      { ...intent.data, createdVia: 'ai_command', originalCommand: dto.command },
        createdBy: actorId,
      });

      return ok({ success: true, resource, message: intent.summary });
    }

    // ── Phase A: parse and return intent for confirmation ────────────────────
    const intent = await this.ai.parseWorkflowCommand(dto.command);
    return ok({ parsed: true, intent });
  }

  /**
   * POST /ai/workflow-suggest  (auth required — owner|admin only)
   *
   * Level 4 — AI-assisted workflow editor.
   * Returns a suggested node graph built ONLY from nodes in enabled packs.
   * The caller (AiWorkflowDesigner) saves it as a DRAFT workflow for human review.
   * The AI never publishes — publish is always a manual human action.
   *
   * Body: { orgId, description }
   * Response: { suggestion: { name, description, nodes, connections } }
   */
  @Post('workflow-suggest')
  @UseGuards(SupabaseJwtGuard)
  async suggestWorkflow(
    @Body()    dto: WorkflowSuggestDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const actorId = req.user.id;

    const { data: member } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', dto.orgId)
      .eq('user_id', actorId)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role as string)) {
      throw new ForbiddenException('AI workflow designer is available to owners and admins only');
    }

    const suggestion = await this.workflowSuggest.suggest(dto.description);
    return ok({ suggestion });
  }

  /**
   * POST /ai/workflow-edit  (auth required — owner|admin only)
   *
   * Design Studio AI co-pilot — conversational editing of a workflow sequence.
   * Called each time the user sends a chat message while designing a workflow.
   *
   * Actions returned:
   *   update_sequence — AI returns a modified node list
   *   highlight_nodes — AI highlights relevant nodes in the palette
   *   suggest_pack    — AI suggests installing a pack for unavailable features
   *   answer          — AI answers a question with no sequence change
   *
   * Body: { orgId, message, currentNodes[], allAvailableNodes[] }
   */
  @Post('workflow-edit')
  @UseGuards(SupabaseJwtGuard)
  async editWorkflow(
    @Body()    dto: WorkflowEditDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const actorId = req.user.id;

    const { data: member } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', dto.orgId)
      .eq('user_id', actorId)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role as string)) {
      throw new ForbiddenException('AI workflow designer is available to owners and admins only');
    }

    const result = await this.workflowEdit.edit({
      message:           dto.message,
      currentNodes:      dto.currentNodes,
      allAvailableNodes: dto.allAvailableNodes,
    });

    return ok(result);
  }

  /**
   * POST /ai/workflow-trigger  (auth required — owner|admin only)
   *
   * Multi-turn endpoint that guides the user through:
   *   1. Project selection
   *   2. Workflow selection (from saved, published workflows — pack-constrained)
   *   3. Input gap filling (one question per turn)
   *   4. Skip review (AI auto-detects existing resources)
   *   5. Execution (when execute:true is sent with phase='ready' session)
   *
   * PACK CONSTRAINT: only workflows already in the DB can be triggered.
   * AI cannot create new workflow definitions or use nodes outside installed packs.
   *
   * Session is stateless on the server — the client carries and resends the
   * session object on each turn.
   */
  @Post('workflow-trigger')
  @UseGuards(SupabaseJwtGuard)
  async triggerWorkflow(
    @Body()    dto: WorkflowTriggerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiResponse<unknown>> {
    const actorId = req.user.id;

    // Execute phase: session is ready + execute:true → trigger the workflow
    if (dto.execute && dto.session?.phase === 'ready' && dto.session.workflowId) {
      const skipNodes = this.workflowTrigger.buildSkipNodes(dto.session);

      const result = await this.executions.triggerRun(
        dto.session.workflowId,
        {
          inputs:    { ...dto.session.inputs, _aiTriggered: true, _originalCommand: dto.command },
          variables: {},
          skipNodes,
        },
        actorId,
      );

      return ok({
        phase:   'done',
        runId:   result.runId,
        message: `Workflow "${dto.session.workflowName}" started. Run ID: ${result.runId}`,
        session: { ...dto.session, phase: 'ready' },
      });
    }

    // Multi-turn gap-filling phases
    const response = await this.workflowTrigger.process(dto, actorId);
    return ok(response);
  }
}
