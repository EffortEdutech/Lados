-- =============================================================================
-- Migration 0057 — Phase 21 S4 (Wave 2): Task/Case Management — Resource Types
--
-- Expands lados_resources.type CHECK constraint to include 2 new resource
-- types used by the official lados.task-case Capability Pack:
--   task  — operational task (lados.task.create / lados.task.update_status)
--   case  — operational case (lados.case.open / lados.case.close)
--
-- Tasks and Cases are modeled as generic Workspace Resources (the same
-- lados_resources table lados.resource-operations exposes) rather than
-- dedicated tables — status/closure changes flow through the existing
-- state-machine-guarded transitionState() path (StateEngineService), so a
-- requires_approval guard on either type routes to human approval exactly
-- like any other guarded resource transition.
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

    -- Escape hatch for custom integrations
    'custom'
  ));

-- ── 2. Index for task/case lookups ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_resources_task_case
  ON lados_resources (org_id, type, state)
  WHERE type IN ('task', 'case');
