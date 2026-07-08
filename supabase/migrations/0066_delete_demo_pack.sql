-- ============================================================
-- Migration 0066: Delete the marketplace demo pack
-- Phase 21 S9 (eff's request, 2026-07-04)
-- ============================================================
--
-- eff asked to remove `demo.lados-demo-pack` ("Lados Demo Pack") the same
-- way as the prototype packs in 0065. Unlike those 9, this pack was never a
-- compiled workspace TypeScript package — it exists purely as DB rows,
-- installed via the registry ("Install from Marketplace") flow
-- (RegistryService.installListing() in apps/api/src/marketplace/
-- registry.service.ts). Confirmed:
--   - installed_from = 'registry', is_official = false
--   - exactly 1 registered node: demo.lados_demo_pack.echo_context
--   - 0 workflows reference any demo.* node type
--   - no code anywhere imports or resolves it (no real-nodes/index.ts entry
--     — it has no real executor at all, only a DB registration; the only
--     other repo reference is an unrelated test fixture,
--     test-data/packs/lados-demo-pack/manifest.json)
--
-- Deleting both the installed pack row and its registry listing, so it's
-- gone from both `/packs` and the marketplace "browse" tab (not just
-- uninstalled/reinstallable). Confirmed via live information_schema query
-- that no table has an FK to registry_packs.id, and (per migration 0065's
-- check) packs.id's only referencing FKs — registered_nodes.pack_id and
-- pack_node_overrides.pack_id — are both ON DELETE CASCADE, so this cleans
-- up automatically with no manual ordering needed.
--
-- Environment-specific: safe no-op anywhere this pack/listing doesn't exist.

DELETE FROM packs
WHERE id = 'demo.lados-demo-pack';

DELETE FROM registry_packs
WHERE pack_id = 'demo.lados-demo-pack';
