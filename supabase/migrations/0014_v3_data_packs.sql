-- ============================================================
-- Migration 0014: V3 Data Packs
-- Sprint 13 (S13-006+007)
-- ============================================================
-- Creates the data_packs catalogue and org-level installation
-- tracking table. Seeds the 7 official QS-OS Data Packs.
--
-- Companion: Vol 12 — Data Pack Specification
-- ============================================================

-- ── data_packs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_packs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,          -- e.g. "price-intelligence"
  display_name  text NOT NULL,
  description   text,
  version       text NOT NULL DEFAULT '1.0.0',
  provider      text NOT NULL DEFAULT 'QS-OS', -- who publishes this pack
  region        text,                           -- null = global, 'MY' = Malaysia etc.
  is_official   boolean NOT NULL DEFAULT false,
  is_enabled    boolean NOT NULL DEFAULT true,
  icon          text,                           -- emoji or icon key
  metadata      jsonb NOT NULL DEFAULT '{}',   -- arbitrary key-value pairs
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_packs_slug_idx    ON data_packs(slug);
CREATE INDEX IF NOT EXISTS data_packs_region_idx  ON data_packs(region);

CREATE TRIGGER set_data_packs_updated_at
  BEFORE UPDATE ON data_packs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE data_packs IS
  'Catalogue of installable Data Packs — trusted datasets available to skills.';
COMMENT ON COLUMN data_packs.slug IS
  'URL-safe identifier used as dependency key, e.g. "price-intelligence"';
COMMENT ON COLUMN data_packs.region IS
  'NULL = globally applicable. ISO country code or regional label for localised packs.';

-- ── org_data_pack_installations ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_data_pack_installations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pack_slug     text NOT NULL REFERENCES data_packs(slug)  ON DELETE RESTRICT,
  version       text NOT NULL,
  installed_at  timestamptz NOT NULL DEFAULT now(),
  installed_by  uuid REFERENCES auth.users(id),
  UNIQUE (org_id, pack_slug)
);

CREATE INDEX IF NOT EXISTS org_pack_inst_org_idx  ON org_data_pack_installations(org_id);
CREATE INDEX IF NOT EXISTS org_pack_inst_slug_idx ON org_data_pack_installations(pack_slug);

COMMENT ON TABLE org_data_pack_installations IS
  'Tracks which Data Packs each organisation has installed.';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE data_packs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_data_pack_installations  ENABLE ROW LEVEL SECURITY;

-- data_packs: readable by any authenticated user (public catalogue)
CREATE POLICY "data_packs_select" ON data_packs
  FOR SELECT TO authenticated USING (is_enabled = true);

-- org_data_pack_installations: members of the org can read; only org owners can write
CREATE POLICY "org_pack_inst_select" ON org_data_pack_installations
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_pack_inst_insert" ON org_data_pack_installations
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "org_pack_inst_delete" ON org_data_pack_installations
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ── Seed: Official QS-OS Data Packs ─────────────────────────────────────────
-- From Vol 12 §2. These are the seven officially supported Data Packs for
-- the Malaysian QS/construction market at launch.

INSERT INTO data_packs (slug, display_name, description, version, provider, region, is_official, icon)
VALUES
  (
    'price-intelligence',
    'Price Intelligence',
    'Live and historical market pricing for construction materials, labour, and equipment in Malaysia. Updated quarterly.',
    '1.0.0',
    'QS-OS',
    'MY',
    true,
    '📊'
  ),
  (
    'supplier-my',
    'Supplier Directory — Malaysia',
    'Vetted supplier database: manufacturers, distributors, and sub-contractors registered in Malaysia with contact, accreditation, and performance data.',
    '1.0.0',
    'QS-OS',
    'MY',
    true,
    '🏭'
  ),
  (
    'material-catalogue',
    'Material Catalogue',
    'Standardised material specifications, dimensions, grades, and compliance references for common construction materials in the Malaysian market.',
    '1.0.0',
    'QS-OS',
    'MY',
    true,
    '🧱'
  ),
  (
    'labour-rates-my',
    'Labour Rates — Malaysia',
    'Prevailing daily and hourly labour rates by trade and skill level, sourced from CIDB Malaysia guidelines. Updated semi-annually.',
    '1.0.0',
    'QS-OS',
    'MY',
    true,
    '👷'
  ),
  (
    'cost-index-my',
    'Construction Cost Index — Malaysia',
    'Regional cost escalation indices for Klang Valley, Penang, Sabah, and Sarawak. Includes material, labour, and all-in composite indices.',
    '1.0.0',
    'QS-OS',
    'MY',
    true,
    '📈'
  ),
  (
    'contract-templates-my',
    'Contract Templates — Malaysia',
    'Standard form contracts: PAM 2018, JKR203A, CIDB 2000, NEC4 adaptation, and bespoke sub-contract templates. Pre-tagged for automated clause extraction.',
    '1.0.0',
    'QS-OS',
    'MY',
    true,
    '📑'
  ),
  (
    'smm-standards',
    'SMM & Measurement Standards',
    'Standard Method of Measurement (SMM) rules, preambles, and work section definitions for the Malaysian QS profession. Includes ARCM and civil works extensions.',
    '1.0.0',
    'QS-OS',
    null,   -- globally applicable
    true,
    '📐'
  )
ON CONFLICT (slug) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    version      = EXCLUDED.version,
    updated_at   = now();
