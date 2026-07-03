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
