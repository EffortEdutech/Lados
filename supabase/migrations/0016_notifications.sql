-- ============================================================
-- Migration 0016: Notifications
-- Sprint 14 (S14-004)
-- ============================================================
-- In-app notification store. Rows are written by NotificationService
-- whenever a workflow event requires user attention.
--
-- Sprint 14: in-app only (bell icon + dropdown).
-- Sprint 19: email + webhook delivery layer added.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      uuid REFERENCES organizations(id) ON DELETE CASCADE,
  type        text NOT NULL,    -- 'approval_request' | 'execution_complete' | 'execution_failed' | etc.
  title       text NOT NULL,
  body        text,
  action_url  text,             -- relative URL for the CTA button in the UI
  metadata    jsonb NOT NULL DEFAULT '{}',
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS
  'In-app notifications for workflow events — approval requests, completions, failures.';
COMMENT ON COLUMN notifications.type IS
  'approval_request | execution_complete | execution_failed | data_pack_update | quota_warning | system';
COMMENT ON COLUMN notifications.action_url IS
  'Relative URL the bell dropdown links to (e.g. /projects/:id/workflows/:id)';

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Users can only read/update their own notifications.
-- NotificationService writes using service-role (bypasses RLS).

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
