# Lados V4 Phase 21 Checklist

**Document ID:** LADOS-V4-P21-CHECKLIST  
**Status:** Active — detail checklist for master plan workstreams  
**Date:** 2026-07-03  
**Primary sprint plan:** `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` (§3A maps workstreams to sprints)

---

## Status Summary

| Workstream | Title | Lands in master plan sprint | Status |
|---|---|---|---|
| 21A | UI Copy and Compatibility Pass | S0 (immediate) | Ready |
| 21B | Provider Profile Data Model | S9A | Planned |
| 21C | Knowledge Pack Listing Layer | S9A | Planned |
| 21D | Review Queue Expansion | S9A | Planned |
| 21E | AI Search Preview | S9A / Phase 22 decision | Planned |
| 21F | Official Capability Runtime Activation Plan | Superseded by master plan S1–S6 | Superseded |

---

## Phase 21A - UI Copy and Compatibility Pass

### Marketplace

- [x] Change visible `Data Packs` tab/copy to `Knowledge Packs`. *(S0, 2026-07-03)*
- [x] Change `Organization Data Packs` to `Installed Knowledge Packs`.
- [x] Change `Browse Official Data Packs` to `Browse Official Knowledge Packs`.
- [x] Change `Install Data Pack` to `Install Knowledge Pack`. *(error copy; card buttons use pack displayName)*
- [x] Change `Disable Data Pack` to `Disable Knowledge Pack`.
- [x] Change `Installed Packs` to `Installed Capability Packs` where it means executable/action packs.
- [x] Change `Browse Registry` to `Browse Capability Packs`.
- [x] Change `Publish Pack` to `Publish Capability Pack`.
- [x] Keep Review Queue wording unless expanded later.

### Explorer / Canvas

- [x] Change Explorer `Data Packs` panel title to `Knowledge Catalogue`. *(S0, 2026-07-03)*
- [x] Change panel body copy to use `Knowledge Packs`.
- [x] Change empty states to use `Knowledge Pack Items`.
- [x] Keep component/API technical identifiers unchanged. *(verified — only `data_pack_*`/`DataPack*` identifiers and code comments remain)*

### Property Panel

- [x] Change `Requires Data Packs` to `Requires Knowledge Packs`. *(S0, 2026-07-03)*
- [x] Change `Data Pack item` labels to `Knowledge Pack Item`. *(incl. DataPackItemField placeholder/select/detail)*
- [x] Preserve manifest field type `data_pack_item`.

### Execution Log

- [x] Change `Data Pack Provenance` to `Knowledge Pack Provenance`. *(S0, 2026-07-03)*
- [x] Change `Data Pack usage` to `Knowledge Pack usage`. *(no user-visible instances found beyond provenance block)*
- [x] Preserve `execution_logs.data_pack_usages` technical naming.

### Documentation

- [ ] Update Phase 21 sprint plan handover.
- [ ] Update Phase 21 checklist.
- [ ] Update V4 README if any route or document reference changes.

### Verification

- [ ] `corepack pnpm --filter web typecheck` passes.
- [ ] Browser verify `/marketplace`.
- [ ] Browser verify Explorer Knowledge Catalogue panel.
- [ ] Browser verify PropertyPanel Knowledge Pack Item field where available.
- [ ] Browser verify Execution Log provenance label where sample run exists.

---

## Phase 21B - Provider Profile Data Model

- [ ] Draft migration plan.
- [ ] Add provider profile schema.
- [ ] Add provider profile service/API.
- [ ] Add owner/admin permission checks.
- [ ] Add Provider Profile page.
- [ ] Link Knowledge Packs to provider identity.
- [ ] Add smoke test.
- [ ] Browser verify profile view.

---

## Phase 21C - Knowledge Pack Listing Layer

- [ ] Decide alias-vs-new-table strategy over `data_packs`.
- [ ] Add listing fields: verification, source policy, visibility, stale status.
- [ ] Add Knowledge Pack detail route.
- [ ] Add Installed Knowledge route.
- [ ] Preserve Phase 19 Data Pack API compatibility.
- [ ] Update tests.
- [ ] Browser verify install/disable.

---

## Phase 21D - Review Queue Expansion

- [ ] Add Provider Profile submissions.
- [ ] Add Knowledge Pack submissions.
- [ ] Add approve/reject/request-changes/suspend actions.
- [ ] Add reviewer notes.
- [ ] Add owner/admin checks.
- [ ] Browser verify admin flow.
- [ ] Browser verify non-admin denial.

---

## Phase 21E - AI Search Preview

- [ ] Draft endpoint contract.
- [ ] Implement installed Knowledge Pack search scope.
- [ ] Implement marketplace Knowledge Pack search scope if listing layer exists.
- [ ] Return provider, pack, version, item, source date, warnings.
- [ ] Build AI Search Preview screen.
- [ ] Verify advisory warnings.

---

## Phase 21F - Official Capability Runtime Activation Plan

- [ ] Choose official pack activation order.
- [ ] Identify executor implementation requirements.
- [ ] Plan `registered_nodes` sync.
- [ ] Plan compatibility alias activation.
- [ ] Plan saved workflow migration.
- [ ] Plan browser visual verification.
- [ ] Keep prototype runtime rollback path.

---

## Product Safety Rules

- [ ] Do not rename `.env*` files or inspect their contents.
- [ ] Do not rename `data_pack_*` technical identifiers in Phase 21A.
- [ ] Do not delete prototype packs until official runtime migration is verified.
- [ ] Do not execute uploaded external runtime code.
- [ ] Keep commercial/QS/contract outputs advisory until human review.

---

## Handover

### 2026-07-03 (2) - S1 Official Runtime Foundation delivered

✅ Completed:
- Confirmed the S1 executor contract already exists (`NodeExecutor` in `@lados/pack-sdk/src/resolve.ts`) — documented as the standing contract rather than rebuilt.
- Extended `OfficialNodeManifest` with optional `events` declarations (`OfficialNodeEventEmission`) + validator support in `@lados/pack-sdk`.
- Built `apps/api/src/pack/official-pack-loader.ts` (pure loader: reads + validates every `packs/official/*` skeleton, no DB deps) and `official-pack-loader.service.ts` (NestJS wrapper, upserts to `packs`/`registered_nodes` as visible-but-non-executable, wired into `PackModule` as its own `OnModuleInit` — kept fully separate from `PackInstallerService` so a broken skeleton can never affect prototype pack sync).
- Wired `pnpm validate:official-packs` into `.github/workflows/ci.yml` — an invalid official manifest now fails CI.
- Added `apps/api/test/official-pack-loader.spec.ts`: loader loads all skeletons cleanly, validator rejects a deliberately broken manifest, alias resolution, and the new `events` field (valid, missing eventType, duplicate eventType, omitted).
- Drafted `supabase/migrations/0056_official_capability_pack_registry.sql` (additive: `packs.layer`, `packs.runtime_status`, `registered_nodes.canonical_capability`, `registered_nodes.executor_status`; existing rows default to fully-enabled so prototype behavior is unchanged).

🔧 Ad-hoc outstanding:
- Migration 0056 is written but **not applied** to the live Supabase project (`fsrdasrwceuscrfglskd`) — needs `eff` to run it via the normal migration path (per Responsibility Split, Claude drafts migrations; applying + Supabase dashboard settings are `eff`'s call).
- Note for `eff`: while investigating, `git status`/`git status --porcelain` failed in the Claude sandbox with `fatal: unknown index entry format 0x00730000`, and a `cat` of `package.json` inside the sandbox showed a truncated file — but `Read`-tool access to the real file (and `git diff HEAD`) showed `package.json` is intact and matches HEAD. This looks like a stale/partial mount snapshot in the sandbox, not real corruption, but worth a quick `git status` on your end to confirm nothing is actually wrong.

➡️ Next:
- S2 — Wave 1 packs: implement real executors for `lados-workflow-foundation`, `lados-human-work`, `lados-document-intelligence` (this is the point where `runtime_status`/`executor_status` for those three packs should start moving off `manifest_only`/`not_started`).
- Apply migration 0056 once eff has verified it locally.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 S1 checklist

Verification — eff ran locally, 2026-07-03:
- `pnpm typecheck` — clean across all 21 workspace projects.
- `pnpm --filter @lados/pack-sdk build && pnpm --filter api test` — 5 suites / 74 tests passed (including the new `official-pack-loader.spec.ts`; first run without the rebuild step showed 2 failures against a stale `dist/` — expected, resolved by rebuilding `@lados/pack-sdk` first).
- `pnpm validate:official-packs` — passed: 20 packs, 51 nodes, 96 canonical capabilities, 38 compatibility aliases.

### 2026-07-03 - Phase 21 checklist created

Done:
- Created Phase 21 checklist.
- Defined 21A as the immediate implementation start.
- Listed future 21B-21F workstreams as planned, not active.

Next:
- Start Phase 21A - UI Copy and Compatibility Pass.

Ad-hoc:
- Phase 21A should be intentionally small and safe.

Docs updated:
- `Sprint/Lados_V4_Phase21_Checklist.md`

Verification:
- Documentation-only update. No code verification required.
