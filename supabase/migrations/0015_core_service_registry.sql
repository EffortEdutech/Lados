-- ============================================================
-- Migration 0015: Core Service Registry
-- Sprint 14 (S14-002)
-- ============================================================
-- Creates the core_services catalogue — a registry of all
-- V3 platform services with their current build status.
-- Used by the Services Status Panel (S14-003) and by the
-- Skill Inspector to show which services a skill requires.
-- ============================================================

CREATE TABLE IF NOT EXISTS core_services (
  id            text PRIMARY KEY,               -- e.g. "ai-service"
  name          text NOT NULL,                  -- e.g. "AI Service"
  description   text,
  status        text NOT NULL DEFAULT 'not_built'
                  CHECK (status IN ('active', 'stub', 'not_built')),
  version       text NOT NULL DEFAULT '0.0.0',
  sprint_built  integer,                        -- sprint when first activated
  sprint_planned integer,                       -- sprint when planned (if not yet built)
  icon          text,                           -- emoji
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_core_services_updated_at
  BEFORE UPDATE ON core_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE core_services IS
  'Registry of V3 platform Core Services — tracks build status for each service.';
COMMENT ON COLUMN core_services.id IS
  'Stable slug used as dependency key in registered_nodes.uses_services[]';
COMMENT ON COLUMN core_services.status IS
  'active = fully implemented; stub = API exists, no real delivery; not_built = planned only';

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Core services are public read for all authenticated users (settings page).
-- Only service-role can write (migrations only — no UI mutations).

ALTER TABLE core_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "core_services_select" ON core_services
  FOR SELECT TO authenticated USING (true);

-- ── Seed: V3 Core Services ────────────────────────────────────────────────────

INSERT INTO core_services (id, name, description, status, version, sprint_built, sprint_planned, icon)
VALUES
  (
    'ai-service',
    'AI Service',
    'OpenAI GPT wrapper with keyword-classification fallback. Powers classify_trade, split_work_package, and generate_rfq nodes.',
    'active',
    '1.0.0',
    9,
    NULL,
    '🤖'
  ),
  (
    'storage-service',
    'Storage Service',
    'Supabase Storage integration for file uploads, library documents, and generated artifacts.',
    'active',
    '1.0.0',
    7,
    NULL,
    '💾'
  ),
  (
    'auth-service',
    'Authentication Service',
    'Supabase Auth JWT validation and user session management. Guards all API endpoints.',
    'active',
    '1.0.0',
    2,
    NULL,
    '🔐'
  ),
  (
    'audit-service',
    'Audit Service',
    'Append-only audit_logs table. Records workflow executions, approvals, and service calls for compliance.',
    'active',
    '1.0.0',
    10,
    NULL,
    '📋'
  ),
  (
    'document-service',
    'Document Service',
    'Unified file-parsing service. Handles Excel (SheetJS) and PDF (stub) parsing for document.read_excel and related nodes.',
    'active',
    '1.0.0',
    14,
    NULL,
    '📄'
  ),
  (
    'notification-service',
    'Notification Service',
    'In-app notifications for workflow events (approvals, completions, failures). Email and webhook delivery planned for Sprint 19.',
    'stub',
    '0.1.0',
    NULL,
    14,
    '🔔'
  ),
  (
    'ocr-service',
    'OCR Service',
    'Optical character recognition for scanned PDF and image BOQs. Required by document.read_pdf node.',
    'not_built',
    '0.0.0',
    NULL,
    19,
    '🔍'
  ),
  (
    'geometry-service',
    'Geometry Service',
    'Area and volume calculations from DWG/IFC drawings. Required by qs.measure_drawing node.',
    'not_built',
    '0.0.0',
    NULL,
    22,
    '📐'
  ),
  (
    'search-service',
    'Search Service',
    'Full-text and semantic search across project documents, BOQ items, and supplier catalogue.',
    'not_built',
    '0.0.0',
    NULL,
    25,
    '🔎'
  ),
  (
    'billing-service',
    'Billing Service',
    'Usage metering, subscription management, and pack licensing for the QS-OS marketplace.',
    'not_built',
    '0.0.0',
    NULL,
    30,
    '💳'
  )
ON CONFLICT (id) DO UPDATE
  SET
    name           = EXCLUDED.name,
    description    = EXCLUDED.description,
    status         = EXCLUDED.status,
    version        = EXCLUDED.version,
    sprint_built   = EXCLUDED.sprint_built,
    sprint_planned = EXCLUDED.sprint_planned,
    icon           = EXCLUDED.icon,
    updated_at     = now();
