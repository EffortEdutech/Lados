-- ============================================================
-- Migration 0073: Phase 22 S22.3 — Cross-Run Monitoring Layer
-- Rollup tables populated by a scheduled job (AnalyticsRollupService,
-- same cron-poll pattern as SchedulerService) — see
-- Lados_V4_Phase22_Enterprise_Workflow_Foundation_Master_Plan.md §5.
-- Additive only; nothing reads these until AnalyticsRollupService starts
-- writing to them.
-- ============================================================

-- ── 1. workflow_run_stats_daily ─────────────────────────────────────────────
--
-- One row per (workflow_id, date). department_id is nullable and derived
-- from the workflow's project at rollup time (projects.department_id,
-- migration 0069) — null for projects with no department assigned, so
-- single-department orgs are unaffected. organization_id/workflow_id are
-- denormalized from execution_runs onto this row so the analytics read
-- path never needs to join back to execution_runs at query time.

CREATE TABLE IF NOT EXISTS workflow_run_stats_daily (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id   uuid REFERENCES departments(id) ON DELETE SET NULL,
  workflow_id     uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  date            date NOT NULL,

  total_runs      integer NOT NULL DEFAULT 0,
  succeeded       integer NOT NULL DEFAULT 0,
  failed          integer NOT NULL DEFAULT 0,
  timed_out       integer NOT NULL DEFAULT 0,
  avg_duration_ms integer,
  p95_duration_ms integer,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workflow_id, date)
);

CREATE INDEX IF NOT EXISTS idx_workflow_run_stats_daily_org_date
  ON workflow_run_stats_daily (organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_run_stats_daily_department
  ON workflow_run_stats_daily (department_id)
  WHERE department_id IS NOT NULL;

CREATE TRIGGER set_workflow_run_stats_daily_updated_at
  BEFORE UPDATE ON workflow_run_stats_daily
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE workflow_run_stats_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read workflow run stats in their org"
  ON workflow_run_stats_daily FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = workflow_run_stats_daily.organization_id
        AND user_id = auth.uid()
    )
  );

-- ── 2. node_execution_stats_daily ───────────────────────────────────────────
--
-- Same grouping as above, plus node_type — "which nodes are slowest/
-- most-failing across all runs" (concern #2). One row per
-- (workflow_id, node_type, date).

CREATE TABLE IF NOT EXISTS node_execution_stats_daily (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id     uuid REFERENCES departments(id) ON DELETE SET NULL,
  workflow_id       uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_type         text NOT NULL,
  date              date NOT NULL,

  total_executions  integer NOT NULL DEFAULT 0,
  succeeded         integer NOT NULL DEFAULT 0,
  failed            integer NOT NULL DEFAULT 0,
  avg_duration_ms   integer,
  p95_duration_ms   integer,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workflow_id, node_type, date)
);

CREATE INDEX IF NOT EXISTS idx_node_execution_stats_daily_org_date
  ON node_execution_stats_daily (organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_node_execution_stats_daily_node_type
  ON node_execution_stats_daily (node_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_node_execution_stats_daily_department
  ON node_execution_stats_daily (department_id)
  WHERE department_id IS NOT NULL;

CREATE TRIGGER set_node_execution_stats_daily_updated_at
  BEFORE UPDATE ON node_execution_stats_daily
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE node_execution_stats_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read node execution stats in their org"
  ON node_execution_stats_daily FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = node_execution_stats_daily.organization_id
        AND user_id = auth.uid()
    )
  );
