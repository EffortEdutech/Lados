-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0071: Retention column stubs
-- Phase 22 S22.1 (Schema Foundations)
-- ─────────────────────────────────────────────────────────────────────────────
-- No archival job or retention enforcement lands here — that's explicitly
-- deferred to S22.5 per eff's confirmation (2026-07-05, Phase22 master plan
-- §9.3: "not enough run volume yet to justify urgency"). This migration only
-- adds the columns those tables will need, while they're still cheap to add
-- (a nullable column on a table with modest row counts today vs. the same
-- ALTER TABLE on a multi-million-row table later).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.execution_runs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.approval_tasks
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.execution_runs.archived_at IS
  'NULL = active/live. Set by a future archival job (Phase 22 S22.5, not yet built) once past the org''s retention window.';
COMMENT ON COLUMN public.approval_tasks.archived_at IS
  'NULL = active/live. Set by a future archival job (Phase 22 S22.5, not yet built) once past the org''s retention window.';
COMMENT ON COLUMN public.audit_log.archived_at IS
  'NULL = active/live. Set by a future archival job (Phase 22 S22.5, not yet built) -- audit_log is expected to get a longer default retention window than execution_runs given its compliance role.';

-- ── organizations.retention_days ──────────────────────────────────────────────
-- NULL = no automatic archival configured (today's default behavior for
-- every existing org). Configurable per-org from day one even though no job
-- reads it yet.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS retention_days INTEGER;

COMMENT ON COLUMN public.organizations.retention_days IS
  'Optional per-org retention window in days for execution_runs/approval_tasks/audit_log. NULL = no automatic archival (default). Read by the Phase 22 S22.5 archival job once built -- not enforced yet.';
