import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDepartmentMemberDto } from './dto/add-department-member.dto';

/**
 * DepartmentService — Phase 22 S22.1
 *
 * Business-unit layer between organization and project. A user's
 * department-level role (department_members.role) is independent of their
 * organization-level role (organization_members.role) — confirmed as a
 * separate table with eff 2026-07-05 (Phase22 master plan §9.4) so the two
 * can differ (e.g. an org `member` who is `admin` of one department only).
 *
 * Nothing outside this module reads department scope yet. Approval routing
 * (S22.2) and monitoring rollups (S22.3) are the first consumers.
 */
@Injectable()
export class DepartmentService {
  constructor(private readonly supabase: SupabaseService) {}

  /** List all departments in an org (user must be an org member) */
  async findAllInOrg(organizationId: string, userId: string) {
    await this.assertOrgMember(organizationId, userId);

    const { data, error } = await this.supabase.admin
      .from('departments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Get a single department (must belong to the given org) */
  async findOne(organizationId: string, id: string, userId: string) {
    await this.assertOrgMember(organizationId, userId);

    const { data, error } = await this.supabase.admin
      .from('departments')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error ?? !data) throw new NotFoundException(`Department ${id} not found`);
    return data;
  }

  /** Create a department in an org — org owner/admin only */
  async create(organizationId: string, dto: CreateDepartmentDto, userId: string) {
    await this.assertOrgMember(organizationId, userId, ['owner', 'admin']);

    if (dto.parentDepartmentId) {
      await this.assertSameOrg(organizationId, dto.parentDepartmentId);
    }

    const { data: existing } = await this.supabase.admin
      .from('departments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', dto.name)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`Department "${dto.name}" already exists in this organization`);
    }

    const { data, error } = await this.supabase.admin
      .from('departments')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        parent_department_id: dto.parentDepartmentId ?? null,
      })
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Failed to create department');
    return data;
  }

  /** Update a department — org owner/admin only */
  async update(organizationId: string, id: string, dto: UpdateDepartmentDto, userId: string) {
    await this.findOne(organizationId, id, userId);
    await this.assertOrgMember(organizationId, userId, ['owner', 'admin']);

    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;

    if (dto.parentDepartmentId !== undefined) {
      if (dto.parentDepartmentId !== null) {
        if (dto.parentDepartmentId === id) {
          throw new BadRequestException('A department cannot be its own parent');
        }
        await this.assertSameOrg(organizationId, dto.parentDepartmentId);
      }
      updates['parent_department_id'] = dto.parentDepartmentId;
    }

    const { data, error } = await this.supabase.admin
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Update failed');
    return data;
  }

  /** List members of a department */
  async listMembers(organizationId: string, departmentId: string, userId: string) {
    await this.findOne(organizationId, departmentId, userId);

    const { data, error } = await this.supabase.admin
      .from('department_members')
      .select('id, role, joined_at, user_id')
      .eq('department_id', departmentId)
      .order('joined_at');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Add a member to a department — org owner/admin, or the department's own owner/admin */
  async addMember(
    organizationId: string,
    departmentId: string,
    dto: AddDepartmentMemberDto,
    userId: string,
  ) {
    await this.findOne(organizationId, departmentId, userId);
    await this.assertDepartmentOrOrgAdmin(organizationId, departmentId, userId);

    // Department scope narrows org membership, it doesn't grant it — the
    // target user must already belong to the organization.
    const { data: orgMembership } = await this.supabase.admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', dto.userId)
      .maybeSingle();

    if (!orgMembership) {
      throw new BadRequestException('User must be a member of the organization before joining a department');
    }

    const { data, error } = await this.supabase.admin
      .from('department_members')
      .insert({
        department_id: departmentId,
        user_id: dto.userId,
        role: dto.role ?? 'member',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('User is already a member of this department');
      }
      throw new Error(error.message);
    }

    return data;
  }

  /** Remove a member from a department — org owner/admin, or the department's own owner/admin */
  async removeMember(
    organizationId: string,
    departmentId: string,
    targetUserId: string,
    userId: string,
  ) {
    await this.findOne(organizationId, departmentId, userId);
    await this.assertDepartmentOrOrgAdmin(organizationId, departmentId, userId);

    const { error } = await this.supabase.admin
      .from('department_members')
      .delete()
      .eq('department_id', departmentId)
      .eq('user_id', targetUserId);

    if (error) throw new Error(error.message);
    return { removed: true };
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

  private async assertSameOrg(organizationId: string, departmentId: string) {
    const { data } = await this.supabase.admin
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!data) throw new NotFoundException(`Department ${departmentId} not found in this organization`);
  }

  /** Org owner/admin, OR the department's own owner/admin, may manage its membership. */
  private async assertDepartmentOrOrgAdmin(organizationId: string, departmentId: string, userId: string) {
    const { data: orgRole } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (orgRole && ['owner', 'admin'].includes(orgRole.role as string)) return;

    const { data: deptRole } = await this.supabase.admin
      .from('department_members')
      .select('role')
      .eq('department_id', departmentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (deptRole && ['owner', 'admin'].includes(deptRole.role as string)) return;

    throw new ForbiddenException('Requires organization owner/admin, or department owner/admin');
  }
}
