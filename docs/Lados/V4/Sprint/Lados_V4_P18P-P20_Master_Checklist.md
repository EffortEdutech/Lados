# Lados V4 P18P-P20 Master Checklist

**Document ID:** LADOS-V4-P18P-P20-CHECKLIST  
**Status:** Active  
**Date:** 2026-07-02  
**Primary sprint plan:** `Sprint/Lados_V4_Sprint_P18P-P20_Productization_DataPacks_ProfessionalBundles.md`

---

## Status Summary

| Phase | Title | Status |
|---|---|---|
| 18P | Marketplace Polish and Data Packs Tab Restoration | Complete |
| 19 | Data Pack Engine | Complete |
| 19C | Data Pack Runtime Provenance Logging | Implemented; migration 0052 applied (verified); runtime/browser tests deferred to PD-1 |
| 20 | Marketplace Knowledge Catalogue Documentation | Active |
| 20B | Professional Lados Pack Bundles | Active - manifest skeleton foundation |

---

## Phase 18P - Marketplace Polish

### Migration and API Verification

- [x] Apply `supabase/migrations/0050_registry_packs.sql`.
- [x] Verify `registry_packs` table exists.
- [x] Verify `lados-pack-bundles` storage bucket exists.
- [x] Verify `GET /registry/packs` returns success.
- [x] Verify `POST /registry/packs/submit` accepts `.ladosPack`.
- [x] Verify `PATCH /registry/packs/:listingId/verify` via owner/admin Review Queue.
- [x] Verify `POST /marketplace/registry/:listingId/install` installs a verified listing.

### Marketplace UI

- [x] Add `Data Packs` tab back to `/marketplace`.
- [x] Preserve `Installed`, `Browse Registry`, and `Publish Pack` tabs.
- [x] Data Packs tab explains difference between Capability Packs and Data Packs.
- [x] Data Packs tab shows planned official Data Packs.
- [x] Browse Registry empty state is polished.
- [x] Publish Pack success state is clear.
- [x] Preview modal explains manifest-only install.
- [x] Owner/admin Review Queue tab added for pending pack verification.

### Test Bundle

- [x] Create `test-data/packs/lados-demo-pack/manifest.json`.
- [x] Create demo README.
- [x] Bundle as `.ladosPack`.
- [x] Confirm local registry ZIP parser reads `manifest.json`.
- [x] Submit bundle through UI.
- [x] Verify listing.
- [x] Install listing.
- [x] Confirm installed pack appears in Installed tab.
- [x] Confirm nodes appear in node registry.

### Closure

- [x] Decide whether `lados-pack publish` CLI is Phase 18P or later.
- [x] Update sprint plan with actual verification result.
- [x] Mark Phase 18P complete only after UI/API/browser verification.

---

## Phase 19 - Data Pack Engine

### Architecture and Schema

- [x] Finalize Data Pack table design.
- [x] Create migration for `data_packs`.
- [x] Create migration for `data_pack_versions`.
- [x] Create migration for `data_pack_collections`.
- [x] Create migration for `data_pack_items`.
- [x] Create migration for `org_data_pack_installs`.
- [x] Add RLS policies.
- [x] Add indexes for search/filter.

### API

- [x] Create `DataPackModule`.
- [x] `GET /data-packs`.
- [x] `GET /data-packs/:slug`.
- [x] `GET /data-packs/:slug/versions/:version`.
- [x] `POST /data-packs/:slug/install?organizationId=`.
- [x] `DELETE /data-packs/:slug?organizationId=`.
- [x] `GET /org/data-packs?organizationId=`.
- [x] `GET /data-pack-items/search`.
- [x] `GET /data-pack-items/:itemId`.
- [x] Add permission checks for install/manage.

### UI

- [x] Marketplace Data Packs tab uses live API.
- [x] Explorer Data Packs panel uses live installed Data Packs.
- [x] Data Pack detail drawer shows collections and provenance.
- [ ] Data Pack item search supports collection/tag/region/effective-date filters. *(collection/packSlug/region/tag done; effective-date filter deferred to PD track)*
- [x] PropertyPanel supports `data_pack_item` field type.
- [x] Data Pack item can be selected into node config.

### Official Seed Data Packs

- [x] `lados.qs-rate-library`.
- [x] `lados.boq-item-library`.
- [x] `lados.claim-evidence-rules`.
- [x] `lados.construction-standards-index`.
- [x] `lados.contractor-productivity-library`.

### Governance

- [x] Every item has source name.
- [x] Every item has source date or publication date.
- [x] Every item has region/applicability.
- [x] Every commercial item states whether it is rate, benchmark, index, material-only, labour-only, plant-only, or all-in.
- [x] Workflow run logs Data Pack item references used.
- [x] UI marks QS/commercial Data Pack values as advisory until accepted by a human.

### Verification

- [x] Migration applied.
- [x] API smoke test added.
- [x] Browser verify Marketplace Data Packs.
- [x] Browser verify Explorer Data Packs.
- [ ] Workflow can use a Data Pack item in node config. *(runtime verification deferred to PD-1 sweep)*
- [x] Typecheck passes.
- [x] Build passes.

### Phase 19C - Runtime Provenance Logging

- [x] Create migration `0052_data_pack_runtime_provenance.sql`.
- [x] Add `execution_logs.data_pack_usages`.
- [x] Resolve Data Pack item ids from node config during execution persistence.
- [x] Persist pack/version/collection/item/source/advisory metadata per node log.
- [x] Support both in-process execution and BullMQ worker execution.
- [x] Show Data Pack provenance in `ExecutionLogPanel`.
- [x] Add Phase 19C smoke test script.
- [x] Apply migration 0052. *(verified 2026-07-02 â€” `execution_logs.data_pack_usages` column exists in live DB)*
- [ ] Run Phase 19C smoke test against a workflow run with a Data Pack item config. *(re-deferred to PD-4 â€” existing seed workflows have invalid i/o wiring (nodes created after workflows); test will run against the first PD-4 demo workflow. PD-2 unit test covers resolveRuntimeUsagesForDefinition in the meantime.)*
- [ ] Browser verify Execution Log provenance block. *(re-deferred to PD-4 â€” same reason)*

---

## Phase 20 - Marketplace Knowledge Catalogue Documentation

### Capability Pack Planning First

- [x] Create Capability Pack planning and node taxonomy paper.
- [x] Document current packs/nodes as prototype assets, not binding target architecture.
- [x] Define pack layering model.
- [x] Define candidate target capability domains.
- [x] Define node indexing model.
- [x] Define canonical capability registry model.
- [x] Define node overlap-control rules.
- [x] Define workflow template ownership model.
- [x] Define Capability Pack manifest extension direction.
- [x] Define prototype retirement policy: reference-only, fresh-build, temporary compatibility, retire.
- [x] Accept fresh-build decision: prototype packs/nodes/templates are reference-only and will be removed from the official product line.
- [x] Draft new target Capability Pack catalogue.
- [x] Classify current prototype packs/nodes against the target catalogue.
- [x] Create first canonical capability registry table/document.
- [x] Create target workflow template index.

### Strategy Documents

- [x] Create marketplace knowledge-catalogue strategy paper.
- [x] Create Phase 20 documentation sprint plan.
- [x] Create naming lock for Capability Packs and Knowledge Packs.
- [x] Reframe Marketplace around supplier/seller Knowledge Packs.
- [x] Document AI conversational search thesis.
- [x] Document Lados as supplier/seller knowledge catalogue agent.

### Supplier Knowledge Pack Specification

- [ ] Define supplier profile fields.
- [ ] Define supplier Knowledge Pack listing fields.
- [ ] Define Knowledge Pack item metadata fields.
- [ ] Define product/service/rate/evidence catalogue examples.
- [ ] Define official vs supplier-provided data labels.

### AI Search and Retrieval

- [ ] Define natural language marketplace search behavior.
- [ ] Define structured filters and ranking factors.
- [ ] Define verification/freshness/region scoring.
- [ ] Define AI answer citation rules.
- [ ] Define workflow insertion behavior.

### Marketplace Screens

- [ ] Marketplace Home.
- [ ] Knowledge Pack Browse.
- [ ] Supplier Profile.
- [ ] Knowledge Pack Detail.
- [ ] Item Detail.
- [ ] Publish Knowledge Pack.
- [ ] Review Queue.
- [ ] Installed Knowledge.
- [ ] AI Search Preview.

### Governance and Business Model

- [ ] Define verification statuses.
- [ ] Define stale/expired data rules.
- [ ] Define commercial advisory wording.
- [ ] Define supplier subscription tiers.
- [ ] Define Phase 21+ implementation backlog.

---

## Active Phase 20B - Professional Lados Pack Bundles

### Standards

- [x] Draft official pack manifest contract standard.
- [x] Create fresh official pack skeleton location.
- [x] Create first official pack skeleton set.
- [x] Finalize first official pack bundle naming for Phase 20B.1.
- [x] Draft port naming and typed port rules in manifest contract.
- [x] Draft high-input-node design pattern in manifest contract.
- [x] Convert official manifest contract into typed SDK definitions.
- [x] Add official manifest validator.
- [x] Add typed compatibility alias map for first prototype-to-official node mappings.
- [x] Add official skeleton validation script.
- [x] Add cross-pack duplicate canonical capability check.
- [x] Add compatibility alias target validation.
- [ ] Finalize official node design standard.
- [ ] Finalize demo workflow acceptance criteria.

### Node Audit

- [x] Create skeleton for `lados.workflow-foundation`.
- [x] Create skeleton for `lados.resource-operations`.
- [x] Create skeleton for `lados.human-work`.
- [x] Create skeleton for `lados.document-intelligence`.
- [x] Create skeleton for `lados.qs-commercial`.
- [ ] Create skeleton for `lados.communication`.
- [ ] Create skeleton for `lados.task-case`.
- [ ] Create skeleton for `lados.commercial-finance`.
- [ ] Create skeleton for `lados.procurement`.
- [ ] Create skeleton for `lados.construction-operations`.
- [ ] Create skeleton for `lados.contract-admin`.
- [ ] Create skeleton for `lados.asset-fleet`.
- [ ] Create skeleton for `lados.people-payroll`.

### Canvas Readability

- [ ] Submit Invoice node readable at default zoom.
- [ ] High-port nodes use grouped/resource-based inputs.
- [ ] No duplicate visible handles.
- [ ] Port labels fit.
- [ ] Node titles fit.
- [ ] Inspector carries detail instead of canvas clutter.

### Official Bundles

- [x] Official bundle manifests drafted for first five fresh packs.
- [x] Official pack metadata drafted for first five fresh packs.
- [x] Official node manifests drafted as manifest-only skeletons for first five fresh packs.
- [ ] Pack colors/icons standardized.
- [x] Pack README files created for first five fresh packs.
- [ ] Official pack bundle test artifacts generated or documented.

### Demo Workflows

- [ ] Submit Invoice to Approval.
- [ ] Progress Claim Evidence Check.
- [ ] RFQ to Quotation Comparison.
- [ ] BOQ Upload to Cost Summary.
- [ ] Defect Report to Notification.

### Verification

- [ ] Demo workflows load.
- [ ] Demo workflows save.
- [ ] Functional demo workflows run where backend nodes are available.
- [ ] Non-functional demo workflows are clearly marked as design/demo only.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Browser visual verification passes.

---

## Product Readiness Gate

Lados V4 can be presented as a full platform only when:

- [ ] Marketplace has Capability Packs and Knowledge Packs.
- [ ] At least one external `.ladosPack` publish/install path is verified.
- [ ] At least two official Knowledge Packs are browsable.
- [ ] At least three official workflows are demo-ready.
- [ ] Official nodes are visually clean and professionally named.
- [ ] QS/commercial outputs show sources, assumptions, and human approval boundaries.
- [ ] No critical console loops or canvas responsiveness issues remain.

---

## Running Handover

### 2026-07-02

**Done:** Created planning checklist for Phase 18P, 19, and 20.

**Next:** Start Phase 18P by restoring Marketplace Data Packs tab and verifying migration 0050.

**Ad-hoc:** Decide whether CLI publish belongs before or after Data Pack Engine.

### 2026-07-02 - Phase 18P execution update

**Done:** Restored `/marketplace` Data Packs tab with official Data Pack planning cards and QS/commercial guardrail copy. Created safe demo pack files under `test-data/packs/lados-demo-pack/` and generated `test-data/packs/lados-demo-pack-0.1.0.ladosPack`.

**Next:** Browser verify `/marketplace`, submit the demo `.ladosPack`, verify the listing, install it from Browse Registry, and confirm the demo node appears in the node registry.

**Ad-hoc:** Live API verification still needs an authenticated owner/admin browser session or JWT.

### 2026-07-02 - Publish submit 400 follow-up

**Done:** Made duplicate pack submissions idempotent: submitting an existing `(pack_id, version)` now returns the existing listing with `status = already_submitted` instead of a 400. Publish Pack UI now displays listing id, pack id, version, and status after successful submit/already-submitted response.

**Verification:** Local `.ladosPack` parser test passed and read `demo.lados-demo-pack` from `test-data/packs/lados-demo-pack-0.1.0.ladosPack`. Full `corepack pnpm typecheck` passed.

**Next:** Retry Publish Pack in the browser. If it still returns 400, capture the red error banner or Network response JSON; likely remaining causes are Storage bucket configuration or live DB schema mismatch.

### 2026-07-02 - Review Queue refinement

**Done:** Added Marketplace `Review Queue` tab for owner/admin users. It loads unverified registry listings, shows listing id and manifest node count, opens the existing preview modal, and approves listings through `PATCH /registry/packs/:listingId/verify?organizationId=...`.

**Verification:** Full `corepack pnpm typecheck` passed. Full `corepack pnpm build` passed with existing non-blocking web lint warnings.

**Next:** In browser: open Marketplace -> Review Queue -> approve listing `847acb03-ad6a-49a1-8c98-e282cf492e23` -> Browse Registry -> Refresh -> Install.

### 2026-07-02 - Phase 18P completion

**Done:** Browser verification completed. `Lados Demo Pack` (`demo.lados-demo-pack / v0.1.0`) was submitted, approved from Review Queue, shown in Browse Registry, installed, and confirmed active in Installed Packs.

**Decision:** `lados-pack publish` CLI is deferred until after Phase 19 unless CI/CD publishing becomes urgent. Phase 18P closes with UI upload as the supported publish path and manifest-only registry install as the supported install path.

**Next:** Begin Phase 19 Data Pack Engine.

**Ad-hoc:** Dynamic uploaded executor runtime remains deferred until a sandboxed verifier/runtime phase.

### 2026-07-02 - Phase 19 Data Pack Engine vertical slice

**Done:** Added `supabase/migrations/0051_data_pack_engine.sql` to upgrade the V3 Data Pack catalogue into V4 Data Pack versions, collections, searchable items, and organization install state. Added `DataPacksModule` with catalog, detail, version, install/disable, org installed list, item search, and item detail endpoints. Marketplace Data Packs now uses live API data with install/disable and provenance detail modal. Explorer Data panel now searches installed Data Pack items. PropertyPanel now supports `data_pack_item` manifest fields.

**Verification:** Full `corepack pnpm typecheck` passed. Added `docs/Lados/V4/Tests/test_phase19_data_packs.ps1` for authenticated API smoke testing after migration 0051 is applied.

**Next:** Apply migration 0051 to Supabase, run the Phase 19 smoke test, then browser-verify Marketplace Data Packs and Explorer Data search.

**Ad-hoc:** Runtime logging of Data Pack item references during workflow execution remains outstanding.

### 2026-07-02 - Phase 19 verification completion

**Done:** Migration 0051 applied. Phase 19 smoke test passed: catalog, detail, install, org installed list, item search, and item provenance all returned success. Browser verification for Marketplace Data Packs and Explorer Data Packs is green.

### 2026-07-02 - Phase 20 documentation kickoff

**Done:** Reframed Phase 20 as Marketplace Knowledge Catalogue documentation. Created the strategy paper and active documentation sprint plan for supplier/seller Knowledge Packs, AI conversational search, governance, and marketplace business model.

**Next:** Use the target Capability Pack catalogue to classify current prototype packs/nodes for retirement or temporary compatibility, complete the canonical capability registry, workflow template index, supplier Knowledge Pack specification, AI retrieval requirements, screen specification, governance checklist, business model notes, and Phase 21+ backlog.

**Ad-hoc:** Phase 19C runtime provenance workflow test remains deferred. Professional Lados Pack Bundles are deferred to Phase 20B after the marketplace knowledge-catalogue strategy is accepted.

### 2026-07-02 - Phase 20A Capability Pack planning update

**Done:** Added Phase 20A Capability Pack planning before Marketplace Knowledge Packs. Created the Capability Pack planning and node taxonomy paper covering greenfield target pack planning, prototype reset policy, pack layering, candidate capability domains, node indexing, canonical capability keys, overlap control, template ownership, UI discovery, manifest extensions, and governance checklist.

**Next:** Classify current prototype packs/nodes as reference lessons, fresh-build targets, retirement candidates, and temporary compatibility concerns, then create the canonical capability registry and workflow template index.

**Ad-hoc:** Current test-era packs are not the target architecture. Knowledge Pack marketplace documentation should proceed only after the new Capability Pack ownership and node/template indexing are agreed.

**Verification:** Full `corepack pnpm typecheck` passed. Full `corepack pnpm build` passed after removing one unused type import from the workflow page. Existing non-blocking ESLint warnings remain around hook dependencies and image optimization.

**Next:** Proceed to Phase 20 Professional Lados Pack Bundles.

**Ad-hoc:** Workflow runtime logging for Data Pack item references is deferred and should be handled before production-grade QS/commercial audit trails.

### 2026-07-02 - Phase 19C runtime provenance logging

**Done:** Added migration 0052 for `execution_logs.data_pack_usages`. Runtime persistence now scans node config for Data Pack item ids, resolves pack/version/collection/item/source/advisory metadata, and writes provenance onto each node log for both fallback execution and BullMQ worker execution. Execution Log panel now displays a Data Pack Provenance block with QS/commercial advisory copy. Added `test_phase19c_data_pack_provenance.ps1`.

**Verification:** Full `corepack pnpm typecheck` passed.

**Next:** Apply migration 0052, run a workflow with a `data_pack_item` config, run the Phase 19C smoke test using that run id, and browser-verify the provenance block.

**Ad-hoc:** This closes the Phase 19C implementation; production audit trail hardening can later add dedicated analytics/reporting over the stored JSONB.

### 2026-07-02 - Phase 20 naming lock

**Done:** Locked the product language for Phase 20: Capability Pack means workflow capabilities, nodes, templates, and action grammar; Knowledge Pack means governed knowledge catalogues, supplier listings, standards references, SOPs, compliance rules, technical guidelines, rates, and evidence rules. Updated the Phase 20 strategy paper, active documentation sprint plan, Capability Pack planning paper, productization sprint plan, master checklist, and V4 README.

**Next:** Continue with the canonical capability registry, workflow template index, current prototype node classification, then the Supplier Knowledge Pack specification and marketplace screen specification.

**Ad-hoc:** Existing `data_pack_*` database/API/test identifiers remain legacy Phase 19 technical names until a deliberate compatibility migration aliases or renames them.

### 2026-07-03 - Target Capability Pack catalogue draft

**Done:** Created `Design/Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`. The draft defines the target official Capability Pack layers, pack IDs, ownership boundaries, dependencies, first professional bundle sets, template ownership, Knowledge Pack dependency map, prototype pack mapping, naming standard, and acceptance gate for official packs.

**Next:** Review and accept the registry, template index, and node audit, then convert accepted rows into implementation tasks.

**Ad-hoc:** Current pack folder names remain prototype implementation names until fresh replacements and compatibility migration are ready.

### 2026-07-03 - Capability registry, template index, and prototype audit

**Done:** Created `Design/Lados_V4_Phase20A_Canonical_Capability_Registry.md`, `Design/Lados_V4_Phase20A_Target_Workflow_Template_Index.md`, and `Design/Lados_V4_Phase20A_Prototype_Node_Audit.md`. The registry maps canonical capability keys to owner packs, target node types, current prototype nodes, and migration decisions. The template index defines target workflow templates with required Capability Packs, Knowledge Packs, user roles, and maturity. The audit classifies current prototype nodes across core, foundation, document, AI, notification, finance, procurement, QS, construction, and contractor packs.

**Next:** Review and accept the registry/index/audit, then convert accepted rows into manifest metadata, compatibility aliases, and fresh implementation tasks.

**Ad-hoc:** Existing saved workflows may still reference current prototype node types. The fresh-build phase must include compatibility aliases or a workflow migration path before prototype runtime support is retired.

### 2026-07-03 - Fresh official Capability Pack build decision

**Done:** Accepted and documented the product direction that prototype packs, nodes, and templates will be removed from the official Lados product line. Created `Design/Lados_V4_Phase20A_Fresh_Capability_Build_Decision.md` and updated the target catalogue, canonical registry, prototype audit, README, sprint plan, and checklist to make prototype assets reference-only.

**Next:** Build the implementation roadmap for fresh official packs, starting with clean pack skeletons, fresh node manifests, compatibility/migration planning, and first professional templates.

**Ad-hoc:** Do not delete working prototype code until fresh replacements and workflow compatibility/migration are ready.

### 2026-07-03 - Phase 20B.1 official pack skeletons and manifest contract

**Done:** Created `Design/Lados_V4_Phase20B1_Official_Pack_Manifest_Contract_Standard.md` and the first fresh official manifest-only skeleton packs under `packs/official/`: `lados.workflow-foundation`, `lados.resource-operations`, `lados.human-work`, `lados.document-intelligence`, and `lados.qs-commercial`. Each skeleton has `manifest.json`, `nodes.json`, README, and template placeholder documentation.

**Next:** Convert the manifest contract into typed SDK definitions and a validator, then draft compatibility aliases/migration for prototype node types before any runtime retirement.

**Ad-hoc:** These official skeletons are intentionally `runtimeStatus: "manifest_only"` and are not synced into `packs` or `registered_nodes` yet. Prototype packs remain temporary runtime support.

### 2026-07-03 - Phase 20B.2 official manifest SDK validator and aliases

**Done:** Added official Capability Pack SDK types, official node manifest types, official manifest validators, and a typed compatibility alias map in `packages/@lados/pack-sdk`. Created `Design/Lados_V4_Phase20B2_Official_Manifest_SDK_Validator_Compatibility_Alias_Plan.md`.

**Next:** Add a workspace validation script for `packs/official`, cross-pack duplicate canonical capability checks, and alias target checks.

**Ad-hoc:** Alias status is `planned` only. No workflow JSON migration, runtime alias rewrite, Marketplace registration, or prototype removal has happened yet.

**Verification:** `corepack pnpm --filter @lados/pack-sdk typecheck` passed.

### 2026-07-03 - Phase 20B.3 official skeleton validation command

**Done:** Added `tools/validate-official-packs.cjs` and root command `corepack pnpm validate:official-packs`. The script builds `@lados/pack-sdk`, validates all official skeleton manifests and node manifests, checks duplicate canonical capability keys and node types across official packs, and verifies compatibility aliases point to existing official node skeletons with matching pack/capability metadata.

**Next:** Expand the fresh official skeleton set for `lados.communication`, `lados.task-case`, `lados.commercial-finance`, `lados.procurement`, and `lados.construction-operations`.

**Ad-hoc:** This validation remains manifest-only. It does not activate aliases, register official packs, migrate workflow JSON, or remove prototype packs.

**Verification:** `corepack pnpm validate:official-packs` passed: 5 packs, 14 nodes, 40 canonical capabilities, 12 compatibility aliases.


