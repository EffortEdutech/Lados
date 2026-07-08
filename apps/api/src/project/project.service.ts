import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly supabase: SupabaseService) {}

  /** List all projects in an org (user must be a member) */
  async findAllInOrg(organizationId: string, userId: string) {
    await this.assertOrgMember(organizationId, userId);

    const { data, error } = await this.supabase.admin
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Get a single project */
  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error ?? !data) throw new NotFoundException(`Project ${id} not found`);

    // Verify user is a member of the project's org
    await this.assertOrgMember(data.organization_id as string, userId);
    return data;
  }

  /** Create a project in an org */
  async create(organizationId: string, dto: CreateProjectDto, userId: string) {
    await this.assertOrgMember(organizationId, userId, ['owner', 'admin', 'member']);

    // Check code uniqueness within org
    const { data: existing } = await this.supabase.admin
      .from('projects')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('code', dto.code)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`Project code "${dto.code}" already exists in this organization`);
    }

    const { data, error } = await this.supabase.admin
      .from('projects')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        currency: dto.currency ?? 'MYR',
        created_by: userId,
      })
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Failed to create project');
    return data;
  }

  /** Update a project */
  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const project = await this.findOne(id, userId);
    await this.assertOrgMember(project.organization_id as string, userId, ['owner', 'admin']);

    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.status !== undefined) updates['status'] = dto.status;
    if (dto.currency !== undefined) updates['currency'] = dto.currency;

    // Phase 22 S22.1 — assign/clear department scope. `null` clears it
    // (moves the project back to org-wide/no department); a UUID must
    // belong to the same org as the project, checked here rather than
    // relying on the FK alone so the error is a clear 404 instead of a raw
    // constraint violation.
    if (dto.departmentId !== undefined) {
      if (dto.departmentId !== null) {
        const { data: dept } = await this.supabase.admin
          .from('departments')
          .select('id')
          .eq('id', dto.departmentId)
          .eq('organization_id', project.organization_id as string)
          .maybeSingle();

        if (!dept) throw new NotFoundException(`Department ${dto.departmentId} not found in this organization`);
      }
      updates['department_id'] = dto.departmentId;
    }

    const { data, error } = await this.supabase.admin
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Update failed');
    return data;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async assertOrgMember(
    orgId: string,
    userId: string,
    roles?: string[],
  ) {
    const { data } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) throw new NotFoundException('Organization not found or access denied');
    if (roles && !roles.includes(data.role as string)) {
      throw new ForbiddenException(`Requires role: ${roles.join(' or ')}`);
    }
  }
}
