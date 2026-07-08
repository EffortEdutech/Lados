-- =============================================================================
-- Migration 0059 — Phase 21 S6 (Wave 4): Construction Operations — Resource Types
--
-- Expands lados_resources.type CHECK constraint to include 1 new resource
-- type used by the official lados.construction-operations Capability Pack:
--   site_diary — daily site diary entry (progress, labour, plant, weather,
--                events) used later as QS evidence for progress claims
--                (lados.construction.create_site_diary)
--
-- Construction Operations needs no other new resource types — it reuses
-- construction_project / site_inspection / defect, already added by
-- migration 0041_construction_resources.sql.
--
-- lados.construction.run_handover_checklist is deliberately stateless/
-- advisory — it evaluates checklist completion and returns a result but
-- does not persist a resource of its own; handover sign-off happens via a
-- separate lados.human.record_decision node in the composing template.
--
-- lados-qs-commercial (the other Wave 4 pack) needs no new resource types
-- either — it reuses boq (0041), progress_claim (0041), and variation
-- (0041). Its split_work_packages and reconcile_final_account nodes are
-- likewise deliberately stateless/advisory, same reasoning as above.
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

    -- Escape hatch for custom integrations
    'custom'
  ));

-- ── 2. Index for site diary lookups ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_site_diary
  ON lados_resources (org_id, parent_id)
  WHERE type = 'site_diary';
