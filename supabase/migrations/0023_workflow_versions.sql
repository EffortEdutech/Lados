-- ── Migration 0023: Workflow Versions ────────────────────────────────────────
--
-- Stores point-in-time snapshots of a workflow definition.
-- A snapshot is created manually (user clicks "Save Version") or automatically
-- on publish. Restore replaces the live definition with a snapshot.
--
-- Sprint 18 (S18-002)

CREATE TABLE IF NOT EXISTS workflow_versions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    UUID        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version_number INT         NOT NULL,
  definition     JSONB       NOT NULL,
  label          TEXT,                           -- optional human-readable label
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT workflow_versions_unique UNIQUE (workflow_id, version_number)
);

-- Fast lookup by workflow
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id
  ON workflow_versions (workflow_id, version_number DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;

-- Members of the org that owns the workflow's project can read versions
CREATE POLICY "org members can read workflow versions"
  ON workflow_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workflows w
      JOIN projects p ON p.id = w.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE w.id = workflow_versions.workflow_id
        AND om.user_id = auth.uid()
    )
  );

-- Members can create versions
CREATE POLICY "org members can create workflow versions"
  ON workflow_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workflows w
      JOIN projects p ON p.id = w.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE w.id = workflow_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'member')
    )
  );
