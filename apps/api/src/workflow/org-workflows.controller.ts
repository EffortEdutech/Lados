import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { ApiResponse } from '@lados/shared-types';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkflowService } from './workflow.service';

/**
 * OrgWorkflowsController — Phase 23 S23.4 (§6)
 *
 *   GET /api/v1/organizations/:orgId/workflows
 *
 * Cross-project, org-scoped workflow listing — distinct from the existing
 * project-scoped `WorkflowController` (`projects/:projectId/workflows`,
 * untouched). Built specifically so the reworked Program canvas (renamed
 * from Pipeline, Phase 24 S24.2) can offer "any published workflow the org
 * can see" when adding a Workflow Stage node, not just workflows in one
 * project.
 */
@Controller('organizations/:orgId/workflows')
@UseGuards(SupabaseJwtGuard)
export class OrgWorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  async findAllInOrg(
    @Param('orgId') orgId: string,
    @CurrentUser() user: User,
  ): Promise<ApiResponse<unknown[]>> {
    const data = await this.workflowService.findAllInOrg(orgId, user.id);
    return { success: true, data, error: null };
  }
}
