-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0070: execution_runs.idempotency_key
-- Phase 22 S22.1 (Schema Foundations)
-- ─────────────────────────────────────────────────────────────────────────────
-- Nullable column + partial unique index. A caller (webhook, scheduled
-- trigger, or manual run) may supply an idempotency_key; if a non-failed run
-- already exists for the same (workflow_id, idempotency_key) pair,
-- ExecutionService.triggerRun() returns the existing run instead of creating
-- a duplicate. Callers that don't supply a key are completely unaffected —
-- the index is partial (WHERE idempotency_key IS NOT NULL), so NULL values
-- never collide.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.execution_runs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

COMMENT ON COLUMN public.execution_runs.idempotency_key IS
  'Optional caller-supplied dedupe key. Combined with workflow_id via a partial unique index -- repeated triggers with the same key return the existing run instead of starting a new one. Phase 22 S22.1.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_execution_runs_workflow_idempotency_key
  ON public.execution_runs (workflow_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
