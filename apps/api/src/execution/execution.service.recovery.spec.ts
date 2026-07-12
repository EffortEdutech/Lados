/**
 * Phase 21 S3 — crash-recovery regression test for ExecutionService.
 *
 * Covers the master plan S3 test requirement: "crash-recovery jest for the
 * requeue logic." ExecutionService._recoverStaleRuns() (Phase 12) runs on
 * every API boot and marks any execution_runs row still at status='running'
 * from before the restart as 'failed' — those runs are orphaned because the
 * in-memory worker process that owned them is gone, so they can never
 * legitimately finish. This proves that behavior end to end via
 * onModuleInit(), and that it never throws (crash recovery must never block
 * API startup).
 */
import { ExecutionService } from './execution.service';

function makeSupabaseStub(
  staleIds: string[],
  captured: { updatePayload?: Record<string, unknown>; updatedIds?: string[] },
) {
  const execRunsTable = {
    select: () => execRunsTable,
    eq: () => Promise.resolve({ data: staleIds.map((id) => ({ id })), error: null }),
    update: (payload: Record<string, unknown>) => {
      captured.updatePayload = payload;
      return {
        in: (_col: string, ids: string[]) => {
          captured.updatedIds = ids;
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return {
    admin: {
      from: jest.fn((table: string) => {
        if (table === 'execution_runs') return execRunsTable;
        throw new Error(`Unstubbed table in test: ${table}`);
      }),
    },
  };
}

/** Builds an ExecutionService with every non-supabase/eventBus dependency stubbed to `{}`. */
function makeService(supabase: unknown): ExecutionService {
  const eventBus = { setWorkflowTrigger: jest.fn() };
  return new ExecutionService(
    supabase as never,
    {} as never, // fileService
    {} as never, // libraryService
    {} as never, // aiService
    {} as never, // documentService
    {} as never, // notificationService
    {} as never, // resourceService
    eventBus as never,
    {} as never, // stateEngine
    {} as never, // security
    {} as never, // approvalTaskCreator
    {} as never, // artifactService
    { isAvailable: false } as never, // executionQueue
    {} as never, // packRegistry
    {} as never, // resourceBindings
    {} as never, // dataPacks
    {} as never, // emailService
    {} as never, // smsService
    { emit: jest.fn() } as never, // emitter (EventEmitter2)
    {} as never, // programArtifactService (Phase 23 S23.3, renamed Phase 24 S24.2)
  );
}

describe('ExecutionService — crash recovery (Phase 12, D2/D3 regression)', () => {
  it('marks runs orphaned by a previous crash as failed on startup', async () => {
    const captured: { updatePayload?: Record<string, unknown>; updatedIds?: string[] } = {};
    const supabase = makeSupabaseStub(['stale-run-1', 'stale-run-2'], captured);
    const service = makeService(supabase);

    await service.onModuleInit();

    expect(captured.updatedIds).toEqual(['stale-run-1', 'stale-run-2']);
    expect(captured.updatePayload).toMatchObject({
      status: 'failed',
      error: { code: 'CRASH_RECOVERY' },
    });
    expect(typeof captured.updatePayload!['completed_at']).toBe('string');
  });

  it('does nothing (and does not throw) when there are no stale runs', async () => {
    const captured: { updatePayload?: Record<string, unknown>; updatedIds?: string[] } = {};
    const supabase = makeSupabaseStub([], captured);
    const service = makeService(supabase);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(captured.updatePayload).toBeUndefined();
  });

  it('never throws even if the recovery query itself fails', async () => {
    const supabase = {
      admin: {
        from: jest.fn(() => ({
          select: () => ({
            eq: () => Promise.resolve({ data: null, error: { message: 'db unreachable' } }),
          }),
        })),
      },
    };
    const service = makeService(supabase);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
