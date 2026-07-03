/**
 * ExecutionQueueService — Phase 12, hardened Phase 21 S3 (D2)
 *
 * Wraps BullMQ Queue. Called by ExecutionService instead of
 * calling _executeAndPersist() directly.
 *
 * Uses plain ConnectionOptions (not an IORedis instance) so BullMQ
 * manages its own internal ioredis connection — avoids version mismatch
 * when the workspace has multiple ioredis versions in node_modules.
 *
 * S3 (D2) hardening — this service used to have a real production defect:
 * Redis commands could hang silently (stale/rotated Upstash credentials),
 * the queue never surfaced a startup problem, and a hung `queue.add()` call
 * would strand triggerRun()/resumeRun() forever with the run stuck at
 * 'running' and zero feedback. Fixed by:
 *   1. A startup healthcheck (with its own hard timeout — round-trips a real
 *      Redis command, `INFO`, since BullMQ 5.x's client-abstraction interface
 *      doesn't expose a literal PING) that logs a LOUD `error`-level line if
 *      Redis is unreachable, instead of only ever logging "ready".
 *   2. `commandTimeout` on the ioredis connection so any individual Redis
 *      command that hangs rejects instead of hanging forever.
 *   3. `enqueueTrigger`/`enqueueResume` now return `{ enqueued: boolean }`
 *      instead of `void` — a timeout or Redis error is caught, logged loudly,
 *      and reported back as `enqueued: false` so the caller (ExecutionService)
 *      can fall back to in-process execution instead of stranding the run.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, ConnectionOptions } from 'bullmq';
import {
  EXECUTION_QUEUE_NAME,
  EXECUTION_JOB_TYPE,
  ExecutionJobPayload,
} from './queue.constants';

/** Any individual Redis command (including the startup healthcheck) waits at most this long. */
const REDIS_COMMAND_TIMEOUT_MS = parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS ?? '', 10) || 8_000;

/** Parse a Redis URL into BullMQ ConnectionOptions (no ioredis import needed). */
export function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host:                parsed.hostname,
    port:                parseInt(parsed.port, 10) || 6379,
    username:            parsed.username || undefined,
    password:            parsed.password ? decodeURIComponent(parsed.password) : undefined,
    tls:                 url.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: null,  // required by BullMQ
    enableReadyCheck:    false,
    // S3 (D2) — without this, a stale/rotated credential or network partition
    // makes ioredis commands (including BullMQ's own .add()) hang indefinitely
    // instead of rejecting. This is the "Redis commands hang silently" defect.
    commandTimeout:      REDIS_COMMAND_TIMEOUT_MS,
  } as ConnectionOptions;
}

/** Rejects with a labeled timeout error if `promise` doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

@Injectable()
export class ExecutionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutionQueueService.name);
  private connectionOptions: ConnectionOptions | undefined;
  private queue: Queue<ExecutionJobPayload> | undefined;
  /** Last known result of the PING healthcheck — surfaced via /queue/health. */
  private lastPingOk: boolean | undefined;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — BullMQ disabled, using in-process fallback');
      return;
    }

    this.connectionOptions = parseRedisUrl(redisUrl);

    this.queue = new Queue(EXECUTION_QUEUE_NAME, {
      connection: this.connectionOptions,
      defaultJobOptions: {
        attempts:         3,
        backoff:          { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 500 },
      },
    });

    // Without this handler, Redis ECONNRESET / TLS errors surface as unhandled
    // process-level exceptions and flood the API log.
    this.queue.on('error', (err) => {
      this.logger.warn(`BullMQ queue connection error (will retry): ${err.message}`);
    });

    this.logger.log(`BullMQ queue "${EXECUTION_QUEUE_NAME}" constructed — verifying connectivity...`);

    // S3 (D2) — startup healthcheck. Fire-and-forget so it never blocks API
    // boot (Redis may legitimately come up a few seconds after the API
    // process does), but its result is LOUD: `error`-level on failure, not a
    // quiet warn buried in startup logs.
    void this.pingHealthcheck();
  }

  /**
   * Verifies Redis is actually reachable, not just configured. Safe to call anytime.
   *
   * Uses `client.info()` rather than a literal PING — BullMQ 5.x abstracts
   * the underlying Redis client behind its own `IRedisClient` interface (to
   * support ioredis/node-redis/Bun interchangeably) and that interface does
   * not declare `ping()`. `info()` is declared on it and is just as good a
   * round-trip liveness check: it only succeeds if Redis actually answers.
   */
  async pingHealthcheck(): Promise<boolean> {
    if (!this.queue) {
      this.lastPingOk = false;
      return false;
    }
    try {
      const client = await withTimeout(this.queue.client, REDIS_COMMAND_TIMEOUT_MS, 'BullMQ client acquisition');
      await withTimeout(client.info(), REDIS_COMMAND_TIMEOUT_MS, 'Redis healthcheck (INFO)');
      this.lastPingOk = true;
      this.logger.log(`BullMQ queue "${EXECUTION_QUEUE_NAME}" ready — Redis healthcheck OK`);
      return true;
    } catch (err: unknown) {
      this.lastPingOk = false;
      const message = err instanceof Error ? err.message : String(err);
      // LOUD on purpose: this is the D2 defect ("Redis commands hang silently,
      // queue has never processed a job") — it must be impossible to miss in
      // the logs, unlike the old silent-`ready`-log-only startup path.
      this.logger.error(
        `BullMQ Redis healthcheck FAILED — queue is configured but Redis is unreachable. ` +
        `Runs will still execute via in-process fallback (see ExecutionService), but no job ` +
        `will ever be processed via BullMQ until this is fixed. Cause: ${message}`,
      );
      return false;
    }
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  /**
   * True when Redis is *configured*. Does not by itself mean Redis is
   * reachable — check `lastKnownHealthy` / call `pingHealthcheck()` for that.
   * Left as the pre-existing contract so trigger/resume call sites keep
   * working; enqueue methods below independently verify + fall back safely.
   */
  get isAvailable(): boolean {
    return !!this.queue;
  }

  /** Last known healthcheck result. `undefined` before the first healthcheck has run. */
  get lastKnownHealthy(): boolean | undefined {
    return this.lastPingOk;
  }

  /**
   * Share parsed ConnectionOptions with the worker (avoids double parse).
   * Worker uses the same options to create its own BullMQ Worker instance.
   */
  getConnectionOptions(): ConnectionOptions | undefined {
    return this.connectionOptions;
  }

  /**
   * Enqueue a new workflow run. runId must already exist in DB.
   *
   * S3 (D2): never throws and never hangs past REDIS_COMMAND_TIMEOUT_MS.
   * Returns `{ enqueued: false }` on any failure so the caller can fall back
   * to in-process execution instead of stranding the run at 'running'.
   */
  async enqueueTrigger(payload: Omit<ExecutionJobPayload, 'type'>): Promise<{ enqueued: boolean }> {
    if (!this.queue) return { enqueued: false };
    try {
      await withTimeout(
        this.queue.add(
          EXECUTION_JOB_TYPE.TRIGGER,
          { ...payload, type: EXECUTION_JOB_TYPE.TRIGGER },
          { jobId: `trigger-${payload.runId}` },
        ),
        REDIS_COMMAND_TIMEOUT_MS,
        `Enqueue TRIGGER for run ${payload.runId}`,
      );
      this.logger.debug(`Enqueued TRIGGER for run ${payload.runId}`);
      return { enqueued: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Enqueue TRIGGER FAILED for run ${payload.runId} — falling back to in-process execution. Cause: ${message}`,
      );
      return { enqueued: false };
    }
  }

  /**
   * Re-enqueue a paused run after approval decision. DB already updated by caller.
   * Same D2 hardening as enqueueTrigger — never hangs, never throws.
   */
  async enqueueResume(payload: Omit<ExecutionJobPayload, 'type'>): Promise<{ enqueued: boolean }> {
    if (!this.queue) return { enqueued: false };
    try {
      await withTimeout(
        this.queue.add(
          EXECUTION_JOB_TYPE.RESUME,
          { ...payload, type: EXECUTION_JOB_TYPE.RESUME },
          { jobId: `resume-${payload.runId}-${Date.now()}` },
        ),
        REDIS_COMMAND_TIMEOUT_MS,
        `Enqueue RESUME for run ${payload.runId}`,
      );
      this.logger.debug(`Enqueued RESUME for run ${payload.runId}`);
      return { enqueued: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Enqueue RESUME FAILED for run ${payload.runId} — falling back to in-process execution. Cause: ${message}`,
      );
      return { enqueued: false };
    }
  }

  // ── Ops / health ────────────────────────────────────────────────────────────

  /**
   * Phase 12 — BullMQ job counts for the execution queue.
   * Returns null when Redis is not configured (in-process fallback mode).
   * Shape: { waiting, active, completed, failed, delayed, paused } — all numbers.
   */
  async getStats(): Promise<{ [key: string]: number } | null> {
    if (!this.queue) return null;
    return this.queue.getJobCounts(
      'waiting', 'active', 'completed', 'failed', 'delayed', 'paused',
    );
  }

  /**
   * Phase 12 — most recent failed jobs (dead-letter view for ops).
   * @param limit max jobs to return (capped at 100)
   */
  async getFailedJobs(limit = 20): Promise<
    Array<{
      jobId:    string | undefined;
      runId:    string;
      type:     string;
      failedAt: number | undefined;
      reason:   string;
      attempts: number;
    }>
  > {
    if (!this.queue) return [];
    const safeLimit = Math.min(limit, 100);
    const jobs = await this.queue.getFailed(0, safeLimit - 1);
    return jobs.map((j) => ({
      jobId:    j.id,
      runId:    j.data.runId,
      type:     j.data.type,
      failedAt: j.finishedOn,
      reason:   j.failedReason ?? 'unknown',
      attempts: j.attemptsMade,
    }));
  }
}
