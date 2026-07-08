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

### 2026-07-05 (17) - Real root cause of (16) found: ApprovalController never wrapped responses in ApiResponse<T>

eff rebuilt (confirmed clean recompile + restart in the API log) and retried — `/approvals` still showed empty, but the browser network log showed `GET /approvals ... 200 in 47ms`. A fast, successful 200 combined with data already proven correct at the DB layer (per (16)) meant the bug had to be in the response shape, not the query — and it was.

✅ **Root cause:** every other controller in this app (confirmed via `workflow.controller.ts`) returns `{ success: true, data, error: null }` — the `ApiResponse<T>` shape the frontend's `apiClient` universally expects and unwraps via `.data`. `ApprovalController`'s 4 handlers (`listPending`, `listForRun`, `getTask`, `decide`) were the one place in the codebase that returned the raw service result directly instead. So `GET /approvals` really was sending the pending task back in its 200 response body — just as a bare JSON array, not `{success,data,error}`. `apiClient`'s `JSON.parse(text) as ApiResponse<T>` then produced an object whose `.data` was `undefined` (arrays have no `.data` property), so every consumer's `setTasks(res.data ?? [])` landed on `[]` regardless of what the API actually sent. (16)'s two DB-query hardening fixes were real improvements but not the actual bug — the query itself worked; the response just never reached the frontend in a shape it could read.

✅ **Fixed** by wrapping all 4 `ApprovalController` methods in `{ success: true, data, error: null }`, matching the established convention exactly.

✅ **This was a wider bug than the one report** — grepped every frontend consumer of `/approvals*` and found the exact same silent-empty pattern in two more places, both fixed for free by this one controller change: `OrgDashboardSummaryCards.tsx`'s pending-approvals count on the main dashboard (would have shown 0 always), and `ExecutionLogPanel.tsx`'s `PausedApprovalBanner` — the inline "Review & Approve" panel shown directly on a paused node in the workflow canvas (visible in eff's very first message in this thread: "Review & Approve — waiting — 118ms"). All three now read the same corrected response shape.

🔧 Ad-hoc outstanding:
- No existing `approval.controller.spec.ts`/`approval.service.spec.ts` to update — this codebase doesn't have HTTP-layer tests for this controller yet (same gap noted in (16)); not adding one now, deferring to eff's live re-test same as (16).
- (16)'s two query-hardening changes in `approval.service.ts` (checked `membershipError`, two-step query instead of the embedded-resource filter) remain in place — harmless, arguably still worth keeping since they removed the one part of this file that had unchecked errors, just weren't the actual fix.

➡️ Next:
- eff: `pnpm --filter api test` → `pnpm typecheck` → `pnpm --filter web typecheck`.
- eff: refresh `/approvals`, the dashboard, and the workflow canvas's paused node — all three should now show the pending task `f666a2e9-...`. Approve or reject it to complete the first full pause→decide→resume loop on an official-node workflow.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)

### 2026-07-05 (16) - /approvals showing "No pending approvals" despite a real pending task — investigated + hardened

eff instantiated and ran the `official-node-proof` template (the sample workflow from (6)/(9)) for the first time: execution log confirmed `lados.human.request_approval` created approval task `f666a2e9-48a7-484f-a894-a37af4cf8585` and paused the run, but `/approvals` showed the empty "No pending approvals" state.

🔎 Investigated via read-only `execute_sql` against the live project (never wrote/deleted anything):
- Confirmed the task row is real and correct: `status:'pending'`, `execution_id` correctly points at the paused `execution_runs` row (`status:'paused'`), which has `organization_id: eeeeeeee-0001-...-0001` (the contractor test org) and `started_by: dddddddd-0001-...-0001` (contractor-owner@lados.dev).
- Confirmed `contractor-owner@lados.dev` is a genuine `owner`-role member of that org in `organization_members`, and that user's `last_sign_in_at` (2026-07-04 23:23) is consistent with still being the logged-in session ~5 hours later when the task was created (2026-07-05 04:40).
- Ran the exact join/filter `ApprovalService.listPending()` is supposed to perform as raw SQL (inner join `approval_tasks`→`execution_runs`, filtered to orgs the owner belongs to) — it correctly returns the one pending task. So the stored data and the intended query semantics are both right; the bug (if still present after eff's next test) is in the API layer translating that intent into an actual query/response, not in the data.
- `SupabaseService.admin` uses the service-role key (confirmed in `supabase.service.ts` — `autoRefreshToken:false, persistSession:false`), so RLS is bypassed server-side; ruled out an RLS policy blocking the read.

✅ Found and fixed one genuine defect while reviewing the code path, regardless of whether it's the root cause here: `listPending()`'s very first query (fetching the user's org memberships) never checked its `error` return — every other query in the file does. A transient failure there would have silently produced `orgIds = []` and returned an empty inbox with zero indication anything went wrong — exactly the symptom eff saw. Fixed to throw like every sibling query.

✅ Also rewrote the main tasks query: replaced the PostgREST embedded-resource dot-notation filter (`.select(..., execution_runs!inner(organization_id,status)).in('execution_runs.organization_id', orgIds)`) with two plain, unambiguous queries — resolve the org-scoped `execution_runs.id`s first, then `approval_tasks` filtered by `execution_id in (...)` and `status='pending'`. Functionally identical result set (verified via the raw-SQL check above), but removes reliance on an embedded-filter syntax pattern that's harder to trace end-to-end without a live request log, in favor of two queries whose behavior is obvious by inspection.

🔧 Ad-hoc outstanding:
- **Root cause not conclusively identified** — the DB state was fully consistent with correct behavior, so this may have been the (now-fixed) silent membership-query failure, a stale/expired session at the moment `/approvals` was loaded, or a timing issue; no Jest suite exists for `ApprovalService` to reproduce it in isolation (no precedent in this codebase for mocking the raw Supabase client chain — every other test mocks at the pack-executor/service-interface layer, not this one), so not adding one now rather than write a brittle first-of-its-kind mock.
- eff: re-run the `official-node-proof` template (or refresh `/approvals` against the existing pending task `f666a2e9-...` — it's still `pending` in the DB right now, untouched) and confirm it now appears. If it still doesn't, the bug is elsewhere (e.g. session/token issue) and needs a live network-tab check of the actual `GET /approvals` response.

➡️ Next:
- eff: `pnpm --filter api test` → `pnpm typecheck` (no new deps, but `approval.service.ts` changed).
- eff: refresh `/approvals` and confirm task `f666a2e9-48a7-484f-a894-a37af4cf8585` now shows; approve or reject it to confirm the full pause→decide→resume loop completes end-to-end for the first time on an official-node workflow.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)

### 2026-07-04 (6) - Official-node proof template + prototype archival scripts drafted (S9 pulled forward)

Resumed after the chaining-fix (verified green by eff — see (5) below) and eff's answers on scope: 7 existing workflows confirmed disposable seed data (not real customer work); prototype pack cleanup should be soft-archive (reversible), not hard delete; work on the sample workflow and archival scripts in parallel rather than strictly sequenced.

✅ Completed (all drafted, none applied — awaiting eff's Supabase review/apply per the standing division of labor):
- **`supabase/migrations/0062_official_node_proof_template.sql`** — seeds a new `workflow_templates` row, slug `official-node-proof`, built entirely from official nodes: `lados.workflow.trigger_manual -> lados.human.request_approval -> lados.workflow.write_log`. Deliberately avoids any node/chain not concretely proven this session (qs-commercial's chain has a real test now; finance/procurement/etc. don't) — instead proves a different, already fully-verified capability end-to-end: trigger -> real approval-task creation -> pause -> human decides via `POST /approvals/:taskId/decide` -> resume -> log, exercising the queue/SSE/approval pipeline (S2-S4, S7.4) live in the browser. Connections use REAL port ids (`trigger`->`context`, `approvalTask`->`data`), not the generic `'out'`/`'in'` placeholder, so it also exercises the new port-aware runner fix. Once applied, eff instantiates it into the test org via the existing, already-tested `POST /workflow-templates/:id/instantiate` — not a one-off hand-inserted workflow row.
- **`supabase/migrations/0063_archive_legacy_prototype_packs.sql`** — soft-archives (not deletes) the 10 legacy prototype packs keyed off `installed_from = 'startup-sync'` (NOT `is_official`, which is mismarked `true` for all 10 — see (5) below): sets `is_enabled = false` + `status = 'disabled'` on `packs` and their `registered_nodes` rows. Every existing query already filters `.eq('is_enabled', true)`, so this hides them from every UI surface (palette, marketplace, Explorer Packs tab) with zero rows deleted — fully reversible. The 20 genuine official packs and the 1 marketplace demo pack (`installed_from='registry'`) are untouched.
- **`supabase/migrations/0064_delete_prototype_seed_workflows.sql`** — hard-deletes the 7 confirmed-disposable seed workflows by explicit UUID (not a WHERE-by-name/status match, to avoid any ambiguity). Checked the live schema first: every FK referencing `workflows.id` (and one level deeper, `execution_runs.id`) is `CASCADE` or `SET NULL` — no `RESTRICT` anywhere in the chain — so a plain `DELETE ... WHERE id IN (...)` is safe with no manual pre-deletion ordering needed. Environment-specific by design (hardcoded UUIDs only exist in this one project); a safe no-op anywhere else.

🔧 Ad-hoc outstanding:
- **Update 2026-07-04:** eff applied migration 0062 only so far. 0063 and 0064 not yet applied — eff confirmed the two are independent of each other and of 0062 (0064 only `DELETE`s `workflows`/`workflow_templates` rows by explicit UUID; 0063 only touches `packs`/`registered_nodes` — no FK or ordering dependency between them), so either can run first safely.
- **Update 2026-07-04:** eff asked for `workflow_templates` cleanup too, not just `workflows` rows. Checked the live table (post-0062): 7 of its 8 rows are still prototype-node-built leftovers from Sprint 10 (`boq-preparation`, `boq-to-rfq`, `tender-comparison`, `quotation-comparison-civil`, `quotation-comparison-mne`, `progress-claim-review`, `supplier-recommendation`) — the 8th is the new `official-node-proof` row from 0062, correctly excluded. Confirmed zero FK constraints reference `workflow_templates.id` anywhere (instantiate() never stores a back-reference), so deleting them is unconditionally safe. Added a second `DELETE FROM workflow_templates` statement to migration `0064` (same file, not yet applied, so edited in place rather than adding a new migration number).
- `packs/*.ts` prototype SOURCE CODE (the actual TypeScript files) and `PackInstallerService`'s startup-sync registration are NOT touched by 0063 — that pack is only a DB-visibility change. Removing the source/registration code entirely is later S9 work, not done here.
- The finance/procurement/etc. pack-chaining audit gap from (5) below is still open — this session's official-node-proof template deliberately worked around it rather than closing it.

➡️ Next:
- eff: apply migration 0063 (soft-archive, requested first), then 0064 (now deletes both the 7 seed workflows and the 7 prototype workflow_templates rows).
- eff: instantiate the `official-node-proof` template into the test org, run it, approve the pending task, confirm it completes — the first real official-node run in the live app.
- eff: confirm the palette/marketplace/Explorer no longer show the 10 archived prototype packs, and that nothing broke.
- Continue closing the finance/procurement/etc. chaining-audit gap before S8 ships templates from those packs.

### 2026-07-04 (7) - Explorer sidebar pack-count bug found + fixed (post-0063/0064 UI check)

eff applied 0063 and 0064, then reported `/packs`, `/marketplace`, and the workflow canvas's Explorer sidebar ("32 packs installed") still showed the 10 prototype packs. Verified via live `execute_sql` queries that the DB archival itself is correct: the 10 `startup-sync` packs are `is_enabled=false`/`status='disabled'`; `workflows` count is 1; `workflow_templates` count is 1 (only `official-node-proof` remains).

✅ Root cause found and fixed:
- Traced `GET /packs` → `PackController.getAll()` → `PackRegistryService.getAll()` (`apps/api/src/pack/pack-registry.service.ts`). This deliberately returns ALL packs, enabled and disabled — that's correct behavior for the `/packs` management page and `GET /marketplace/packs` browse view (its own doc comment says "Browse all packs — enabled and disabled"); both already render a "Disabled" badge and were working as designed. `OrgPackController` (`GET /org/packs`) already filters `is_enabled` correctly for org-scoped consumers.
- `NodePalette.tsx` (the actual node-dragging/workflow-building surface) calls `GET /nodes`, which already filters `registered_nodes.is_enabled=true` via `NodeService.findAll()` — never affected.
- The one real bug: `apps/web/src/components/canvas/explorer/ExplorerPacksTab.tsx` reused the unfiltered `/packs` response for its "N packs installed" count and list, with no `is_enabled` filter — so it counted/listed all 32 rows including the 10 archived ones.
- **Fix**: added `.filter((p) => p.is_enabled)` to the `/packs` response before `setPacks()` in `ExplorerPacksTab.tsx`, since this sidebar is a build-time surface (not a pack-management page) and disabled packs have no usable nodes on the canvas anyway. No backend, migration, or other file change needed.

🔧 Ad-hoc outstanding:
- A minor discrepancy noticed during the live-query check (not yet investigated): `official-skeleton-sync` pack count reads 21, where it was previously tracked as 20 genuine official packs — needs a follow-up check, not blocking.
- **Resolved in (8) below**: the 21st official pack is `lados.video-production` — a real, later addition (Content Production line of business, `@lados/official-video-production`), not a bug.

➡️ Next:
- eff: `pnpm --filter web typecheck` then refresh the workflow canvas at `/projects/d3799a9a-15d7-4055-b83b-ac55e89a18ff/workflows/c7b41545-3b7d-4725-a579-3a4e6251a600` and confirm the Explorer sidebar's pack count now excludes the 10 archived packs.
- Continue closing the finance/procurement/etc. chaining-audit gap before S8 ships templates from those packs.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)

### 2026-07-04 (8) - Prototype packs fully removed from the platform (code + DB), not just soft-archived

eff's follow-up request, verbatim: "I want all the prototypes packs & nodes to be removed. It can be kept archived in archived folder but not in the Lados platform." This goes further than (6)/(7)'s soft-archive (`is_enabled=false`, still visible on the `/packs` management page) — eff wants the 10 legacy prototype packs (`ai-pack`, `construction-pack`, `contractor-pack`, `core-pack`, `document-pack`, `finance-pack`, `foundation-pack`, `notifications-pack`, `procurement-pack`, `qs-pack`) gone from the running platform entirely, with only an on-disk archive left.

Investigation first, since this is more invasive than a DB flag: these packs are not simply dead code. `apps/api/src/execution/real-nodes/index.ts` still wired all 9 (not `ai-pack`, which was always a stub) as fallback resolvers behind the official packs, and `apps/api/src/notification/email.service.ts` / `sms.service.ts` imported `EmailPayload`/`EmailResult`/`SmsPayload`/`SmsResult` from `@lados/notifications-pack` even though the officially-active `officialCommunicationResolve` already had its own independent, identically-shaped types in `@lados/official-communication`. Confirmed via live `information_schema` query that `registered_nodes.pack_id -> packs.id` and `pack_node_overrides.pack_id -> packs.id` are both `ON DELETE CASCADE` (no other FK references `packs.id`), so a hard delete of the 10 `packs` rows is safe and self-cleaning.

✅ Completed:
- `apps/api/src/notification/email.service.ts` / `sms.service.ts` — switched their `EmailPayload`/`EmailResult`/`SmsPayload`/`SmsResult` type imports from `@lados/notifications-pack` to `@lados/official-communication` (structurally identical shape, confirmed by reading both). These services never depended on the prototype pack's code, only its type shape — this was the one real code coupling that had to move before the pack could be removed.
- `apps/api/src/execution/real-nodes/index.ts` — removed all 9 legacy resolver imports (`coreResolve`, `documentResolve`, `qsResolve`, `procurementResolve`, `foundationResolve`, `contractorResolve`, `constructionResolve`, `financeResolve`, `notificationsResolve`), their 4 adapter functions (`makeContractorResourceAdapter`, `makeConstructionResourceAdapter`, `makeConstructionAiAdapter`, `makeFinanceResourceAdapter`), and the `contractor-pack`/`construction-pack`/`finance-pack` type imports they used. Every node type they resolved has a canonical official-pack successor already wired ahead of them in the resolver chain, and migration 0064 already confirmed zero live workflows/templates use any prototype node type.
- `apps/api/src/pack/pack-installer.service.ts` — removed all 9 legacy pack manifest imports and their `COMPILED_PACKS`/`MANIFEST_MAP`/`MANIFEST_TO_DB_PACK_ID`/`PACK_PREFIXES`/`ALL_NODE_MANIFESTS` entries. This closes a real resurrection risk that had been sitting live in production: `syncNodeManifests()` unconditionally upserted `is_enabled: true` on every registered_nodes row for these packs on **every API restart**, which would have silently undone migration 0063's soft-archive on the next deploy. With the imports gone there is nothing left in code to resurrect, independent of the DB migration below.
- `apps/api/package.json` — removed the 9 `@lados/*-pack` workspace dependencies. `apps/web/next.config.mjs` — removed `@lados/contractor-pack` from `transpilePackages` (the only web-side reference to any of these packs; it was a `transpilePackages` list entry, not an actual import, but would have broken the Next.js build once the package no longer resolves).
- `apps/api/test/pack-manifests.spec.ts` — deleted. Its sole purpose was validating these 9 packs' manifests; retired along with them.
- Moved all 10 package directories from `packs/<name>` to `archived/packs/<name>` (new top-level `archived/` folder, sibling to `packs/`, `apps/`, `packages/`). `pnpm-workspace.yaml`'s globs (`packs/*`, `packs/official/*`) don't reach `archived/`, so none of the 10 are workspace members anymore — not built, not typechecked, not importable as `@lados/<name>`. Source is fully preserved on disk, untouched otherwise.
- Re-grepped the whole repo afterward for `@lados/(core-pack|foundation-pack|qs-pack|document-pack|procurement-pack|contractor-pack|construction-pack|finance-pack|notifications-pack|ai-pack)` across `.ts/.tsx/.json/.mjs` — zero remaining references outside `archived/packs/` itself and a few now-updated comments (`approval-task.creator.ts`, `operations/page.tsx`, `jobs/page.tsx` — all three were already-deprecated/redirect routes, comments only, no live imports).
- **`supabase/migrations/0065_delete_legacy_prototype_packs.sql`** (NEW, drafted, not yet applied) — `DELETE FROM packs WHERE installed_from = 'startup-sync'`, superseding 0063's soft-archive with a real delete. Cascades automatically clean up the 10 packs' `registered_nodes` and any `pack_node_overrides` rows (confirmed FK `ON DELETE CASCADE` on both, no other table references `packs.id`). Confirmed zero workflows/templates reference these node types (0064 already handled that). Safe no-op on any environment without these rows.

🔧 Ad-hoc outstanding:
- Migration 0065 is drafted but **not applied** — per the standing division of labor, eff applies it to Supabase.
- Full build/test verification loop not yet re-run after this round of edits — needed before eff applies 0065, since `apps/api`/`apps/web` no longer declare these 9 packages as dependencies.

➡️ Next:
- eff: `pnpm install` (regenerates the lockfile now that 9 workspace deps were dropped from `apps/api/package.json`), then the usual loop — `pnpm build:packages` → `pnpm build:packs` → `pnpm typecheck` → `pnpm --filter api test` → `pnpm --filter web typecheck` → `pnpm validate:official-packs`.
- eff: once green, apply migrations `0065_delete_legacy_prototype_packs.sql` and `0066_delete_demo_pack.sql` in Supabase (see (10) below for 0066).
- eff: refresh `/packs` and `/marketplace` and confirm the 10 prototype packs are gone entirely (not just shown as "Disabled").
- Continue closing the finance/procurement/etc. chaining-audit gap before S8 ships templates from those packs.

### 2026-07-04 (10) - Demo pack removal drafted

eff asked to remove `demo.lados-demo-pack` too. Unlike the 9 prototype packs, this one was never a compiled workspace package — it's a marketplace/registry-installed pack (`installed_from='registry'`, 1 node `demo.lados_demo_pack.echo_context`, 0 workflows reference it, no code anywhere resolves or imports it). Pure DB cleanup, no code/archival changes needed. `supabase/migrations/0066_delete_demo_pack.sql` (NEW, drafted, not yet applied) deletes both the `packs` row (cascades to `registered_nodes`/`pack_node_overrides`, same FK pattern confirmed in 0065) and its `registry_packs` listing row (confirmed via live query: no FK references `registry_packs.id`), so it's gone from both `/packs` and the marketplace browse tab, not just uninstalled.

### 2026-07-04 (11) - Main (group-level) I/O port handles built on canvas nodes

eff asked for a discussion, then to build: a main input/output dot at the top-left/top-right of every canvas node (group-level, connects to/from "the whole node"), in addition to the existing individual per-port dots, so a wire can be dragged from either the main dot or a specific named port.

Backend readiness check (done before writing any UI code): `WorkflowConnection` is already just `{sourcePortId, targetPortId}` — any string. `packages/execution-engine/src/runner.ts`'s `_resolveInputs()` (written during the S9 chaining fix, (5) below) already special-cases exactly this: any binding where `sourcePortId === 'out'` or `targetPortId === 'in'` skips the precise port-to-port remap and relies solely on the unconditional flat-merge of every upstream node's output — i.e. "receive/send everything", which is precisely what a group-level connector should mean. This was originally built for backward compatibility with old generic-id connections, but it's the identical semantic a "main port" needs — so **no runner, graph-planner, or schema change was needed**, only canvas UI work.

✅ Completed — `apps/web/src/components/canvas/WorkflowCanvas.tsx`'s `SkillNode`:
- Added `renderMainHandle(side)`: an always-rendered `Handle` per side, `id: 'in'`/`'out'`, positioned fixed near the top of the card (not scaling with the port list like the per-row dots), styled as a hollow ring (white fill, border colored to the node's accent color) so it visually reads as "the whole node" rather than one more named port.
- Removed the old synthetic single-port fallback (`inputHandles = inputs.length > 0 ? inputs : [{id:'in',...}]`) and the invisible 1×1 `renderLegacyCompatibilityHandle` it fed — both are now fully superseded by the always-present main handle. Per-port row handles (`renderPortHandle`) now iterate the real declared `inputs`/`outputs` arrays directly, with no synthetic substitute.
- Confirmed via grep of every `packs/official/*` manifest that no real declared port anywhere uses the literal id `in`/`out`, so there's no id collision between a node's real ports and its new main handle.
- Verified (no code change needed) that `isValidConnection`/`computeValidation`'s port-type lookups fall through to `undefined` for the main handle's id (since it's absent from `portTypeMap`/the node's declared port list), and `isPortCompatible(undefined, x)` already returns `true` unconditionally — so the main dot can always connect, to anything, with no type-mismatch false rejections. Duplicate-edge detection is keyed by `(node, handle)` pairs, so a main-dot connection and a specific-port connection between the same two nodes coexist without being flagged as duplicates.
- Existing saved edges (every pre-Phase-20 prototype workflow, which only ever used the generic `in`/`out` placeholder) still resolve correctly — same node id, same handle id, only the handle's on-screen position/style changed (from vertically-centered-and-invisible to top-anchored-and-visible). Zero data migration needed.

🔧 Known minor side-effect (not fixed, low priority): `computeValidation`'s "`<node>` has no outputs/inputs" warning is keyed off the real declared-port count, not the new main handle's existence — a node with 0 declared outputs will still show that warning even if a user has wired its main output dot to something. This is arguably still useful information (no granular typed output exists), just slightly stale wording now that the main dot makes every node connectable regardless. Not addressed this pass.

➡️ Next:
- eff: `pnpm --filter web typecheck` then open any workflow on the canvas and confirm: every node shows a visible ring-style dot at the top-left and top-right (in addition to its named per-port dots), dragging from/to it creates a connection, and existing saved workflows still render their old edges correctly (now anchored to the top of the card instead of vertically centered).

### 2026-07-04 (12) - core.start/core.end 404 fixed + full core-pack/foundation-pack coverage audit

eff hit `GET /nodes/core.start` / `GET /nodes/core.end` 404s clicking those nodes on canvas after (8)'s core-pack removal, then asked for a full audit: does the new official L0 (Foundation, 3 packs / 19 nodes: workflow-foundation 7, human-work 4, resource-operations 8) actually cover everything the old "basic" packs (core-pack, foundation-pack) provided?

✅ 404 root cause + fix:
- `packages/workflow-json/src/builder.ts`'s `WorkflowBuilder.blank()` (called by `WorkflowService.create()` for every new workflow — "Create a blank workflow (Start → End)") hardcoded `core.start`/`core.end` as the default two nodes.
- Checked `archived/packs/core-pack/src/index.ts`'s `resolveNode()` and `manifests.ts`'s `nodeManifests` array: **neither `core.start` nor `core.end` was ever a real node** — they had no manifest declaration and no executor even when core-pack was active. They were phantom types the blank-workflow scaffold referenced but nothing ever backed — a pre-existing bug, not something the removal introduced (removing core-pack only surfaced it, by making `GET /nodes/:type` 404 instead of whatever it silently did before).
- Fixed: `blank()` now seeds real official nodes — `lados.workflow.trigger_manual` for Start (genuine direct successor: "start a workflow from a manual operator action") and `lados.workflow.write_log` for End (closest real terminus marker, given a working default config so it's usable immediately, no perfect "End" equivalent exists since the official model doesn't need an explicit end marker).
- One already-existing workflow (id `c7b41545-...`, name "a" — eff's own test workflow) still has the old phantom types baked into its saved `definition` JSON from before the fix; not repaired (a live data write, out of scope for a code fix) — eff can just delete + re-add those two nodes on canvas.

✅ Full coverage audit (core-pack's 19 node manifests + foundation-pack's 3, cross-checked against every `packs/official/*/nodes.json`'s `compatibilityAliases` field, not just the central `packages/@lados/pack-sdk/src/compatibility-aliases.ts` registry — the central file turned out to be incomplete/stale relative to individual nodes.json declarations, e.g. `core.parallel`/`core.merge`/`core.delay`/`core.cron_trigger` are all real, working aliases declared only in `lados-workflow-foundation/nodes.json`, not mirrored centrally):

**Covered (19 of 22 total):** `core.logger`→`lados.workflow.write_log`, `core.cron_trigger`→`lados.workflow.trigger_schedule`, `core.human_approval`→`lados.human.request_approval`, `core.condition`→`lados.workflow.condition`, `artifact.write`→`lados.artifact.write`, `artifact.read`→`lados.artifact.read`, `project.save_artifact`/`project.read_artifact`→ same two (merge), `resource.create/read/update/list/transition`→`lados.resource.*` (resource-operations pack), `state.change`→`lados.resource.transition` (aliased), `core.parallel/merge/delay`→`lados.workflow.parallel/merge/delay`, `foundation.send_notification`→`lados.communication.send_in_app`, `foundation.request_approval`→`lados.human.request_approval`.

**Genuine gaps found (3, none fixed this pass):**
1. **`core.loop`** (iterate an array, collect results) — no successor anywhere in any official pack. Grepped every `packs/official/*/nodes.json` for loop/iterate/foreach — nothing. A workflow needing to process each line of a BOQ, each invoice, etc. one-by-one currently has no official node for it.
2. **`event.publish`** — no successor. `lados.workflow-foundation`'s own `manifest.json` *declares* the capability `"workflow.event.publish"` in its capabilities list, but its `nodes` array has no node implementing it — the exact same "capability declared, no node built" pattern already known and left open in Wave 3/4 packs (see (S5)/(S6) above), just not previously noticed in L0 itself.
3. **`foundation.assign_user`** (assign a user to any resource) — partial gap. `lados.task-case`'s `lados.task.create` has an "assignee" config field, so assignment-as-part-of-task-creation works, but there's no standalone "assign user to arbitrary resource" node the way the prototype one was generic. Composable via `lados.resource.update`'s field-mapping, just not a dedicated node.

🔧 Ad-hoc outstanding:
- None of the 3 gaps above are fixed — flagging for eff's prioritization decision before assuming L0 is at full parity.
- The central `compatibility-aliases.ts` registry should eventually be reconciled with what's actually declared per-node (documentation debt, not a functional gap) — not done this pass.

➡️ Next:
- eff: decide whether/when to build `core.loop`'s successor, `event.publish`'s missing node, and a dedicated generic assign-user node — none are blocking today (0 live workflows use any of them), but worth scoping before a real customer workflow needs one.

### 2026-07-04 (13) - All 3 audit gaps from (12) closed: lados.workflow.loop, lados.workflow.publish_event, lados.resource.assign

eff's follow-up, verbatim: "build the three missing nodes now. Bismillah..." — closing all 3 gaps identified in (12) rather than deferring.

✅ Completed:
- **`lados.workflow.loop`** (`packs/official/lados-workflow-foundation/src/nodes/loop.ts`) — direct successor to prototype `core.loop`, same lookup order (upstream output by `items_key` → `items` input → named-key input → `config.items`) and same outputs (`results`/`count`/`first`/`last`), including `extract_key` sub-field mapping. Closes the `workflow.control.loop` capability, which the pack's own `manifest.json` had declared since S2 with no backing node.
- **`lados.workflow.publish_event`** (`packs/official/lados-workflow-foundation/src/nodes/publish-event.ts`) — direct successor to prototype `event.publish`. Needs an injected `IEventBusService` (structurally satisfied by the real `EventBusService.publish()`) — the only node in this pack requiring a service. Closes the `workflow.event.publish` capability gap flagged in (12) (declared in `manifest.json` since S2, never backed by a node). `resolveNode()` in this pack's `index.ts` now takes an optional `WorkflowFoundationServices` param (`{ eventBusService }`); every other node in the pack is unaffected and still resolves with zero args, same as before.
- **`lados.resource.assign`** (`packs/official/lados-resource-operations/src/nodes/assign-resource.ts`) — successor to prototype `foundation.assign_user`, but generic across any Workspace Resource type (the prototype was foundation-pack-specific). Writes `assignee`/`assigneeRole` into the resource's `data` via the same `IUpdateResourceService.updateResource()` call `lados.resource.update` uses — added as a new `resource.assign` capability (not previously declared, since no gap existed in the *capability* list — the gap was "no dedicated node at all"). `resolveNode()`'s new `assignService` param falls back to `updateService` if not separately provided, so wiring only needs one line in `real-nodes/index.ts` (reuses `resourceService`).
- **Wiring**: `apps/api/src/execution/real-nodes/index.ts` now passes `{ eventBusService }` into `officialWorkflowFoundationResolve()` (previously called with no args) and `assignService: resourceService` into `officialResourceOperationsResolve()`.
- **Manifests updated** (both packs): `nodes.json` gained one entry each; `lados-workflow-foundation/manifest.json`'s `nodes` array grew from 7 to 9 (capabilities count unchanged at 10 — `workflow.trigger.event` remains the one intentional capability-only exception, documented inline in the manifest's `verification.manifest` note: event-triggered workflow starts are handled by `EventBusService`'s subscription dispatch, not by a runnable node, so a placeholder node would have no real behavior); `lados-resource-operations/manifest.json` gained a new `resource.assign` capability, growing both `capabilities` and `nodes` from 8 to 9 (still 1:1).
- **`packages/@lados/pack-sdk/src/compatibility-aliases.ts`** — added the 3 missing alias entries (`core.loop`, `event.publish`, `foundation.assign_user`) pointing at their new official successors, closing the staleness this file already had flagged against it in (12).
- **Tests**: extended `apps/api/test/official-workflow-foundation.spec.ts` (loop: array-from-input, extract_key mapping, upstream lookup, LOOP_NO_ARRAY failure; publish_event: NO_SERVICE, successful publish assertion on the fake `IEventBusService.publish` call args, MISSING_INPUT, and the "published:false but not thrown" null-return path) and `apps/api/test/official-resource-operations.spec.ts` (assign: NO_SERVICE, successful assign with exact `updateResource` call-arg assertion, fallback-to-shared-`updateService` path, MISSING_INPUT for both `resourceId` and `userId`). Both packs' "N nodes for N capabilities" contract tests updated to the new counts (9/9 workflow-foundation with the one documented exception on the raw capability count vs. node count staying at 9-of-10; 9/9 resource-operations, fully 1:1).

🔧 Ad-hoc outstanding:
- Full `pnpm build:packages` → `pnpm build:packs` → `pnpm typecheck` → `pnpm --filter api test` → `pnpm --filter web typecheck` → `pnpm validate:official-packs` loop not yet re-run since these edits — needed before considering this closed.
- `workflow.trigger.event` remains capability-only by design (see manifest note above) — not a new gap, just carried forward from (12)'s audit and now explicitly documented instead of silently present.
- The finance/procurement/etc. pack-chaining audit gap from (5) is still open and unrelated to this entry.

➡️ Next:
- eff: run the full build/typecheck/test loop above.
- eff: confirm the 3 new node types (`lados.workflow.loop`, `lados.workflow.publish_event`, `lados.resource.assign`) appear in the palette under Workflow Foundation / Resource Operations respectively, and are drag-connectable on canvas.
- Continue closing the finance/procurement/etc. chaining-audit gap before S8 ships templates from those packs.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)

### 2026-07-05 (14) - Build confirmed green; 4 UI bugs/gaps found + fixed (packs page, 429 throttle, Resources tabs, topbar user)

eff confirmed the full `pnpm build:packages → build:packs → typecheck → --filter api test → --filter web typecheck → validate:official-packs` loop is green after (13)'s three new nodes, then reported four UI issues in one message. AskUserQuestion failed mid-investigation (tool error), so scope decisions below were made using the most-complete/most-honest option rather than the quick-patch alternative, flagged here for eff to redirect if wrong.

✅ 1. **Packs page (`/packs`) mixed 0-node bundle packs in with real Capability Packs.** Added layer-based tabs — Capability Packs (L0-L2) / Solutions (L3) / Templates (L5) — mirroring Marketplace's tab pattern, each with a tile/table view toggle mirroring `/resources`'s existing pattern (localStorage-persisted, key `lados_packs_view`). Required adding `layer` to `PackRegistryService.getAll()`'s select (previously only `/nodes` had it, per S7.1 — `/packs` never did).

✅ 2. **`GET /packs/:id/health` 429 (Too Many Requests) on pack detail pages.** Root cause: `/packs`'s list page fired one health request per enabled pack in parallel on every mount (~21 today, doubled by React StrictMode's dev double-effect) against a global 120 req/min-per-IP throttle (`app.module.ts`, PD-3) — the burst consumed enough quota that the next page's own single health call 429'd. Fixed with a new bulk endpoint: `PackInstallerService.getAllPackHealth()` + `GET /packs/health` (registered before `:id` like `resource-views`), computed server-side with no HTTP round-trips between packs. `/packs` now calls this once instead of N times.

✅ 3. **`/resources` page lost all its type tabs (vehicle, trip, driver, job, invoice, payment, expense, payroll_run, etc.) after migration 0065 removed the legacy prototype packs.** This was a real regression, not a rename request as first framed: `PackInstallerService.getResourceViews()` (backs `GET /packs/resource-views`, which `/resources` calls to build its tabs) only ever read `MANIFEST_MAP` — the compiled-in prototype-pack registry, emptied to `{}` in (8). No official pack had ever declared an equivalent, so once contractor-pack was gone, nothing declared view configs for any resource type at all — the underlying `resources` rows were untouched (0064 only deleted workflows/templates), so `?type=vehicle` links still "worked" but rendered with no icon/labels/inline actions. Fixed by giving official packs the same declaration point: `OfficialCapabilityPackManifest` gained an optional `resourceViews?: PackResourceDefinition[]` field (reuses the exact prototype-pack shape), persisted to a new `packs.resource_views` jsonb column (migration `0067_packs_resource_views.sql`) by `OfficialPackLoaderService`, and read back by `getResourceViews()` alongside (now-permanently-empty) `MANIFEST_MAP`. Ported the old contractor-pack table faithfully into 3 official packs' `manifest.json` (job/trip/fuel_receipt/customer/vehicle/driver/equipment/operator/maintenance_record → `lados.asset-fleet`; invoice/payment → `lados.commercial-finance`; expense/payroll_run → `lados.people-payroll`), swapping every inline action's `node` field from the old prototype type to its new official successor (per the compatibility alias map) — `state.change` actions were left as-is since that's a special sentinel the frontend handles directly, not a resolved node type. **One honest gap found and left unfixed:** the old Job card's "Generate Invoice" action (`contractor.generate_invoice`) has no official successor anywhere — omitted from the new `lados.asset-fleet` resourceViews entry rather than mapping it to something wrong; flagging for eff same as the loop/event.publish/assign_user gaps in (12).

✅ 4. **No indication of who's logged in.** Added the user's display name (falls back to email) to the sidebar near Notifications/Sign out, fetched once via `supabase.auth.getUser()` in `(app)/layout.tsx`.

ℹ️ 5. **Explained, no code change:** Platform Services (`/settings/services`) is a read-only status board over `GET /services` (migration 0015) — lists V3 Core Services (not workflow nodes) with an `active`/`stub`/`not_built` badge per service, e.g. OCR Service is `not_built` because no PDF/image OCR dependency exists yet and `lados.document.read_pdf`'s manifest already says as much.

🔧 Ad-hoc outstanding:
- Not yet re-verified by eff: this entire batch (migration 0067, 3 manifest.json edits, pack-sdk type/validator changes, 2 new API routes, 1 rewritten frontend page, layout.tsx edit) needs the full build/typecheck/test loop, migration 0067 applied, and a visual check that `/resources` tabs reappear and `/packs` tabs/table render correctly.
- `contractor.generate_invoice`'s missing official successor (found in item 3) is a new, small, standalone gap — not blocking, not fixed.
- Migrations `0065`/`0066` (delete legacy packs / demo pack) status unconfirmed this pass — assumed still pending apply from (8)/(10) unless eff has since applied them.

➡️ Next:
- eff: `pnpm install` → `pnpm build:packages` → `pnpm build:packs` → `pnpm typecheck` → `pnpm --filter api test` → `pnpm --filter web typecheck` → `pnpm validate:official-packs`.
- eff: apply migration `0067_packs_resource_views.sql`, then `/packs/sync` (or restart the API) so `lados.asset-fleet`/`lados.commercial-finance`/`lados.people-payroll`'s new `resourceViews` get persisted.
- eff: visually confirm `/resources?type=vehicle` (and trip/driver/job/invoice/payment/expense/payroll_run) show tabs/icons/inline actions again, `/packs` shows the 3 new tabs with tile/table toggle, and the sidebar shows the logged-in user's name/email.
- Decide whether to build a successor for `contractor.generate_invoice` (new gap, item 3).

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)

### 2026-07-05 (15) - Platform Services reconciled, Marketplace tile/table toggle, hydration-mismatch fix, Resources renamed to Assets

eff reported 5 more items in one message: (1) confirm build green, (2) reconcile Platform Services to current reality — some rows still referenced "QS-OS" branding and prototype-era node names, (3) Marketplace needs the same tile/table view toggle as `/packs`/`/resources`, (4) a React hydration-mismatch warning on refreshing `/resources` (`Prop className did not match` on the view-toggle button), (5) sidebar still says "Resources" — eff's own framing is "it is the asset of the organization."

✅ 2. **Platform Services (`core_services`) reconciliation.** Read the original seed (migration `0015`, Sprint 14) against the current codebase. Confirmed via `apps/api/src/execution/real-nodes/index.ts`'s resolver wiring exactly which NestJS services back which official nodes today. New migration `0068_core_services_reconcile.sql`:
  - Corrected 6 existing rows whose descriptions still named prototype-era nodes or "QS-OS": `ai-service` (now correctly says it only powers `lados.asset_fleet.extract_fuel_receipt` — qs-commercial's classify/split nodes are deterministic, not AI-backed), `document-service` (now names the real `lados.document.*` nodes), `notification-service` (status flipped stub→active; description narrowed to in-app-only now that Email/SMS are separate services), `ocr-service` and `geometry-service` (removed fake node references, kept honestly `not_built`), `billing-service` (QS-OS → Lados Marketplace).
  - Added 13 rows for services that now genuinely exist but were never registered: Event Bus, Resource, State Engine, Approval Task, Artifact, Email, SMS, Execution Queue, Scheduler, Knowledge Packs, Security Engine, Resource Bindings, and Library services — each verified to exist as a real file/class before being added (no invented services).
  - Added a curated `metadata.usedByPacks`/`usedByNodes` field per row (the "more information ... for reference" eff asked for), since `registered_nodes.uses_services` is confirmed still unpopulated by the official pack loader. `ServicesService.findAll()` now selects `metadata`; `/settings/services` renders it as "Used by:" pack-id chips under each service's description.

✅ 3. **Marketplace tile/table view toggle.** Added the same `ViewToggle` pattern used on `/packs`/`/resources` (localStorage key `lados_marketplace_view`) to the Installed, Browse Capability Packs, and Knowledge Packs tabs — each already had a tile/grid view; added a parallel compact table view (`InstalledPackTable`/`RegistryPackTable`/`DataPackTable`) reusing the same data and action handlers. Publish/Review tabs are single-purpose forms, not lists, so no toggle there.

✅ 4. **Hydration-mismatch fix.** Root cause: `viewMode`'s `useState` initializer read `localStorage` directly (`() => typeof window !== 'undefined' ? localStorage.getItem(...) : 'tile'`), which returns a different value during SSR (no `window`) than on the client's first render — React then warns because the server HTML and the client's first-hydration HTML disagree on the toggle button's classes. Fixed in both `/resources` and `/packs` (the latter had the identical bug, introduced in (14)) by initializing `viewMode` with a plain `'tile'` default on both renders, then reading `localStorage` inside a `useEffect` (client-only, post-hydration) and calling `setViewMode` there if a stored preference exists. Built the new Marketplace toggle (item 3) with this corrected pattern from the start.

✅ 5. **Sidebar "Resources" → "Assets".** Changed only the `label` in `(app)/layout.tsx`'s `NAV` array and the page's own H1 in `resources/page.tsx` — kept `href: '/resources'`, the route folder, and all internal identifiers unchanged (same technical-identifier-compatibility rule as the S7.5 Data→Knowledge Packs rename), so no links break.

ℹ️ 1. Build-green confirmation carried forward from (14) — no new build changes in this batch beyond what's listed above; still needs a fresh loop run given the new migration and page edits.

🔧 Ad-hoc outstanding:
- Migration `0068_core_services_reconcile.sql` drafted, **not applied** — eff to apply via Supabase.
- Migration `0067_packs_resource_views.sql` (from (14)) — confirm whether eff has applied this yet; `0068` has no dependency on it either way.
- `state-engine-service`, `security-engine-service`, `resource-bindings-service`, `execution-queue-service`, and `scheduler-service` rows have `usedByPacks: []` (empty) — they're real and active but not wired into any single pack's per-node resolver (invoked internally by the workflow runner/queue, not by `buildRealNodeResolver`'s pack list) — this is accurate, not a gap, but flagging so it isn't mistaken for missing data.
- Table view for Marketplace's Knowledge Packs tab reuses one `DataPackTable` component for both the "Installed" and "Browse Official" sections — intentional reuse, not a missed distinction.

➡️ Next:
- eff: `pnpm install` → `pnpm build:packages` → `pnpm build:packs` → `pnpm typecheck` → `pnpm --filter api test` → `pnpm --filter web typecheck` → `pnpm validate:official-packs`.
- eff: apply migration `0068_core_services_reconcile.sql` (and `0067` if not already applied).
- eff: visually confirm `/settings/services` shows the corrected descriptions/statuses and "Used by:" chips, Marketplace's 3 list tabs show a working tile/table toggle, refreshing `/resources` no longer logs a hydration warning, and the sidebar/page now say "Assets".

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)

### 2026-07-04 (9) - Pack health "Broken" badge + pack icon display bugs found + fixed

eff reported two `/packs` UI issues while reviewing after (8): (1) several official packs show a red "✕ Broken" health badge (e.g. `lados.template.cipaa-preparation`), and (2) the pack detail page renders the raw icon field text ("Scale") instead of an icon/emoji, while the pack list page shows the generic 📦 for the same pack.

✅ Root causes found and fixed:
- **Health badge**: `PackInstallerService.getPackHealthByPrefix()` (backs `GET /packs/:id/health`, called by both `/packs` and `/packs/:id`) treated `nodes.length === 0` as unconditionally `'broken'`. Confirmed via live query that 7 official packs genuinely have 0 registered nodes by design — the 2 L3 Solution packs (`lados.solution.contractor-ops`, `lados.solution.qs-practice`) and 5 L5 Template packs (`lados.template.cipaa-preparation`/`defect-management`/`invoice-approval`/`procurement-rfq`/`progress-claim`) are bundle/composition packs, not node-providing packs — they were never supposed to register node types. **Fixed**: 0 registered nodes now maps to `'healthy'` (vacuously — nothing registered means nothing can fail to resolve), not `'broken'`. `PackRegistryService.getPackHealth()` has the identical bug pattern but is currently unused (no call sites) — left as-is, flagged here in case it's wired up later.
- **Icon display**: official Phase 21 pack/node manifests store the real PascalCase `lucide-react` component export name (e.g. `"Scale"`, `"HardHat"`, `"Workflow"`) — a different convention from the prototype packs' lowercase-kebab strings (e.g. `"hard-hat"`). `apps/web/src/lib/icon-map.ts`'s `resolveIcon()` → `isLucideName()` regex (`/^[a-z0-9-]+$/`) only matched all-lowercase names, so PascalCase values failed the test and were assumed to "already be an emoji" and echoed back as literal text — that's the raw `"Scale"` on the detail page. Separately, `apps/web/src/app/(app)/packs/page.tsx` had its own **local, incomplete duplicate** of `PACK_EMOJI`/`LUCIDE_TO_EMOJI` (only ~10 keys, all lowercase-kebab, no import from `@/lib/icon-map`) — which is why the list page showed 📦 instead of the same wrong text: its lookup missed too, but its fallback silently swallowed the miss instead of echoing raw text. **Fixed**: widened `isLucideName()` to accept PascalCase (`/^[A-Za-z][A-Za-z0-9-]*$/`), added the ~21 PascalCase icon names actually in use (`Scale`, `HardHat`, `Workflow`, `Ruler`, `Truck`, `Database`, `ShoppingCart`, `Clapperboard`, etc.) to the shared `LUCIDE_TO_EMOJI` map, and removed `packs/page.tsx`'s duplicate local maps entirely in favor of importing the shared `resolveIcon`/`PACK_EMOJI` from `@/lib/icon-map` — the two pages can no longer drift out of sync since there's now only one map.

🔧 Ad-hoc outstanding:
- None of these were DB/migration changes — pure code fixes, ready for eff's next `pnpm --filter web typecheck` + `pnpm --filter api typecheck` pass (bundled with the (8) verification loop, not a separate run).

➡️ Next:
- eff: include this in the same build/verification pass as (8) — no new migration, no new dependency.
- eff: refresh `/packs` and `/packs/lados.template.cipaa-preparation` and confirm: health badge now reads Healthy (or a sensible non-broken state) for the 7 zero-node bundle/template packs, and the icon renders as an emoji (⚖️ for CIPAA Preparation Templates) consistently on both the list and detail pages.

### 2026-07-04 (5) - Execution engine chaining bug found + fixed (blocking gap for S8, pulled forward)

Context: eff asked to (1) clean up prototype packs/nodes/workflows across every org, starting with (2) building one simple real workflow using official nodes. Before building anything, pulled real counts from Supabase: 2 orgs, 7 workflows total (6 draft + 1 published), and **every single one of them uses only legacy prototype node types** — zero existing workflows use any `lados.*` official node. Also found the `is_official` column is unreliable (10 legacy prototype packs are mismarked `is_official:true` — a pre-Phase-21 labeling meaning collision; `installed_from` is the real signal: `'startup-sync'` = legacy prototype, `'official-skeleton-sync'` = genuine Phase 21 official).

While designing the "one simple workflow," found a systemic, program-wide bug blocking it — eff chose to fix this before anything else.

✅ Completed:
- **Root cause:** `packages/execution-engine/src/graph-planner.ts`'s `buildAdjacency()` discarded `sourcePortId`/`targetPortId` from every connection, keeping only node-level `dependsOn: string[]`. `runner.ts`'s `_resolveInputs()` then blindly `Object.assign`'d **every key** of **every** upstream dependency's entire output object into the next node's `ctx.inputs`, regardless of which port was actually wired. Port declarations in `nodes.json` and on the canvas were purely decorative — never used to remap or rename anything at runtime. This has been true since S1; every wave's own "E2E test" is a hand-chained proxy (manually calling executor functions with reshaped data), never a real graph run through the actual Runner — which is exactly why this went unnoticed for 4+ waves.
- **Concrete proof of impact:** `lados.qs.read_boq` outputs a key called `boq` (`{items, source, boqId?}`); `lados.qs.normalize_boq` reads `ctx.inputs['items']` expecting a bare array. Wiring them on a real canvas would silently produce zero normalized rows — no error, `status:'success'`, 0 items processed. Same shape mismatch repeats `normalize_boq -> classify_trade`. `classify_trade -> split_work_packages` is a pure key-name mismatch (`classified` vs `items`) with no wrapping issue.
- **Fix (generic, systemic):** added `InputBinding[]` to `ExecutionStep` (`packages/execution-engine/src/types.ts`); `graph-planner.ts` now builds real per-connection `{sourceNodeId, sourcePortId, targetPortId}` bindings per step. `runner.ts`'s `_resolveInputs()` now layers a port-aware overlay on top of the legacy flat merge: for any connection carrying a **real** port id (not the generic `'out'`/`'in'` placeholder the frontend defaults to for connections/edges saved before real port ids existed — see `normalizeDefinition()` in `WorkflowCanvas.tsx`/`ExplorerTemplatesTab.tsx`), it extracts the exact upstream value at that specific source port and places it under the target port's key. The legacy flat merge runs unconditionally first and is untouched — **every existing prototype workflow's connections use the generic `'out'`/`'in'` placeholder today, so this is a pure additive overlay with zero behavior change for any of the 7 existing seed workflows.**
- **Fix (targeted, qs-commercial):** port-aware remapping alone doesn't solve the *wrapping* mismatch (a renamed key still holds the wrong-shaped value). Added `resolveItemsInput()` to `normalize-boq.ts` and `classify-trade.ts` — accepts either a bare array or an object with an `.items` array, covering both the legacy-merge case (gets the wrapper object) and future real-port-wired case. `split_work_packages` needed no change — `classify_trade`'s output is already a bare array, so the port-rename alone fixes that pair.
- **New test:** `apps/api/test/execution-runner-real-chain.spec.ts` — the first test in the entire program that builds a genuine `QSWorkflowDefinition` (real nodes + real port-id connections) and runs it through the actual `runWorkflow()`/`WorkflowRunner`, not a proxy. Asserts the full `read_boq -> normalize_boq -> classify_trade -> split_work_packages` chain produces correct, non-empty, correctly-shaped results end-to-end. A second test documents the legacy-placeholder fallback path explicitly (proves it degrades safely to `[]` rather than crashing, matching every existing prototype workflow's actual behavior).
- **Partial audit of other packs (bounded, not exhaustive):** spot-checked `lados-procurement`. `create_rfq -> issue_rfq` (both use key `rfq`) and `compare_quotations -> recommend_award` (both use key `comparison`) already chain correctly — no fix needed. `receive_quotation -> compare_quotations` doesn't chain 1:1 by design (compare needs multiple quotations at once; receive handles one submission at a time — intended to be resource-bound/config-driven, not a bug). `recommend_award -> generate_po_request` has a port-name mismatch (declared input port `award`, code reads `request`) but investigating further showed this is **not the same bug class** — `recommend_award`'s output (`recommendedSupplier`, `recommendedQuotationId`) doesn't even contain the fields `generate_po_request` needs (`supplier`, `amount`), so a key rename alone wouldn't make it chain; `generate_po_request` is correctly designed to be config/human-driven at that award decision boundary (a human reviews the recommendation, then supplies PO request details) rather than a pure auto-pipe — consistent with the project's human-decision-boundary discipline. Recommend cleaning up the port declaration name for clarity as a low-priority follow-up, not a functional fix.

🔧 Ad-hoc outstanding:
- **finance, contract-admin, communication, task-case, resource-operations, construction-operations, asset-fleet, and people-payroll packs have NOT been individually audited** for the same class of bug. This is a real, bounded gap — do not assume they're clean. Needed before S8 ships any template chaining nodes from those packs.
- The original ask (prototype archival across every org + one real official-node sample workflow) is still pending — this fix was pulled in ahead of it per eff's explicit "fix it now, before anything else" instruction. Now resuming.

➡️ Next:
- Design + build one official-node sample workflow (now genuinely provable end-to-end), then draft the prototype/workflow archival scripts.

Verification — eff ran locally, 2026-07-04: `pnpm install` → `pnpm build:packages` (9/9) → `pnpm build:packs` (23/23) → `pnpm typecheck` (34/34, clean first try) → `pnpm --filter api test` (**29 suites/346 passed/2 skipped**, including the new `execution-runner-real-chain.spec.ts` — confirms the port-aware fix actually moves data end-to-end, not just in theory) → `pnpm validate:official-packs` (20 packs, 75 nodes, 96 capabilities, 38 aliases — unchanged, as expected since no nodes were added) — **all green, no fixes needed.**

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` — flagged under §4 S3/S8 as a newly-discovered gap (see master plan for the exact note)

### 2026-07-04 (4) - S7 UI Alignment delivered

✅ Completed:
- **S7.1 Palette layer grouping:** `node.service.ts`'s `/nodes`+`/packs` selects now include `packs.layer` (migration `0056`) via a 2-tier select cascade (`runSelectCascade`, shared by `findAll`/`findOne`/`search`) that falls back to a bare-minimum select if `layer`/`uses_services`/`data_pack_deps`/`canvas_ux` aren't migrated yet on a given environment. `NodePalette.tsx` now groups nodes into `L0 · Foundation` / `L1 · Domain` / `L2 · Solution / Industry` / `Other Packs` layer sections (each with a node count), wrapping the existing per-pack grouping rather than replacing it.
- **S7.2 Canvas readability:** discovered every official node's manifest `canvasUx` block (`minWidth`/`minHeight`/`maxVisiblePortsPerSide`) was silently dropped end-to-end — never stored in `registered_nodes`, never read by the frontend, despite being declared on every node since S1. New migration `0061_registered_nodes_canvas_ux.sql` (nullable `canvas_ux jsonb`, zero behavior change for prototype nodes) + wired through `official-pack-loader.service.ts`'s upsert and `node.service.ts`'s select cascade. `WorkflowCanvas.tsx`'s `SkillNode` now sizes each card from `canvasUx` and caps the cosmetic port-label list at `maxVisiblePortsPerSide` with a "+N more — see inspector" note — never hides actual `Handle` connection points, only the label summary, so live edges are never visually broken.
- **S7.3 Manifest-driven inspector:** discovered `config_schema`/`ui_schema` were hardcoded to `[]`/`{}` for every official node since S2 (a stale code comment falsely claimed a future implementation wave would fill it in; none ever did) — PropertyPanel rendered "This skill has no configuration" for every official node regardless of executor status, meaning no field on any S2-S6.1 node could actually be configured from the canvas. Added `deriveConfigSchema()`/`humanizeFieldKey()` to `official-pack-loader.service.ts`: derives one generic `type:'string'` `ConfigField` per declared `configGroups` field key (an honest floor, not a fabricated richer widget type) and mirrors `configGroups` into `ui_schema.sections` so PropertyPanel still groups fields the way each manifest author organized them. New `apps/api/test/official-pack-loader-config-schema.spec.ts` (unit tests + an integration test iterating every real official node). **Known gap, deliberately not fixed:** the Bindings tab only appears for `type:'resource'` fields, which this generic derivation never produces, and some nodes use per-node dynamic binding-key names (e.g. qs-commercial's `bindingKey`/`boqResourceId`) — a universal synthetic "resourceId" field would be actively wrong for those nodes. Flagged as follow-up, not guessed at.
- **S7.4 Live node status via SSE:** new `useExecutionRunStream(runId)` hook (`apps/web/src/hooks/useExecutionRunStream.ts`) consumes `GET /runs/:runId/stream` (S3/D4) via `fetch()` + manual SSE-frame parsing rather than native `EventSource` — `SupabaseJwtGuard` only reads the `Authorization` header with no query-param fallback, and `EventSource` cannot set custom headers; adding a query-param-token bypass would be a backend security change outside this task's authority, so this reuses the existing Bearer-token auth instead. Dispatches `run.node_started`/`run.node_done` into `useExecutionStore`'s `nodeLogs`; `WorkflowCanvas.tsx` merges each log's `status` onto the matching node's `data.runStatus`, and `SkillNode` renders a status ring + corner badge (running/completed/failed/waiting/skipped). Purely additive alongside the existing `useExecutionRunMonitor` poll, which remains the terminal-status/log-fetch safety net. Wired into the workflow page (`useExecutionRunStream(activeRunId)` alongside the existing monitor call).
- **S7.5 Marketplace naming pass:** audited; 21A's Data Pack → Knowledge Pack rename (landed S0, 2026-07-03) was already fully intact across `marketplace/page.tsx`, `packs/page.tsx`, `DataPackBrowser.tsx`, `ExplorerPacksTab.tsx`, `PropertyPanel.tsx`. Found and fixed one miss: `ExplorerShell.tsx`'s Explorer tab strip still labeled the `datapacks` tab "Data"/"Data packs" even though the panel it opens already said "Knowledge Catalogue" — relabeled to "Knowledge"/"Knowledge Catalogue" (`datapacks` union-type id kept unchanged, per the technical-identifier compatibility rule). Tidied two stale code comments (non-user-visible). Confirmed the genuine `/suppliers` page (subcontractor/trade suppliers for RFQ/quotations — a real construction-domain feature) is unrelated to "Catalogue Provider" and was correctly left untouched. No premature Catalogue Provider/Provider Profile UI found or added — that data model stays deferred to S9A (21B) as planned; pack attribution today is an honest plain "by {author}" string.
- **S7.6 Explorer official packs/templates/KP search:** added a layer badge to `ExplorerPacksTab.tsx` alongside its existing "Official" badge, for parity with the palette. Confirmed `workflow_templates` has no `is_official` column and no official template exists yet — Official Templates is explicitly S8 scope, so no badge/filter was added for templates (would fabricate a distinction the data model doesn't support). Discovered the backend `/data-pack-items/search` (PD-4) already implements an `effectiveOn` (YYYY-MM-DD) filter but no UI control existed to set it — added a date input + Clear button to `DataPackBrowser.tsx`, wired to the existing param; no backend changes needed.

🔧 Ad-hoc outstanding:
- Migration `0061_registered_nodes_canvas_ux.sql` still needs to be applied by eff (via Supabase) — additive/nullable, no impact on prototype nodes either way.
- Two known, documented gaps deliberately not fixed this pass (see S7.3/S7.6 above): the resource-picker/Bindings-tab mapping for official nodes, and Official Templates (correctly S8 scope).
- **Two real bugs found on eff's first `pnpm typecheck` run, both in `node.service.ts`'s new `findAllPacks()`, both fixed:** (1) the original inline fallback (`let { data, error } = ...; if (error) ({ data, error } = ...)`) reassigned `data` from a narrower select (no `layer`) into a variable TS had inferred from the wider V3 select (with `layer`) — `TS2322`, "Property 'layer' is missing". Fixed by generalizing `runSelectCascade` to accept its own `selects` cascade array (default remains the node-select `SELECT_CASCADE`) and having `findAllPacks` pass a `PACKS_SELECT_CASCADE`, removing the inline duplicate fallback entirely. (2) The first fix over-corrected: explicitly parameterizing `runSelectCascade<PackRow[]>(...)` with a hand-written interface then failed a *different* way (`TS2322` again — Supabase's typed client, given a runtime `string` passed to `.select()`, falls back to its `GenericStringError` sentinel row type, which a hand-written `{id: string; ...}` interface isn't assignable from). Fixed by NOT passing an explicit type argument — same as `findAll`/`findOne`/`search` already do — and casting the loose result to `Record<string, any>[]` after the fact instead. Neither bug affected any other S7 file; both were isolated to this one new method.

➡️ Next:
- eff: apply migration `0061_registered_nodes_canvas_ux.sql`.
- eff: browser/visual sign-off per screen (palette layer grouping, canvas readability on the official pack set, live run-status colouring on a real run, Explorer tabs, effective-date KP search) — the one remaining S7 checklist item and the S7 gate itself.
- After sign-off: S8 (Official Templates + Full Platform E2E) per master plan sequencing.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 S7 checklist + gate

Verification — eff ran locally, 2026-07-04: `pnpm install` → `pnpm build:packs` (23/23) → `pnpm typecheck` — first run failed on `apps/api` (`TS2322` in `node.service.ts`'s new `findAllPacks()`), fixed, second run failed differently (`TS2322` again, same method, see Ad-hoc note above), fixed again, third run clean across all 34 workspace projects → `pnpm --filter api test` (**28 suites/344 passed/2 skipped** — the 2 skips are the `REDIS_URL`-gated real-Redis tests, by design; suite count up from 27 because `official-pack-loader-config-schema.spec.ts`, new this sprint, joined the run) → `pnpm --filter web typecheck` (clean) → `pnpm validate:official-packs` (20 packs, 75 nodes, 96 capabilities, 38 aliases — unchanged from S6.1, as expected since S7 was UI/API-plumbing only, no new nodes) — **all green.** Migration `0061_registered_nodes_canvas_ux.sql` still needs to be applied by eff; eff's browser/visual sign-off remains the one open S7 item and the S7 gate itself.

### 2026-07-04 (3) - S6.1 remaining Wave 4 official executors delivered (pulled forward from Phase 22)

✅ Completed:
- **`@lados/official-contract-admin`** (`lados.contract-admin`, L2, 5 nodes): `register_instruction`, `prepare_notice`, `track_notice_due_date`, `lookup_clause_reference`, `link_correspondence_evidence` — all `executorStatus:"implemented"`. **No skeleton parity gap** — first Wave 4 pack whose `nodes.json` already fully matched `manifest.json`'s 5 declared nodes from the start. New migration `0060_contract_admin_resource_types.sql` adds `contract_instruction`/`contract_notice` to the `lados_resources` type CHECK constraint. `lookup_clause_reference` is a deterministic keyword match, honestly NOT a real Knowledge Pack search integration (no such search infrastructure exists in this repo yet — same "no fabricated capability" discipline as S6's `classify_trade`) — returns an empty result flagged `NO_CLAUSE_SOURCE_SUPPLIED` rather than fabricating a match when no candidate clause list is supplied. `prepare_notice`/`track_notice_due_date` are always advisory (`aiBoundary:"requires_human_review"`) — neither drafts legally-binding notice text nor resolves a disputed date; both explicitly require human review.
- **`@lados/official-asset-fleet`** (`lados.asset-fleet`, L2, 7 nodes): `create_job`, `dispatch_trip`, `complete_trip`, `upload_fuel_receipt`, `extract_fuel_receipt`, `create_maintenance_record`, `clear_maintenance` — all `executorStatus:"implemented"`. No skeleton parity gap. Reuses `job`/`trip`/`fuel_receipt`/`maintenance_record` Workspace Resource types already permitted by migration `0032_phase9_contractor_edition.sql` — no new migration needed (this pack is the official successor to Contractor Edition's equivalent capabilities, per `compatibilityAliases` in `nodes.json`, e.g. `contractor.create_job`). `extract_fuel_receipt` reuses the real, already-integrated `AiService.isConfigured`/`runVision` (same capability contractor-pack's real `contractor.extract_fuel_data` node uses for this exact purpose) — honest reuse of existing infrastructure, not a new fabricated capability; falls back to a `confidence:0` advisory stub when AI isn't configured, and `approvedByHuman` is always `false` regardless (a human sets that only via a separate approval step). `clear_maintenance` enforces the `MISSING_HUMAN_DECISION` contract on `clearedBy` — never fabricates the clearing actor, same discipline as every approval/clearance node since S2's `lados.human.record_decision`.
- **`@lados/official-people-payroll`** (`lados.people-payroll`, L2, 3 nodes): `prepare_payroll_run`, `record_payroll_approval`, `record_expense_approval` — all `executorStatus:"implemented"`. No skeleton parity gap. Reuses `payroll_run` (migration `0034_phase9_contractor_edition_m3.sql`) and `expense` (migration `0032_phase9_contractor_edition.sql`) — no new migration needed. Both approval nodes enforce `MISSING_HUMAN_DECISION` on `approvedBy` — the system never approves payroll or expenses itself; `prepare_payroll_run` only prepares data (`advisory:true` on the resource), it never pays.
- **Wiring:** all 3 new `workspace:*` packages added to `apps/api/package.json`; `buildRealNodeResolver()` gained 3 new resolver entries, inserted right after Wave 4 (QS Commercial / Construction Operations) and before Foundation Pack, all backed by the existing `resourceService`/`aiService` params (`resourceService as any` cast, same pattern as every prior wave; `aiService` passed directly to `officialAssetFleetResolve` for `extract_fuel_receipt`, same as `contractorResolve` below it).
- **Tests:** `apps/api/test/official-contract-admin.spec.ts`, `official-asset-fleet.spec.ts`, `official-people-payroll.spec.ts` (manifest↔executor contract + per-node `MockNodeContext` coverage, including the `MISSING_HUMAN_DECISION` guardrail on `clear_maintenance`/`record_payroll_approval`/`record_expense_approval`, the never-fabricate-a-match guardrail on `lookup_clause_reference`, and the always-advisory/`approvedByHuman:false` guardrail on `extract_fuel_receipt` both with and without AI configured), plus `official-wave4-1-e2e.spec.ts` — a proxy chain across all 3 packs (`create_job → dispatch_trip → complete_trip` pausing on approval; `register_instruction → prepare_notice → track_notice_due_date → lookup_clause_reference` always advisory; `prepare_payroll_run → record_payroll_approval` blocked by `MISSING_HUMAN_DECISION` until a human actor is supplied).

🔧 Ad-hoc outstanding:
- This work was explicitly pulled forward from the master plan's original Phase 22 deferral, per eff's direct request ("Lets finish the remaining Wave 4 skeleton"). No master-plan gate template names these 3 packs together — `official-wave4-1-e2e.spec.ts` is a proxy, same approach as every prior wave's own gate proxy.
- One real bug found on eff's first `pnpm typecheck` run: `apps/api/src/execution/real-nodes/index.ts` passed a `readService` property to `officialContractAdminResolve({...})`, but `ContractAdminServices` only declares `createService`/`updateService` (contract-admin's nodes never need a read service) — `TS2561`. Fixed by removing the stray `readService` line. Re-run was clean. Learning from S5's `NodeExecutor` miss, all 3 packs' `src/index.ts` were still written correctly from the start (no repeat of that specific mistake) — this was a different, smaller wiring slip in the integration file, not the packs themselves.

➡️ Next:
- S7 (UI Alignment) per master plan sequencing, or the templates wave to give every wave's proxy E2E tests real workflow graphs to run against.
- Migration `0060_contract_admin_resource_types.sql` still needs to be applied by eff (via Supabase).

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 (remaining Wave 4 packs)

Verification — eff ran locally, 2026-07-04: `pnpm install` → `pnpm build:packs` (23/23) → `pnpm typecheck` — first run failed on `apps/api` (`TS2561`, see Ad-hoc note above), fixed, re-run clean across all 34 workspace projects → `pnpm --filter api test` (**27 suites/335 passed/2 skipped** — the 2 skips are the `REDIS_URL`-gated real-Redis tests, by design) → `pnpm validate:official-packs` (20 packs, 75 nodes, 96 capabilities, 38 aliases — node count unchanged from S6 since these 3 packs' nodes already existed as skeletons; S6.1 only flipped `executorStatus`) — **all green.** Migration `0060_contract_admin_resource_types.sql` **applied by eff, 2026-07-04.**

### 2026-07-04 (2) - S6 Wave 4 official executors delivered

✅ Completed:
- **`@lados/official-qs-commercial`** (`lados.qs-commercial`, L2, 7 nodes): `read_boq`, `normalize_boq`, `classify_trade`, `split_work_packages`, `value_variation`, `assess_progress_claim`, `reconcile_final_account` — all `executorStatus:"implemented"`. **Skeleton bug found+fixed:** `nodes.json` only defined 3 of the 7 nodes manifest.json's own `nodes` list declared (`normalize_boq`, `split_work_packages`, `value_variation`, `reconcile_final_account` were missing) — added all 4. Separately noted (not fixed, same class of deferral as S2's workflow-foundation): 5 further manifest **capabilities** (`qs.boq.generate_draft`, `qs.claim.submit`, `qs.claim.record_certification`, `qs.variation.submit`, `qs.variation.record_approval`) have no corresponding node in manifest.json's own `nodes` array either — a pre-existing, larger gap than a missing `nodes.json` entry; not invented since nothing specifies their design. `classify_trade`/`value_variation`/`assess_progress_claim`/`reconcile_final_account` are all deterministic rules-based advisory computations, deliberately NOT real AI/LLM calls (`classify_trade` uses a small built-in keyword→trade map, honestly limited, same discipline as S5's `compare_quotations`). `reconcile_final_account` is the "cost summary (advisory)" node named in the master-plan bullet and the S6 gate; `value_variation` is where "rate check against QS rate library" lives (rate lookup against a caller-supplied map, unresolved items flagged, never guessed). No new resource types needed — reuses `boq`/`progress_claim`/`variation` from migration `0041_construction_resources.sql`. `split_work_packages` and `reconcile_final_account` are deliberately stateless (no resource persisted).
- **`@lados/official-construction-operations`** (`lados.construction-operations`, L2, 6 nodes): `create_project`, `create_site_inspection`, `submit_inspection_report`, `log_defect`, `create_site_diary`, `run_handover_checklist` — all `executorStatus:"implemented"`. **Skeleton bug found+fixed:** `nodes.json` only defined 5 of the 6 declared nodes (`run_handover_checklist` was missing) — added it (the master-plan bullet itself only lists 5 items and doesn't mention handover checklist, but manifest.json's own `nodes` array already committed to 6 — fixed for internal pack consistency, same precedent as every prior wave's parity fix). New migration `0059_construction_site_diary_resource_type.sql` adds `site_diary` (construction_project/site_inspection/defect reuse migration 0041). `log_defect` deliberately does NOT run an automatic defect-classification engine — severity/category come directly from the caller, since the node's own intent doesn't ask for AI-assisted classification (unlike `classify_trade`, which explicitly does). `run_handover_checklist` is deliberately stateless (no resource persisted) and purely advisory — handover sign-off is always a separate human decision.
- **Remaining skeletons** (`lados-contract-admin`, `lados-asset-fleet`, `lados-people-payroll`): confirmed still manifest-only (`status:"skeleton"`, `runtimeStatus:"manifest_only"`), untouched — runtime deferred to Phase 22 per the master plan, no code changes made.
- **Wiring:** both new `workspace:*` packages added to `apps/api/package.json`; `buildRealNodeResolver()` gained 2 new resolver entries, inserted right after Wave 3 (Procurement) and before Foundation Pack, both backed by the existing `resourceService` param (`resourceService as any` cast, same pattern as every prior wave).
- **Tests:** `apps/api/test/official-qs-commercial.spec.ts`, `official-construction-operations.spec.ts` (manifest↔executor contract + per-node coverage, including the never-auto-certify guardrail on `submit_inspection_report`'s pause path and the always-advisory contract on every QS computation node), plus `official-wave4-e2e.spec.ts` — a proxy for the `qs_practice.boq_upload_to_cost_summary` gate (`read_boq → normalize_boq → classify_trade → split_work_packages → reconcile_final_account → human acceptance pause/resume`), a short Construction Operations chain (`create_project → create_site_inspection → submit_inspection_report`, pausing rather than certifying), and real-`DataPacksService` provenance-visibility assertions for `classify_trade`/`value_variation`'s KP ref config fields.

🔧 Ad-hoc outstanding:
- The master-plan S6 gate names a specific template (`qs_practice.boq_upload_to_cost_summary`) that doesn't exist as a real workflow graph yet — same situation as every prior wave's gate; `official-wave4-e2e.spec.ts` is a proxy. Revisit once the templates wave builds the real graph.
- Could not run the verification loop in the Claude sandbox this pass (bash mount truncation persists — see [[feedback_bash_mount_staleness]]). Learning from S5's `NodeExecutor` miss, both new packs' `src/index.ts` were written from the start using the correct local-type-alias pattern (verified by grep against every sibling pack's import list) — this paid off: **eff's build was clean on the first try, no fixes needed.**

➡️ Next:
- S7 (UI Alignment) per master plan sequencing, or the remaining Wave 4 skeleton packs (`contract-admin`, `asset-fleet`, `people-payroll`) if eff wants those pulled forward from Phase 22.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 S6 checklist

Verification — eff ran locally, 2026-07-04: `pnpm install` → `pnpm build:packs` (20/20) → `pnpm typecheck` (31/31) → `pnpm --filter api test` (**23 suites/280 passed/2 skipped** — the 2 skips are the `REDIS_URL`-gated real-Redis tests, by design) → `pnpm validate:official-packs` (20 packs, 75 nodes — up from 70 at S5, the 13 new Wave 4 nodes — 96 canonical capabilities, 38 compatibility aliases) — **all green, no fixes needed this time.** Migration `0059_construction_site_diary_resource_type.sql` still needs to be applied by eff.

### 2026-07-04 - S5 Wave 3 official executors delivered

✅ Completed:
- **`@lados/official-commercial-finance`** (`lados.commercial-finance`, L1, 8 nodes): `submit_invoice`, `verify_invoice`, `record_invoice_approval`, `record_payment`, `create_purchase_order`, `record_purchase_order_approval`, `claim_retention_release`, `record_retention_release` — all `executorStatus:"implemented"`. **Skeleton bug found+fixed:** `nodes.json` only defined 5 of the 8 nodes the manifest declared (`record_purchase_order_approval`, `claim_retention_release`, `record_retention_release` were missing) — added all 3, same class of gap as S4's Resource Operations fix. Invoices/POs/retention releases are Workspace Resources reusing migration `0043_finance_resource_types.sql`'s `finance_invoice`/`purchase_order`/`retention_release` types — no new migration needed for this pack. `verify_invoice` is a deterministic tolerance check against a bound PO (not an AI call) — always advisory, never itself approves. Every approval/release node (`record_invoice_approval`, `record_purchase_order_approval`, `record_retention_release`) mirrors `lados.human.record_decision`'s `MISSING_HUMAN_DECISION` contract exactly — `approvedBy`/`releasedBy` is never fabricated.
- **`@lados/official-procurement`** (`lados.procurement`, L1, 6 nodes): `create_rfq`, `issue_rfq`, `receive_quotation`, `compare_quotations`, `recommend_award`, `generate_po_request` — all `executorStatus:"implemented"`. **Skeleton bug found+fixed:** `nodes.json` only defined 4 of the 6 declared nodes (`issue_rfq`, `receive_quotation` were missing) — added both. New migration `0058_procurement_resource_types.sql` adds `rfq`/`quotation`/`po_request` to the `lados_resources` type CHECK constraint (with 2 supporting partial indexes), following the same cumulative-history-comment convention as every prior resource-type migration. `compare_quotations` is a deterministic lowest-price-wins ratio scorer (not a weighted multi-criteria engine, not an AI call) — honestly documented as a limitation, same "no fabricated capability" discipline as S2's `read_pdf`/`read_docx` stubs. `recommend_award` is Restricted maturity: it only ranks/recommends, never creates an approval task or transitions a resource itself — award approval is always composed via a separate `lados.human.request_approval` node downstream in the template graph.
- **Provenance:** confirmed (not built — the mechanism already exists) that `DataPacksService.resolveRuntimeUsagesForDefinition` automatically scans every node's `config` for Data Pack item UUIDs and attaches usage to the execution log — both packs' KP-referencing fields (`knowledgePackRefs` on `submit_invoice`/`create_rfq`, `invoiceRules` on `verify_invoice`, `comparisonRules`/`supplierCatalogueRefs` on `compare_quotations`) were verified to line up exactly between `nodes.json`'s `configGroups` and each executor's actual config reads, then proven end-to-end in `official-wave3-e2e.spec.ts` by running the real `resolveRuntimeUsagesForDefinition` (DB stubbed at its own boundary) over node configs shaped like these executors' real output.
- **Wiring:** both new `workspace:*` packages added to `apps/api/package.json`; `buildRealNodeResolver()` gained 2 new resolver entries, inserted right after Wave 2 (Communication) and before Foundation Pack, both backed by the existing `resourceService` param (`resourceService as any` cast, same pattern as every prior wave — `ResourceService`'s `ResourceType`/`DEFAULT_STATE` unions stay narrower than the official packs' intentionally-generic `string` interfaces by design; construction-pack/finance-pack already established this cast-don't-extend precedent).
- **Tests:** `apps/api/test/official-commercial-finance.spec.ts`, `official-procurement.spec.ts` (manifest↔executor contract + per-node `MockNodeContext` coverage, including the `MISSING_HUMAN_DECISION` guardrail on every approval/release node and the advisory-only contract on `verify_invoice`/`compare_quotations`/`recommend_award`), plus `official-wave3-e2e.spec.ts` — two in-process proxy chains (`submit_invoice → verify_invoice → record_invoice_approval` pausing at the human gate; `create_rfq → issue_rfq → receive_quotation ×2 → compare_quotations → recommend_award → generate_po_request → finance.create_purchase_order` handoff) plus the real-`DataPacksService` provenance-visibility assertions described above.

🔧 Ad-hoc outstanding:
- The master-plan S5 gate names two specific templates (`invoice_approval.submit_invoice_to_approval`, `procurement_rfq.rfq_to_quotation_comparison`) that don't exist as real workflow graphs yet — `packs/official/lados-template-invoice-approval` and `lados-template-procurement-rfq` already exist as **skeleton, manifest-only L5 template packs** (found during this pass, untouched — out of S5's scope, which is Wave 3 executors only) with empty `workflowTemplates` graph bodies. `official-wave3-e2e.spec.ts` is a proxy for now, same approach as S4's Wave 2 E2E test; revisit the literal gate once the templates wave builds real graphs.
- Could not run the verification loop in the Claude sandbox this pass (bash mount truncation, see prior note) — manual review caught one real bug (`recommend_award.ts`'s unguarded `ranked[0]` access) but missed a second: both new packs' `src/index.ts` imported a type named `NodeExecutor` from `@lados/execution-engine`, which doesn't actually export a type by that name (a grep match on `MockNodeExecutor` was mistaken for it). Every sibling pack instead declares `NodeExecutor` as a local type alias — fixed both files to match (`pnpm build:packs` caught it immediately on eff's first real run). Lesson: grep substring matches on type names are not a substitute for actually building — logged in [[feedback_bash_mount_staleness]].

➡️ Next:
- S6 (per master plan sequencing — likely Wave 4 packs and/or the templates wave that gives S4/S5's proxy E2E tests real workflow graphs to run against).

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 S5 checklist

Verification — eff ran locally, 2026-07-04: first `pnpm build:packs` failed on both new packs (`TS2724: '@lados/execution-engine' has no exported member named 'NodeExecutor'` — fixed per Ad-hoc note above). Re-run: `pnpm build:packs` clean across all 18 pack projects → `pnpm typecheck` clean across all 29 workspace projects → `pnpm --filter api test` — **20 suites / 237 passed / 2 skipped** (the 2 skips are the `REDIS_URL`-gated real-Redis tests, by design) → `pnpm validate:official-packs` — passed: 20 packs, 70 nodes (up from 60 at S4 — the 14 new Wave 3 nodes), 96 canonical capabilities, 38 compatibility aliases. Migration `0058_procurement_resource_types.sql` still needs to be applied by eff.

### 2026-07-03 (5) - S4 Wave 2 official executors delivered

✅ Completed:
- **`@lados/official-communication`** (`lados.communication`, L1, 4 nodes): `send_email` (SMTP via `EmailService`), `send_in_app` (via `NotificationService`), `send_reminder` (immediate delivery only — does not itself defer to `dueDate`/`offset`, compose with `lados.workflow.delay`/`trigger_schedule` upstream for real scheduling) all `executorStatus:"implemented"`. `send_sms` deliberately marked `executorStatus:"stub"` (pack `runtimeStatus:"stub_executors"`) — wired correctly end-to-end to `ISmsService` but `SmsService` (Phase 10) has no real SMS provider configured, always returns `sent:false`. `send_in_app`'s role/`organizationScope` broadcast is accepted but fails clearly with `NOT_IMPLEMENTED` rather than guessing a recipient — no org-member-by-role lookup service exists yet.
- **`@lados/official-task-case`** (`lados.task-case`, L1, 4 nodes): `create`, `update_status`, `case.open`, `case.close`, all `executorStatus:"implemented"`. Tasks and Cases are modeled as generic Workspace Resources (`lados_resources` type `task`/`case` — new migration `0057_task_case_resource_types.sql` expands the CHECK constraint; `ResourceService.ResourceType`/`DEFAULT_STATE` extended accordingly, both default to `'open'`). Status/closure changes go through `ResourceService.transitionState()` — the same state-machine-guarded mechanism as Resource Operations — so a `requires_approval` guard on the `task`/`case` state machine surfaces as `status:'paused'`, mirroring `lados.human.request_approval`'s contract; it never silently auto-approves.
- **`@lados/official-resource-operations`** (`lados.resource-operations`, L0, 8 nodes): `create`, `read`, `list`, `update`, `transition`, `resolve_binding`, `artifact.write`, `artifact.read` — all `executorStatus:"implemented"`. **Skeleton bug found+fixed:** the S4 manifest declared capability `resource.transition` with no corresponding node anywhere in `manifest.json.nodes` or `nodes.json` (only 7 nodes for 8 capabilities) — added `lados.resource.transition` (new node file + manifest/nodes.json entries) to close the gap, since the master plan explicitly requires "state transition (state-machine-guarded)" for this pack. `resolve_binding` reads the resourceId already merged into `config[bindingKey]` by `execution.service.ts#resolveDefinitionBindings` (bindings resolve at the definition level before a run starts) and fetches + validates the resolved resource's type. `ResourceService.createResource` gained an optional `initialState` param to satisfy the `create` node's `initialState` config field.
- **Wiring:** all 3 new `workspace:*` packages added to `apps/api/package.json`; `buildRealNodeResolver()` in `apps/api/src/execution/real-nodes/index.ts` gained 3 new resolver entries, inserted right after Wave 1 (Resource Operations → Task-Case → Communication → Foundation Pack), all backed by the existing `resourceService`/`artifactService`/`emailService`/`smsService`/`notificationService` params (no new constructor params needed) — same `resourceService as any` cast pattern already used for `coreResolve` below it, since `ResourceService`'s `ResourceType`/`DEFAULT_STATE` unions are narrower than the official packs' intentionally-generic `string` interfaces (runtime shape is identical, only the TS union differs).
- **Tests:** `apps/api/test/official-communication.spec.ts`, `official-task-case.spec.ts`, `official-resource-operations.spec.ts` (also asserts the 8-node/8-capability parity fix), plus `official-wave2-e2e.spec.ts` — an in-process proxy E2E chaining Workflow Foundation + Human Work + Task-Case + Communication nodes (case opened → human approval pause/resume → status update → in-app notify → logger), same pattern as S2's `official-wave1-e2e.spec.ts`.

🔧 Ad-hoc outstanding:
- The master-plan S4 gate names a specific template (`document_control.review_and_signoff`) that doesn't exist yet — every pack's `verification.templates` is still `not_started`, Wave 2 included. `official-wave2-e2e.spec.ts` is a proxy for now; revisit the literal gate once S5/S6 build real templates.
- `send_in_app`'s role-broadcast and `send_reminder`'s actual due-date scheduling are both honestly un-implemented gaps (documented in-code and in nodes.json), not silently faked — worth a look if a future template needs either.

➡️ Next:
- S5 (Wave 3 — Commercial Finance, Procurement) per master plan sequencing, or continue any follow-up from the ad-hoc list above.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 S4 checklist

Verification — eff ran locally, 2026-07-03: `pnpm install` → `pnpm build:packs` → `pnpm typecheck` → `pnpm --filter api test` → `pnpm validate:official-packs` — **all green, no fixes needed.** Migration `0057_task_case_resource_types.sql` applied by eff.

### 2026-07-03 (4) - S3 Engine Hardening delivered

✅ Completed:
- **D1 (regression test only — fix already landed):** `apps/api/src/workflow/workflow.service.spec.ts` — proves `WorkflowService.publish()` writes a status value from the DB-allowed list (`draft`/`published`/`archived`) and never the historical `'active'` bug that 500'd every publish since Phase 1.
- **D2 (queue hardening):** `ExecutionQueueService` — added a startup PING healthcheck (`pingHealthcheck()`, loud `error`-level log on failure, surfaced via `/queue/health`'s new `redisHealthy` field), `commandTimeout` on the ioredis connection (`REDIS_COMMAND_TIMEOUT_MS`, default 8s) so a hung Redis command rejects instead of hanging forever, and `enqueueTrigger`/`enqueueResume` now return `{enqueued: boolean}` instead of `void` (never throw, never hang past the command timeout). Added a shared `ExecutionService.enqueueOrRunInline()` helper that tries the queue and falls back to in-process execution whenever `enqueued` is false — refactored `triggerRun`/`resumeRun`/`_triggerFromEvent` onto it, and fixed a latent gap: `SchedulerService` used to call `ExecutionQueueService` directly with **no fallback at all**, so a cron-triggered run could be silently dropped forever if Redis was down — it now goes through `ExecutionService.enqueueOrRunInline()` too (required adding `ExecutionModule` as an import of `SchedulerModule`; no circular dependency).
- **D3 (run watchdog):** new `apps/api/src/execution/run-watchdog.service.ts` (`RunWatchdogService`, wired into `ExecutionModule`) — polls every 60s (same architecture as `SchedulerService`) for `execution_runs` stuck at `running`/`queued` longer than `RUN_WATCHDOG_TIMEOUT_MS` (default 30 min), marks them `timed_out` with a visible `RUN_TIMEOUT` error, publishes a `workflow.failed` event + `audit_log` row, and emits the new `run.timed_out` SSE event. `timed_out` was already a valid `execution_runs.status` value in the original Phase 6 migration — no new migration needed. Complements (does not replace) the existing `ExecutionService._recoverStaleRuns()` crash recovery, which only catches the narrower case of the whole API process restarting.
- **D4 (live per-node SSE):** the `/runs/:runId/stream` SSE endpoint has existed since Phase 12 but nothing ever emitted `run.node_started`/`run.node_done` — it only ever saw whole-run lifecycle events. Added an optional `onNodeEvent` hook to `RunnerOptions` in `@lados/execution-engine` (`packages/execution-engine/src/types.ts` + `runner.ts`), fired at the start and at every one of `_executeStep`'s 7 return paths (muted/bypassed/skipped/paused/failed/completed/exception), always wrapped so a throwing callback can never break execution. Wired into both `ExecutionWorker` (queue path) and `ExecutionService.enqueueOrRunInline()`'s in-process fallback path, so live node progress works whether or not Redis is configured.
- **sub_workflow + job priority decision:** deferred to Phase 22 (see master plan §4 S3 — neither is required by the S3 gate or any Wave 1–3 official template).
- **Tests:** `apps/api/src/queue/execution-queue.service.spec.ts` (unit tests for the no-Redis fallback contract + `parseRedisUrl`'s `commandTimeout`, plus a real-Redis integration block gated on `REDIS_URL` — skipped in CI), `apps/api/src/execution/execution.service.recovery.spec.ts` (crash-recovery regression), `apps/api/src/execution/run-watchdog.service.spec.ts` (timeout marking + SSE/event-bus emission).

🔧 Ad-hoc outstanding:
- No new dependencies or workspace packages were added this pass — **no `pnpm install` / lockfile regen needed.** But `packages/execution-engine/src/{types,runner}.ts` changed, so run `pnpm build:packages` (covers `execution-engine`) before `pnpm typecheck` / `pnpm --filter api test` — same class of gotcha as S1/S2, this time hitting `execution-engine`'s `dist/`.
- The real-Redis integration test in `execution-queue.service.spec.ts` only runs when `REDIS_URL` is set in the environment — CI has none configured, so it's skipped there by design. If eff wants that block exercised, set `REDIS_URL` locally before running `pnpm --filter api test` (this is also the natural moment to close the still-open S0 item "`eff` Confirm Upstash account status + rotate/retrieve valid Redis credentials").
- D3's watchdog query (`execution_runs` filtered by `status` + `started_at`) has no dedicated index on `started_at` — acceptable at current (Contractor Edition) scale per the existing `execution_runs_status_idx`, flagged as a future optimization only if the table grows large.
- The S3 gate text ("killing the worker mid-run requeues and completes") is covered by BullMQ's own built-in stalled-job recovery (lock expiry → automatic retry, already configured via `attempts: 3` + exponential backoff) — no new code was needed for that specific behavior, but it has not been proven under a real kill-the-worker drill; that's a good candidate for the S11 chaos-testing checklist item ("kill worker mid-run (requeue proof)"), not blocking here.

➡️ Next:
- eff: run `pnpm build:packages` → `pnpm typecheck` → `pnpm --filter api test` → (optionally, with `REDIS_URL` set) re-run tests to exercise the real-Redis block.
- Once verified: S4 (Wave 2 packs) can start in parallel with S3 per the master plan's parallelism note, or continue engine work if anything above needs follow-up.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 S3 checklist

Verification — eff ran locally, 2026-07-03:
- `pnpm build:packages` then `pnpm typecheck` — first run failed: `execution-queue.service.ts` called `client.ping()`, but BullMQ 5.x's `IRedisClient` abstraction (added to support ioredis/node-redis/Bun interchangeably) doesn't declare `ping()`. Fixed by switching the healthcheck to `client.info()` (declared on the interface, same round-trip liveness guarantee). Re-run: clean across all 24 workspace projects.
- `pnpm --filter api test` — **13 suites / 137 passed, 2 skipped** (the `REDIS_URL`-gated real-Redis integration tests in `execution-queue.service.spec.ts`, correctly skipped since no `REDIS_URL` is set locally — exactly the designed CI behavior). New suites all green: `workflow.service.spec.ts` (D1), `execution-queue.service.spec.ts` (D2), `run-watchdog.service.spec.ts` (D3, log output confirms a stuck run was correctly marked `timed_out`), `execution.service.recovery.spec.ts` (crash recovery).
- Still outstanding: verifying the D2 healthcheck against a real Upstash instance (needs `eff` to set `REDIS_URL` with valid credentials — this is also S0's still-open "confirm Upstash account status" item).

### 2026-07-03 (3) - S2 Wave 1 official executors delivered

✅ Completed:
- Scaffolded `packs/official/lados-workflow-foundation`, `lados-human-work`, `lados-document-intelligence` as real `workspace:*` packages (added `packs/official/*` to `pnpm-workspace.yaml`), each with its own `package.json`, `tsconfig.json`, completed `nodes.json` (every node the manifest declares now has a full node entry — some skeletons were missing entries).
- Implemented all 7 `lados-workflow-foundation` executors: `trigger_manual`, `trigger_schedule` (successor to `core.cron_trigger`), `condition` (hand-rolled expression evaluator, never `eval()`), `parallel`, `merge` (shallow + deep strategies), `delay` (real async sleep, 5-minute ceiling, clamps + warns), `write_log`. No external services required.
- Implemented all 4 `lados-human-work` executors: `request_approval` and `review_checkpoint` (canonical successors to `core.human_approval`/`foundation.request_approval` — pause the workflow and create an approval task; AI never resolves the pause), `assign_user`, `record_decision` (fails with `MISSING_HUMAN_DECISION` rather than ever fabricating who decided). Service interfaces (`IApprovalTaskService`, `INotificationService`, `IAssignableResourceService`) are declared locally in this pack — not imported from any prototype pack — satisfied structurally by the existing NestJS services.
- Implemented `lados-document-intelligence`: `upload_file`, `read_excel` (XLSX fallback parser when no `DocumentService` injected), `extract_table`, `generate_document` (real `docx`-based Word generation, inline base64 fallback when no storage service injected) are fully implemented. `read_pdf` and `read_docx` are **deliberate, honestly-labeled stubs** (`executorStatus: "stub"`, pack `runtimeStatus: "stub_executors"`) — they fetch file metadata but do not extract text, because no PDF/DOCX-reading dependency exists in the repo yet and this pass intentionally avoided adding one blind. Follow-up noted in each stub's docstring.
- Wired all three pack resolvers into `apps/api/src/execution/real-nodes/index.ts` → `buildRealNodeResolver()`, placed **first** in the resolver chain (ahead of Foundation Pack) since they are the canonical successors per the compatibility alias map.
- Added `@lados/testing` as an `apps/api` devDependency (was missing) and wrote 4 new Jest suites: `official-workflow-foundation.spec.ts`, `official-human-work.spec.ts`, `official-document-intelligence.spec.ts` (manifest↔executor contract + `MockNodeContext` execution per node, every node in all 3 packs covered), and `official-wave1-e2e.spec.ts` — the new first official-node E2E: a linear in-process chain `trigger_manual → generate_document → request_approval (pauses) → record_decision (human-supplied resume) → write_log`, proving the AI-never-decides guardrail holds across the full chain.

🔧 Ad-hoc outstanding:
- **`pnpm-lock.yaml` needs regenerating** — 3 new workspace packages (`@lados/official-workflow-foundation`, `@lados/official-human-work`, `@lados/official-document-intelligence`) plus `@lados/testing` as a new `apps/api` devDependency were added. Run a normal `pnpm install` (not `--frozen-lockfile`) once, locally, before typecheck/test/CI — same category of gotcha as S1's "rebuild `@lados/pack-sdk` dist before testing," but this one is a lockfile regeneration, not a build step.
- `read_pdf` / `read_docx` remain stubs — do not build production templates depending on parsed PDF/DOCX text until a real parsing dependency (e.g. `pdf-parse`, `mammoth`) is added in a dedicated pass with its own verified lockfile update.
- Three manifest-declared capabilities in `lados-workflow-foundation` have no corresponding node yet (`workflow.trigger.event`, `workflow.control.loop`, `workflow.event.publish` per the manifest's `capabilities` list) — deferred as a known gap, not blocking the S2 gate since all 7 *declared nodes* are fully implemented.
- No NestJS service yet implements `IDocumentStorageService` — `generate_document` currently always falls back to the inline base64 path in production too, not just in tests.

➡️ Next:
- eff: run `pnpm install` (regenerate lockfile) → `pnpm typecheck` → `pnpm --filter api test` → `pnpm validate:official-packs`, same verification loop as S1.
- Once verified: S3 — Wave 2 packs, or begin retiring/aliasing the prototype nodes these three packs supersede (per the compatibility alias map), per master plan sequencing.

📝 Checklist updated:
- `Sprint/Lados_V4_Phase21_Checklist.md` (this file)
- `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` §4 S2 checklist

Verification — eff ran locally, 2026-07-03:
- `pnpm install` — regenerated the lockfile for the 3 new workspace packages + `@lados/testing`. Symlinks created correctly; `pnpm build:packs` was still needed before typecheck (the 3 new official packs had never been built — same class of gotcha as S1's pack-sdk dist rebuild, this time hitting `packs/official/*`'s `dist/` output).
- `pnpm build:packs` → `pnpm typecheck` — clean across all 24 workspace projects.
- `pnpm --filter api test` — first run surfaced 2 failures, both bugs in the new test files (not the executors): `official-wave1-e2e.spec.ts` used an object-shorthand variable name that didn't match its declaration; `official-document-intelligence.spec.ts`'s fake XLSX fixture only had 2 columns, and the fallback parser's header-detection heuristic requires ≥3 non-empty cells in a row. Both fixed; re-run: **9 suites / 122 tests passed.**
- `pnpm validate:official-packs` — passed: 20 packs, 60 nodes (up from 51 at S1 — the 3 Wave-1 packs' `nodes.json` now fully match their manifests), 96 canonical capabilities, 38 compatibility aliases.

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
