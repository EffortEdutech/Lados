/**
 * Phase 21 S3 (D1 regression) — WorkflowService.publish() status regression.
 *
 * Historical defect (found in PD-4 E2E, fixed 2026-07-03): publish() used to
 * set `status: 'active'`, which violates the DB constraint
 * `workflows_status_check CHECK (status IN ('draft','published','archived'))`
 * (see supabase/migrations/0003_create_workflows.sql) — every publish() call
 * 500'd since Phase 1. The fix already landed in workflow.service.ts; this
 * test exists so a future edit can never silently reintroduce a status value
 * outside the DB-allowed list without a test failing first.
 */
import { WorkflowService } from './workflow.service';
import { WorkflowStatus } from '@lados/shared-types';

/** DB-authoritative allowed values — supabase/migrations/0003_create_workflows.sql */
const DB_ALLOWED_WORKFLOW_STATUSES = ['draft', 'published', 'archived'];

const WORKFLOW_ID = 'wf-001';
const USER_ID = 'user-001';
const PROJECT_ID = 'project-001';
const ORG_ID = 'org-001';

/**
 * Minimal stateful chainable Supabase query-builder stub.
 * Distinguishes select/update/insert on the same `.from(table)` call so one
 * stub can serve every call WorkflowService.publish() makes against a table
 * (e.g. `workflows` is both read via findOne() and written at the end).
 */
function chainableTable(opts: {
  onSelect?: () => { data: unknown; error: unknown };
  onUpdate?: (payload: Record<string, unknown>) => { data: unknown; error: unknown };
  onInsert?: (payload: Record<string, unknown>) => { data: unknown; error: unknown };
  onDelete?: () => { data: unknown; error: unknown };
}) {
  let mode: 'select' | 'update' | 'insert' | 'delete' = 'select';
  let lastPayload: Record<string, unknown> = {};

  function resolveResult(): { data: unknown; error: unknown } {
    if (mode === 'update' && opts.onUpdate) return opts.onUpdate(lastPayload);
    if (mode === 'insert' && opts.onInsert) return opts.onInsert(lastPayload);
    if (mode === 'delete') return opts.onDelete ? opts.onDelete() : { data: null, error: null };
    if (opts.onSelect) return opts.onSelect();
    return { data: null, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: any = {
    select: () => obj,
    eq: () => obj,
    order: () => obj,
    limit: () => obj,
    update: (payload: Record<string, unknown>) => { mode = 'update'; lastPayload = payload; return obj; },
    insert: (payload: Record<string, unknown>) => { mode = 'insert'; lastPayload = payload; return obj; },
    delete: () => { mode = 'delete'; return obj; },
    maybeSingle: () => Promise.resolve(resolveResult()),
    single: () => Promise.resolve(resolveResult()),
    // Plain `await x.insert(...)` / `await x.delete().eq().eq()` with no
    // further chain — makes the object itself awaitable.
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(resolveResult()).then(resolve, reject),
  };
  return obj;
}

function makeService(
  capture: { publishUpdate?: Record<string, unknown> },
  preflight: jest.Mock = jest.fn(),
): WorkflowService {
  const tables: Record<string, ReturnType<typeof chainableTable>> = {
    workflows: chainableTable({
      onSelect: () => ({
        data: {
          id: WORKFLOW_ID,
          project_id: PROJECT_ID,
          definition: { nodes: [{ id: 'n1', type: 'lados.workflow.trigger_manual' }] },
          version: 1,
        },
        error: null,
      }),
      onUpdate: (payload) => {
        capture.publishUpdate = payload;
        return {
          data: {
            id: WORKFLOW_ID,
            name: 'Test Workflow',
            status: payload['status'],
            published_version_id: payload['published_version_id'],
            published_at: payload['published_at'],
          },
          error: null,
        };
      },
    }),
    projects: chainableTable({
      onSelect: () => ({ data: { organization_id: ORG_ID }, error: null }),
    }),
    organization_members: chainableTable({
      onSelect: () => ({ data: { role: 'owner' }, error: null }),
    }),
    workflow_versions: chainableTable({
      onSelect: () => ({ data: null, error: null }), // no prior version — nextVersion = 1
      onInsert: () => ({ data: { id: 'version-001', version_number: 1 }, error: null }),
    }),
    audit_log: chainableTable({
      onInsert: () => ({ data: null, error: null }),
    }),
    // publish() fire-and-forget syncTriggerSubscriptions() re-reads `projects`
    // (already stubbed above) then clears old subscriptions before
    // re-registering any from definition.triggers (none in this fixture).
    lados_event_subscriptions: chainableTable({
      onDelete: () => ({ data: null, error: null }),
    }),
  };

  const supabase = {
    admin: {
      from: jest.fn((table: string) => {
        const t = tables[table];
        if (!t) throw new Error(`Unstubbed table in test: ${table}`);
        return t;
      }),
    },
  };

  return new WorkflowService(
    supabase as never,
    {} as never,
    { assertDefinitionRuntimeReady: preflight } as never,
  );
}

describe('WorkflowService.publish — D1 status regression', () => {
  it('sets a status value that is in the DB-allowed list (never the historical "active" bug)', async () => {
    const capture: { publishUpdate?: Record<string, unknown> } = {};
    const service = makeService(capture);

    const result = await service.publish(WORKFLOW_ID, USER_ID);

    expect(capture.publishUpdate).toBeDefined();
    const status = capture.publishUpdate!['status'];

    expect(status).not.toBe('active');
    expect(DB_ALLOWED_WORKFLOW_STATUSES).toContain(status);
    expect(status).toBe(WorkflowStatus.PUBLISHED);
    expect(result.published).toBe(true);
    expect(result.workflow).toMatchObject({ status: WorkflowStatus.PUBLISHED });
  });

  it('also stamps published_version_id and published_at alongside the status update', async () => {
    const capture: { publishUpdate?: Record<string, unknown> } = {};
    const service = makeService(capture);

    await service.publish(WORKFLOW_ID, USER_ID);

    expect(capture.publishUpdate).toMatchObject({
      published_version_id: 'version-001',
    });
    expect(typeof capture.publishUpdate!['published_at']).toBe('string');
  });

  it('blocks publish before snapshotting when a required executor is unavailable', async () => {
    const capture: { publishUpdate?: Record<string, unknown> } = {};
    const preflight = jest.fn(() => { throw new Error('Workflow is not production-ready'); });
    const service = makeService(capture, preflight);

    await expect(service.publish(WORKFLOW_ID, USER_ID)).rejects.toThrow('not production-ready');
    expect(preflight).toHaveBeenCalledTimes(1);
    expect(capture.publishUpdate).toBeUndefined();
  });
});
