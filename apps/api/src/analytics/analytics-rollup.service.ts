/**
 * AnalyticsRollupService — Phase 22 S22.3 (§5)
 *
 * Populates workflow_run_stats_daily / node_execution_stats_daily
 * (migration 0073) from execution_runs / execution_logs. Same poll-based
 * architecture as SchedulerService/RunWatchdogService — a single
 * setInterval, no external cron library.
 *
 * Design: recompute (not incrementally accumulate) today's and yesterday's
 * rows on every tick, upserting via the tables' UNIQUE(workflow_id[, node_type], date)
 * constraint. Recomputing from source rows each tick is simpler and safer
 * than incremental counters (no risk of double-counting on a missed/retried
 * tick) — acceptable at this run volume (see Phase22 plan §0 framing: not
 * enough run volume yet to need a leaner incremental design). "Today AND
 * yesterday" guards against a run that started right before local midnight
 * and only completed after.
 *
 * p95/avg are computed in application code (fetch duration_ms values,
 * sort, index) rather than a Postgres percentile_cont() stored procedure —
 * consistent with this codebase's convention of doing aggregation in TS via
 * the Supabase JS client rather than introducing custom SQL functions.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

const POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes — rollups are not latency-sensitive

interface RunRow {
  id: string;
  organization_id: string;
  project_id: string;
  workflow_id: string;
  status: string;
  duration_ms: number | null;
}

interface LogRow {
  run_id: string;
  node_type: string;
  status: string;
  duration_ms: number | null;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayBounds(dateStr: string): { start: string; end: string } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

@Injectable()
export class AnalyticsRollupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsRollupService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly supabase: SupabaseService) {}

  onModuleInit(): void {
    this.logger.log(`AnalyticsRollupService: starting (poll ${POLL_INTERVAL_MS}ms)`);
    // Run once shortly after boot, then on the regular interval.
    setTimeout(() => void this.tick(), 15_000);
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ── Internal tick ─────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const dates = [dateOnly(yesterday), dateOnly(today)];

    for (const date of dates) {
      try {
        await this.rollupDate(date);
      } catch (err: unknown) {
        this.logger.error(`AnalyticsRollupService: rollup failed for ${date} — ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private async rollupDate(date: string): Promise<void> {
    const { start, end } = dayBounds(date);

    // ── Resolve project -> department_id once per tick (small table, cheap) ──
    const { data: projects, error: projectsError } = await this.supabase.admin
      .from('projects')
      .select('id, department_id');

    if (projectsError) {
      this.logger.warn(`AnalyticsRollupService: projects query failed — ${projectsError.message}`);
      return;
    }
    const departmentByProject = new Map<string, string | null>(
      (projects ?? []).map((p) => [p.id as string, (p.department_id as string | null) ?? null]),
    );

    await this.rollupWorkflowRunStats(date, start, end, departmentByProject);
    await this.rollupNodeExecutionStats(date, start, end, departmentByProject);
  }

  // ── workflow_run_stats_daily ──────────────────────────────────────────────

  private async rollupWorkflowRunStats(
    date: string,
    start: string,
    end: string,
    departmentByProject: Map<string, string | null>,
  ): Promise<void> {
    const { data: runs, error } = await this.supabase.admin
      .from('execution_runs')
      .select('id, organization_id, project_id, workflow_id, status, duration_ms')
      .gte('started_at', start)
      .lt('started_at', end);

    if (error) {
      this.logger.warn(`AnalyticsRollupService: execution_runs query failed for ${date} — ${error.message}`);
      return;
    }
    if (!runs?.length) return;

    const byWorkflow = new Map<string, RunRow[]>();
    for (const run of runs as RunRow[]) {
      const list = byWorkflow.get(run.workflow_id) ?? [];
      list.push(run);
      byWorkflow.set(run.workflow_id, list);
    }

    const rows = [...byWorkflow.entries()].map(([workflowId, group]) => {
      const durations = group.map((r) => r.duration_ms).filter((d): d is number => d != null);
      const sortedDurations = [...durations].sort((a, b) => a - b);

      return {
        organization_id: group[0]!.organization_id,
        department_id:   departmentByProject.get(group[0]!.project_id) ?? null,
        workflow_id:     workflowId,
        date,
        total_runs:      group.length,
        succeeded:       group.filter((r) => r.status === 'completed').length,
        failed:          group.filter((r) => r.status === 'failed').length,
        timed_out:       group.filter((r) => r.status === 'timed_out').length,
        avg_duration_ms: average(durations),
        p95_duration_ms: percentile(sortedDurations, 95),
        updated_at:      new Date().toISOString(),
      };
    });

    const { error: upsertError } = await this.supabase.admin
      .from('workflow_run_stats_daily')
      .upsert(rows, { onConflict: 'workflow_id,date' });

    if (upsertError) {
      this.logger.warn(`AnalyticsRollupService: workflow_run_stats_daily upsert failed for ${date} — ${upsertError.message}`);
      return;
    }

    this.logger.debug(`AnalyticsRollupService: rolled up ${rows.length} workflow(s) for ${date}`);
  }

  // ── node_execution_stats_daily ────────────────────────────────────────────

  private async rollupNodeExecutionStats(
    date: string,
    start: string,
    end: string,
    departmentByProject: Map<string, string | null>,
  ): Promise<void> {
    const { data: logs, error: logsError } = await this.supabase.admin
      .from('execution_logs')
      .select('run_id, node_type, status, duration_ms')
      .gte('started_at', start)
      .lt('started_at', end);

    if (logsError) {
      this.logger.warn(`AnalyticsRollupService: execution_logs query failed for ${date} — ${logsError.message}`);
      return;
    }
    if (!logs?.length) return;

    // Resolve org/workflow/project for each distinct run_id — avoids
    // PostgREST's embedded-resource dot-notation filter (same rationale as
    // ApprovalService.listPending()'s rewrite, Phase 21 checklist (16)/(17)).
    const runIds = [...new Set((logs as LogRow[]).map((l) => l.run_id))];
    const { data: runs, error: runsError } = await this.supabase.admin
      .from('execution_runs')
      .select('id, organization_id, project_id, workflow_id')
      .in('id', runIds);

    if (runsError) {
      this.logger.warn(`AnalyticsRollupService: execution_runs lookup failed for ${date} — ${runsError.message}`);
      return;
    }

    const runMeta = new Map(
      (runs ?? []).map((r) => [r.id as string, {
        organizationId: r.organization_id as string,
        workflowId: r.workflow_id as string,
        projectId: r.project_id as string,
      }]),
    );

    const byWorkflowAndType = new Map<string, { workflowId: string; nodeType: string; orgId: string; projectId: string; entries: LogRow[] }>();
    for (const log of logs as LogRow[]) {
      const meta = runMeta.get(log.run_id);
      if (!meta) continue; // orphaned log row (run deleted) — skip
      const key = `${meta.workflowId}::${log.node_type}`;
      const bucket = byWorkflowAndType.get(key) ?? {
        workflowId: meta.workflowId,
        nodeType: log.node_type,
        orgId: meta.organizationId,
        projectId: meta.projectId,
        entries: [],
      };
      bucket.entries.push(log);
      byWorkflowAndType.set(key, bucket);
    }

    const rows = [...byWorkflowAndType.values()].map((bucket) => {
      const durations = bucket.entries.map((e) => e.duration_ms).filter((d): d is number => d != null);
      const sortedDurations = [...durations].sort((a, b) => a - b);

      return {
        organization_id:  bucket.orgId,
        department_id:    departmentByProject.get(bucket.projectId) ?? null,
        workflow_id:      bucket.workflowId,
        node_type:        bucket.nodeType,
        date,
        total_executions: bucket.entries.length,
        succeeded:        bucket.entries.filter((e) => e.status === 'completed').length,
        failed:           bucket.entries.filter((e) => e.status === 'failed').length,
        avg_duration_ms:  average(durations),
        p95_duration_ms:  percentile(sortedDurations, 95),
        updated_at:       new Date().toISOString(),
      };
    });

    if (rows.length === 0) return;

    const { error: upsertError } = await this.supabase.admin
      .from('node_execution_stats_daily')
      .upsert(rows, { onConflict: 'workflow_id,node_type,date' });

    if (upsertError) {
      this.logger.warn(`AnalyticsRollupService: node_execution_stats_daily upsert failed for ${date} — ${upsertError.message}`);
      return;
    }

    this.logger.debug(`AnalyticsRollupService: rolled up ${rows.length} node-type bucket(s) for ${date}`);
  }
}
