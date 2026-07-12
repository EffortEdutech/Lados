-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0075: Pipeline Orchestration & Governance — Schema Foundations
-- Phase 23 S23.1 — see Lados_V4_Phase23_Pipeline_Orchestration_Governance_
-- Master_Plan.md §3 for the full design rationale.
--
-- All additive. Zero behavior change to any existing project, workflow, or
-- approval task unless a pipeline is explicitly built and run.
--
-- The old Sprint 11/12 `project_pipelines`/`project_artifacts` tables are
-- DELIBERATELY NOT dropped or touched here — the old PipelineController/
-- PipelineCanvas.tsx still actively read/write them until S23.4 replaces the
-- canvas. eff confirmed (2026-07-08, plan §9.2) the 3 existing
-- `project_pipelines` rows are disposable test data, so no migration path is
-- needed for them — they simply stop being written to once S23.4 ships, and
-- both old tables get dropped in a later cleanup migration once nothing
-- references them anymore.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── pipelines ────────────────────────────────────────────────────────────────
-- The pipeline definition — a top-level org entity (NOT nested under a
-- project, unlike the old project_pipelines). A stage inside `layout` can
-- reference a workflow living in any project the org can see.

CREATE TABLE IF NOT EXISTS public.pipelines (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id     UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  name              TEXT        NOT NULL,
  description       TEXT,
  layout            JSONB       NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  status            TEXT        NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'published', 'archived')),
  created_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipelines IS
  'A chain of workflows forming an end-to-end business process, optionally scoped to a department (NULL = org-wide). Phase 23 S23.1 -- successor to the retired project-scoped project_pipelines.';
COMMENT ON COLUMN public.pipelines.department_id IS
  'NULL = org-wide / cross-department. Mirrors projects.department_id''s exact pattern from Phase 22 S22.1.';

CREATE INDEX IF NOT EXISTS idx_pipelines_organization_id ON public.pipelines(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_department_id   ON public.pipelines(department_id);

CREATE TRIGGER pipelines_set_updated_at
  BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── pipeline_runs ──────────────────────────────────────────────────────────
-- One row per pipeline execution -- the durable, server-tracked state a
-- client-side-only runner could never provide. Mirrors execution_runs'
-- shape deliberately (snapshot, status enum, timing columns) so the same
-- review/monitoring patterns apply cleanly.

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id         UUID        NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id       UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  pipeline_snapshot   JSONB       NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'created'
                                   CHECK (status IN (
                                     'created', 'running', 'paused',
                                     'completed', 'failed', 'cancelled', 'timed_out'
                                   )),
  current_stage_ids   JSONB       NOT NULL DEFAULT '[]',
  stage_history       JSONB       NOT NULL DEFAULT '[]',
  started_by          UUID        REFERENCES auth.users(id),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  error               JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipeline_runs IS
  'One row per pipeline execution. pipeline_snapshot is immutable at trigger time (same convention as execution_runs.workflow_snapshot). Phase 23 S23.1.';
COMMENT ON COLUMN public.pipeline_runs.current_stage_ids IS
  'Array of node ids currently active/paused-at -- an array (not a single id) because a DAG can have parallel branches.';
COMMENT ON COLUMN public.pipeline_runs.stage_history IS
  'Append-only log: [{stageNodeId, type: workflow|gate, executionRunId|approvalTaskId, status, startedAt, completedAt}, ...]. Kept as jsonb, not a child table, given the low stage-count-per-pipeline vs node-count-per-workflow.';

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline_id ON public.pipeline_runs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_org_id      ON public.pipeline_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status      ON public.pipeline_runs(status);

CREATE TRIGGER pipeline_runs_set_updated_at
  BEFORE UPDATE ON public.pipeline_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── pipeline_artifacts ─────────────────────────────────────────────────────
-- Successor to project_artifacts -- scoped to one pipeline RUN (not a
-- project-wide singleton per key), so two concurrent pipeline runs can never
-- clobber each other's handoff data under the same artifact_key.

CREATE TABLE IF NOT EXISTS public.pipeline_artifacts (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id    UUID        NOT NULL REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
  source_stage_id    TEXT        NOT NULL,
  source_run_id      UUID        REFERENCES public.execution_runs(id) ON DELETE SET NULL,
  artifact_key       TEXT        NOT NULL,
  value              JSONB       NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_artifacts_run_key UNIQUE (pipeline_run_id, artifact_key)
);

COMMENT ON TABLE public.pipeline_artifacts IS
  'Cross-workflow data handoff within one pipeline run. Written/read by lados.workflow.pipeline_save_artifact / pipeline_read_artifact (S23.3). Phase 23 S23.1.';

CREATE INDEX IF NOT EXISTS idx_pipeline_artifacts_run_id ON public.pipeline_artifacts(pipeline_run_id);

-- ── execution_runs: thread pipeline context into an ordinary workflow run ───

ALTER TABLE public.execution_runs
  ADD COLUMN IF NOT EXISTS pipeline_run_id  UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pipeline_stage_id TEXT;

COMMENT ON COLUMN public.execution_runs.pipeline_run_id IS
  'NULL for an ordinary standalone run (the default, every pre-Phase-23 run). Set when ExecutionService.triggerRun() is called by PipelineExecutionService for a pipeline stage -- gives pipeline_save_artifact/pipeline_read_artifact nodes and future analytics a join key back to the parent pipeline run. Phase 23 S23.1.';

CREATE INDEX IF NOT EXISTS idx_execution_runs_pipeline_run_id
  ON public.execution_runs(pipeline_run_id)
  WHERE pipeline_run_id IS NOT NULL;

-- ── approval_tasks: pipeline_gate task type (N-of-M quorum, confirmed §9.3) ──
--
-- A pipeline_gate task is a gate INSTANCE, not a single decision -- the
-- roster (voter_user_ids) and threshold (vote_threshold) live here, but each
-- individual committee member's decision lives in the new
-- pipeline_gate_votes child table below. This is a deliberate divergence
-- from 'approval'/'input' tasks, which remain one-row-one-decision.

ALTER TABLE public.approval_tasks
  ADD COLUMN IF NOT EXISTS pipeline_run_id  UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS voter_user_ids   JSONB,
  ADD COLUMN IF NOT EXISTS vote_threshold   INTEGER;

COMMENT ON COLUMN public.approval_tasks.voter_user_ids IS
  'pipeline_gate only -- the "M" roster: array of eligible committee member user_ids. NULL for approval/input tasks.';
COMMENT ON COLUMN public.approval_tasks.vote_threshold IS
  'pipeline_gate only -- the "N": number of approved votes needed to pass. NULL for approval/input tasks.';

-- execution_id was NOT NULL (every task used to belong to exactly one
-- workflow run). A pipeline_gate task belongs to a pipeline run instead --
-- relax the NOT NULL and replace it with an explicit XOR constraint so the
-- "exactly one parent" invariant is just as strict as before, now covering
-- both parent types.
ALTER TABLE public.approval_tasks
  ALTER COLUMN execution_id DROP NOT NULL;

ALTER TABLE public.approval_tasks
  DROP CONSTRAINT IF EXISTS approval_tasks_execution_xor_pipeline;
ALTER TABLE public.approval_tasks
  ADD CONSTRAINT approval_tasks_execution_xor_pipeline
  CHECK (
    (task_type IN ('approval', 'input') AND execution_id IS NOT NULL AND pipeline_run_id IS NULL)
    OR
    (task_type = 'pipeline_gate' AND pipeline_run_id IS NOT NULL AND execution_id IS NULL
       AND voter_user_ids IS NOT NULL AND vote_threshold IS NOT NULL)
  );

ALTER TABLE public.approval_tasks
  DROP CONSTRAINT IF EXISTS approval_tasks_task_type_check;
ALTER TABLE public.approval_tasks
  ADD CONSTRAINT approval_tasks_task_type_check
  CHECK (task_type IN ('approval', 'input', 'pipeline_gate'));

CREATE INDEX IF NOT EXISTS idx_approval_tasks_pipeline_run_id
  ON public.approval_tasks(pipeline_run_id)
  WHERE pipeline_run_id IS NOT NULL;

-- Escalation poll index for gates specifically -- mirrors S22.2's
-- idx_approval_tasks_escalation_poll but scoped to pipeline_gate, since gate
-- escalation notifies non-voters rather than reassigning a single assignee
-- (PipelineWatchdogService, S23.2 -- different code path from
-- ApprovalWatchdogService, same underlying columns).
CREATE INDEX IF NOT EXISTS idx_approval_tasks_gate_escalation_poll
  ON public.approval_tasks (created_at)
  WHERE task_type = 'pipeline_gate' AND status = 'pending'
    AND escalate_after_minutes IS NOT NULL AND escalated_at IS NULL;

-- ── pipeline_gate_votes ────────────────────────────────────────────────────
-- One row per committee member's decision on a pipeline_gate task.

CREATE TABLE IF NOT EXISTS public.pipeline_gate_votes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_task_id  UUID        NOT NULL REFERENCES public.approval_tasks(id) ON DELETE CASCADE,
  voter_user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision          TEXT        NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comments          TEXT,
  decided_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_gate_votes_one_per_voter UNIQUE (approval_task_id, voter_user_id)
);

COMMENT ON TABLE public.pipeline_gate_votes IS
  'One vote per committee member per gate. UNIQUE(approval_task_id, voter_user_id) enforces "one person, one vote" at the database level -- a retried/duplicate vote request cannot double-count. Phase 23 S23.1.';

CREATE INDEX IF NOT EXISTS idx_pipeline_gate_votes_task_id ON public.pipeline_gate_votes(approval_task_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Defense-in-depth only, matching this codebase's established pattern
-- everywhere else -- the API uses the service-role client (bypasses RLS)
-- and enforces authorization in the NestJS service layer. These policies
-- matter only for any future direct client access.

ALTER TABLE public.pipelines            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_artifacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_gate_votes  ENABLE ROW LEVEL SECURITY;

-- pipelines: visible to any org member; create/update restricted to org
-- owner/admin (mirrors departments_insert_org_admin / departments_update_org_admin).
CREATE POLICY "pipelines_select_org_members" ON public.pipelines
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pipelines_insert_org_admin" ON public.pipelines
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "pipelines_update_org_admin" ON public.pipelines
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "pipelines_service_all" ON public.pipelines
  FOR ALL USING (auth.role() = 'service_role');

-- pipeline_runs / pipeline_artifacts / pipeline_gate_votes: read-only for org
-- members (all writes go through the service-role client, driven by
-- PipelineExecutionService/PipelineWatchdogService -- no direct client writes
-- are expected, same convention as execution_runs/execution_logs).

CREATE POLICY "pipeline_runs_select_org_members" ON public.pipeline_runs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pipeline_runs_service_all" ON public.pipeline_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "pipeline_artifacts_select_org_members" ON public.pipeline_artifacts
  FOR SELECT USING (
    pipeline_run_id IN (
      SELECT id FROM public.pipeline_runs
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "pipeline_artifacts_service_all" ON public.pipeline_artifacts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "pipeline_gate_votes_select_org_members" ON public.pipeline_gate_votes
  FOR SELECT USING (
    approval_task_id IN (
      SELECT at.id FROM public.approval_tasks at
      JOIN public.pipeline_runs pr ON pr.id = at.pipeline_run_id
      WHERE pr.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- A voter can insert their own vote directly (defense-in-depth mirror of
-- castVote()'s server-side roster check, S23.2) -- but never on someone
-- else's behalf, and never update/delete an existing vote (votes are
-- immutable once cast, matching the "one person, one vote" rule).
CREATE POLICY "pipeline_gate_votes_insert_self" ON public.pipeline_gate_votes
  FOR INSERT WITH CHECK (voter_user_id = auth.uid());

CREATE POLICY "pipeline_gate_votes_service_all" ON public.pipeline_gate_votes
  FOR ALL USING (auth.role() = 'service_role');
