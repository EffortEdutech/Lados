# Lados V4 Phase 27 - Official Pack Runtime Completion Checklist

**Status:** Active - S27.1 complete 2026-07-23; S27.2 next
**Master plan:** `Lados_V4_Phase27_Official_Pack_Runtime_Completion_and_PKA_Readiness_Master_Plan.md`  
**Rule:** Do not mark an item complete without the named evidence. `Code written` is not equivalent to `verified`.

**Roadmap context:** Phase 25 Multi-Run Canvas Tracking is complete. Phase 26 Flexible Multi-Tenant Org Structure is reserved but untouched. Phase 27 S27.0 is complete.

## Status legend

- `[ ]` not started
- `[~]` in progress or code-complete but not verified
- `[x]` complete with evidence
- `[B]` blocked with named dependency/owner
- `[D]` deliberately deferred with approved reason

## Phase gate summary

| Sprint | Gate | Status | Evidence |
|---|---|---|---|
| S27.0 | Complete pack/node/workflow runtime baseline | `[x]` | Generated JSON + verification report |
| S27.1 | Production-strict execution and one readiness truth | `[x]` | Runtime/API/UI/preflight/CI checks verified |
| S27.2 | First activation wave has typed config and real services | `[ ]` | Contract/integration tests |
| S27.3 | Secure Connection Profile foundation operational | `[ ]` | Migration/RLS/API/UI/security tests |
| S27.4 | Priority provider connectors make real round trips | `[ ]` | Sandbox evidence |
| S27.5 | L0-L2 packs have explicit verified outcomes | `[ ]` | Updated matrix + graph tests |
| S27.6 | Selected L3/L5 packs install and configure | `[ ]` | Setup/rollback/browser evidence |
| S27.7 | Selected proof workflows certified end to end | `[ ]` | Certification reports |
| S27.8 | Knowledge provider/PKA readiness and close-out | `[ ]` | Provider conformance + handover |

## S27.0 - Official pack runtime truth baseline

### Repository and contract inventory

- [x] Enumerate all live `packs/official/*` workspaces; exclude `archived/packs`. *(22 workspaces.)*
- [x] Record pack layer/type, version, `runtimeStatus`, dependencies, nodes, templates, and resource views.
- [x] Enumerate every official node type and canonical capability. *(103 nodes.)*
- [x] Resolve every node through the real-node resolver in a deterministic probe. *(S27.0 static probe: API resolver import + pack resolver node declaration, 103/103; executable resolver probes remain S27.1.)*
- [x] Record declared `executorStatus` against actual resolver result. *(99 implemented, 4 stub, all 103 statically wired.)*
- [x] Record injected services and configuration dependencies per executor.
- [x] Record external provider/Connection Profile requirements.
- [x] Record resource, Knowledge Pack, approval, artifact, and document dependencies.
- [x] Record unit, integration, provider, graph, and E2E test evidence. *(Repository evidence only; provider/live claims remain explicitly unverified.)*
- [x] Flag manifest capabilities with no corresponding node. *(Recorded per pack; Workflow Foundation's event trigger remains an intentional service-level capability.)*
- [x] Flag workflow/template references to unknown, aliased, disabled, stub, or missing nodes. *(Three graph bodies validated for node IDs/types, ports, and cycles; Video Production references one declared stub.)*

### Prepared workflow demand map

- [x] Enumerate every L3 Solution Pack workflow/template. *(8 descriptors across 2 packs.)*
- [x] Enumerate every L5 Template Pack workflow/template. *(5 descriptors across 5 packs.)*
- [x] Expand each workflow into required nodes, services, resources, connections, roles, and knowledge. *(Three graph-backed workflows expanded; 13 descriptor-only assets classified as under-specified and blocked from exact expansion.)*
- [x] Identify the exact missing capability blocking each workflow. *(Primary blocker for 13 assets is the missing importable workflow graph body.)*
- [x] Score missing capabilities by workflows unlocked, business value, reuse, cost, and sandbox availability.
- [x] Recommend first node/service activation wave. *(Production strict first; Document Intelligence and typed configuration next.)*
- [x] Recommend first L4 provider wave. *(Provider-neutral connection/HTTP/webhook/file/OAuth foundation first; specific Microsoft/Google family deferred until graph bodies expose exact demand.)*
- [x] Recommend first L3/L5 certification set. *(Contractor Ops trip dispatch first, fleet maintenance second; graph-backed Quran Media verification and Video planning-only path in parallel as appropriate.)*
- [x] Give every prepared pack an initial readiness state and reason. *(11 runtime-ready, 4 degraded, 7 catalogue-only, 0 statically blocked.)*

### S27.0 gate

- [x] Matrix contains every live official pack exactly once.
- [x] Matrix contains every live official node exactly once.
- [x] Every prepared L3/L5 workflow has a dependency result.
- [x] No runtime claim relies only on manifest prose. *(Static resolver and repository evidence are distinguished from provider/live certification.)*
- [x] First activation/provider/certification waves selected for the Phase 27 sequence.

**Evidence paths:**

- [x] Generated machine-readable readiness report: `artifacts/runtime-readiness/official-pack-readiness.json`.
- [x] Human-readable report: `docs/Lados/V4/Verification/Phase27_Official_Pack_Runtime_Baseline.md`.
- [x] Repeatable generator: `tools/generate-phase27-runtime-baseline.cjs` via `npm run baseline:phase27`.
- [x] Handover entry added to master plan and this checklist.

## S27.1 - Production-strict execution and readiness reporting

### Execution modes

- [x] Add explicit `development-simulation`, `test`, and `production-strict` modes.
- [x] Make production default strict.
- [x] Remove generic unknown-node success from production execution.
- [x] Require explicit test mock registration.
- [x] Watermark development simulations in outputs/logs. *(Node log execution source and warning are persisted; domain output envelopes remain unchanged to preserve node contracts.)*
- [x] Return structured `EXECUTOR_NOT_AVAILABLE` failure.
- [x] Add regression tests for unknown, stub, degraded, and real executors. *(S27.1 baseline tests plus existing official-pack and real-chain suites.)*

### Runtime truth service

- [x] Implement manifest/resolver/service/test reconciliation. *(Manifest + live resolver + tests complete; external connector configuration certification remains S27.3.)*
- [x] Generate node readiness state.
- [x] Generate pack readiness state.
- [x] Expose readiness through API.
- [x] Surface readiness in Marketplace.
- [x] Surface readiness in node palette/inspector. *(Unavailable skills remain visible but cannot be dragged.)*
- [x] Block or warn workflow publish/run based on required readiness. *(Stub/missing nodes block before publish snapshot or run creation.)*
- [x] Persist real/degraded/simulated/test-mock execution evidence. *(Execution source is in node logs; degraded is recorded as readiness evidence rather than an executor source.)*
- [x] Add CI failure for contradictory runtime claims. *(`pnpm readiness:check`.)*

### S27.1 gate

- [x] Unknown node fails in production-strict mode.
- [x] Test mocks continue to work only in tests.
- [x] API, UI, build report, and resolver show the same readiness.
- [x] No pack with a required stub/missing executor displays runtime-ready.

## S27.2 - Typed configuration and shared service completion

### Configuration

- [ ] Select packs/nodes from S27.0 activation wave.
- [ ] Replace generic strings with actual field types.
- [ ] Add required/default/validation rules.
- [ ] Add resource and Knowledge Pack reference fields.
- [ ] Add file/document fields.
- [ ] Add future Connection Profile selectors where required.
- [ ] Verify configuration fits and functions in canvas UI.
- [ ] Add DTO/manifest/executor contract tests.

### Services

- [ ] Confirm and implement selected document parsing gaps.
- [ ] Confirm and implement document/library storage gap.
- [ ] Confirm and implement selected spreadsheet operations.
- [ ] Confirm and implement notification recipient lookup gaps.
- [ ] Add timeout, retry, idempotency, and structured error conventions.
- [ ] Add audit/provenance behavior.
- [ ] Remove stub status only after the real path passes tests.
- [ ] Reclassify unselected gaps honestly.

### S27.2 gate

- [ ] Selected nodes are configurable without editing JSON.
- [ ] Selected executors invoke real services.
- [ ] Missing dependencies fail loudly.
- [ ] Contract and integration tests pass.

## S27.3 - Connection Profiles and connector runtime foundation

### Schema and security

- [ ] Design organization-scoped Connection Profile model.
- [ ] Draft next free migration only after confirming migration head.
- [ ] Add RLS for read/create/update/disable/revoke.
- [ ] Define encrypted secret/token reference boundary.
- [ ] Prove secrets never return through API DTOs.
- [ ] Prove secrets never enter workflow JSON or execution logs.
- [ ] Add audit events for create/test/refresh/disable/revoke.

### Runtime

- [ ] Define provider adapter contract.
- [ ] Inject secret-safe connector access into real-node service composition.
- [ ] Implement connection health checks.
- [ ] Implement OAuth authorize/callback/refresh/revoke foundation where selected.
- [ ] Implement webhook register/verify/renew/remove foundation where selected.
- [ ] Implement retry, timeout, pagination, rate-limit, and idempotency helpers.
- [ ] Implement provider error normalization.
- [ ] Add connection selector manifest/config field.

### UI

- [ ] Connection list and status.
- [ ] Add/connect flow.
- [ ] Scope/permission display.
- [ ] Test connection command.
- [ ] Reconnect/disable/revoke commands.
- [ ] Clear expired/unhealthy state.

### S27.3 gate

- [ ] Organization admin can create, test, use, disable, and revoke a connection.
- [ ] Unauthorized organization member cannot manage connections.
- [ ] Node accesses provider through a reference, not raw credentials.
- [ ] Secret-leakage tests pass.

## S27.4 - Priority L4 connector wave

### Demand confirmation

- [ ] Confirm selected provider family and exact actions/triggers.
- [ ] Name workflows unlocked by each connector node.
- [ ] Confirm sandbox/test accounts and required scopes.
- [ ] Record provider API/licence/usage constraints.

### Implementation per connector node

- [ ] Typed manifest/configuration.
- [ ] Real executor.
- [ ] Typed connector service method.
- [ ] Input/output schema and port tests.
- [ ] Authentication/scope failure.
- [ ] Expired token/refresh behavior.
- [ ] Timeout/retry behavior.
- [ ] Rate-limit behavior.
- [ ] Pagination behavior where relevant.
- [ ] Attachment/file limits where relevant.
- [ ] Idempotency/duplicate-event behavior where relevant.
- [ ] Provider error mapping.
- [ ] Sandbox round trip.
- [ ] Readiness report updated.

### S27.4 gate

- [ ] Every selected connector performs a real provider round trip.
- [ ] Every selected connector has negative-path evidence.
- [ ] Named prepared workflows are unblocked at the connector layer.
- [ ] No unverified connector displays provider-ready.

## S27.5 - Remaining official node and pack activation

- [ ] Re-run complete runtime matrix after S27.2-S27.4.
- [ ] Finish demanded L0-L2 executor/service gaps.
- [ ] Complete typed configuration for activated packs.
- [ ] Add cross-pack graph tests.
- [ ] Test resource creation/transitions.
- [ ] Test human approval and request-input pause/resume.
- [ ] Test document and artifact handoff.
- [ ] Test communication handoff.
- [ ] Test existing Knowledge Pack references and provenance.
- [ ] Assign every remaining stub/degraded node an owner, blocker, defer, or reclassification.
- [ ] Assign every L0-L2 pack an explicit readiness state.

### S27.5 gate

- [ ] No ambiguous L0-L2 readiness remains.
- [ ] Runtime-ready packs have graph-level evidence.
- [ ] Degraded packs expose limitations.
- [ ] Blocked packs name the missing service/provider/decision.

## S27.6 - Solution/Template installer and setup experience

### Installer

- [ ] Validate Capability Pack versions.
- [ ] Validate node/executor readiness.
- [ ] Validate Connection Profiles and scopes.
- [ ] Validate resources and bindings.
- [ ] Validate roles/permissions.
- [ ] Validate Knowledge Pack/provider requirements.
- [ ] Validate workflow schema and aliases.
- [ ] Support atomic install/rollback.

### Setup experience

- [ ] Connection selection/test.
- [ ] Resource creation/binding.
- [ ] Role/assignee configuration.
- [ ] Required knowledge selection.
- [ ] Sample input.
- [ ] Expected output.
- [ ] Publish/run readiness summary.
- [ ] Clear blocked/degraded findings.

### Pack activation

- [ ] Select first L3 certification pack(s).
- [ ] Select first L5 certification pack(s).
- [ ] Supply proof workflow and fixtures.
- [ ] Supply expected artifacts/results.
- [ ] Supply failure/human-review boundaries.
- [ ] Give every unselected L3/L5 pack an explicit status.

### S27.6 gate

- [ ] Non-developer installs selected pack without JSON editing.
- [ ] Missing dependency blocks before run.
- [ ] Failed setup rolls back cleanly.
- [ ] Browser verification passes.

## S27.7 - End-to-end pack certification

### Proof workflow coverage

- [ ] Document ingest/extract/generate/store proof.
- [ ] Communication trigger/process/approve/respond proof.
- [ ] Professional resource/QS/procurement/contract/construction proof.
- [ ] Program/Stage Gate/artifact proof.
- [ ] Knowledge Pack lookup/provenance proof.

### Operational behavior

- [ ] Real provider connection used where declared.
- [ ] No simulated node executed.
- [ ] Retry and rate-limit behavior verified.
- [ ] Duplicate/idempotent trigger behavior verified.
- [ ] Pause/resume survives process boundaries.
- [ ] Failure stops downstream unsafe work.
- [ ] Resources/artifacts persist correctly.
- [ ] Audit and provenance are complete.
- [ ] UI shows live and terminal state correctly.

### S27.7 gate

- [ ] Selected certification set passes end to end.
- [ ] Certification report records pack/node/provider versions.
- [ ] Remaining packs have explicit blockers or defer decisions.
- [ ] Marketplace certification states match evidence.

## S27.8 - PKA contract readiness and close-out

### Build before first KF PKA

- [ ] Confirm contract package name with KF `packages/pka` vocabulary.
- [ ] Define `KnowledgeProvider`.
- [ ] Define query/result/reference/provenance contracts.
- [ ] Define requirement validation contract.
- [ ] Define bounded context-bundle contract.
- [ ] Implement `LocalKnowledgePackProvider` over `DataPacksService`.
- [ ] Implement `TestKnowledgeProvider`.
- [ ] Add optional knowledge requirements to one proof workflow.
- [ ] Record provider-qualified execution provenance.
- [ ] Prove existing Knowledge Pack behavior remains compatible.

### Prepare KF handshake

- [ ] Document required valid and invalid KF fixtures.
- [ ] Define expected install-decision parity test skeleton.
- [ ] Document deferred importer/schema/mapping/signing work.
- [ ] Do not create production PKA tables from assumptions.
- [ ] Do not claim Installed PKA support before a real package passes parity.

### Full close-out

- [ ] `pnpm build:packages` passes.
- [ ] `pnpm build:packs` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm --filter api test` passes.
- [ ] `pnpm --filter web typecheck` passes.
- [ ] `pnpm validate:official-packs` passes.
- [ ] Provider/browser E2E evidence recorded.
- [ ] Security tests pass.
- [ ] Runtime readiness report regenerated.
- [ ] Graphify refreshed after structural code changes.
- [ ] AGENTS/current-phase guidance updated.
- [ ] Master-plan handover and residual backlog completed.

### S27.8 gate

- [ ] Phase 27 definition of done is satisfied.
- [ ] Existing Knowledge Packs work through provider boundary.
- [ ] Lados is ready for KF fixture parity when the first PKA exists.
- [ ] No unfinished work is described as production-ready.

## Decision register

| Decision | Recommended answer | Confirmed |
|---|---|---|
| Runtime readiness source | Generated evidence, not manifest prose | `[ ]` |
| Missing executor in production | Fail strict | `[ ]` |
| Connector prioritization | Prepared-workflow demand score | `[ ]` |
| Provider certification | Real sandbox/test account required | `[ ]` |
| L3/L5 completion | Prioritized certification plus explicit outcomes for all | `[ ]` |
| PKA work before manufacture | Contracts + Knowledge Pack adapter only | `[ ]` |
| Final PKA importer/schema | Wait for real package and fixture parity | `[ ]` |

## Handover log

### 2026-07-22 (1) - Checklist created; implementation not started

Created alongside the re-centered Phase 27 master plan. The first executable task is S27.0 inventory and demand mapping. Existing dirty-worktree changes are unrelated and must not be reverted.

**Next:** confirm the plan/decision register, then generate the official pack/node/workflow readiness baseline.

### 2026-07-22 (2) - S27.0 complete

Generated and verified the complete static baseline. See the checked S27.0 items and evidence paths above, plus master-plan handover entry (3) for findings, ad-hoc outstanding work, activation decisions, and verification limits.

**Next:** S27.1 production-strict execution and readiness reporting.

### 2026-07-22 (3) - Quran Media workspace resolution repaired

- [x] Refresh pnpm workspace links offline.
- [x] Add missing Quran Media API importer entry to `pnpm-lock.yaml`.
- [x] Confirm `apps/api/node_modules/@lados/official-quran-media` junction exists.
- [x] Add Religious Source and Current Issue Research stubs to the recovery spec's `ExecutionService` constructor.
- [x] Quran Media pack build passes.
- [x] API typecheck passes.
- [x] Targeted tests pass: 3 suites, 76 tests.

**Next:** S27.1 remains the next planned sprint.
