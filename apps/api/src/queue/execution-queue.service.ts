/**
 * ExecutionQueueService — Phase 12
 *
 * Wraps BullMQ Queue. Called by ExecutionService instead of
 * calling _executeAndPersist() directly.
 *
 * Uses plain ConnectionOptions (not an IORedis instance) so BullMQ
 * manages its own internal ioredis connection — avoids version mismatch
 * when the workspace has multiple ioredis versions in node_modules.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, ConnectionOptions } from 'bullmq';
import {
  EXECUTION_QUEUE_NAME,
  EXECUTION_JOB_TYPE,
  ExecutionJobPayload,
} from './queue.constants';

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
  } as ConnectionOptions;
}

@Injectable()
export class ExecutionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutionQueueService.name);
  private connectionOptions: ConnectionOptions | undefined;
  private queue: Queue<ExecutionJobPayload> | undefined;

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

    this.logger.log(`BullMQ queue "${EXECUTION_QUEUE_NAME}" ready`);
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  /** True when Redis is configured and the queue is ready. */
  get isAvailable(): boolean {
    return !!this.queue;
  }

  /**
   * Share parsed ConnectionOptions with the worker (avoids double parse).
   * Worker uses the same options to create its own BullMQ Worker instance.
   */
  getConnectionOptions(): ConnectionOptions | undefined {
    return this.connectionOptions;
  }

  /** Enqueue a new workflow run. runId must already exist in DB. */
  async enqueueTrigger(payload: Omit<ExecutionJobPayload, 'type'>): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(
      EXECUTION_JOB_TYPE.TRIGGER,
      { ...payload, type: EXECUTION_JOB_TYPE.TRIGGER },
      { jobId: `trigger-${payload.runId}` },
    );
    this.logger.debug(`Enqueued TRIGGER for run ${payload.runId}`);
  }

  /** Re-enqueue a paused run after approval decision. DB already updated by caller. */
  async enqueueResume(payload: Omit<ExecutionJobPayload, 'type'>): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(
      EXECUTION_JOB_TYPE.RESUME,
      { ...payload, type: EXECUTION_JOB_TYPE.RESUME },
      { jobId: `resume-${payload.runId}-${Date.now()}` },
    );
    this.logger.debug(`Enqueued RESUME for run ${payload.runId}`);
  }
}
