-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0078: Phase 23 S23.5 — Pipeline Analytics + Retention Extension
-- Mirrors Phase 22 S22.3 (workflow_run_stats_daily, migration 0073) and S22.1's
-- retention schema-hook pattern (archived_at, migration 0071) for the
-- pipeline_runs table introduced in S23.1 (migration 0075). See
-- Lados_V4_Phase23_Pipeline_Orchestration_Governance_Master_Plan.md §7.
--
-- Additive only — no behavior change to any existing pipeline run until
-- AnalyticsRollupService starts writing pipeline_run_stats_daily rows and
-- RetentionService starts reading pipeline_runs.archived_at (both app-side
-- changes ship alongside this migration in the same sprint). Retention still
-- only ever touches orgs with organizations.retention_days set (NULL by
-- default for every org, same gate as execution_runs/approval_tasks/audit_log).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── pipeline_run_stats_daily ─────────────────────────────────────────────────
-- One row per (pipeline_id, date), mirroring workflow_run_stats_daily (0073)
-- column-for-column. department_id is derived from pipelines.department_id at
-- rollup time (nullable — org-wide pipelines have no department, same as
-- projects with no department assigned).

CREATE TABLE IF NOT EXISTS public.pipeline_run_stats_daily (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id   UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  pipeline_id     UUID        NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,

  total_runs      INTEGER     NOT NULL DEFAULT 0,
  succeeded       INTEGER     NOT NULL DEFAULT 0,
  failed          INTEGER     NOT NULL DEFAULT 0,
  timed_out       INTEGER     NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER,
  p95_duration_ms INTEGER,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (pipeline_id, date)
);

COMMENT ON TABLE public.pipeline_run_stats_daily IS
  'Cross-run pipeline analytics, mirroring workflow_run_stats_daily (0073) column-for-column. Populated by AnalyticsRollupService. duration_ms is computed in application code from started_at/completed_at — pipeline_runs (0075) has no duration_ms column of its own, unlike execution_runs. Phase 23 S23.5.';

CREATE INDEX IF NOT EXISTS idx_pipeline_run_stats_daily_org_date
  ON public.pipeline_run_stats_daily (organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_run_stats_daily_department
  ON public.pipeline_run_stats_daily (department_id)
  WHERE department_id IS NOT NULL;

CREATE TRIGGER pipeline_run_stats_daily_set_updated_at
  BEFORE UPDATE ON public.pipeline_run_stats_daily
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pipeline_run_stats_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read pipeline run stats in their org"
  ON public.pipeline_run_stats_daily FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = pipeline_run_stats_daily.organization_id
        AND user_id = auth.uid()
    )
  );

-- (No explicit service_role policy — matches 0073's precedent exactly; the
-- API's service-role client bypasses RLS entirely, so this table only ever
-- needs a read policy for direct authenticated client access.)

-- ── pipeline_runs.archived_at ────────────────────────────────────────────────
-- Same schema-hook pattern as 0071_retention_columns.sql for execution_runs/
-- approval_tasks/audit_log. NULL for every existing row — no behavior change
-- until RetentionService starts stamping it for orgs with retention_days set.

ALTER TABLE public.pipeline_runs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.pipeline_runs.archived_at IS
  'NULL = active/live. Stamped by RetentionService (Phase 22 S22.5 pattern, extended Phase 23 S23.5) once past the org''s retention_days window in ''archive'' mode. In ''delete'' mode the row is hard-deleted instead and this column is moot for it — cascades to pipeline_artifacts via ON DELETE CASCADE (0075).';

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_retention_poll
  ON public.pipeline_runs (organization_id, started_at)
  WHERE archived_at IS NULL AND status IN ('completed', 'failed', 'cancelled', 'timed_out');
