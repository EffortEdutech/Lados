-- ============================================================
-- Migration 0056: Phase 21 S1 — Official Capability Pack Registry
-- ============================================================
-- Adds the columns needed to register Phase 20B official Capability Pack
-- skeletons (packs/official/*) into `packs` and `registered_nodes`
-- alongside existing prototype packs, without touching prototype rows.
--
-- All additions are nullable-or-defaulted so existing rows (all prototype
-- packs/nodes, which are fully runtime-enabled today) keep their current
-- behaviour with zero data migration required.
--
-- Populated by OfficialPackLoaderService (apps/api/src/pack) on startup.
-- Official packs stay is_enabled = true / status = 'active' so they are
-- VISIBLE in the node registry per the S1 gate — runtime_status /
-- executor_status are what mark them non-executable until their
-- implementation wave (S2-S6) lands, not visibility flags.

-- ── packs: layer + runtime maturity ───────────────────────────────────────────

ALTER TABLE packs
  ADD COLUMN IF NOT EXISTS layer text
    CHECK (layer IN ('L0', 'L1', 'L2', 'L3', 'L4', 'L5'));

ALTER TABLE packs
  ADD COLUMN IF NOT EXISTS runtime_status text NOT NULL DEFAULT 'runtime_enabled'
    CHECK (runtime_status IN ('manifest_only', 'stub_executors', 'runtime_enabled', 'retired'));

COMMENT ON COLUMN packs.layer IS
  'Phase 20B official Capability Pack layer (L0 Platform Foundation .. L5 Template Packs). Null for pre-Phase-20 prototype packs.';
COMMENT ON COLUMN packs.runtime_status IS
  'manifest_only | stub_executors | runtime_enabled | retired. Defaults to runtime_enabled so existing prototype packs are unaffected; official skeletons are registered as manifest_only until their executor wave lands (see Phase 21 Master Plan S1-S6).';

-- ── registered_nodes: canonical capability + executor maturity ────────────────

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS canonical_capability text;

ALTER TABLE registered_nodes
  ADD COLUMN IF NOT EXISTS executor_status text NOT NULL DEFAULT 'implemented'
    CHECK (executor_status IN ('not_started', 'planned', 'stub', 'implemented'));

COMMENT ON COLUMN registered_nodes.canonical_capability IS
  'Canonical Capability Registry key (Phase 20A), e.g. "qs.boq.read". Null for pre-Phase-20 prototype nodes.';
COMMENT ON COLUMN registered_nodes.executor_status IS
  'not_started | planned | stub | implemented. Defaults to implemented so existing prototype nodes are unaffected; official skeleton nodes are registered as not_started until an executor is written for their wave.';

CREATE INDEX IF NOT EXISTS registered_nodes_canonical_capability_idx
  ON registered_nodes(canonical_capability);

CREATE INDEX IF NOT EXISTS packs_runtime_status_idx
  ON packs(runtime_status);
