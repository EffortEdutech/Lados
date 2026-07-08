-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0074: Retention execution — mode column + archive storage bucket
-- Phase 22 S22.5 (Retention & Archival Execution, §7)
-- ─────────────────────────────────────────────────────────────────────────────
-- S22.1 (migration 0071) added the schema hook: organizations.retention_days
-- and archived_at on execution_runs/approval_tasks/audit_log, with no job
-- reading them yet. This migration adds the one remaining piece of schema
-- S22.5's job needs — a per-org archive-vs-delete preference — and creates
-- the Storage bucket the job exports to before it ever archives/deletes a
-- row. No behavior changes for existing orgs: retention_days stays NULL
-- (disabled) until an org admin opts in.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── organizations.retention_mode ──────────────────────────────────────────────
-- 'archive' (default, safe/reversible): rows stay, archived_at is stamped.
-- 'delete' (explicit opt-in): rows are hard-deleted after a successful export.
-- Only takes effect for an org once retention_days is also set (non-NULL) --
-- see 0071_retention_columns.sql.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS retention_mode TEXT NOT NULL DEFAULT 'archive'
    CHECK (retention_mode IN ('archive', 'delete'));

COMMENT ON COLUMN public.organizations.retention_mode IS
  'How the Phase 22 S22.5 retention job disposes of rows past the retention_days window. ''archive'' (default) stamps archived_at and keeps the row; ''delete'' hard-deletes after a successful export. Has no effect while retention_days is NULL.';

-- ── Storage bucket: retention-archives ────────────────────────────────────────
-- Private bucket (no storage.objects RLS policy is added for authenticated/anon
-- users -- deliberately: only the API's service-role client, which bypasses
-- RLS, should ever read or write here). One JSON object per (org, table,
-- export tick); see RetentionService for the exact path convention.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'retention-archives',
  'retention-archives',
  false,
  null,
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;
