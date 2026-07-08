/**
 * RetentionService — Phase 22 S22.5 (Retention & Archival Execution, §7)
 *
 * Executes the archival job the S22.1 schema hook (migration 0071) was
 * built for: reads organizations.retention_days (NULL = disabled, the
 * default for every existing org — no behavior changes unless an org admin
 * opts in) and, for each opted-in org, finds terminal execution_runs /
 * approval_tasks / audit_log rows older than the window and not yet
 * archived_at-stamped. Each batch is exported as JSON to Supabase Storage
 * (bucket 'retention-archives') BEFORE the rows are disposed of — export
 * failure aborts disposal for that batch so nothing is ever lost.
 *
 * Disposal is either:
 *   - 'archive' (organizations.retention_mode default) — archived_at is
 *     stamped, the row stays queryable by anyone who explicitly asks for
 *     archived rows. Safe/reversible, the product-safety default.
 *   - 'delete'  (explicit per-org opt-in) — the row is hard-deleted after
 *     a successful export. For execution_runs this cascades to
 *     execution_logs (FK ON DELETE CASCADE, migration 0006) — those child
 *     rows are folded into the same export payload first so no per-node
 *     log detail is lost even in delete mode.
 *
 * audit_log gets a longer *effective* retention window than execution_runs/
 * approval_tasks given its compliance role (§7) — see
 * AUDIT_LOG_RETENTION_MULTIPLIER / AUDIT_LOG_MIN_RETENTION_DAYS below. This
 * is computed in application code, not a second schema column, so a short
 * operational window (e.g. "drop run history after 30 days") can never
 * accidentally prune compliance history down to the same 30 days.
 *
 * Poll-based, same architecture as RunWatchdogService/ApprovalWatchdogService/
 * AnalyticsRollupService — a single setInterval, no external cron library.
 * The `retention_days IS NOT NULL` filter makes every tick a cheap no-op in
 * the common case (no org has opted in yet).
 *
 * Design note flagged for eff: applying `retention_mode` uniformly to
 * audit_log (i.e. allowing hard-delete of compliance history, not just
 * execution_runs/approval_tasks) is a judgment call, not an explicit
 * instruction from the plan doc. Revisit if a real compliance requirement
 * surfaces that audit_log should NEVER be hard-deletable regardless of org
 * preference.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EventBusService } from '../event-bus/event-bus.service';

const DEFAULT_POLL_INTERVAL_MS = 60_000; // 1 minute — matches RunWatchdogService/ApprovalWatchdogService cadence
const BATCH_LIMIT = 500;                 // rows exported+disposed per (org, table) per tick
const BUCKET = 'retention-archives';

const AUDIT_LOG_RETENTION_MULTIPLIER = 3;   // audit_log's effective window = max(retention_days * 3, floor)
const AUDIT_LOG_MIN_RETENTION_DAYS   = 365; // never prune compliance history below ~1 year, regardless of org setting

const EXECUTION_RUN_TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out'];
const APPROVAL_TASK_TERMINAL_STATUSES = ['approved', 'rejected', 'auto_approved', 'submitted'];

type RetentionMode = 'archive' | 'delete';

interface RetentionOrg {
  id: string;
  retention_days: number;
  retention_mode: RetentionMode;
}

@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  readonly pollIntervalMs: number;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
  ) {
    const configured = parseInt(process.env.RETENTION_POLL_INTERVAL_MS ?? '', 10);
    this.pollIntervalMs = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_POLL_INTERVAL_MS;
  }

  onModuleInit(): void {
    this.logger.log(`RetentionService: starting (poll ${this.pollIntervalMs}ms)`);
    this.timer = setInterval(() => void this.tick(), this.pollIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ── Internal tick ─────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    try {
      const { data: orgs, error } = await this.supabase.admin
        .from('organizations')
        .select('id, retention_days, retention_mode')
        .not('retention_days', 'is', null);

      if (error) {
        this.logger.warn(`RetentionService: organizations query failed — ${error.message}`);
        return;
      }
      if (!orgs?.length) return; // common case: no org has opted in yet

      for (const org of orgs as RetentionOrg[]) {
        try {
          await this.processOrg(org);
        } catch (err: unknown) {
          this.logger.error(
            `RetentionService: org ${org.id} tick error — ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(`RetentionService: tick error — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async processOrg(org: RetentionOrg): Promise<void> {
    const now = Date.now();
    const opsCutoff = new Date(now - org.retention_days * 86_400_000).toISOString();
    const auditRetentionDays = Math.max(org.retention_days * AUDIT_LOG_RETENTION_MULTIPLIER, AUDIT_LOG_MIN_RETENTION_DAYS);
    const auditCutoff = new Date(now - auditRetentionDays * 86_400_000).toISOString();

    await this.archiveExecutionRuns(org, opsCutoff);
    await this.archiveApprovalTasks(org, opsCutoff);
    await this.archiveAuditLog(org, auditCutoff);
  }

  // ── execution_runs (+ cascaded execution_logs) ───────────────────────────

  private async archiveExecutionRuns(org: RetentionOrg, cutoffIso: string): Promise<void> {
    const { data: runs, error } = await this.supabase.admin
      .from('execution_runs')
      .select('*')
      .eq('organization_id', org.id)
      .is('archived_at', null)
      .in('status', EXECUTION_RUN_TERMINAL_STATUSES)
      .lt('started_at', cutoffIso)
      .limit(BATCH_LIMIT);

    if (error) {
      this.logger.warn(`RetentionService: execution_runs query failed for org ${org.id} — ${error.message}`);
      return;
    }
    if (!runs?.length) return;

    const runIds = runs.map((r) => r['id'] as string);

    // Fold in child execution_logs so delete-mode disposal never loses
    // per-node detail (execution_logs has ON DELETE CASCADE from
    // execution_runs, migration 0006).
    const { data: logs, error: logsError } = await this.supabase.admin
      .from('execution_logs')
      .select('*')
      .in('run_id', runIds);

    if (logsError) {
      this.logger.warn(`RetentionService: execution_logs query failed for org ${org.id} — ${logsError.message}`);
      return; // don't export/dispose a partial picture
    }

    const logsByRun = new Map<string, unknown[]>();
    for (const log of logs ?? []) {
      const key = log['run_id'] as string;
      const list = logsByRun.get(key) ?? [];
      list.push(log);
      logsByRun.set(key, list);
    }

    const exportRows = runs.map((r) => ({ ...r, execution_logs: logsByRun.get(r['id'] as string) ?? [] }));

    const exported = await this.exportBatch(org.id, 'execution_runs', exportRows);
    if (!exported) return; // export failed — do not dispose

    await this.disposeBatch(org, 'execution_runs', runIds, exported.path, exportRows.length);
  }

  // ── approval_tasks ────────────────────────────────────────────────────────

  private async archiveApprovalTasks(org: RetentionOrg, cutoffIso: string): Promise<void> {
    // approval_tasks has no organization_id column directly — resolve via
    // its project_id (same lookup style as AnalyticsRollupService's
    // departmentByProject map).
    const { data: projects, error: projectsError } = await this.supabase.admin
      .from('projects')
      .select('id')
      .eq('organization_id', org.id);

    if (projectsError) {
      this.logger.warn(`RetentionService: projects lookup failed for org ${org.id} — ${projectsError.message}`);
      return;
    }
    const projectIds = (projects ?? []).map((p) => p['id'] as string);
    if (!projectIds.length) return;

    const { data: tasks, error } = await this.supabase.admin
      .from('approval_tasks')
      .select('*')
      .in('project_id', projectIds)
      .is('archived_at', null)
      .in('status', APPROVAL_TASK_TERMINAL_STATUSES)
      .lt('created_at', cutoffIso)
      .limit(BATCH_LIMIT);

    if (error) {
      this.logger.warn(`RetentionService: approval_tasks query failed for org ${org.id} — ${error.message}`);
      return;
    }
    if (!tasks?.length) return;

    const exported = await this.exportBatch(org.id, 'approval_tasks', tasks);
    if (!exported) return;

    const ids = tasks.map((t) => t['id'] as string);
    await this.disposeBatch(org, 'approval_tasks', ids, exported.path, tasks.length);
  }

  // ── audit_log ─────────────────────────────────────────────────────────────

  private async archiveAuditLog(org: RetentionOrg, cutoffIso: string): Promise<void> {
    const { data: rows, error } = await this.supabase.admin
      .from('audit_log')
      .select('*')
      .eq('organization_id', org.id)
      .is('archived_at', null)
      .lt('created_at', cutoffIso)
      .limit(BATCH_LIMIT);

    if (error) {
      this.logger.warn(`RetentionService: audit_log query failed for org ${org.id} — ${error.message}`);
      return;
    }
    if (!rows?.length) return;

    const exported = await this.exportBatch(org.id, 'audit_log', rows);
    if (!exported) return;

    const ids = rows.map((r) => r['id'] as string);
    await this.disposeBatch(org, 'audit_log', ids, exported.path, rows.length);
  }

  // ── Shared: export + dispose ─────────────────────────────────────────────

  private async exportBatch(
    orgId: string,
    table: string,
    rows: Record<string, unknown>[],
  ): Promise<{ path: string } | null> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `${orgId}/${table}/${timestamp}_${randomUUID()}.json`;

    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      organizationId: orgId,
      table,
      rowCount: rows.length,
      rows,
    });

    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(payload, 'utf-8'), { contentType: 'application/json', upsert: false });

    if (error) {
      this.logger.error(`RetentionService: export to storage failed for org ${orgId} table ${table} — ${error.message}`);
      return null;
    }

    return { path };
  }

  private async disposeBatch(
    org: RetentionOrg,
    table: string,
    ids: string[],
    exportPath: string,
    count: number,
  ): Promise<void> {
    if (org.retention_mode === 'delete') {
      const { error } = await this.supabase.admin.from(table).delete().in('id', ids);
      if (error) {
        this.logger.error(`RetentionService: delete failed for org ${org.id} table ${table} — ${error.message}`);
        return;
      }
    } else {
      const { error } = await this.supabase.admin
        .from(table)
        .update({ archived_at: new Date().toISOString() })
        .in('id', ids);
      if (error) {
        this.logger.error(`RetentionService: archive-stamp failed for org ${org.id} table ${table} — ${error.message}`);
        return;
      }
    }

    const message = `Retention: ${count} ${table} row(s) ${org.retention_mode === 'delete' ? 'exported and deleted' : 'exported and archived'} (org ${org.id}).`;
    this.logger.log(`RetentionService: ${message}`);

    await this.supabase.admin.from('audit_log').insert({
      organization_id: org.id,
      project_id:      null,
      actor_id:         null, // system-initiated
      event_type:       `retention.${table}_${org.retention_mode === 'delete' ? 'deleted' : 'archived'}`,
      entity_type:      table,
      entity_id:        null, // batch operation, not a single entity
      summary:          message,
      metadata:         { count, exportPath, mode: org.retention_mode, retentionDays: org.retention_days },
    });

    void this.eventBus.publish({
      orgId:      org.id,
      type:       'retention.batch_processed',
      sourceType: 'system',
      actorId:    'system',
      payload:    { table, count, mode: org.retention_mode, exportPath },
    });
  }
}
