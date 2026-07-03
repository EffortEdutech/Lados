/**
 * Phase 21 S3 (D3) — RunWatchdogService.
 *
 * Covers the master plan D3 item: "runs in running/queued beyond a
 * configurable timeout are marked timed_out with a visible error." Exercises
 * the private tick()/timeoutRun() logic directly (bypassing the setInterval
 * scheduling, which onModuleInit()/onModuleDestroy() cover trivially) against
 * a hand-built Supabase stub, matching the pattern already used for
 * SchedulerService-adjacent tests in this codebase.
 */
import { RunWatchdogService } from './run-watchdog.service';

interface CapturedUpdate {
  runId: string;
  payload: Record<string, unknown>;
}

function makeSupabaseStub(
  stuckRuns: Array<{ id: string; workflow_id: string; project_id: string; organization_id: string; started_by: string | null; started_at: string }>,
  updates: CapturedUpdate[],
) {
  const execRunsTable = {
    select: () => execRunsTable,
    in: () => execRunsTable,
    lt: () => Promise.resolve({ data: stuckRuns, error: null }),
    update: (payload: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => ({
        in: () => ({
          select: () => {
            updates.push({ runId: id, payload });
            return Promise.resolve({ data: [{ id }], error: null });
          },
        }),
      }),
    }),
  };

  const auditLogTable = { insert: () => Promise.resolve({ data: null, error: null }) };

  return {
    admin: {
      from: jest.fn((table: string) => {
        if (table === 'execution_runs') return execRunsTable;
        if (table === 'audit_log') return auditLogTable;
        throw new Error(`Unstubbed table in test: ${table}`);
      }),
    },
  };
}

function makeService(supabase: unknown, eventBusPublish: jest.Mock, emitterEmit: jest.Mock): RunWatchdogService {
  const eventBus = { publish: eventBusPublish };
  const emitter = { emit: emitterEmit };
  return new RunWatchdogService(supabase as never, eventBus as never, emitter as never);
}

describe('RunWatchdogService', () => {
  it('defaults timeoutMs to 30 minutes when RUN_WATCHDOG_TIMEOUT_MS is unset', () => {
    const prev = process.env.RUN_WATCHDOG_TIMEOUT_MS;
    delete process.env.RUN_WATCHDOG_TIMEOUT_MS;
    try {
      const svc = makeService(makeSupabaseStub([], []), jest.fn(), jest.fn());
      expect(svc.timeoutMs).toBe(30 * 60 * 1000);
    } finally {
      if (prev === undefined) delete process.env.RUN_WATCHDOG_TIMEOUT_MS;
      else process.env.RUN_WATCHDOG_TIMEOUT_MS = prev;
    }
  });

  it('respects RUN_WATCHDOG_TIMEOUT_MS when set to a valid positive number', () => {
    const prev = process.env.RUN_WATCHDOG_TIMEOUT_MS;
    process.env.RUN_WATCHDOG_TIMEOUT_MS = '60000';
    try {
      const svc = makeService(makeSupabaseStub([], []), jest.fn(), jest.fn());
      expect(svc.timeoutMs).toBe(60_000);
    } finally {
      if (prev === undefined) delete process.env.RUN_WATCHDOG_TIMEOUT_MS;
      else process.env.RUN_WATCHDOG_TIMEOUT_MS = prev;
    }
  });

  it('marks a stuck run timed_out, publishes an event, and emits the SSE event', async () => {
    const staleRun = {
      id: 'run-stuck-1',
      workflow_id: 'wf-1',
      project_id: 'proj-1',
      organization_id: 'org-1',
      started_by: 'user-1',
      started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    };
    const updates: CapturedUpdate[] = [];
    const eventBusPublish = jest.fn();
    const emitterEmit = jest.fn();
    const supabase = makeSupabaseStub([staleRun], updates);
    const svc = makeService(supabase, eventBusPublish, emitterEmit);

    // Private tick() drives the whole poll cycle — invoked directly, same
    // technique used across this codebase for testing interval-based
    // services without waiting on real timers.
    await (svc as unknown as { tick: () => Promise<void> }).tick();

    expect(updates).toHaveLength(1);
    expect(updates[0]!.runId).toBe('run-stuck-1');
    expect(updates[0]!.payload).toMatchObject({ status: 'timed_out' });
    expect((updates[0]!.payload['error'] as { code: string }).code).toBe('RUN_TIMEOUT');

    expect(eventBusPublish).toHaveBeenCalledTimes(1);
    expect(eventBusPublish.mock.calls[0]![0]).toMatchObject({
      orgId: 'org-1',
      type: 'workflow.failed',
      sourceId: 'wf-1',
    });

    expect(emitterEmit).toHaveBeenCalledTimes(1);
    expect(emitterEmit.mock.calls[0]![0]).toBe('run.timed_out');
    expect(emitterEmit.mock.calls[0]![1]).toMatchObject({ runId: 'run-stuck-1' });
  });

  it('does nothing when there are no stuck runs', async () => {
    const eventBusPublish = jest.fn();
    const emitterEmit = jest.fn();
    const svc = makeService(makeSupabaseStub([], []), eventBusPublish, emitterEmit);

    await (svc as unknown as { tick: () => Promise<void> }).tick();

    expect(eventBusPublish).not.toHaveBeenCalled();
    expect(emitterEmit).not.toHaveBeenCalled();
  });
});
