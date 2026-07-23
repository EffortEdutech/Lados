# Lados V4 Phase 27 - Official Pack Runtime Completion and PKA Readiness Master Plan

| Field | Decision |
|---|---|
| Status | Active - S27.2 in progress; Document Intelligence activation slice complete 2026-07-23 |
| Primary objective | Make every prepared official pack honestly installable, configurable, and executable in Lados |
| Secondary objective | Prepare stable PKA-facing runtime contracts without waiting for or inventing the first KF PKA |
| Depends on | Phase 25 Multi-Run Canvas Tracking complete; Phase 26 Flexible Multi-Tenant Org Structure is reserved but untouched; official pack catalogue; execution engine; Knowledge Pack engine |
| Delivery posture | Evidence-driven, additive, production-strict, fail loud, certify end to end |
| Live checklist | `Lados_V4_Phase27_Official_Pack_Runtime_Completion_Checklist.md` |

## 0. Executive decision

Phase 27 completes the operational path from a pack being visible in Lados to that pack performing real work.

The acceptance rule is deliberately strict:

> No pack is presented as runtime-ready unless its declared executable content resolves to real executors, has usable configuration, has its required services and connections available, fails loudly when dependencies are unavailable, and passes its declared integration or end-to-end certification gate.

The current platform is not a canvas-only placeholder. Many L0-L2 nodes already have real executors. The gap is that runtime truth is fragmented:

- some nodes are implemented;
- some are degraded behind missing infrastructure;
- some are explicit stubs;
- some manifest capabilities have no executable node;
- L3 Solution Packs and L5 Template Packs are not all certified applications;
- L4 provider connector coverage is largely missing;
- missing executors can still fall back to mock behavior;
- the first KF PKA has not yet been manufactured.

Phase 27 resolves these conditions in dependency order. PKA readiness is included, but final PKA import/storage work waits for a real KF package and contract fixtures.

## 1. Target operating model

```text
Official Pack Manifest
  -> runtime truth validator
  -> typed configuration and dependency declaration
  -> real node executor
  -> Lados domain service
  -> provider connector when external access is required
  -> workflow/template dependency validation
  -> integration and E2E certification
  -> honest Marketplace readiness state
```

For knowledge-dependent nodes:

```text
Professional node
  -> KnowledgeProvider contract
       +-- existing LocalKnowledgePackProvider
       +-- deterministic TestKnowledgeProvider
       +-- future InstalledPkaProvider after KF publishes a PKA
  -> bounded knowledge result/context
  -> execution provenance and human review
```

## 2. Product boundaries

### 2.1 Capability Packs

Capability Packs own executable nodes and their domain behavior. A Capability Pack is functional only when its runtime-enabled nodes resolve to real executors and their service dependencies are operable.

### 2.2 Solution and Template Packs

L3 Solution Packs and L5 Template Packs compose Capability Packs. They do not become functional merely because their JSON is valid. They require:

- dependency-aware installation;
- configuration and connection readiness;
- resource and permission setup;
- executable workflow definitions;
- sample/fixture inputs;
- declared expected outputs;
- end-to-end certification.

### 2.3 Integration Packs

L4 packs provide external-system connectivity. They own provider-specific authentication, triggers, actions, pagination, retries, rate limits, webhooks, and error mapping. They do not own professional business rules.

### 2.4 Knowledge Packs and PKAs

- Existing Knowledge Packs remain versioned governed reference catalogues.
- A PKA is a broader governed professional asset manufactured by KF.
- Lados owns runtime installation, retrieval, execution, tenant data, and client adaptation.
- KF owns Base PKA authoring, review, approval, publishing, and versioning.
- Phase 27 prepares the provider boundary now but does not fabricate a production PKA importer around a package that does not yet exist.

## 3. Definition of functional

### 3.1 Node readiness states

Every registered node must have one generated state:

| State | Meaning |
|---|---|
| `manifest_only` | Declared for discovery; no executable claim |
| `missing_executor` | Runtime is claimed or expected, but no real executor resolves |
| `stub` | Executor exists only to report unimplemented behavior |
| `degraded` | Real behavior exists but a required/optional dependency is unavailable |
| `implemented` | Real executor and service behavior pass contract tests |
| `integration_verified` | Real service boundary passes an integration test |
| `provider_verified` | External provider sandbox/test account path passes |
| `certified_e2e` | Declared workflow proof passes end to end with provenance |

`executor_status` in manifests is an input to this result, not its source of truth. Resolver probes and tests must agree with the declaration.

### 3.2 Pack readiness states

Pack readiness is derived from nodes, dependencies, and verification evidence:

| State | Meaning |
|---|---|
| `catalogue_only` | Discoverable but not installable as operational runtime |
| `blocked` | Required executor, service, connector, schema, or dependency is missing |
| `degraded` | Safe partial operation exists and limitations are explicit |
| `runtime_ready` | All declared runtime nodes are implemented and locally verified |
| `provider_ready` | Required external providers are verified |
| `certified_e2e` | Pack proof workflow passes from user input to durable output |

The Marketplace, node palette, workflow validator, and run logs must use the same generated readiness result.

### 3.3 Production behavior

- No generic mock success for an unresolved node.
- No silent downgrade from provider action to fabricated output.
- Stubs return a structured failure before side effects.
- Degraded operation is allowed only when declared, visible, and safe.
- Required connector or knowledge capability failures block publish/run as appropriate.
- Test mocks are explicitly registered inside tests only.

## 4. Architecture decisions

### AD-25.1 - Generate runtime truth

Create a runtime-readiness service and build-time report that reconciles:

- official pack manifest and `nodes.json`;
- `runtimeStatus` and `executorStatus` declarations;
- real-node resolver availability;
- required injected services;
- required Connection Profiles;
- node contract, integration, provider, and E2E test evidence;
- template/solution dependencies.

The generated report becomes the source for API/UI readiness displays and CI gates.

### AD-25.2 - Add production-strict execution

Execution modes:

| Mode | Missing executor behavior |
|---|---|
| `development-simulation` | Explicitly registered simulation, visibly watermarked |
| `test` | Only test-registered mocks are permitted |
| `production-strict` | Structured `EXECUTOR_NOT_AVAILABLE` failure; workflow stops |

Production defaults to strict. An unknown node must never return success containing only its type.

### AD-25.3 - Keep executors thin

```text
Node executor
  validates NodeContext/configuration
  calls a typed Lados service
  maps service result to declared output ports
  returns success/failure/pause
```

Services own domain logic, external SDK use, retry behavior, error normalization, audit, and idempotency. Provider SDK calls must not be duplicated across node executors.

### AD-25.4 - Build one connection foundation

All connector packs use shared organization-scoped Connection Profiles with:

- provider and connection type;
- encrypted secrets or OAuth token references;
- scopes and granted permissions;
- owner/organization access policy;
- health and last verification status;
- expiry/refresh metadata;
- disable, reconnect, revoke, and rotation lifecycle;
- audit events;
- secret-safe executor access.

Credentials must never enter workflow definitions, node configuration, API responses, execution logs, or PKA content.

### AD-25.5 - Build connectors from workflow demand

Do not build a broad connector catalogue speculatively. First map every prepared L3/L5 workflow to the exact external triggers/actions it needs. Prioritize connector capabilities by:

1. number of currently blocked workflows unlocked;
2. business importance of those workflows;
3. shared reuse across packs;
4. implementation/security cost;
5. availability of provider sandbox accounts.

### AD-25.6 - Separate connector primitives and provider packs

Shared primitives may include HTTP, webhook lifecycle, file transfer, pagination, retry, rate limiting, and OAuth helpers. Provider packs own vendor-specific schemas and behavior such as Gmail, Outlook, SharePoint, or Google Sheets.

### AD-25.7 - Prepare PKA seams without inventing the package

Build only stable runtime-facing abstractions before the first KF PKA:

- `KnowledgeProvider`;
- knowledge queries/results;
- requirement declarations;
- provider-qualified references;
- provenance contracts;
- bounded context-bundle contract;
- `LocalKnowledgePackProvider` over `DataPacksService`;
- `TestKnowledgeProvider`.

Defer final PKA schema normalization, production importer, workflow component mapping, signing, and semantic upgrade behavior until KF supplies a sanitized real package plus valid/invalid fixtures.

## 5. Workstream A - Runtime truth and safety

### 5.1 Inventory outputs

The inventory must enumerate every live official pack and node, excluding `archived/packs`, and record:

- layer and pack type;
- node type and canonical capability;
- declared executor/runtime status;
- real resolver result;
- injected services;
- configuration fields and types;
- resource/Knowledge Pack dependencies;
- external connection requirements;
- contract/integration/provider/E2E tests;
- workflows/templates referencing the node;
- blocking gap and recommended owner sprint.

### 5.2 Validator rules

CI/build validation fails when:

- a node claims implemented but no real executor resolves;
- a runtime-ready pack contains a required stub/missing executor;
- a template references unknown or disabled node types;
- configuration declares a Connection Profile that the executor cannot consume;
- declared input/output ports contradict implementation evidence;
- a certified pack lacks its named proof workflow/test.

### 5.3 Execution evidence

Persist per-node execution mode and readiness evidence with each run:

- `real`, `degraded`, `simulated`, or `test_mock`;
- pack ID/version;
- executor version/build;
- connector/connection reference without secrets;
- warnings and limitations.

`simulated` cannot occur in production-strict mode.

## 6. Workstream B - Configuration and service completion

### 6.1 Typed configuration

Replace generic derived strings with real manifest fields as each pack is activated:

- string/text;
- number and currency;
- boolean/toggle;
- select/multiselect;
- date/datetime;
- resource picker;
- Knowledge Pack item/reference;
- file/document input;
- Connection Profile selector;
- validation, defaults, conditional visibility, and secret-safe fields.

Do not attempt a blind bulk conversion. Configuration is completed pack by pack with executor tests.

### 6.2 Shared services to finish or introduce

- document parsing and generation;
- document/library storage;
- spreadsheet read/write;
- email send/read and attachments;
- notification recipient resolution;
- HTTP and webhook handling;
- provider authentication/token lifecycle;
- external file/storage operations;
- retry, timeout, pagination, rate-limit, and idempotency policies;
- structured provider error mapping;
- connector health probes.

### 6.3 Known baseline gaps to verify in S27.0

The audit identifies these as examples, not an exhaustive final list:

- PDF and DOCX extraction;
- generated-document save-to-library wiring;
- inbound Gmail/Outlook email access and provider triggers;
- real SMS provider;
- organization/role notification lookup;
- genuine Knowledge Pack retrieval where nodes currently pass references through or use simple keyword matching;
- provider calendar, cloud storage, online spreadsheet, Slack, Teams, WhatsApp, accounting, CRM, and ERP actions;
- any node whose real service is configuration-gated or whose current executor is explicitly marked stub.

The inventory, not this prose list, decides final scope.

## 7. Workstream C - Connector foundation and L4 packs

### 7.1 Foundation capabilities

Recommended order:

1. Connection Profile schema, RLS, encryption boundary, API, and UI.
2. Provider adapter contract and secret-safe execution context.
3. Authenticated HTTP request and health probe.
4. Inbound webhook subscription/verification/renewal.
5. OAuth authorization, refresh, revoke, and scope handling.
6. Shared retry, pagination, rate-limit, timeout, and idempotency middleware.
7. File/attachment transfer and safe content limits.
8. Connector observability and health dashboard.

### 7.2 Provider waves

Final priority is determined by S27.0 demand mapping. Expected candidate waves:

**Wave 1 - Document and communication foundations**

- SMTP send and IMAP receive where suitable;
- document storage and attachment handling;
- PDF/DOCX extraction;
- spreadsheet file operations;
- generic HTTP/webhook.

**Wave 2 - Microsoft 365**

- Outlook Mail;
- Microsoft Calendar;
- OneDrive;
- SharePoint;
- Excel Online;
- Teams.

**Wave 3 - Google Workspace**

- Gmail;
- Google Calendar;
- Google Drive;
- Google Sheets.

**Wave 4 - Business-specific integrations**

- Slack/WhatsApp/SMS providers;
- accounting, CRM, ERP, supplier, or other systems required by prepared solutions.

Provider waves may be reordered or reduced after the demand matrix. A provider pack is not certified without a real sandbox/test-account path.

## 8. Workstream D - Solution and Template activation

### 8.1 Installation contract

L3/L5 installation validates:

- Capability Pack versions;
- node/executor readiness;
- required Connection Profiles and scopes;
- required resources and bindings;
- required Knowledge Packs/provider capabilities;
- roles and permissions;
- workflow JSON schema;
- configuration completeness;
- setup steps and rollback behavior.

### 8.2 Setup experience

Each activated solution/template supplies:

- purpose and operational owner;
- dependency list;
- setup wizard fields;
- connection selection/test;
- required resource creation/binding;
- sample input or deterministic fixture;
- expected output/artifact;
- failure and human-review boundaries;
- proof workflow and certification record.

### 8.3 Certification contract

Each prepared L3/L5 pack is assigned one outcome:

- certified in Phase 27;
- blocked by named external dependency/account decision;
- deliberately catalogue-only with honest UI status;
- retired/superseded through a separate approved decision.

No pack is silently omitted from the final matrix.

## 9. Workstream E - PKA readiness before KF manufacture

### 9.1 Build now

Create a small portable contract package, provisionally `@lados/knowledge-sdk` or `@lados/pka-sdk`, only after checking naming against KF `packages/pka`. It should contain runtime-neutral types for:

- `KnowledgeProvider`;
- `KnowledgeRequirement` and validation result;
- provider-qualified asset/object references;
- search/query/result;
- provenance and source references;
- governance mode;
- bounded context bundle;
- runtime limitations and human-review requirements.

Implement:

- `LocalKnowledgePackProvider` over the existing `DataPacksService`;
- `TestKnowledgeProvider` for deterministic workflow tests;
- optional knowledge requirements on nodes/templates/workflows;
- execution provenance that preserves provider, asset, version, source, assumptions, and advisory status.

### 9.2 Defer until KF supplies the first PKA

- final archive importer and storage layout;
- normalized PKA component database schema;
- exact KF manifest/component validators;
- Base PKA installation/upgrade UI;
- KF workflow component mapper;
- package signing and publisher trust;
- semantic diff/rollback rules;
- remote KF Runtime Knowledge Service/provider;
- production vector/hybrid retrieval.

### 9.3 Contract handshake gate

When KF produces the first sanitized package, S27.PKA resumes with:

1. valid package fixture;
2. malformed fixture;
3. missing-governance fixture;
4. missing-component fixture;
5. capability-mismatch fixture;
6. review-required fixture;
7. package version/update fixture;
8. expected KF harness decisions.

Lados does not freeze its production importer until the KF and Lados fixture decisions agree.

## 10. Sprint plan

### S27.0 - Official pack runtime truth baseline

**Goal:** know exactly what is real, stubbed, degraded, missing, or unverified.

- Generate the complete pack/node readiness matrix.
- Map every L3/L5 workflow to nodes, services, resources, Knowledge Packs, and connectors.
- Reconcile manifests with the real resolver.
- Identify false runtime-ready claims and unknown node references.
- Rank gaps by number/value of workflows unlocked.
- Freeze the first activation wave from evidence.

**Gate:** every live official pack and node appears once in the matrix, every prepared workflow has a dependency result, and Phase 27 implementation priorities are evidence-backed.

### S27.1 - Production-strict execution and readiness reporting

**Goal:** eliminate silent success and establish one runtime truth surface.

- Add execution modes and strict resolver failure.
- Restrict mocks to development simulation or explicit tests.
- Implement runtime readiness service/API and build report.
- Persist real/degraded/simulated execution evidence.
- Surface readiness in Marketplace, palette, workflow validation, and logs.
- Add manifest/resolver contradiction tests.

**Gate:** no unresolved node can succeed in production; UI/API/CI agree on readiness.

### S27.2 - Typed configuration and shared service completion

**Goal:** make the first activation wave genuinely configurable and operable.

- Replace generic config fields for selected packs.
- Complete document, library, spreadsheet, notification, and other high-reuse services selected by S27.0.
- Normalize structured errors, timeouts, idempotency, and audit behavior.
- Convert known stubs only when their real service path exists.
- Add contract and integration tests.

**Gate:** selected L0-L2 nodes run with real inputs/outputs and no hidden service fallback.

### S27.3 - Connection Profiles and connector runtime foundation

**Goal:** provide one secure base for all L4 provider packs.

- Add schema/migration, RLS, API, and UI.
- Implement encryption/secret reference boundary.
- Add provider adapter, health, OAuth/webhook foundations, retries, pagination, rate limits, and idempotency.
- Add connection selector manifest field and node binding.
- Add audit and secret-leakage tests.

**Gate:** an organization admin can create/test/disable a connection, and a node can use it without exposing credentials.

### S27.4 - Priority L4 connector wave

**Goal:** unlock the greatest number of prepared workflows.

- Implement only the provider actions/triggers selected by S27.0.
- Add typed node manifests and real executors backed by connector services.
- Add sandbox/provider integration tests.
- Add reconnect, expired-token, rate-limit, pagination, attachment/file, and provider-error cases.
- Update runtime matrix continuously.

**Gate:** each selected connector completes a real provider round trip and unlocks its named workflow set.

### S27.5 - Remaining official node and pack activation

**Goal:** close required executor/service gaps across the selected Capability Packs.

- Finish or honestly reclassify remaining stubs/degraded nodes.
- Complete pack configuration schemas.
- Add graph-level tests for cross-pack chains.
- Validate resource, approval, artifact, document, communication, and knowledge handoffs.
- Record blockers that require provider accounts or product decisions.

**Gate:** every L0-L2 pack is `runtime_ready`, explicitly `degraded`, or blocked with named evidence; none is ambiguously functional.

### S27.6 - Solution/Template installer and setup experience

**Goal:** turn prepared L3/L5 assets into operable installations.

- Implement dependency-aware validation/installation.
- Add setup wizard for connections, resources, bindings, roles, and knowledge requirements.
- Add sample inputs, expected outputs, and rollback.
- Validate workflows before publish/run.
- Select and activate the first solution/template certification set.

**Gate:** a non-developer can install, configure, and start each selected solution without editing JSON or supplying secrets to a node.

### S27.7 - End-to-end pack certification

**Goal:** prove prepared packs through real operational workflows.

- Run each selected proof workflow from input/trigger through durable output.
- Include connector, document, human approval, resource, artifact, and knowledge paths where declared.
- Verify failure, retry, pause/resume, idempotency, audit, and provenance.
- Publish certification evidence and honest remaining blocker list.
- Ensure non-certified packs cannot display a certified/runtime-ready claim.

**Gate:** the agreed certification set is green end to end and every other prepared pack has an explicit readiness outcome.

### S27.8 - PKA contract readiness and Phase close-out

**Goal:** make Lados ready to consume the first KF PKA without pretending it exists.

- Finalize Knowledge Provider runtime contracts.
- Implement Local Knowledge Pack and test providers.
- Add knowledge requirement/provenance support to one certified proof workflow.
- Prepare the KF/Lados fixture parity harness skeleton.
- Document exactly what Lados needs from KF's first manufactured PKA.
- Run full build/test/browser/security checks.
- Refresh Graphify, roadmap, AGENTS guidance, and handover.

**Gate:** existing Knowledge Packs are consumable through the provider boundary, one proof workflow records governed knowledge provenance, and the first KF package can be integrated through fixture parity rather than redesign.

## 11. Certification proof workflows

S27.0 selects the final set, but it should cover these capability classes:

1. **Document workflow:** ingest PDF/DOCX/XLSX -> extract/validate -> generate document -> save artifact/library.
2. **Communication workflow:** real inbound trigger/message -> process attachment/data -> human approval -> real outbound response.
3. **Professional operations workflow:** business resource -> QS/procurement/contract/construction node chain -> evidence/provenance -> durable output.
4. **Program governance workflow:** workflow stage -> Stage Gate -> resume -> cross-stage artifact.
5. **Knowledge workflow:** existing Knowledge Pack requirement -> governed lookup -> professional node -> provenance and limitations.

No proof workflow may depend on simulated success.

## 12. Definition of done

Phase 27 is complete only when:

1. Every live official pack/node has generated runtime truth.
2. Every prepared L3/L5 workflow has a dependency and readiness result.
3. Production cannot silently run a missing executor as a mock.
4. Runtime-ready nodes have real typed configuration.
5. Real executors call real services with structured failure behavior.
6. Connector nodes use secure organization Connection Profiles.
7. Priority providers pass sandbox/test-account round trips.
8. Selected solutions/templates install through a setup flow.
9. Selected proof workflows pass end to end without simulated nodes.
10. Marketplace, palette, validation, execution, and CI show consistent readiness.
11. Non-certified packs are clearly blocked, degraded, or catalogue-only.
12. Existing Knowledge Packs still work and are available through the Knowledge Provider boundary.
13. Lados is contract-ready for the first KF PKA without freezing invented package assumptions.

## 13. Verification requirements

| Layer | Required evidence |
|---|---|
| Manifest | Schema validation, node/capability parity, typed configuration |
| Resolver | Real executor probe and strict unknown-node failure |
| Service | Unit and integration tests, failure/timeout/idempotency behavior |
| Connection | RLS, encryption boundary, health, scopes, refresh/revoke, no secret leakage |
| Provider | Sandbox round trip, retry, pagination, rate limit, provider errors |
| Workflow | Graph-level chain, ports, resources, pause/resume, provenance |
| Solution/template | Dependency check, setup, rollback, sample input, expected output |
| UI | Readiness, setup, blocked/degraded states, logs, responsive behavior |
| Security | Tenant isolation, permission checks, secret/log scanning, unsafe input limits |
| PKA readiness | Provider conformance, Knowledge Pack compatibility, fixture harness contract |

Standing verification loop:

```text
pnpm build:packages
pnpm build:packs
pnpm typecheck
pnpm --filter api test
pnpm --filter web typecheck
pnpm validate:official-packs
```

Provider-enabled sprints additionally require named sandbox/browser E2E evidence. Passing the local fallback alone does not certify a connector.

## 14. Non-goals

- building every possible SaaS connector;
- replacing the Lados workflow engine with n8n or another engine;
- claiming all official packs are equally mature before evidence exists;
- embedding provider SDK calls directly throughout node executors;
- storing credentials in workflows, logs, fixtures, or PKAs;
- redesigning KF authoring or manufacturing;
- freezing a production PKA schema before the first KF package/fixtures exist;
- converting every Knowledge Pack into a PKA;
- allowing arbitrary third-party executable code through a knowledge package;
- rewriting historical migrations or Phase 19-24 records.

## 15. Risks and controls

| Risk | Control |
|---|---|
| Pack appears functional because it renders | Generated runtime truth and certification badges |
| Missing executor reports success | Production-strict execution |
| Connector effort grows without bound | Workflow-demand prioritization |
| Credentials leak into node config/logs | Connection Profiles and secret-reference boundary |
| Executors duplicate provider logic | Thin executors and shared typed services |
| Provider tests cannot run | Block provider certification; retain explicit status |
| Generic schemas make real nodes unusable | Pack-by-pack typed configuration completion |
| L3/L5 JSON mistaken for application readiness | Installer/setup/E2E certification gates |
| Knowledge Pack confused with future PKA | Separate terminology and provider-qualified references |
| PKA importer built against guesses | Wait for KF package plus fixture parity |
| Existing user workflows regress | Additive fields, aliases where needed, workflow inventory, regression tests |

## 16. Decisions to confirm at S27.0

Recommended defaults:

1. Readiness source: **generated manifest + resolver + dependency + test evidence**.
2. Production behavior: **strict failure for unresolved executors**.
3. Connector priority: **workflow-demand score, not catalogue ambition**.
4. First provider family: **not yet evidence-selectable because 13 L3/L5 descriptors have no workflow graph body; build the provider-neutral foundation first and select the family after graph demand extraction**.
5. Provider certification: **real sandbox/test account required**.
6. Existing explicit stubs: **finish when demanded; otherwise reclassify honestly**.
7. L3/L5 scope: **certify a prioritized set, give every remaining pack an explicit outcome**.
8. PKA work now: **provider contracts and Knowledge Pack adapter only**.
9. PKA importer: **defer final design until KF provides the first package and fixture matrix**.

## 17. Handover log

### 2026-07-22 (1) - Plan re-centered on executable official packs

The first Phase 27 draft focused on KF PKA integration. eff clarified the actual delivery intention: all prepared packs must become honestly executable in Lados, and the main current blockers are unfinished executors/services, missing connectors, incomplete L3/L5 activation, and misleading runtime readiness. The first KF PKA has not yet been manufactured.

This replacement plan makes official pack runtime completion the primary program and PKA contract readiness a later, bounded workstream. It absorbs only relevant findings from the architecture audit and preserves Phase 24 history. No runtime code or migration has been implemented.

**Next:** confirm the plan, then execute S27.0 by generating the complete official pack/node/workflow dependency matrix and selecting the first activation wave.

### 2026-07-22 (2) - Roadmap sequence confirmed

eff confirmed that `Lados_V4_Phase25_MultiRun_Canvas_Tracking_Master_Plan.md` is complete and `Lados_V4_Phase26_Flexible_MultiTenant_Org_Structure_Master_Plan.md` remains untouched. Phase 27 therefore remains the correct number for this program. This confirmation changes roadmap context only; it does not start or alter Phase 26 implementation.

### 2026-07-22 (3) - S27.0 complete: repeatable official pack runtime baseline

Built `tools/generate-phase27-runtime-baseline.cjs` and root command `npm run baseline:phase27`. The generator reads all live `packs/official/*` manifests/nodes/templates, excludes `archived/packs`, reconciles node declarations with pack resolver source and live API resolver imports, records pack service/external requirements and test-file evidence, validates graph-backed workflow node types/IDs/ports/cycles, ranks blockers, and writes both machine-readable and human-readable evidence:

- `artifacts/runtime-readiness/official-pack-readiness.json`
- `docs/Lados/V4/Verification/Phase27_Official_Pack_Runtime_Baseline.md`

Baseline result: 22 official workspaces; 15 executable-node packs and 7 composition-only packs; 103 nodes (99 declared implemented, 4 declared stub); 103/103 statically present in resolver paths; 11 packs statically runtime-ready, 4 degraded, 7 catalogue-only, 0 statically blocked. There are 16 template descriptors but only 3 importable workflow graph bodies. The other 13 are descriptor-only, so exact provider/connector demand cannot honestly be derived from them yet. The three graph bodies have no unknown node types, invalid ports, or cycles; Video Production is degraded because its graph uses the `lados.video.render_scenes` stub.

The four declared stubs are `lados.communication.send_sms`, `lados.document.read_pdf`, `lados.document.read_docx`, and `lados.video.render_scenes`. Configuration remains a platform-wide usability blocker: 102 nodes expose config field keys that `OfficialPackLoaderService` derives as optional strings rather than typed controls.

**Activation decisions:** S27.1 production-strict execution remains next. S27.2 prioritizes Document Intelligence and typed configuration. The first business graph bodies should be Contractor Ops `trip_dispatch_and_completion`, then `fleet_maintenance`, because their declared lower-layer dependencies are statically runtime-ready with no declared stubs. Specific Microsoft 365 versus Google Workspace selection is deferred until graph bodies expose exact trigger/action demand; S27.3 still builds the provider-neutral connection/HTTP/webhook/file/OAuth foundation.

**Ad-hoc outstanding:**

- The 13 descriptor-only L3/L5 assets need real importable workflow graph bodies; this is now an explicit activation backlog, not a hidden connector assumption.
- `apps/api/src/execution/real-nodes/index.ts` still documents the WorkflowRunner mock fallback, confirming the S27.1 strict-mode requirement.
- `packs/official/lados-quran-media/src/index.ts` contains an obsolete header claiming every executor is a stub, while the manifest/nodes declare 13 implemented executors.
- Template descriptors do not explicitly reference sibling workflow bodies; the three existing bodies are discovered by filename convention.
- S27.0 resolver and test evidence is static. Executable resolver probes and generated runtime/API/UI truth belong to S27.1.

**Verification:** `node --check tools/generate-phase27-runtime-baseline.cjs` passed; `npm run baseline:phase27` passed repeatedly; generated graph checks report zero issues; `corepack pnpm validate:official-packs` passed (22 packs, 103 nodes, 122 canonical capabilities, 43 aliases); `git diff --check` passed for the scoped files. Full monorepo typecheck/API tests were not required for this static generator/doc sprint and remain part of implementation sprint verification.

**Next:** S27.1 - implement production-strict execution modes and one generated readiness truth surface, using the S27.0 JSON as the baseline contract.

### 2026-07-22 (4) - Post-S27.0 API compile blocker repaired

eff reported `TS2307: Cannot find module '@lados/official-quran-media'` from `apps/api/src/execution/real-nodes/index.ts`. The package manifest, built `dist/index.d.ts`, and API dependency declaration were already present. The actual defect was an incomplete pnpm workspace install state: `apps/api/node_modules/@lados/official-quran-media` was missing and the API importer section of `pnpm-lock.yaml` did not yet contain the workspace link.

Ran `corepack pnpm install --offline`, which added the missing lock importer entry and created the API workspace junction without downloading packages. Rebuilt `@lados/official-quran-media`. API typecheck then exposed one subsequent regression: `execution.service.recovery.spec.ts` still constructed `ExecutionService` with 20 arguments after QMCP added `ReligiousSourceService` and `CurrentIssueResearchService`. Added the two explicit test stubs.

**Verification:** Quran Media pack build passed; `corepack pnpm --filter api typecheck` passed; targeted Jest passed 3/3 suites and 76/76 tests (`execution.service.recovery.spec.ts`, `official-quran-media.spec.ts`, `official-quran-media-e2e.spec.ts`). The original module-resolution error is closed.

**Ad-hoc outstanding:** none from this compile repair. The broader S27.0 findings remain as recorded in entry (3).

**Next:** S27.1 remains unchanged.

### 2026-07-22 (5) - S27.1 core runtime and readiness slice complete

Implemented explicit execution modes in `@lados/execution-engine`: `development-simulation`, `test`, and `production-strict`. The engine now defaults to production-strict, returns structured `EXECUTOR_NOT_AVAILABLE` for an unresolved node, permits only explicitly registered mocks in test mode, and records `real`, `simulated`, or `test_mock` execution source in node logs. Development simulation emits a clear warning that synthetic output is not production evidence. Both in-process API execution and BullMQ worker execution now resolve their mode through `execution-mode.ts`; production and unspecified environments are strict.

Added resolver-backed readiness reconciliation in `runtime-readiness.ts`. It reads validated official manifests/nodes, probes the live API node resolver, derives per-node `implemented`/`stub`/`missing_executor` and per-pack `runtime_ready`/`degraded`/`blocked`/`catalogue_only`, and reports contradictions such as an implemented declaration with no resolver. `GET /execution/runtime-readiness` exposes this result. The Pack Manager now consumes this endpoint and displays honest runtime states instead of the legacy prefix-based health claim.

**Verification:** execution-engine build passed; API and web typechecks passed; targeted S27.1 regression suite passed 5/5; full API Jest passed 34/34 suites, 462 passed and 2 skipped. The first full-suite command used the wrong pnpm argument separator and found no tests; it was immediately rerun correctly with `pnpm --filter api exec jest --runInBand` and passed.

**Ad-hoc outstanding:**

- The legacy `/packs/health` prefix-based endpoint still exists for compatibility and the pack-detail page; it must be retired or redirected to readiness truth before S27.1 closes.
- Marketplace and node palette/inspector do not yet consume resolver-backed readiness.
- Workflow publish/run preflight does not yet block or warn for stub/missing required nodes.
- The S27.0 build report remains a static resolver-path audit; CI contradiction enforcement and build/runtime report unification are still required.
- A dedicated database column for execution source was not added. The source is preserved in persisted node log messages; schema-level querying can be added only if operational reporting requires it.

**Next:** finish S27.1 by unifying the remaining UI surfaces, publish/run validation, legacy health compatibility, and CI/build-report contradiction checks. S27.2 begins only after that gate is green.

### 2026-07-23 (6) - S27.1 complete: readiness enforced across UI, publish/run, and CI

Closed the remaining S27.1 surfaces. Marketplace installed-pack cards and tables, Pack Manager, pack detail/node inspector, and the canvas Skill Library now consume `GET /execution/runtime-readiness`. Stub or missing-executor skills remain visible for diagnosis but cannot be dragged into new workflows. The pack-detail page no longer calls the legacy prefix-based health endpoint.

Added definition readiness preflight to `ExecutionService`. Publishing and triggering a run now stop before snapshot/run creation when any required node is a stub or has no resolver, returning a structured `BadRequestException` with the blocking node types and states. Added a publish regression proving no workflow update occurs after a failed preflight.

Extended `tools/generate-phase27-runtime-baseline.cjs` with per-node runtime readiness, contradiction reporting, and `--check` mode. Root command `pnpm readiness:check` now fails when an implemented node lacks resolver wiring, a runtime-enabled pack contains a non-implemented executor, or a runtime-ready pack contains a stub/missing executor. CI runs this check after official-pack validation. Regenerated JSON and Markdown evidence; current result remains 22 packs, 103 nodes, 4 honest stubs, 11 runtime-ready packs, 4 degraded packs, 7 catalogue-only packs, and zero contradictions.

**Verification:** API and web typechecks passed; `pnpm readiness:check` passed with zero contradictions; baseline regeneration passed; targeted NestJS suites passed 2/2 suites and 7/7 tests; full API Jest passed serially with 34/34 suites, 464 passed and 2 skipped. A parallel full-suite run briefly produced Windows/Jest module-resolution errors inside installed NestJS files; `pnpm install --offline` confirmed the workspace was current, the affected suites passed serially, and the final serial full suite was green.

**Ad-hoc outstanding:** the legacy `/packs/health` and `/packs/:id/health` endpoints remain server-side for backward compatibility, but first-party UI no longer consumes them. Remove them in a future API deprecation pass after confirming no external client usage. No S27.1 gate depends on their deletion.

**Next:** S27.2 - typed configuration and shared service completion, beginning with the selected activation wave and Document Intelligence PDF/DOCX/storage requirements.

### 2026-07-23 (7) - S27.2 Document Intelligence activation slice complete

Activated the first S27.2 pack slice without waiting for a KF-manufactured PKA. The official Document Intelligence pack now declares explicit typed configuration schemas for Excel, PDF, DOCX, and generated-document nodes. The shared manifest contract and validator preserve those schemas, and the canvas field router supports the existing library picker as a typed manifest widget.

Replaced the PDF and DOCX placeholders with real `pdf-parse` and `mammoth` extraction paths. Both nodes resolve upload or library sources, emit source/provenance metadata, support structured failures, and require the real `DocumentService`. PDF extraction supports validated page ranges. Generated documents now persist through `FileService` with organization, project, workflow, and user provenance; storage failures no longer silently fall back to an inline-only result when storage is available.

Regenerated the runtime baseline with typed-versus-generic configuration accounting. Current static result: 22 packs, 103 nodes, 101 implemented, 2 stubs, 12 runtime-ready packs, 3 degraded packs, 7 catalogue-only packs, and zero contradictions. Four Document Intelligence nodes now have explicit typed schemas; 99 configured nodes still contain generic loader-derived fields.

**Verification:** `@lados/core`, `@lados/node-sdk`, `@lados/pack-sdk`, and the official Document Intelligence pack builds passed; API and web typechecks passed; official-pack validation and readiness checks passed; real generated PDF/DOCX extraction passed in plain Node; focused Jest passed 4/4 suites and 31/31 tests; full API Jest passed 36/36 suites with 470 passed and 2 skipped.

**Ad-hoc completed:** removed the unconsumed Excel `range` manifest field rather than exposing a control the executor ignored. Updated Git `origin` to `https://github.com/EffortEdutech/Lados.git` as requested; this repository setting is not part of the source commit.

**Ad-hoc outstanding:** canvas visual verification for the new typed controls; generic configuration remains on 99 nodes; resource/Knowledge Pack reference selectors, future Connection Profile selectors, notification recipient lookup, and shared timeout/retry/idempotency conventions remain within S27.2. The two honest runtime stubs are SMS sending and video rendering.

**Next:** continue S27.2 with shared timeout/retry/idempotency/error conventions and notification recipient resolution, then type the next workflow-demanded pack rather than broad-editing all manifests without graph demand.
