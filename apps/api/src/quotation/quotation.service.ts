/**
 * QuotationService
 *
 * Manages supplier quotations for trade packages within a project.
 * Sprint 17 (S17-005)
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import type { CreateQuotationDto, UpdateQuotationDto } from './dto/create-quotation.dto';

@Injectable()
export class QuotationService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(
    projectId: string,
    userId: string,
    filters?: { trade?: string; supplier_id?: string },
  ) {
    await this.assertProjectAccess(projectId, userId);

    let query = this.supabase.admin
      .from('quotations')
      .select('*, suppliers(id, name, email, cidb_grade)')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });

    if (filters?.trade)       query = query.eq('trade', filters.trade);
    if (filters?.supplier_id) query = query.eq('supplier_id', filters.supplier_id);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('quotations')
      .select('*, suppliers(id, name, email, phone, cidb_grade)')
      .eq('id', id)
      .single();

    if (error ?? !data) throw new NotFoundException(`Quotation ${id} not found`);
    if (data.project_id) await this.assertProjectAccess(data.project_id as string, userId);
    return data;
  }

  async create(projectId: string, dto: CreateQuotationDto, userId: string) {
    const orgId = await this.assertProjectAccess(projectId, userId, ['owner', 'admin', 'member']);

    // Auto-compute total if not supplied
    let total = dto.total_amount;
    if (!total && dto.line_items && dto.line_items.length > 0) {
      total = dto.line_items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
    }

    const { data, error } = await this.supabase.admin
      .from('quotations')
      .insert({
        organization_id: orgId,
        project_id:      projectId,
        distribution_id: dto.distribution_id ?? null,
        supplier_id:     dto.supplier_id,
        trade:           dto.trade,
        line_items:      dto.line_items ?? [],
        total_amount:    total ?? null,
        currency:        dto.currency ?? 'MYR',
        validity_days:   dto.validity_days ?? 90,
        notes:           dto.notes ?? null,
        status:          dto.status ?? 'submitted',
        created_by:      userId,
      })
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Failed to create quotation');
    return data;
  }

  async update(id: string, dto: UpdateQuotationDto, userId: string) {
    const q = await this.findOne(id, userId);
    if (q.project_id) await this.assertProjectAccess(q.project_id as string, userId, ['owner', 'admin', 'member']);

    const updates: Record<string, unknown> = {};
    if (dto.line_items    !== undefined) updates['line_items']    = dto.line_items;
    if (dto.total_amount  !== undefined) updates['total_amount']  = dto.total_amount;
    if (dto.validity_days !== undefined) updates['validity_days'] = dto.validity_days;
    if (dto.notes         !== undefined) updates['notes']         = dto.notes;
    if (dto.status        !== undefined) updates['status']        = dto.status;

    const { data, error } = await this.supabase.admin
      .from('quotations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error ?? !data) throw new Error(error?.message ?? 'Update failed');
    return data;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /** Returns organization_id after verifying access */
  private async assertProjectAccess(
    projectId: string,
    userId: string,
    roles?: string[],
  ): Promise<string> {
    const { data: project } = await this.supabase.admin
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) throw new NotFoundException('Project not found');

    const { data: member } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id as string)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) throw new NotFoundException('Access denied');
    if (roles && !roles.includes(member.role as string)) {
      throw new NotFoundException('Insufficient role');
    }
    return project.organization_id as string;
  }
}
