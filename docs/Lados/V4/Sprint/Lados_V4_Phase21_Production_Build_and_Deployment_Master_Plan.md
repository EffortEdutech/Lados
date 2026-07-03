# Lados V4 Phase 21 — Production Build & Deployment Master Plan

| | |
|---|---|
| **Document ID** | LADOS-V4-P21-MASTER-PLAN |
| **Status** | Active — kickoff approved |
| **Date** | 2026-07-03 |
| **Methodology** | Phase-gate delivery (each sprint gate closes before the next opens) |
| **Supersedes** | PD-4/PD-5/PD-6 of `Lados_V4_Audit_and_Production_Deployment_Sprint_Plan.md` (PD-1–PD-3 delivered; their gates remain closed) |
| **Depends on** | Phase 20A planning docs, Phase 20B1–B4 contracts, Canonical Capability Registry, Target Capability Pack Catalogue, Target Workflow Template Index |
| **Canonical product designs** | `Design/Lados_V4_Capability_Packs_Product_and_Technical_Design.md` · `Design/Lados_V4_Knowledge_Packs_Product_and_Technical_Design.md` |
| **Absorbs** | `Lados_V4_Phase21_Sprint_Plan.md` workstreams 21A–21F (see §3A); detailed 21A–21E items live in `Lados_V4_Phase21_Checklist.md` |

---

## 1. Strategic Decision (locked)

Per Phase 20A Fresh Capability Build Decision:

1. **Prototype packs, nodes, and templates are reference-only.** They will not be refactored into the product line. They are archived, not shipped.
2. **Official Capability Packs are fresh builds** from the canonical capability registry, target catalogue, and 20B1 manifest contract.
3. **Testing of "fully running Lados" happens on official assets only.** No further E2E verification is spent on prototype workflows.
4. Nodes, packs, UI, and engine are fixed/built to the Phase 20 standards **before** platform-level E2E begins.

## 2. What Phase 21 Inherits

**Delivered and closed (PD-1–PD-3):** truth-up + repo hygiene; jest baseline (64 tests) + CI + gitleaks; throttler/helmet; per-org webhook secrets + rawBody fix; advisor remediation (search_path, 74 RLS initplan, 34 FK indexes); org-scoping fixes (resource, event-bus, file, library).

**Known engine defects found in PD-4 E2E (fix in S3):**
- D1. `publish()` set `status:'active'` violating the DB check — fixed 2026-07-03, needs regression test.
- D2. BullMQ/Upstash queue: Redis commands hang silently; queue has never processed a job. Needs credential verification, startup PING healthcheck, command timeouts, loud fallback.
- D3. Run stuck at `running` with zero feedback when the queue stalls — needs run-level watchdog/timeout.
- D4. SSE live node status not implemented (execution feedback is poll-based).

**Existing assets:** 10 official skeleton packs under `packs/official/` (manifest-only), official SDK validator (20B2), alias map, seed Knowledge Packs (5), 19C provenance pipeline (code-verified via unit tests).

---

## 3. Sprint Overview

| Sprint | Title | Type | Owner mix |
|---|---|---|---|
| S0 | Program Setup & Prototype Freeze | Governance | Claude + eff |
| S1 | Official Runtime Foundation | Engine + SDK | Claude |
| S2 | Wave 1 Packs: Foundation, Human Work, Document Intelligence | Fresh build | Claude |
| S3 | Engine Hardening (queue, watchdog, SSE, publish regression) | Engine | Claude + eff (Upstash) |
| S4 | Wave 2 Packs: Communication, Task-Case, Resource Operations | Fresh build | Claude |
| S5 | Wave 3 Packs: Commercial Finance, Procurement | Fresh build | Claude |
| S6 | Wave 4 Packs: QS Commercial, Construction Operations (L2) | Fresh build | Claude |
| S7 | UI Alignment: palette, canvas readability, inspector, Explorer, Marketplace naming | Frontend | Claude + eff (visual review) |
| S8 | Official Templates + Full Platform E2E | Verification | eff (browser) + Claude |
| S9 | Prototype Archival & Cutover | Migration | Claude + eff (approve) |
| S10 | Production Infrastructure & Staging | Infra | eff (accounts/decisions) + Claude |
| S11 | Launch Readiness & Go-Live | Launch | Both |

Parallelism allowed: S3 may run alongside S4–S5 (different subsystems). S7 may begin once S2 delivers the first runtime packs. Everything else is strictly gated.

---

## 3A. Workstream Integration (from the earlier Phase 21 Sprint Plan)

The earlier `Lados_V4_Phase21_Sprint_Plan.md` defined workstreams 21A–21F. They map into this program as follows — detailed tick-items remain in `Lados_V4_Phase21_Checklist.md`:

| Workstream | Title | Lands in | Notes |
|---|---|---|---|
| **21A** | UI Copy & Compatibility Pass (Data Packs → Knowledge Packs wording) | **S0** (immediate — low-risk, independent, ready) | UI wording only; `data_pack_*` technical identifiers unchanged per the compatibility rule |
| 21B | Provider Profile data model (Catalogue Provider) | **S9A** | After functional completeness; additive migration |
| 21C | Knowledge Pack Listing Layer (product layer over technical Data Packs) | **S9A** | With 21B |
| 21D | Review Queue expansion (Provider Profiles + Knowledge Packs) | **S9A** | With 21B/21C |
| 21E | AI Search Preview (cited search over installed + marketplace knowledge) | **S9A** (stretch) or Phase 22 | Decision at S9A gate |
| 21F | Official Capability Runtime Activation Plan | **Superseded by S1–S6** | This master plan IS the activation plan |

### New Sprint S9A — Marketplace Knowledge Layer (runs after S9, parallel with S10 allowed)

- [ ] 21B: Provider Profile model + migration (Catalogue Provider identity per Knowledge Packs design doc).
- [ ] 21C: Knowledge Pack listing layer over `data_pack_*` tables (no rename of technical identifiers).
- [ ] 21D: Review Queue expansion for Provider Profiles and Knowledge Pack listings.
- [ ] 21E decision: build AI Search Preview now or seed Phase 22 backlog.
- [ ] `eff` Browser verify per the Phase 21 Checklist sections.

**Gate:** marketplace presents Knowledge Packs as product listings with provider identity, per the canonical design doc.

---

## 4. Sprint Checklists

### S0 — Program Setup & Prototype Freeze

- [x] Declare prototype freeze: no new features on `packs/*` prototype packs (bug fixes only if blocking). *(declared 2026-07-03)*
- [x] **Execute 21A UI Copy & Compatibility Pass** — done 2026-07-03; all §21A code items ticked in `Lados_V4_Phase21_Checklist.md`; typecheck + browser verify pending (eff).
- [x] Move this plan to Active in `docs/Lados/README.md` status table; retire PD-4/5/6 rows.
- [x] Label PD-4 prototype demo workflow as prototype-era. *(DB name prefixed `[PROTOTYPE]` + description; JSON export annotated; deletion in S9)*
- [x] Define official-pack Definition of Done (§5) as the acceptance contract for S2–S6. *(accepted at kickoff)*
- [ ] `eff` Confirm Upstash account status + rotate/retrieve valid Redis credentials (needed by S3).
- [ ] `eff` Git tag `prototype-freeze-2026-07` on main for archaeology.
- [ ] `eff` 21A verification: `corepack pnpm --filter web typecheck` + browser verify /marketplace tabs, Explorer Knowledge Catalogue panel, PropertyPanel Knowledge Pack Item field, provenance label.

**Gate:** freeze declared, plan active, DoD agreed.

### S1 — Official Runtime Foundation

> Makes `packs/official/*` loadable as real runtime packs, per 20B1 §2 preconditions.

- [x] Executor contract for official nodes: typed `execute(ctx)` signature returning `{ status, outputs }`. *(2026-07-03 — already existed as `NodeExecutor` in `@lados/pack-sdk/src/resolve.ts`: `(ctx: NodeContext) => Promise<NodeExecuteResult>`, confirmed as the standing S1 contract; no official executors implemented yet, by design — that's S2+.)*
- [x] Official pack loader: compile/register `packs/official/*` with `manifest.json` + `nodes.json` (manifest-first, executors added per wave). *(2026-07-03 — `apps/api/src/pack/official-pack-loader.ts`, pure fs-based loader + validator, no DB/NestJS deps.)*
- [x] Node registry integration: official nodes appear in `registered_nodes` with layer/capability metadata; prototype and official coexist during transition. *(2026-07-03 — `OfficialPackLoaderService` in `apps/api/src/pack/official-pack-loader.service.ts`, wired into `PackModule`, upserts official packs/nodes as visible + non-executable via new `runtime_status`/`executor_status` columns. Does not touch `PackInstallerService` or prototype rows.)*
- [x] Wire 20B2 validator into CI: invalid official manifest fails the build. *(2026-07-03 — added `pnpm validate:official-packs` step to `.github/workflows/ci.yml`.)*
- [x] Compatibility alias table live: alias map resolves prototype type → official type (Stage 1 "Planned" per 20B2 §5). *(Already live since 20B.2 — `officialCompatibilityAliases` / `resolveOfficialCompatibilityAlias` in `@lados/pack-sdk`; confirmed still Stage 1 only, no runtime rewrite behavior added.)*
- [x] `TEST` Jest: loader registers all skeleton packs; validator rejects a deliberately broken manifest; alias resolution unit test. *(2026-07-03 — `apps/api/test/official-pack-loader.spec.ts`.)*
- [x] Extend manifest contract with `events` declarations (closes deferred Phase 1F item at the standard level). *(2026-07-03 — `OfficialNodeEventEmission` + `OfficialNodeManifest.events?` in `@lados/pack-sdk/src/types.ts`, validated in `validate.ts`, optional/backward-compatible with existing skeleton `nodes.json` files.)*

**New:** `supabase/migrations/0056_official_capability_pack_registry.sql` — adds `packs.layer`, `packs.runtime_status`, `registered_nodes.canonical_capability`, `registered_nodes.executor_status`. Additive/defaulted; not yet applied to the live Supabase project — needs `eff` to run via the normal migration path.

**Gate:** `pnpm typecheck` clean (21/21 projects) · `pnpm --filter api test` 74/74 green · `pnpm validate:official-packs` passed (20 packs, 51 nodes, 96 capabilities, 38 aliases) — verified by eff 2026-07-03. Official packs visible in node registry (flagged non-executable until their wave lands) — code complete; migration 0056 still needs to be applied to the live Supabase project before the registry rows actually exist there.

### S2 — Wave 1: `lados-workflow-foundation`, `lados-human-work`, `lados-document-intelligence`

- [x] Workflow Foundation executors: condition, merge, parallel, delay, logger, manual + cron(schedule) trigger. *(2026-07-03 — all 7 declared nodes implemented: `trigger_manual`, `trigger_schedule`, `condition`, `parallel`, `merge`, `delay`, `write_log`. No dedicated `loop` or `webhook` trigger node yet — `workflow.trigger.event` / `workflow.control.loop` / `workflow.event.publish` are declared as manifest capabilities but have no node yet, deferred as a known gap; `trigger_manual`/`trigger_schedule` and `write_log` serve as the start/end points in practice, there is no separate formal "end" node.)*
- [x] Human Work executors: approval task (pause/resume), assignment, decision record — approval is THE guardrail node; human decision required for all commercial facts. *(2026-07-03 — all 4 declared nodes implemented: `request_approval`, `review_checkpoint` (both pause + create a task, never auto-resolve), `assign_user`, `record_decision` (fails with `MISSING_HUMAN_DECISION` rather than ever inferring who decided).)*
- [~] Document Intelligence executors: read excel/pdf, extract table, generate document, save to library. *(2026-07-03 — `upload_file`, `read_excel` (with XLSX fallback parser), `extract_table`, `generate_document` (real `docx` output) implemented. `read_pdf`/`read_docx` are honest stubs — `executorStatus: "stub"`, fetch metadata only, no text extraction, no PDF/DOCX-parsing dependency exists yet. "Save to library" is not wired — `generate_document` accepts an optional `IDocumentStorageService` but no NestJS service implements it yet, so it always falls back to returning the document inline as base64 today.)*
- [ ] Resource Binding + Knowledge Pack reference patterns implemented per 20B1 (config fields declare `data_pack_item` / resource-picker types). *(Not started this pass — nodes.json already declares `resourceBindings`/`knowledgePackRequirements` metadata from S1, but no new runtime resource-picker logic was added in S2; `assign_user`/`request_approval` take `resourceId` as a plain input today, not a bound resource-picker field.)*
- [x] `TEST` Jest per node: manifest↔executor contract, MockNodeContext execution, pause/resume for approval. *(2026-07-03 — `apps/api/test/official-workflow-foundation.spec.ts`, `official-human-work.spec.ts`, `official-document-intelligence.spec.ts`: every node in all 3 packs covered, contract test (nodes.json → resolveNode) + MockNodeContext execution + explicit pause/resume coverage for `request_approval`/`review_checkpoint`.)*
- [ ] Canvas smoke: nodes render readably at default zoom (S7 does the full pass). *(Deferred to S7 as stated in this plan.)*

**Gate:** a linear official workflow (start → doc node → approval → logger → end) runs in-process end-to-end with provenance + approval + resume. **This is the new first E2E — on official nodes.** *(2026-07-03 — `apps/api/test/official-wave1-e2e.spec.ts` proves this in-process: `trigger_manual → generate_document → request_approval (pauses) → record_decision (human-supplied resume) → write_log`, combining all 3 Wave-1 resolvers exactly as `buildRealNodeResolver()` does. Note: this is an in-process/in-memory chain proof, not a run through the real queued `WorkflowRunner` + Supabase-persisted execution — that full-stack path still needs a manual or S3-era integration verification once Redis/DB wiring is exercised.)*

### S3 — Engine Hardening (parallel-capable)

- [~] D2: Upstash credentials verified (`eff`); startup `PING` healthcheck logs LOUD failure; BullMQ command timeout; enqueue falls back to in-process on queue failure instead of stranding the run. *(2026-07-03 — code complete: `ExecutionQueueService.pingHealthcheck()` (loud `error`-level log, surfaced via `/queue/health`'s new `redisHealthy` field), `commandTimeout` via `REDIS_COMMAND_TIMEOUT_MS` (default 8s), `enqueueTrigger`/`enqueueResume` now return `{enqueued}` and never hang/throw. New shared `ExecutionService.enqueueOrRunInline()` used by `triggerRun`/`resumeRun`/`_triggerFromEvent` **and** `SchedulerService` (which previously had no fallback path at all — a cron-triggered run could be silently dropped forever if Redis was down; fixed by routing it through the same helper). Still needs `eff` to actually verify/rotate Upstash credentials and confirm the PING succeeds against the live instance — that half of D2 is an account action, not code.)*
- [x] D3: run watchdog — runs in `running`/`queued` beyond a configurable timeout are marked `timed_out` with a visible error. *(2026-07-03 — new `RunWatchdogService` (`apps/api/src/execution/run-watchdog.service.ts`), polls every 60s, timeout via `RUN_WATCHDOG_TIMEOUT_MS` (default 30 min), marks `timed_out` + publishes `workflow.failed` + `audit_log` row + `run.timed_out` SSE event. `timed_out` already existed in the Phase 6 `execution_runs` status check — no migration needed. Complements, doesn't replace, `ExecutionService._recoverStaleRuns()` (API-restart crash case only).)*
- [x] D1: regression test — publish flow asserts status value against the DTO allowed list. *(2026-07-03 — the `status:'active'` fix itself predates this sprint (already landed 2026-07-03 per the defect note above); this item was the missing regression test — `apps/api/src/workflow/workflow.service.spec.ts`.)*
- [x] D4: SSE live node status — `runs/:runId/stream` emits `run.node_started` / `run.node_done`; canvas colours nodes live (UI half lands in S7). *(2026-07-03 — the SSE endpoint existed since Phase 12 but nothing ever emitted node-level events. Added `RunnerOptions.onNodeEvent` to `@lados/execution-engine` (fires at every one of `_executeStep`'s 7 return paths, never throws into the runner), wired into both `ExecutionWorker` (queue path) and `ExecutionService.enqueueOrRunInline()`'s in-process fallback. Canvas colouring itself is explicitly deferred to S7 per this plan.)*
- [x] `core.sub_workflow` + job priority: build or formally defer to Phase 22 (decision recorded here). *(2026-07-03 — **deferred to Phase 22.** Neither is required by this sprint's gate (below) or by any Wave 1–3 official template in the Target Template Index; revisit if a Wave 4+ template needs workflow composition or queue prioritization.)*
- [x] `TEST` queue integration test with real Redis (skipped in CI when no `REDIS_URL`); crash-recovery jest for the requeue logic. *(2026-07-03 — `apps/api/src/queue/execution-queue.service.spec.ts` (no-Redis fallback unit tests + a `REDIS_URL`-gated real integration block), `apps/api/src/execution/execution.service.recovery.spec.ts` (crash recovery), `apps/api/src/execution/run-watchdog.service.spec.ts` (timeout marking).)*

**Gate:** queued run completes on real Redis; killing the worker mid-run requeues and completes; a stalled queue produces a loud failure not a silent hang. *(2026-07-03 — "killing the worker mid-run requeues" is covered by BullMQ's own stalled-job lock-expiry recovery (already configured: `attempts: 3` + exponential backoff), not new code from this sprint; it has not yet been proven under a real kill-the-worker drill — good S11 chaos-test material, not blocking here. "Queued run completes on real Redis" and "stalled queue produces a loud failure" are code-complete per D2 above and verified locally by eff — `pnpm typecheck` clean 24/24, `pnpm --filter api test` 13 suites/137 passed/2 skipped (the 2 skips are the `REDIS_URL`-gated real-Redis tests, by design, since no `REDIS_URL` is set locally) — but still need `eff` to set real Upstash credentials and re-run to confirm the healthcheck/enqueue path against live Redis, not just the no-Redis fallback contract.)*

### S4 — Wave 2: `lados-communication`, `lados-task-case`, `lados-resource-operations`

- [x] Communication executors: in-app notification, email (SMTP-gated), reminder; SMS stub clearly marked. *(2026-07-03 — `@lados/official-communication`: `send_email`/`send_in_app`/`send_reminder` implemented (wired to `EmailService`/`NotificationService`); `send_sms` deliberately marked `executorStatus:"stub"` — wired end-to-end to `ISmsService` but `SmsService` itself has no real provider configured (Phase 10 stub). Role/organization-scope broadcast on `send_in_app` is accepted but fails clearly with `NOT_IMPLEMENTED` — no org-member-by-role lookup service exists yet.)*
- [x] Task-Case executors: create task, update status, case record. *(2026-07-03 — `@lados/official-task-case`: tasks/cases modeled as Workspace Resources (`lados_resources` type `task`/`case`, added via migration `0057_task_case_resource_types.sql`); status/closure changes go through `ResourceService.transitionState()` (state-machine-guarded, same mechanism as Resource Operations) — a `requires_approval` guard surfaces as `status:'paused'`, never a silent auto-approval.)*
- [x] Resource Operations executors: create/read/update Workspace Resource, state transition (state-machine-guarded). *(2026-07-03 — `@lados/official-resource-operations`: 8 nodes — create/read/list/update/transition/resolve_binding/artifact.write/artifact.read. **Skeleton bug found+fixed:** the S4 manifest declared capability `resource.transition` with no corresponding node anywhere (`manifest.json.nodes` nor `nodes.json`) — added `lados.resource.transition` to close the gap, since the master plan explicitly requires state transition. `resolve_binding` reads the resourceId already merged into `config[bindingKey]` by `execution.service.ts#resolveDefinitionBindings` and fetches+validates the resolved resource. `ResourceService.createResource` gained an optional `initialState` param to satisfy the node's config field of the same name.)*
- [x] `TEST` per node as S2. *(2026-07-03 — `apps/api/test/official-communication.spec.ts`, `official-task-case.spec.ts`, `official-resource-operations.spec.ts` (also asserts the 8-node/8-capability parity fix), plus `official-wave2-e2e.spec.ts` — a proxy E2E chaining Workflow Foundation + Human Work + Task-Case + Communication nodes end-to-end in-process. Verified green by eff.)*

**Gate:** template `document_control.review_and_signoff` (Production-ready target) runs E2E on official nodes. *(2026-07-03 — that named template is itself a templates-wave deliverable: every pack's `verification.templates` is still `not_started`, Wave 2 included, so the literal gate can't run yet. `official-wave2-e2e.spec.ts` is a proxy — same approach S2 used for its own first E2E before templates existed — chaining a representative case review-and-signoff flow across all 4 packs shipped so far. Revisit this gate for real once S5/S6 templates land. **Verified by eff, 2026-07-03:** `pnpm install` → `pnpm build:packs` → `pnpm typecheck` → `pnpm --filter api test` → `pnpm validate:official-packs` — all green, no fixes needed. Migration `0057_task_case_resource_types.sql` applied.)*

### S5 — Wave 3: `lados-commercial-finance`, `lados-procurement`

- [ ] Commercial Finance executors: submit invoice, verify (advisory), approval record, payment record, PO creation — every commercial fact behind a Human Work approval.
- [ ] Procurement executors: create RFQ, quotation comparison (advisory), award recommendation (Restricted maturity — approval mandatory), PO request handoff.
- [ ] Knowledge Pack references wired: invoice validation rules, procurement SOP packs consumed via provenance-logged item refs.
- [ ] `TEST` per node as S2 + provenance assertions.

**Gate:** `invoice_approval.submit_invoice_to_approval` and `procurement_rfq.rfq_to_quotation_comparison` run E2E with provenance blocks visible.

### S6 — Wave 4 (L2): `lados-qs-commercial`, `lados-construction-operations`

- [ ] QS Commercial executors: read/clean/validate BOQ, classify trade, cost summary (advisory), rate check against QS rate library.
- [ ] Construction Operations executors: project record, inspection, report, defect, site diary.
- [ ] Remaining skeletons (`contract-admin`, `asset-fleet`, `people-payroll`): manifest skeletons created; runtime deferred to Phase 22 (recorded).
- [ ] `TEST` per node as S2.

**Gate:** `qs_practice.boq_upload_to_cost_summary` (Advisory) runs E2E: BOQ file → cost summary → human acceptance, provenance logged.

### S7 — UI Alignment

- [ ] Node palette grouped by capability layer (L0–L2) and pack, driven by official manifest metadata — not a flat list.
- [ ] Canvas readability standard applied (20B checklist): high-port nodes use grouped/resource inputs, no duplicate handles, labels/titles fit, inspector carries detail.
- [ ] Manifest-driven inspector verified against official `ConfigField` types incl. `data_pack_item` + resource pickers.
- [ ] Live node status colouring from S3 SSE.
- [ ] Marketplace naming pass: "Knowledge Packs" + "Catalogue Provider" terminology (Phase 20C naming lock) across Marketplace/Explorer UI.
- [ ] Explorer: official packs, templates, and Knowledge Pack search with effective-date filter exposed.
- [ ] `eff` Visual review sign-off per screen (Screens spec Vol 6 as reference).

**Gate:** eff signs off canvas readability + palette on the official pack set.

### S8 — Official Templates + Full Platform E2E

- [ ] Ship first 5 official templates from the Target Template Index at stated maturity: Submit Invoice to Approval, Document Review & Signoff, RFQ to Quotation Comparison, BOQ Upload to Cost Summary, Progress Claim Evidence Check.
- [ ] Template instantiate → publish → run → approve → complete, per template (browser, `eff`).
- [ ] 19C provenance verified on official runs (`test_phase19c` against a fresh RunId).
- [ ] Publish/version/restore verified (D1 regression in the browser).
- [ ] Queue path verified on real Redis (S3 gate re-run through the UI).
- [ ] Canvas groups / Run Group verified on an official workflow (clears the deferred 14A/14B browser items).
- [ ] Resource Bindings verified on an official workflow (clears deferred P15 items).
- [ ] Product Readiness Gate from P18P–P20 checklist fully ticked.

**Gate:** all deferred verification items across every historical checklist are closed or explicitly retired. **Lados is functionally product-complete.**

### S9 — Prototype Archival & Cutover

- [ ] Aliases to Stage 2 "Active" (per 20B2 §5): existing prototype-type workflows resolve to official nodes.
- [ ] Migrate/regenerate any workflows worth keeping; delete broken prototype seed workflows from live DB.
- [ ] Move `packs/*` prototype sources to `packs/archive/` (or archive branch); remove from runtime registration and palette.
- [ ] Registry cleanup: prototype rows in `packs`/`registered_nodes` marked archived, hidden from UI.
- [ ] Update docs: prototype folders labelled reference-only; CLAUDE.md pack list updated.
- [ ] `TEST` full regression: build, 64+ jest suite, official E2E replay.

**Gate:** clean product line — only official packs visible; nothing user-facing references prototype assets.

### S10 — Production Infrastructure & Staging

- [ ] `eff` **Decision:** API+worker host (Railway / Fly.io / Render — Claude prepares comparison); web → Vercel; Redis → Upstash (verified in S3); DB → Supabase.
- [ ] `eff` Create hosting + Sentry accounts.
- [ ] Staging environment: separate Supabase project, staging env vars, seed script with official packs + demo org.
- [ ] Deploy pipeline: CI → staging on merge; production deploy manual approval; migrations dry-run on staging first.
- [ ] Observability: Sentry (api+web), pino structured logs with run correlation IDs, uptime check on `/health`, BullMQ queue-depth alert.
- [ ] `eff` Supabase production settings: PITR/backups, connection pooler; enable leaked-password protection (still outstanding from PD-3).
- [ ] Secrets in host secret store; final gitleaks sweep.

**Gate:** staging runs the full S8 E2E green.

### S11 — Launch Readiness & Go-Live

- [ ] Load: 100 concurrent runs; 1000-node plan.
- [ ] Chaos: kill worker mid-run (requeue proof); force DLQ + surface in `/jobs`; stale-Redis drill (watchdog proof).
- [ ] Advisors + org-scoping + gitleaks final re-run: zero security WARNs.
- [ ] Runbook: deploy, rollback, key rotation, DLQ triage, incident contacts.
- [ ] `eff` Production deploy + smoke test; 48-hour watch.
- [ ] Retrospective + Phase 22 backlog seeded (contract-admin/asset-fleet/people-payroll runtime, sub_workflow if deferred, Knowledge Pack marketplace build per Phase 20C spec, CIPAA template pack).

**Gate:** Lados in production. Alhamdulillah.

---

## 5. Official Pack Definition of Done (applies to every S2–S6 pack)

1. `manifest.json` + `nodes.json` pass the 20B2 validator in CI.
2. Every node: canonical capability key from the registry; ports typed and ≤ readable count (inspector carries detail); `events` declared; `resourceRequirements` and Knowledge Pack references declared where applicable.
3. Every executor: S1 contract, `ctx.log.*` only, returns `{ status, outputs }`, jest test with MockNodeContext.
4. Commercial/advisory outputs carry advisory flags; human approval nodes gate all commercial facts; provenance logged for every Knowledge Pack item used.
5. Pack README + palette grouping metadata + icon/colour per design system.
6. No imports from prototype pack source. Prototype code may be read, never linked.

## 6. Responsibility Split

| Who | Owns |
|---|---|
| **Claude** | All code: SDK/loader, executors, tests, engine fixes, UI implementation, migrations, CI, seed scripts, docs upkeep, this checklist |
| **eff** | Upstash/hosting/Sentry accounts + credentials; Supabase dashboard settings; all browser verification + visual sign-offs; architectural decisions (host choice, defer/build calls); git push after each gate; final go-live trigger |

## 7. Session Protocol

Unchanged: every session ends with ✅ Completed · 🔧 Ad-hoc outstanding · ➡️ Next task · 📝 Checklist updated (this document is the live checklist for Phase 21).

## 8. Risks

| Risk | Mitigation |
|---|---|
| Fresh-build scope creep (10 packs × executors) | Waves are gated by runnable template E2Es, not node counts; skeleton-only deferrals recorded per wave |
| Queue remains unreliable on Upstash | S3 gate blocks S8; fallback decision point: self-hosted Redis on the API host (S10 decision) |
| Prototype archival breaks existing demo data | S9 migrates or deletes explicitly; alias Stage 2 protects stored definitions |
| Single-developer bottleneck on browser verification | Verification batched per gate with prepared step scripts (PD-1 runbook pattern) |

---

*Kickoff: S0 starts immediately upon eff's confirmation. First Claude deliverable: S0 governance edits + S1 executor contract.*
