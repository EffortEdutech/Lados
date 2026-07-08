-- ============================================================
-- Migration 0063: Soft-archive legacy prototype packs
-- Phase 21 (S9 pulled forward, prototype archival — eff's request)
-- ============================================================
--
-- Context: 10 legacy prototype packs (registered by the pre-Phase-21
-- PackInstallerService, installed_from = 'startup-sync') are mismarked
-- is_official:true in the live `packs` table today — a pre-Phase-21
-- labeling meaning collision. That field used to mean "shipped with the
-- platform" (not third-party), not "built under the Phase 21 20B1 official
-- manifest contract". The real distinguishing signal, confirmed against
-- the live data on 2026-07-04, is `installed_from`:
--   'startup-sync'           -> legacy prototype (10 packs, THIS migration)
--   'official-skeleton-sync' -> genuine Phase 21 official (20 packs, untouched)
--   'registry'               -> marketplace-installed demo pack (untouched)
--
-- The 10 packs archived here: lados.ai-pack, lados.construction-pack,
-- lados.contractor-pack, lados.core-pack, lados.document-pack,
-- lados.finance-pack, lados.foundation-pack, lados.notifications-pack,
-- lados.procurement-pack, lados.qs-pack.
--
-- Soft-archive only, per eff's explicit choice — no rows deleted, no
-- source code removed. Sets is_enabled = false (+ status = 'disabled') on
-- both `packs` and their `registered_nodes` rows. Every existing query already
-- filters .eq('is_enabled', true) (NodeService.findAll/findAllPacks,
-- ExplorerPacksTab, NodePalette, marketplace), so this hides them from
-- every UI surface without deleting anything — fully reversible by
-- flipping is_enabled back to true on both tables.
--
-- Deliberately NOT touched here: the 20 genuine official packs, the 1
-- marketplace demo pack, and prototype pack SOURCE CODE under packs/*.ts
-- (moving/archiving packs/*.ts source, and removing PackInstallerService's
-- startup sync entirely, is later S9 work — this migration only affects
-- what's already-registered in the live database). Also NOT touched: the
-- 7 existing seed workflows that reference these prototype node types —
-- see migration 0064 for that separate, explicit decision (they're
-- deleted outright, per eff's confirmation they're disposable seed data,
-- not archived here since archiving a pack row does not retroactively
-- break workflows that already reference its node types by string).

UPDATE packs
SET is_enabled = false,
    status = 'disabled',
    updated_at = now()
WHERE installed_from = 'startup-sync';

UPDATE registered_nodes
SET is_enabled = false,
    updated_at = now()
WHERE pack_id IN (
  SELECT id FROM packs WHERE installed_from = 'startup-sync'
);
