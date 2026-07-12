import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

/**
 * ProgramsService — Phase 23 S23.1, renamed from PipelinesService in Phase 24
 * S24.1/S24.2 to match standard business-operations language.
 *
 * CRUD-only layer over the org-level `programs` table (migration 0075,
 * renamed by 0079). This is deliberately NOT the old `PipelineService`
 * (apps/api/src/pipeline/) which still operates on project-scoped
 * `project_pipelines` for the pre-Phase-23 canvas — that module is a
 * separate, already-retired feature, untouched by this rename. Nothing
 * executes a program here; that's ProgramExecutionService /
 * ProgramWatchdogService. This module only lets a program definition + its
 * canvas layout be created, listed, and edited.
 *
 * Scope mirrors DepartmentService: department_id is nullable (NULL = org-wide,
 * confirmed by eff 2026-07-08 — "Both — optional department, org-wide if unset").
 */
@Injectable()
export class ProgramsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** List all programs in an org (user must be an org member). Optional department filter. */
  async findAllInOrg(organizationId: string, userId: string, departmentId?: string) {
    await this.assertOrgMember(organizationId, userId);

    let query = this.supabase.admin
      .from('programs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Get a single program (must belong to the given org) */
  async findOne(organizationId: string, id: string, userId: string) {
    await this.assertOrgMember(organizationId, userId);

    const { data, error } = await this.supabase.admin
      .from('programs')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error ?? !data) throw new NotFoundException(`Program ${id} not found`);
    return data;
  }

  /** Create a program in an org — org owner/admin only */
  async create(organizationId: string, dto: CreateProgramDto, userId: string) {
    await this.assertOrgMember(organizationId, userId, ['owner', 'admin']);

    if (dto.departmentId) {
      await this.assertSameOrgDepartment(organizationId, dto.departmentId);
    }

    const { data: existing } = await this.supabase.admin
      .from('programs')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', dto.name)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`Program "${dto.name}" already exists in this organization`);
    }

    const { data, error } = await this.supabase.admin
      .from('programs')
      .insert({
        organization_id: organizationId,
        department_id: dto.departmentId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Failed to create program');
    return data;
  }

  /** Update a program (name/description/department/layout/status) — org owner/admin only */
  async update(organizationId: string, id: string, dto: UpdateProgramDto, userId: string) {
    await this.findOne(organizationId, id, userId);
    await this.assertOrgMember(organizationId, userId, ['owner', 'admin']);

    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.layout !== undefined) updates['layout'] = dto.layout;
    if (dto.status !== undefined) updates['status'] = dto.status;

    if (dto.departmentId !== undefined) {
      if (dto.departmentId !== null) {
        await this.assertSameOrgDepartment(organizationId, dto.departmentId);
      }
      updates['department_id'] = dto.departmentId;
    }

    const { data, error } = await this.supabase.admin
      .from('programs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Update failed');
    return data;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async assertOrgMember(orgId: string, userId: string, roles?: string[]) {
    const { data } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) throw new NotFoundException('Organization not found or access denied');
    if (roles && !roles.includes(data.role as string)) {
      throw new ForbiddenException(`Requires organization role: ${roles.join(' or ')}`);
    }
  }

  private async assertSameOrgDepartment(organizationId: string, departmentId: string) {
    const { data } = await this.supabase.admin
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!data) throw new NotFoundException(`Department ${departmentId} not found in this organization`);
  }
}
