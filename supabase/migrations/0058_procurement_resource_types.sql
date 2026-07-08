-- =============================================================================
-- Migration 0058 — Phase 21 S5 (Wave 3): Procurement — Resource Types
--
-- Expands lados_resources.type CHECK constraint to include 3 new resource
-- types used by the official lados.procurement Capability Pack:
--   rfq        — request for quotation (lados.procurement.create_rfq /
--                issue_rfq)
--   quotation  — a supplier's response to an RFQ (lados.procurement
--                .receive_quotation)
--   po_request — an approved-award handoff record for Commercial Finance
--                to turn into a real purchase order
--                (lados.procurement.generate_po_request /
--                lados.finance.create_purchase_order)
--
-- Commercial Finance itself needs no new resource types — it reuses
-- finance_invoice / purchase_order / retention_release, already added by
-- migration 0043_finance_resource_types.sql.
--
-- Comparison and award-recommendation nodes (compare_quotations,
-- recommend_award) are deliberately stateless/advisory — they do not
-- persist a resource of their own; human review happens via a separate
-- lados.human.request_approval node in the composing template.
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

    -- Escape hatch for custom integrations
    'custom'
  ));

-- ── 2. Indexes for procurement lookups ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_rfq_quotation
  ON lados_resources (org_id, type, parent_id)
  WHERE type IN ('rfq', 'quotation');

CREATE INDEX IF NOT EXISTS idx_resources_po_request
  ON lados_resources (org_id, state)
  WHERE type = 'po_request';
