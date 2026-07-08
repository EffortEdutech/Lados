-- 0067_packs_resource_views.sql
-- Phase 21 S9.1 (gap closure, 2026-07-05)
--
-- eff reported the /resources page lost its type tabs (vehicle, trip,
-- driver, job, etc.) after migration 0065 hard-deleted the legacy
-- prototype packs. Root cause: PackInstallerService.getResourceViews()
-- (backs GET /packs/resource-views, which /resources calls on mount to
-- build its tabs) only ever read from MANIFEST_MAP — the compiled-in
-- prototype pack registry, emptied to {} when the 9 legacy packs were
-- removed (see 0065's handover note). Official packs never had an
-- equivalent column to declare the same "resource type -> view config"
-- data, so once contractor-pack was gone, nothing declared views for
-- vehicle/job/trip/driver/fuel_receipt/maintenance_record/invoice/
-- payment/expense/payroll_run at all. The underlying `resources` rows
-- were never deleted (0064 only removed workflows/workflow_templates),
-- so ?type=vehicle links still "work" but render with no display config.
--
-- Fix: give official packs a place to declare the same view config,
-- reusing the exact PackResourceDefinition shape prototype packs used
-- (packages/@lados/pack-sdk/src/types.ts's OfficialCapabilityPackManifest
-- .resourceViews, new optional field). OfficialPackLoaderService's
-- registerPack() now persists manifest.resourceViews into this column;
-- PackInstallerService.getResourceViews() reads it back for every active
-- pack, alongside (now-permanently-empty) MANIFEST_MAP.
--
-- Safe to run multiple times (IF NOT EXISTS). Nullable-with-default, so
-- every existing pack row is backfilled to an empty array — zero
-- behavior change until a pack's manifest.json actually declares
-- resourceViews and gets re-synced.

ALTER TABLE packs
  ADD COLUMN IF NOT EXISTS resource_views jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN packs.resource_views IS
  'Official-pack resourceViews declarations (PackResourceDefinition[]) — used by GET /packs/resource-views to drive the generic /resources page tabs/icons/inline actions per resource type. Populated from manifest.json by OfficialPackLoaderService; empty array for packs that own no user-facing Workspace Resource type.';
