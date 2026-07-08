/**
 * AnalyticsService — Phase 22 S22.3 (§5)
 *
 * Read-side for the rollup tables populated by AnalyticsRollupService.
 * Pure queries — no computation happens here, it all already happened at
 * rollup time. Filterable by department/workflow/date range per the plan.
 */
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { SecurityEngineService } from '../security/security.service';

export interface AnalyticsFilters {
  departmentId?: string;
  workflowId?: string;
  dateFrom?: string; // YYYY-MM-DD, inclusive
  dateTo?: string;   // YYYY-MM-DD, inclusive
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly security: SecurityEngineService,
  ) {}

  async getWorkflowRunStats(orgId: string, userId: string, filters: AnalyticsFilters) {
    await this.security.requireMembership(userId, orgId);

    let query = this.supabase.admin
      .from('workflow_run_stats_daily')
      .select('*')
      .eq('organization_id', orgId)
      .order('date', { ascending: false });

    if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
    if (filters.workflowId) query = query.eq('workflow_id', filters.workflowId);
    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return this.withWorkflowNames(data ?? []);
  }

  async getNodeExecutionStats(orgId: string, userId: string, filters: AnalyticsFilters) {
    await this.security.requireMembership(userId, orgId);

    let query = this.supabase.admin
      .from('node_execution_stats_daily')
      .select('*')
      .eq('organization_id', orgId)
      .order('date', { ascending: false });

    if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
    if (filters.workflowId) query = query.eq('workflow_id', filters.workflowId);
    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return this.withWorkflowNames(data ?? []);
  }

  /**
   * Attaches `workflow_name` to each rollup row for display — the rollup
   * tables only store `workflow_id` (denormalized from execution_runs at
   * rollup time), so the dashboard would otherwise have to resolve names
   * itself via a separate per-project call.
   */
  private async withWorkflowNames<T extends { workflow_id: string }>(rows: T[]): Promise<Array<T & { workflow_name: string | null }>> {
    if (rows.length === 0) return [];

    const workflowIds = [...new Set(rows.map((r) => r.workflow_id))];
    const { data: workflows } = await this.supabase.admin
      .from('workflows')
      .select('id, name')
      .in('id', workflowIds);

    const nameById = new Map((workflows ?? []).map((w) => [w.id as string, w.name as string]));
    return rows.map((row) => ({ ...row, workflow_name: nameById.get(row.workflow_id) ?? null }));
  }
}
