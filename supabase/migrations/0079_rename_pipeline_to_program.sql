-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0079: Phase 24 S24.1 — Rename Pipeline → Program, Committee Gate →
-- Stage Gate, and add a true Project ↔ Program parent/child relationship.
-- See Lados_V4_Phase24_Program_Restructure_Master_Plan.md §1/§3 for the full
-- rename map and rationale.
--
-- Why: "Pipeline" doesn't match standard business-operations vocabulary (a
-- pipeline is normally one item moving through stages; what Phase 23 built is
-- several Workflows, each in its own Project, chained together with human
-- sign-off checkpoints -- a PMI-style Program governed by Stage Gates).
-- Separately, `pipelines`/`projects` were both scoped directly to
-- `organizations` with no relationship between them, when a Program
-- orchestrating several Projects should actually contain them. eff confirmed
-- (2026-07-11): full internal rename (not just UI labels) + a real
-- `projects.program_id` FK. Node/task terminology is NOT touched here --
-- eff's own framing kept "node" as an internal/canvas term, only its
-- business-facing label changes (S24.4, frontend only).
--
-- Timing: the S23.2 pipeline-run smoke test was deferred through S23.4/S23.5
-- and never actually run, so `pipeline_runs`/`pipeline_gate_votes`/
-- `pipeline_artifacts` almost certainly have zero real rows today -- this is
-- close to the cheapest possible moment to do this rename.
--
-- Scope boundary, deliberate: auto-generated constraint/index names (plain
-- inline `REFERENCES ...` FKs and the unnamed `UNIQUE (pipeline_id, date)` on
-- pipeline_run_stats_daily) are left as-is. Guessing their exact generated
-- names to rename them risks a wrong DROP/RENAME failing loudly for zero
-- functional benefit -- nothing reads those names, and `\d`/information_schema
-- already show the correct (renamed) target table regardless of the
-- constraint's own label. Every EXPLICITLY named object from migrations
-- 0075/0076/0078 (tables, named CHECK/UNIQUE constraints, indexes, triggers,
-- RLS policies) is renamed below.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Rename tables ──────────────────────────────────────────────────────

ALTER TABLE public.pipelines              RENAME TO programs;
ALTER TABLE public.pipeline_runs          RENAME TO program_runs;
ALTER TABLE public.pipeline_artifacts     RENAME TO program_artifacts;
ALTER TABLE public.pipeline_gate_votes    RENAME TO stage_gate_votes;
ALTER TABLE public.pipeline_run_stats_daily RENAME TO program_run_stats_daily;

-- ── 2. Rename columns ─────────────────────────────────────────────────────

ALTER TABLE public.program_runs RENAME COLUMN pipeline_id       TO program_id;
ALTER TABLE public.program_runs RENAME COLUMN pipeline_snapshot TO program_snapshot;

ALTER TABLE public.program_artifacts RENAME COLUMN pipeline_run_id TO program_run_id;

ALTER TABLE public.program_run_stats_daily RENAME COLUMN pipeline_id TO program_id;

ALTER TABLE public.execution_runs RENAME COLUMN pipeline_run_id   TO program_run_id;
ALTER TABLE public.execution_runs RENAME COLUMN pipeline_stage_id TO program_stage_id;

ALTER TABLE public.approval_tasks RENAME COLUMN pipeline_run_id TO program_run_id;

-- ── 3. approval_tasks.task_type: 'pipeline_gate' → 'stage_gate' ───────────
-- Drop the two CHECK constraints that hardcode the old literal value first --
-- the data fix-up below would violate them otherwise.

ALTER TABLE public.approval_tasks DROP CONSTRAINT IF EXISTS approval_tasks_execution_xor_pipeline;
ALTER TABLE public.approval_tasks DROP CONSTRAINT IF EXISTS approval_tasks_task_type_check;

UPDATE public.approval_tasks SET task_type = 'stage_gate' WHERE task_type = 'pipeline_gate';

ALTER TABLE public.approval_tasks
  ADD CONSTRAINT approval_tasks_task_type_check
  CHECK (task_type IN ('approval', 'input', 'stage_gate'));

ALTER TABLE public.approval_tasks
  ADD CONSTRAINT approval_tasks_execution_xor_program
  CHECK (
    (task_type IN ('approval', 'input') AND execution_id IS NOT NULL AND program_run_id IS NULL)
    OR
    (task_type = 'stage_gate' AND program_run_id IS NOT NULL AND execution_id IS NULL
       AND voter_user_ids IS NOT NULL AND vote_threshold IS NOT NULL)
  );

-- ── 4. Rename remaining explicitly-named constraints (UNIQUE) ────────────

ALTER TABLE public.program_artifacts
  RENAME CONSTRAINT pipeline_artifacts_run_key TO program_artifacts_run_key;

ALTER TABLE public.stage_gate_votes
  RENAME CONSTRAINT pipeline_gate_votes_one_per_voter TO stage_gate_votes_one_per_voter;

-- ── 5. Rename indexes ──────────────────────────────────────────────────────

ALTER INDEX IF EXISTS idx_pipelines_organization_id       RENAME TO idx_programs_organization_id;
ALTER INDEX IF EXISTS idx_pipelines_department_id         RENAME TO idx_programs_department_id;
ALTER INDEX IF EXISTS idx_pipeline_runs_pipeline_id        RENAME TO idx_program_runs_program_id;
ALTER INDEX IF EXISTS idx_pipeline_runs_org_id             RENAME TO idx_program_runs_org_id;
ALTER INDEX IF EXISTS idx_pipeline_runs_status             RENAME TO idx_program_runs_status;
ALTER INDEX IF EXISTS idx_pipeline_artifacts_run_id        RENAME TO idx_program_artifacts_run_id;
ALTER INDEX IF EXISTS idx_execution_runs_pipeline_run_id   RENAME TO idx_execution_runs_program_run_id;
ALTER INDEX IF EXISTS idx_approval_tasks_pipeline_run_id   RENAME TO idx_approval_tasks_program_run_id;
ALTER INDEX IF EXISTS idx_pipeline_gate_votes_task_id      RENAME TO idx_stage_gate_votes_task_id;
ALTER INDEX IF EXISTS idx_pipeline_run_stats_daily_org_date   RENAME TO idx_program_run_stats_daily_org_date;
ALTER INDEX IF EXISTS idx_pipeline_run_stats_daily_department RENAME TO idx_program_run_stats_daily_department;
ALTER INDEX IF EXISTS idx_pipeline_runs_retention_poll     RENAME TO idx_program_runs_retention_poll;

-- Partial index whose predicate embeds the old literal value -- can't rename
-- in place, drop + recreate against the now-'stage_gate' data.
DROP INDEX IF EXISTS idx_approval_tasks_gate_escalation_poll;
CREATE INDEX IF NOT EXISTS idx_approval_tasks_stage_gate_escalation_poll
  ON public.approval_tasks (created_at)
  WHERE task_type = 'stage_gate' AND status = 'pending'
    AND escalate_after_minutes IS NOT NULL AND escalated_at IS NULL;

-- ── 6. Rename triggers ─────────────────────────────────────────────────────

ALTER TRIGGER pipelines_set_updated_at ON public.programs
  RENAME TO programs_set_updated_at;
ALTER TRIGGER pipeline_runs_set_updated_at ON public.program_runs
  RENAME TO program_runs_set_updated_at;
ALTER TRIGGER pipeline_run_stats_daily_set_updated_at ON public.program_run_stats_daily
  RENAME TO program_run_stats_daily_set_updated_at;

-- ── 7. Rename RLS policies ─────────────────────────────────────────────────

ALTER POLICY "pipelines_select_org_members" ON public.programs RENAME TO "programs_select_org_members";
ALTER POLICY "pipelines_insert_org_admin"   ON public.programs RENAME TO "programs_insert_org_admin";
ALTER POLICY "pipelines_update_org_admin"   ON public.programs RENAME TO "programs_update_org_admin";
ALTER POLICY "pipelines_service_all"        ON public.programs RENAME TO "programs_service_all";

ALTER POLICY "pipeline_runs_select_org_members" ON public.program_runs RENAME TO "program_runs_select_org_members";
ALTER POLICY "pipeline_runs_service_all"        ON public.program_runs RENAME TO "program_runs_service_all";

ALTER POLICY "pipeline_artifacts_select_org_members" ON public.program_artifacts RENAME TO "program_artifacts_select_org_members";
ALTER POLICY "pipeline_artifacts_service_all"        ON public.program_artifacts RENAME TO "program_artifacts_service_all";

ALTER POLICY "pipeline_gate_votes_select_org_members" ON public.stage_gate_votes RENAME TO "stage_gate_votes_select_org_members";
ALTER POLICY "pipeline_gate_votes_insert_self"        ON public.stage_gate_votes RENAME TO "stage_gate_votes_insert_self";
ALTER POLICY "pipeline_gate_votes_service_all"        ON public.stage_gate_votes RENAME TO "stage_gate_votes_service_all";

ALTER POLICY "Members can read pipeline run stats in their org" ON public.program_run_stats_daily
  RENAME TO "Members can read program run stats in their org";

-- ── 8. Refresh comments ────────────────────────────────────────────────────

COMMENT ON TABLE public.programs IS
  'A chain of Workflows forming an end-to-end business process, optionally scoped to a department (NULL = org-wide). Renamed from "pipelines" in Phase 24 S24.1 to match standard business-operations language -- a Program coordinates several Projects toward one outcome, governed by Stage Gates. Originally Phase 23 S23.1.';

COMMENT ON TABLE public.program_runs IS
  'One row per Program execution. program_snapshot is immutable at trigger time (same convention as execution_runs.workflow_snapshot). Renamed from "pipeline_runs" in Phase 24 S24.1. Originally Phase 23 S23.1.';
COMMENT ON COLUMN public.program_runs.current_stage_ids IS
  'Array of stage node ids currently active/paused-at -- an array (not a single id) because a DAG can have parallel branches.';
COMMENT ON COLUMN public.program_runs.stage_history IS
  'Append-only log: [{stageNodeId, type: workflow|gate, executionRunId|approvalTaskId, status, startedAt, completedAt}, ...]. Kept as jsonb, not a child table, given the low stage-count-per-program vs node-count-per-workflow.';
COMMENT ON COLUMN public.program_runs.archived_at IS
  'NULL = active/live. Stamped by RetentionService (Phase 22 S22.5 pattern, extended Phase 23 S23.5) once past the org''s retention_days window in ''archive'' mode. In ''delete'' mode the row is hard-deleted instead -- cascades to program_artifacts via ON DELETE CASCADE (originally 0075).';

COMMENT ON TABLE public.program_artifacts IS
  'Cross-workflow data handoff within one Program run. Written/read by lados.workflow.program_save_artifact / program_read_artifact (renamed in S24.3). Renamed from "pipeline_artifacts" in Phase 24 S24.1. Originally Phase 23 S23.1.';

COMMENT ON TABLE public.stage_gate_votes IS
  'One vote per committee member per Stage Gate. UNIQUE(approval_task_id, voter_user_id) enforces "one person, one vote" at the database level. Renamed from "pipeline_gate_votes" in Phase 24 S24.1. Originally Phase 23 S23.1.';

COMMENT ON TABLE public.program_run_stats_daily IS
  'Cross-run Program analytics, mirroring workflow_run_stats_daily (0073) column-for-column. Populated by AnalyticsRollupService. Renamed from "pipeline_run_stats_daily" in Phase 24 S24.1. Originally Phase 23 S23.5 (0078).';

COMMENT ON COLUMN public.execution_runs.program_run_id IS
  'NULL for an ordinary standalone run (the default, every pre-Phase-23 run). Set when ExecutionService.triggerRun() is called by ProgramExecutionService for a Program stage -- gives program_save_artifact/program_read_artifact nodes and analytics a join key back to the parent Program run. Renamed from "pipeline_run_id" in Phase 24 S24.1.';

COMMENT ON COLUMN public.approval_tasks.voter_user_ids IS
  'stage_gate tasks only -- the "M" roster: array of eligible committee member user_ids. NULL for approval/input tasks. Terminology updated in Phase 24 S24.1 (was "pipeline_gate").';
COMMENT ON COLUMN public.approval_tasks.vote_threshold IS
  'stage_gate tasks only -- the "N": number of approved votes needed to pass. NULL for approval/input tasks. Terminology updated in Phase 24 S24.1 (was "pipeline_gate").';
COMMENT ON COLUMN public.approval_tasks.workflow_id IS
  'NULL for stage_gate tasks (not tied to a single workflow). NOT NULL in practice for approval/input tasks. Terminology updated in Phase 24 S24.1 (was "pipeline_gate"), originally Phase 23 S23.2.';
COMMENT ON COLUMN public.approval_tasks.project_id IS
  'NULL for stage_gate tasks (not tied to a single project). NOT NULL in practice for approval/input tasks. Terminology updated in Phase 24 S24.1 (was "pipeline_gate"), originally Phase 23 S23.2.';

-- ── 9. New: projects.program_id (true parent/child FK) ────────────────────
-- Mirrors projects.department_id's exact pattern (Phase 22 S22.1): nullable,
-- ON DELETE SET NULL, zero behavior change for any project not explicitly
-- assigned to a Program.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_program_id ON public.projects(program_id);

COMMENT ON COLUMN public.projects.program_id IS
  'NULL = not assigned to a Program (every pre-Phase-24 project, and the default for new ones). A Project belongs to at most one Program -- the true parent/child relationship a Program''s Stage Gates orchestrate across. Phase 24 S24.1.';
