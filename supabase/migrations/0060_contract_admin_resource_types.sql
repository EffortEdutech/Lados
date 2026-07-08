-- =============================================================================
-- Migration 0060 — Phase 21 S6.1 (remaining Wave 4 skeletons): Contract
-- Administration — Resource Types
--
-- Expands lados_resources.type CHECK constraint to include 2 new resource
-- types used by the official lados.contract-admin Capability Pack:
--   contract_instruction — a registered contract instruction entry
--                          (lados.contract.register_instruction)
--   contract_notice      — a draft/issued contract notice, later updated
--                          in place by lados.contract.track_notice_due_date
--                          (lados.contract.prepare_notice)
--
-- lados.contract.track_notice_due_date and
-- lados.contract.link_correspondence_evidence update an already-bound
-- resource (contract_notice, or any resource passed via resourceBinding)
-- rather than creating a new type.
--
-- lados.contract.lookup_clause_reference is deliberately stateless — a
-- deterministic keyword match over an optionally supplied clause list, not
-- a real Knowledge Pack search integration (honest limitation, no
-- resource persisted).
--
-- lados-asset-fleet and lados-people-payroll (the other two remaining
-- Wave 4 skeletons built alongside this migration) need NO new resource
-- types at all — they are official successors to Contractor Edition
-- capabilities and fully reuse job / trip / fuel_receipt /
-- maintenance_record (migration 0032_phase9_contractor_edition.sql) and
-- payroll_run / expense (migrations 0032 and 0034), matching their
-- nodes.json compatibilityAliases (e.g. "contractor.create_job").
--
-- No new tables required.
-- =============================================================================

-- ── 1. Expand type CHECK ──────────────────────────────────────────────────────
--
-- Cumulative constraint history:
--   0027 (core):         job, fleet, worker, material, site, custom
--   0032 (contractor M1): trip, invoice, payment, customer, driver, vehicle,
--                          equipment, fuel_receipt, maintenance_record, expense
--   0034 (contractor M3): operator, payroll_run
--   0041 (construction):  construction_project, progress_claim, variation,
--                          defect, boq, site_inspection
--   0043 (finance):       finance_invoice, purchase_order, retention_release
--   0057 (task-case):     task, case
--   0058 (procurement):   rfq, quotation, po_request
--   0059 (construction-operations): site_diary
--   0060 (contract-admin): contract_instruction, contract_notice

ALTER TABLE lados_resources
  DROP CONSTRAINT IF EXISTS lados_resources_type_check;

ALTER TABLE lados_resources
  ADD CONSTRAINT lados_resources_type_check
  CHECK (type IN (
    -- Core resource types (0027)
    'job', 'fleet', 'worker', 'material', 'site',

    -- Contractor Edition M1-M2 (0032)
    'trip', 'invoice', 'payment',
    'customer', 'driver', 'vehicle', 'equipment',
    'fuel_receipt', 'maintenance_record', 'expense',

    -- Contractor Edition M3-M4 (0034)
    'operator', 'payroll_run',

    -- Construction Pack (0041 — Phase 7)
    'construction_project',
    'progress_claim',
    'variation',
    'defect',
    'boq',
    'site_inspection',

    -- Finance Pack (0043 — Phase 9)
    'finance_invoice',
    'purchase_order',
    'retention_release',

    -- Task/Case Management official pack (0057 — Phase 21 S4)
    'task',
    'case',

    -- Procurement official pack (0058 — Phase 21 S5)
    'rfq',
    'quotation',
    'po_request',

    -- Construction Operations official pack (0059 — Phase 21 S6)
    'site_diary',

    -- Contract Administration official pack (0060 — Phase 21 S6.1)
    'contract_instruction',
    'contract_notice',

    -- Escape hatch for custom integrations
    'custom'
  ));

-- ── 2. Index for contract admin lookups ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_contract_admin
  ON lados_resources (org_id, type, parent_id)
  WHERE type IN ('contract_instruction', 'contract_notice');
