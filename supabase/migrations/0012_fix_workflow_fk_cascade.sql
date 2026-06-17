-- =============================================================================
-- 0012: Fix workflow FK constraints so workflows can be deleted cleanly
--
-- Problem: deleting a workflow was blocked by:
--   - uploads.workflow_id_fkey  (NO ACTION — should be SET NULL, upload survives)
--   - execution_runs FK         (NO ACTION — should CASCADE, runs belong to workflow)
-- =============================================================================

-- ── uploads ────────────────────────────────────────────────────────────────────
-- workflow_id is nullable; set it to NULL when the workflow is deleted so the
-- upload record is preserved (it may still be referenced in the library).
ALTER TABLE uploads
  DROP CONSTRAINT IF EXISTS uploads_workflow_id_fkey;

ALTER TABLE uploads
  ADD CONSTRAINT uploads_workflow_id_fkey
  FOREIGN KEY (workflow_id)
  REFERENCES workflows(id)
  ON DELETE SET NULL;

-- ── execution_runs ─────────────────────────────────────────────────────────────
-- Runs belong to a workflow; cascade the delete so runs are cleaned up
-- automatically when their parent workflow is removed.
-- execution_logs already cascades from execution_runs (checked in 0006).
ALTER TABLE execution_runs
  DROP CONSTRAINT IF EXISTS execution_runs_workflow_id_fkey;

ALTER TABLE execution_runs
  ADD CONSTRAINT execution_runs_workflow_id_fkey
  FOREIGN KEY (workflow_id)
  REFERENCES workflows(id)
  ON DELETE CASCADE;
