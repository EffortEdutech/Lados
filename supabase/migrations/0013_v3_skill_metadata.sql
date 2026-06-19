-- ============================================================
-- Migration 0013: V3 Skill Metadata — uses_services & data_pack_deps
-- Sprint 13 (S13-002)
-- ============================================================
-- Adds two new columns to registered_nodes for V3 Core Services
-- and Data Pack dependency declarations.
-- All columns are nullable with empty-array defaults so existing
-- rows are unaffected until explicitly seeded.
-- ============================================================

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS uses_services  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS data_pack_deps text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN registered_nodes.uses_services IS
  'Core service names this skill requires, e.g. {''ai-service'',''storage-service''}';
COMMENT ON COLUMN registered_nodes.data_pack_deps IS
  'Data pack slugs this skill requires, e.g. {''supplier-pack''}';

-- ── Seed: service declarations for all existing nodes ─────────────────────────

UPDATE registered_nodes SET
  uses_services  = ARRAY['storage-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type = 'document.upload_file';

UPDATE registered_nodes SET
  uses_services  = ARRAY['storage-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type = 'document.read_excel';

UPDATE registered_nodes SET
  uses_services  = ARRAY['storage-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type IN ('document.read_boq', 'qs.clean_boq');

UPDATE registered_nodes SET
  uses_services  = ARRAY['ai-service', 'audit-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type = 'qs.classify_trade';

UPDATE registered_nodes SET
  uses_services  = ARRAY['ai-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type = 'qs.split_work_package';

UPDATE registered_nodes SET
  uses_services  = ARRAY['ai-service', 'storage-service', 'audit-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type = 'procurement.generate_rfq';

UPDATE registered_nodes SET
  uses_services  = ARRAY['auth-service', 'audit-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type = 'core.human_approval';

UPDATE registered_nodes SET
  uses_services  = ARRAY['storage-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type IN ('project.save_artifact', 'project.read_artifact');

UPDATE registered_nodes SET
  uses_services  = ARRAY['audit-service'],
  data_pack_deps = ARRAY[]::text[]
WHERE type = 'core.logger';
