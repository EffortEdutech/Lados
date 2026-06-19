-- ============================================================
-- Migration 0017: Audit Log — service_id column
-- Sprint 14 (S14-005)
-- ============================================================
-- Adds service_id to audit_logs so individual service calls
-- (AiService, DocumentService) can be attributed to their
-- originating Core Service in the audit trail viewer.
-- ============================================================

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS service_id text;

COMMENT ON COLUMN audit_log.service_id IS
  'Core Service that generated this log entry, e.g. "ai-service", "document-service". NULL for workflow-level events.';

CREATE INDEX IF NOT EXISTS audit_log_service_id_idx ON audit_log(service_id)
  WHERE service_id IS NOT NULL;
