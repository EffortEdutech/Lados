-- ============================================================
-- Migration 0068: Core Service Registry Reconciliation
-- Phase 21 S9.2 (2026-07-05)
-- ============================================================
-- migration 0015 seeded core_services back in Sprint 14, when the
-- platform still used prototype-style node names (classify_trade,
-- document.read_pdf, qs.measure_drawing, ...) and the "QS-OS"
-- product name. Phase 21 replaced almost all of that surface with
-- official lados.* Capability Packs and renamed the product to Lados.
-- This migration:
--   1. Corrects the 6 existing rows whose description text still
--      names prototype-era nodes or the old "QS-OS" branding.
--   2. Adds 13 rows for NestJS services that now genuinely exist
--      and back official pack nodes, but were never registered here.
--   3. Populates `metadata.usedByPacks` / `metadata.usedByNodes` as a
--      curated "used by, for reference" cross-link — the
--      `registered_nodes.uses_services` column this table's own
--      comment describes is confirmed NOT populated by the official
--      pack loader, so this curated metadata is the only current
--      source of that reference information (Settings > Platform
--      Services page surfaces it).
-- ============================================================

-- ── 1. Correct existing rows ──────────────────────────────────────────────────

UPDATE core_services SET
  description = 'OpenAI GPT wrapper with keyword-classification fallback. Currently powers lados.asset_fleet.extract_fuel_receipt (vision extraction from photographed fuel receipts). lados-qs-commercial''s classify_trade/split_work_packages nodes use deterministic rules, not AI — no live node currently depends on the classification/RFQ-generation path this row originally described.',
  metadata = jsonb_build_object(
    'usedByPacks', jsonb_build_array('lados-asset-fleet'),
    'usedByNodes', jsonb_build_array('lados.asset_fleet.extract_fuel_receipt'),
    'reconciledInPhase', 'Phase 21 S9.2'
  ),
  updated_at = now()
WHERE id = 'ai-service';

UPDATE core_services SET
  description = 'Unified file-parsing service. Handles Excel (SheetJS) and PDF (text-layer) parsing for lados.document.read_excel, lados.document.read_pdf, lados.document.read_docx, and lados.document.extract_table nodes.',
  metadata = jsonb_build_object(
    'usedByPacks', jsonb_build_array('lados-document-intelligence'),
    'usedByNodes', jsonb_build_array(
      'lados.document.read_excel', 'lados.document.read_pdf',
      'lados.document.read_docx', 'lados.document.extract_table'
    ),
    'reconciledInPhase', 'Phase 21 S9.2'
  ),
  updated_at = now()
WHERE id = 'document-service';

UPDATE core_services SET
  description = 'Writes in-app notification rows (notifications table). Real outbound delivery has since split into dedicated services: Email Service (below, active) and SMS Service (below, still stub). This row now covers only the in-app notify() path used by Human Work approval nodes and lados.communication.send_in_app.',
  status = 'active',
  version = '1.1.0',
  metadata = jsonb_build_object(
    'usedByPacks', jsonb_build_array('lados-human-work', 'lados-communication'),
    'usedByNodes', jsonb_build_array('lados.human.request_approval', 'lados.communication.send_in_app'),
    'reconciledInPhase', 'Phase 21 S9.2'
  ),
  updated_at = now()
WHERE id = 'notification-service';

UPDATE core_services SET
  description = 'Optical character recognition for scanned or photographed documents that have no digital text layer. Distinct from lados.document.read_pdf (already active — handles text-layer PDFs only, no scanned-image support). No official node depends on this yet.',
  metadata = jsonb_build_object(
    'usedByPacks', jsonb_build_array(),
    'reconciledInPhase', 'Phase 21 S9.2'
  ),
  updated_at = now()
WHERE id = 'ocr-service';

UPDATE core_services SET
  description = 'Area and volume calculations from DWG/IFC drawings. No official node currently depends on this — planned for a future QS Commercial extension, not yet scheduled.',
  metadata = jsonb_build_object(
    'usedByPacks', jsonb_build_array(),
    'reconciledInPhase', 'Phase 21 S9.2'
  ),
  updated_at = now()
WHERE id = 'geometry-service';

UPDATE core_services SET
  description = 'Usage metering, subscription management, and pack licensing for the Lados Marketplace.',
  metadata = jsonb_build_object(
    'usedByPacks', jsonb_build_array(),
    'reconciledInPhase', 'Phase 21 S9.2'
  ),
  updated_at = now()
WHERE id = 'billing-service';

-- ── 2. Add services that now genuinely exist but were never registered ───────

INSERT INTO core_services (id, name, description, status, version, icon, metadata)
VALUES
  (
    'event-bus-service',
    'Event Bus Service',
    'Publishes and distributes workflow domain events. Powers lados.workflow.publish_event and is invoked by the State Engine''s emit_event action after resource state transitions.',
    'active',
    '1.0.0',
    '🛰️',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array('lados-workflow-foundation'),
      'usedByNodes', jsonb_build_array('lados.workflow.publish_event'),
      'builtInPhase', 'Phase 4'
    )
  ),
  (
    'resource-service',
    'Resource Service',
    'Generic CRUD + state-transition service for all Workspace Resource types (jobs, trips, invoices, BOQs, RFQs, site diaries, payroll runs, and more). The single most-used platform service — backs nearly every official Capability Pack''s create/read/update/transition/assign nodes.',
    'active',
    '1.0.0',
    '📦',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array(
        'lados-resource-operations', 'lados-task-case', 'lados-commercial-finance',
        'lados-procurement', 'lados-qs-commercial', 'lados-construction-operations',
        'lados-contract-admin', 'lados-asset-fleet', 'lados-people-payroll', 'lados-human-work'
      ),
      'builtInPhase', 'Phase 3'
    )
  ),
  (
    'state-engine-service',
    'State Engine Service',
    'Single gatekeeper for resource state transitions — validates fromState-to-toState against lados_state_machines definitions, enforces requires_role / requires_approval guards, and emits post-transition events. AI guardrail: never auto-approves; requires_approval always routes to a human reviewer.',
    'active',
    '1.0.0',
    '🔀',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array(),
      'builtInPhase', 'Phase 5',
      'note', 'Invoked internally by the workflow runner/resource transitions, not directly by a per-node resolver.'
    )
  ),
  (
    'approval-service',
    'Approval Task Service',
    'Creates and resolves human approval tasks (approval_tasks table). Powers lados.human.request_approval and every approval-gated node across Human Work, Asset & Fleet, and People & Payroll packs. AI guardrail: AI may never resolve an approval task.',
    'active',
    '1.0.0',
    '✅',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array('lados-human-work'),
      'usedByNodes', jsonb_build_array('lados.human.request_approval'),
      'builtInPhase', 'Phase 7'
    )
  ),
  (
    'artifact-service',
    'Artifact Service',
    'Reads and writes generated workflow artifacts (documents, exports, reports). Backs Resource Operations'' artifact read/write nodes. Document Intelligence''s generate_document node has no storage-backed implementation wired yet and falls back to returning the file inline.',
    'active',
    '1.0.0',
    '🗂️',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array('lados-resource-operations'),
      'builtInPhase', 'Phase 3'
    )
  ),
  (
    'email-service',
    'Email Service',
    'Sends real email via SMTP (Nodemailer). Falls back to log-only stub mode if SMTP_HOST is not configured. Powers lados.communication.send_email.',
    'active',
    '1.0.0',
    '📧',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array('lados-communication'),
      'usedByNodes', jsonb_build_array('lados.communication.send_email'),
      'builtInPhase', 'Phase 10'
    )
  ),
  (
    'sms-service',
    'SMS Service',
    'Logs SMS payloads; no real provider (Twilio/MSG91) wired yet. Powers lados.communication.send_sms, which reports executorStatus: stub until a provider is configured.',
    'stub',
    '0.1.0',
    '📱',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array('lados-communication'),
      'usedByNodes', jsonb_build_array('lados.communication.send_sms'),
      'builtInPhase', 'Phase 10'
    )
  ),
  (
    'execution-queue-service',
    'Execution Queue Service',
    'Wraps BullMQ (Redis-backed) to run workflow executions off the request thread, with a startup healthcheck, per-command timeouts, and enqueue-failure fallback to in-process execution.',
    'active',
    '1.1.0',
    '⏱️',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array(),
      'builtInPhase', 'Phase 12, hardened Phase 21 S3'
    )
  ),
  (
    'scheduler-service',
    'Scheduler Service',
    'Polls cron-triggered workflow subscriptions every 60 seconds and fires due workflows via the Execution Queue, falling back to in-process execution if Redis is unavailable.',
    'active',
    '1.0.0',
    '⏰',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array(),
      'builtInPhase', 'Phase 10'
    )
  ),
  (
    'data-packs-service',
    'Knowledge Packs Service',
    'Manages Knowledge Pack registration, versioning, and effective-date-aware lookups consumed by Commercial Finance, Procurement, and QS Commercial nodes for rate/clause provenance. (Renamed from "Data Packs" in the S7.5 naming pass — see marketplace.)',
    'active',
    '1.0.0',
    '📚',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array('lados-commercial-finance', 'lados-procurement', 'lados-qs-commercial'),
      'builtInPhase', 'pre-Phase 21, renamed Phase 21 S7.5'
    )
  ),
  (
    'security-engine-service',
    'Security Engine Service',
    'Centralised role/permission enforcement (owner > admin > member > driver/operator > viewer), replacing ad-hoc membership checks scattered across services. AI guardrail: never grants approval or certification permissions based on AI output — always requires a human owner/admin.',
    'active',
    '1.0.0',
    '🛡️',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array(),
      'builtInPhase', 'Phase 6'
    )
  ),
  (
    'resource-bindings-service',
    'Resource Bindings Service',
    'Binds workflow node config fields to specific Workspace Resource instances and resolves those bindings at execution time, with per-workflow access checks.',
    'active',
    '1.0.0',
    '🔗',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array()
    )
  ),
  (
    'library-service',
    'Library Service',
    'Manages the Project Document Library — files uploaded once (via Storage Service) and referenced by nodes through library_file_id, categorised as boq/spec/drawing/schedule/other. Backs Document Intelligence''s file-lookup nodes.',
    'active',
    '1.0.0',
    '📖',
    jsonb_build_object(
      'usedByPacks', jsonb_build_array('lados-document-intelligence'),
      'builtInPhase', 'Sprint 8'
    )
  )
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN core_services.metadata IS
  'Curated reference metadata. Notably metadata.usedByPacks / metadata.usedByNodes — a hand-maintained "which official packs/nodes depend on this service" cross-link, kept because registered_nodes.uses_services is not populated by the official pack loader (confirmed Phase 21 S9.2).';
