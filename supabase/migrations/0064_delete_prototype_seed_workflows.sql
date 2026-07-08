-- ============================================================
-- Migration 0064: Delete disposable prototype-era seed workflows + templates
-- Phase 21 (S9 pulled forward, prototype archival — eff's request)
-- ============================================================
--
-- Part 1 — Context: as of 2026-07-04, all 7 workflows across both
-- organizations in this project (6 draft + 1 published) were built
-- entirely from legacy prototype node types (core.*, qs.*, finance.*,
-- procurement.*) and are confirmed by eff to be disposable seed/sample
-- data, not real customer work worth migrating or preserving:
--
--   c92b5d46-ce1f-4e18-a2c8-d2189d8dc079  Hospital B — BOQ to RFQ (Sample)
--   d58672d3-a30d-4afc-9897-a5f0770cceb7  BOQ Preparation & Validation
--   149a1c20-73e5-4627-aa62-4c67a0f69da7  Progress Claim Review
--   74f1f47d-c830-4b99-9a41-f309ab85afa6  Quotation Comparison — M&E Works
--   25cd6a94-a052-46f9-ae22-7d2b1497adb5  Order Receipt to Payment Process
--   cca62c11-d582-4d22-88e9-ef5d9fcdc972  Invoice Workflow
--   41fcd08b-257a-4d8e-9520-ef28b759ed16  [PROTOTYPE] Demo: Progress Claim Rate Check (E2E)
--
-- Hard delete (not archive) per eff's explicit choice for these 7 rows
-- specifically — distinct from migration 0063's pack-level soft-archive.
-- Confirmed safe: every FK referencing workflows.id is either ON DELETE
-- CASCADE (approval_tasks, execution_runs, group_run_logs,
-- lados_event_subscriptions, resource_bindings, workflow_versions) or ON
-- DELETE SET NULL (lados_artifacts, project_artifacts.source_workflow_id,
-- uploads.workflow_id) — checked against the live schema on 2026-07-04, no
-- RESTRICT constraints anywhere in the chain (including one level deeper,
-- execution_runs.id's own dependents). No manual pre-deletion of child
-- rows is needed; the database handles the cascade.
--
-- Part 2 — workflow_templates: checked the live table on 2026-07-04 (after
-- migration 0062 applied, which added the 8th, official-node-based row) —
-- 7 of the 8 templates are still entirely prototype-node-built (same
-- core.*/qs.*/procurement.*/document.*/project.*/workflow.* types as the
-- seed workflows above), left over from Sprint 10's original seed +
-- Contractor Edition additions. Deleting them too, per eff's follow-up
-- request. Confirmed zero FK constraints reference workflow_templates.id
-- anywhere in the schema (instantiate() copies the definition into a new,
-- independent workflows row — it never stores a back-reference to the
-- template) — so this delete is unconditionally safe, no cascade concerns:
--
--   bd1975d0-1f88-431e-a7c8-483a9b6c105f  boq-preparation             BOQ Preparation & Validation
--   41e922ff-a162-4710-8bf1-0af667a4a043  boq-to-rfq                  BOQ to RFQ
--   fb9fda3d-6c5c-4818-9e38-48d6a22f3b72  tender-comparison           Tender Comparison & Award
--   b4590bc2-31ec-4dce-a484-171164fa295d  quotation-comparison-civil  Quotation Comparison — Civil & Structural
--   f5cac555-3dcd-4bbd-b30d-ca3a60862a3f  quotation-comparison-mne    Quotation Comparison — M&E Works
--   ce233aef-177a-4baf-8f65-2f9bd3b8e874  progress-claim-review       Progress Claim Review
--   0a544600-8e96-4237-a6f6-3d73d8c97163  supplier-recommendation     Supplier Recommendation & Budget Summary
--
-- The 8th row (slug 'official-node-proof', migration 0062) is deliberately
-- excluded — that's the new official-node template, not a prototype one.
--
-- Environment-specific: all UUIDs in this migration only exist in this one
-- Supabase project. Running this against a different/future environment
-- that doesn't have these rows is a safe no-op (0 rows affected).
--
-- Explicitly NOT deleted here: the packs/registered_nodes rows those
-- workflows'/templates' node types belong to (see migration 0063 —
-- soft-archived, not deleted, since other future workflows could still
-- reference the same node types until packs/*.ts prototype source is
-- actually retired).

DELETE FROM workflows
WHERE id IN (
  'c92b5d46-ce1f-4e18-a2c8-d2189d8dc079',
  'd58672d3-a30d-4afc-9897-a5f0770cceb7',
  '149a1c20-73e5-4627-aa62-4c67a0f69da7',
  '74f1f47d-c830-4b99-9a41-f309ab85afa6',
  '25cd6a94-a052-46f9-ae22-7d2b1497adb5',
  'cca62c11-d582-4d22-88e9-ef5d9fcdc972',
  '41fcd08b-257a-4d8e-9520-ef28b759ed16'
);

DELETE FROM workflow_templates
WHERE id IN (
  'bd1975d0-1f88-431e-a7c8-483a9b6c105f',
  '41e922ff-a162-4710-8bf1-0af667a4a043',
  'fb9fda3d-6c5c-4818-9e38-48d6a22f3b72',
  'b4590bc2-31ec-4dce-a484-171164fa295d',
  'f5cac555-3dcd-4bbd-b30d-ca3a60862a3f',
  'ce233aef-177a-4baf-8f65-2f9bd3b8e874',
  '0a544600-8e96-4237-a6f6-3d73d8c97163'
);
