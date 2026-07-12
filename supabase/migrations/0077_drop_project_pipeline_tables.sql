-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0077: Drop retired Sprint 11/12 project-scoped pipeline tables
-- Phase 23 S23.4 — see Lados_V4_Phase23_Pipeline_Orchestration_Governance_
-- Master_Plan.md §6 for the canvas rework this closes out.
--
-- `project_pipelines` / `project_artifacts` were the old project-scoped,
-- client-side-only pipeline feature (PipelineController, PipelineCanvas.tsx,
-- PipelineRunner.ts) — fully superseded by the org-level `pipelines` /
-- `pipeline_runs` / `pipeline_artifacts` tables (migration 0075) and the
-- new /pipelines canvas (S23.4). eff confirmed 2026-07-08 (Phase23 plan
-- §9.2) the 3 existing project_pipelines rows are disposable test data —
-- migration 0075's own header comment deferred this exact drop to "a later
-- cleanup migration once nothing references them anymore." As of S23.4:
--   - apps/api/src/app.module.ts no longer registers PipelineModule.
--   - apps/web's project page no longer imports/renders PipelineCanvas.
-- Source files for both are left on disk, unwired, not deleted (see the
-- S23.4 handover for the full list) — this migration only removes the data
-- they used to read/write.
--
-- Not yet applied — only eff applies migrations.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.project_artifacts;
DROP TABLE IF EXISTS public.project_pipelines;
