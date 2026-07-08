-- ============================================================
-- Migration 0072: Phase 22 S22.2 — Human-in-the-Loop Upgrade
-- Named-user assignment, delegation, escalation, and the generic
-- structured-input node (lados.human.request_input) all reuse
-- approval_tasks — see Lados_V4_Phase22_Enterprise_Workflow_Foundation_
-- Master_Plan.md §4. All additive; zero change to existing rows
-- (task_type defaults to 'approval', every other new column is nullable).
-- ============================================================

-- ── 1. Named-user assignment (§4.1) ────────────────────────────────────────
--
-- Nullable — when unset, behavior is identical to today (role-based
-- assignee_role only). When set, ApprovalService.decide()/listPending()
-- restrict to this user (plus an org owner/admin override — §8, nobody is
-- ever permanently blocked by an absent assignee).

ALTER TABLE approval_tasks
  ADD COLUMN IF NOT EXISTS assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_approval_tasks_assignee_user_id
  ON approval_tasks (assignee_user_id)
  WHERE assignee_user_id IS NOT NULL;

-- ── 2. Delegation (§4.2) ────────────────────────────────────────────────────

ALTER TABLE approval_tasks
  ADD COLUMN IF NOT EXISTS delegated_from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delegated_to_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delegated_at            timestamptz;

-- ── 3. Escalation (§4.3) ────────────────────────────────────────────────────
--
-- escalate_after_minutes is set per-task (from the request_approval /
-- request_input node's config). ApprovalWatchdogService polls for pending
-- tasks past their window and either reassigns to escalated_to_user_id (if
-- configured) or notifies the org's owners/admins — either way it stamps
-- escalated_at so the same task is never escalated twice.

ALTER TABLE approval_tasks
  ADD COLUMN IF NOT EXISTS escalate_after_minutes integer,
  ADD COLUMN IF NOT EXISTS escalated_at            timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_to_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_approval_tasks_escalation_poll
  ON approval_tasks (created_at)
  WHERE status = 'pending' AND escalate_after_minutes IS NOT NULL AND escalated_at IS NULL;

-- ── 4. Generic structured-input node (§4.4) ─────────────────────────────────
--
-- task_type discriminates 'approval' (existing behavior, decide() applies)
-- from 'input' (submit-input applies instead). Reuses the same table/
-- lifecycle/assignment/delegation/escalation mechanics rather than a
-- parallel table — confirmed by eff, Phase22 plan §9.2.
--
-- submitted_data stores the human-entered payload once submitted; the
-- node's inputSchema itself is stored in the existing generic `data` jsonb
-- column (data.inputSchema) — no new column needed for that, matching the
-- existing snapshot-in-`data` convention already used by request_approval.

ALTER TABLE approval_tasks
  ADD COLUMN IF NOT EXISTS task_type      text NOT NULL DEFAULT 'approval',
  ADD COLUMN IF NOT EXISTS submitted_data jsonb;

ALTER TABLE approval_tasks
  DROP CONSTRAINT IF EXISTS approval_tasks_task_type_check;
ALTER TABLE approval_tasks
  ADD CONSTRAINT approval_tasks_task_type_check
  CHECK (task_type IN ('approval', 'input'));

-- Widen the status check to add 'submitted' (submit-input's terminal
-- status — distinct from 'approved'/'rejected' since submitting data isn't
-- a decision). Existing rows are unaffected ('pending'/'approved'/
-- 'rejected'/'auto_approved' are all still valid).
ALTER TABLE approval_tasks
  DROP CONSTRAINT IF EXISTS approval_tasks_status_check;
ALTER TABLE approval_tasks
  ADD CONSTRAINT approval_tasks_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved', 'submitted'));
