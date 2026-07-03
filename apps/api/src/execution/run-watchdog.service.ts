/**
 * RunWatchdogService — Phase 21 S3 (D3)
 *
 * Historical defect: a run could get stuck at status 'running' (or 'queued')
 * forever with zero feedback if the queue stalled or a worker died mid-job
 * without crashing the whole API process (the narrower case
 * ExecutionService._recoverStaleRuns() doesn't cover — that one only catches
 * runs orphaned by an API *process* restart). This watchdog polls for runs
 * that have been running/queued longer than a configurable timeout and marks
 * them 'timed_out' with a visible error, so the UI never shows an infinite
 * spinner and the operator can resubmit.
 *
 * Poll-based, same architecture as SchedulerService (Phase 10) — no external
 * cron/scheduling library needed for a single-process API.
 *
 * Configuration:
 *   RUN_WATCHDOG_TIMEOUT_MS — how long a run may stay running/queued before
 *                             being timed out (default 30 minutes).
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { RUN_EVENT } from '../queue/queue.constants';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS   = 60_000;         // 1 minute — matches SchedulerService's cadence

interface StuckRun {
  id: string;
  workflow_id: string;
  project_id: string;
  organization_id: string;
  started_by: string | null;
  started_at: string;
}

@Injectable()
export class RunWatchdogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RunWatchdogService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  readonly timeoutMs: number;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventBus: EventBusService,
    private readonly emitter: EventEmitter2,
  ) {
    const configured = parseInt(process.env.RUN_WATCHDOG_TIMEOUT_MS ?? '', 10);
    this.timeoutMs = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
  }

  onModuleInit(): void {
    this.logger.log(
      `RunWatchdogService: starting (poll ${POLL_INTERVAL_MS}ms, timeout ${this.timeoutMs}ms)`,
    );
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // ── Internal tick ─────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - this.timeoutMs).toISOString();

      const { data: stuck, error } = await this.supabase.admin
        .from('execution_runs')
        .select('id, workflow_id, project_id, organization_id, started_by, started_at')
        .in('status', ['running', 'queued'])
        .lt('started_at', cutoff);

      if (error) {
        this.logger.warn(`RunWatchdogService: query failed — ${error.message}`);
        return;
      }
      if (!stuck?.length) return;

      for (const run of stuck as StuckRun[]) {
        await this.timeoutRun(run);
      }
    } catch (err: unknown) {
      this.logger.error(`RunWatchdogService: tick error — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Timeout a single stuck run ───────────────────────────────────────────

  private async timeoutRun(run: StuckRun): Promise<void> {
    const ageMinutes = Math.round((Date.now() - new Date(run.started_at).getTime()) / 60_000);
    const message =
      `Run exceeded the ${Math.round(this.timeoutMs / 60_000)}-minute watchdog timeout ` +
      `(no progress for ${ageMinutes} minutes) — marked timed_out. Resubmit to retry.`;

    // Re-assert status in the WHERE clause — guards against a race where the
    // run legitimately completed/failed between our SELECT and this UPDATE.
    const { error: updateErr, data: updated } = await this.supabase.admin
      .from('execution_runs')
      .update({
        status:       'timed_out',
        error:        { code: 'RUN_TIMEOUT', message },
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)
      .in('status', ['running', 'queued'])
      .select('id');

    if (updateErr) {
      this.logger.error(`RunWatchdogService: failed to mark run ${run.id} timed_out — ${updateErr.message}`);
      return;
    }
    if (!updated?.length) {
      // Raced with a legitimate completion/failure — nothing to do.
      return;
    }

    this.logger.error(`RunWatchdogService: run ${run.id} (workflow ${run.workflow_id}) TIMED OUT — ${message}`);

    void this.eventBus.publish({
      orgId:      run.organization_id,
      type:       'workflow.failed',
      sourceType: 'workflow',
      sourceId:   run.workflow_id,
      actorId:    run.started_by ?? 'system',
      payload:    { runId: run.id, error: { code: 'RUN_TIMEOUT', message } },
    });

    await this.supabase.admin.from('audit_log').insert({
      organization_id: run.organization_id,
      project_id:      run.project_id,
      actor_id:        run.started_by,
      event_type:      'run.timed_out',
      entity_type:     'run',
      entity_id:       run.id,
      summary:         message,
      metadata:        { workflow_id: run.workflow_id },
    });

    // SSE — lets an open /runs/:runId/stream close instead of hanging until
    // its own 10-minute safety timeout.
    this.emitter.emit(RUN_EVENT.RUN_TIMED_OUT, { runId: run.id, error: message });
  }
}
