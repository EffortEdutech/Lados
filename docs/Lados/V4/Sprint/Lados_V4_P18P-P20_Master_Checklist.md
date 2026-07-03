# Lados V4 P18P-P20 Master Checklist

**Document ID:** LADOS-V4-P18P-P20-CHECKLIST  
**Status:** Active  
**Date:** 2026-07-02  
**Primary sprint plan:** `Sprint/Lados_V4_Sprint_P18P-P20_Productization_DataPacks_ProfessionalBundles.md`
**Phase 20 controlling plan:** `Sprint/Lados_V4_Phase20_Master_Sprint_Plan.md`

---

## Status Summary

| Phase | Title | Status |
|---|---|---|
| 18P | Marketplace Polish and Data Packs Tab Restoration | Complete |
| 19 | Data Pack Engine | Complete |
| 19C | Data Pack Runtime Provenance Logging | Implemented; migration 0052 applied (verified); runtime/browser tests deferred to PD-1 |
| 20 | Marketplace Knowledge Catalogue Documentation | Complete - Phase 20E closeout complete |
| 20B | Professional Lados Pack Bundles | Complete - contract/design/skeleton layer |

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
- [x] Data Pack item search supports collection/tag/region/effective-date filters. *(effectiveOn param added to API in PD-4, 2026-07-03; Explorer UI passes filters via query params)*
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
- [x] Reframe Marketplace around Catalogue Provider Knowledge Packs.
- [x] Document AI conversational search thesis.
- [x] Document Lados as Catalogue Provider knowledge catalogue agent.

### Catalogue Provider Knowledge Pack Specification

- [x] Select broader term than Supplier for Marketplace publishers: Catalogue Provider.
- [x] Define Catalogue Provider profile fields.
- [x] Define Provider Knowledge Pack listing fields.
- [x] Define Knowledge Pack item metadata fields.
- [x] Define product/service/rate/evidence catalogue examples.
- [x] Define official vs provider-provided data labels.
- [x] Document Supplier as procurement/RFQ term and Catalogue Provider as marketplace publisher term.

### AI Search and Retrieval

- [x] Define natural language marketplace search behavior.
- [x] Define structured filters and ranking factors.
- [x] Define verification/freshness/region scoring.
- [x] Define AI answer citation rules.
- [x] Define workflow insertion behavior.
- [x] Draft AI retrieval result shape.

### Marketplace Screens

- [x] Marketplace Home.
- [x] Knowledge Pack Browse.
- [x] Catalogue Provider Profile.
- [x] Knowledge Pack Detail.
- [x] Item Detail.
- [x] Publish Knowledge Pack.
- [x] Review Queue.
- [x] Installed Knowledge.
- [x] AI Search Preview.

### Governance and Business Model

- [x] Define verification statuses.
- [x] Define stale/expired data rules.
- [x] Define commercial advisory wording.
- [x] Define Catalogue Provider subscription tiers.
- [x] Define Phase 21+ implementation backlog.

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
- [x] Add template-only official pack validation for L3/L5 solution/template packs.
- [x] Finalize official node design standard.
- [x] Finalize demo workflow acceptance criteria.

### Node Audit

- [x] Create skeleton for `lados.workflow-foundation`.
- [x] Create skeleton for `lados.resource-operations`.
- [x] Create skeleton for `lados.human-work`.
- [x] Create skeleton for `lados.document-intelligence`.
- [x] Create skeleton for `lados.qs-commercial`.
- [x] Create skeleton for `lados.communication`.
- [x] Create skeleton for `lados.task-case`.
- [x] Create skeleton for `lados.commercial-finance`.
- [x] Create skeleton for `lados.procurement`.
- [x] Create skeleton for `lados.construction-operations`.
- [x] Create skeleton for `lados.contract-admin`.
- [x] Create skeleton for `lados.asset-fleet`.
- [x] Create skeleton for `lados.people-payroll`.
- [x] Create skeleton for `lados.solution.contractor-ops`.
- [x] Create skeleton for `lados.solution.qs-practice`.
- [x] Create skeleton for `lados.template.invoice-approval`.
- [x] Create skeleton for `lados.template.procurement-rfq`.
- [x] Create skeleton for `lados.template.progress-claim`.
- [x] Create skeleton for `lados.template.defect-management`.
- [x] Create skeleton for `lados.template.cipaa-preparation`.

### Canvas Readability

- [x] Submit Invoice readability rule documented for default zoom.
- [x] High-port nodes use grouped/resource-based input contract.
- [x] No duplicate visible handles allowed by official node design standard.
- [x] Port label fit rule documented.
- [x] Node title fit rule documented.
- [x] Inspector carries detail instead of canvas clutter by contract.

### Official Bundles

- [x] Official bundle manifests drafted for first five fresh packs.
- [x] Official pack metadata drafted for first five fresh packs.
- [x] Official node manifests drafted as manifest-only skeletons for first five fresh packs.
- [x] Pack colors/icons standardized.
- [x] Pack README files created for first five fresh packs.
- [x] Official pack bundle test artifacts documented as deferred until runtime surfacing.

### Demo Workflows

- [ ] Submit Invoice to Approval functional/demo workflow.
- [ ] Progress Claim Evidence Check functional/demo workflow.
- [ ] RFQ to Quotation Comparison functional/demo workflow.
- [ ] BOQ Upload to Cost Summary functional/demo workflow.
- [ ] Defect Report to Notification functional/demo workflow.
- [ ] CIPAA Preparation Bundle functional/demo workflow.
- [x] Submit Invoice to Approval template skeleton.
- [x] Progress Claim Evidence Check template skeleton.
- [x] RFQ to Quotation Comparison template skeleton.
- [x] BOQ Upload to Cost Summary template skeleton.
- [x] Defect Report to Notification template skeleton.
- [x] CIPAA Preparation Bundle template skeleton.

### Verification

- [ ] Demo workflows load. *(deferred to runtime/template execution phase)*
- [ ] Demo workflows save. *(deferred to runtime/template execution phase)*
- [ ] Functional demo workflows run where backend nodes are available. *(deferred to runtime/template execution phase)*
- [x] Non-functional demo workflows are clearly marked as design/demo only.
- [x] Typecheck passes for official pack SDK validator work.
- [ ] Build passes.
- [ ] Browser visual verification passes. *(deferred because official packs are manifest-only and not in the palette yet)*

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

**Done:** Reframed Phase 20 as Marketplace Knowledge Catalogue documentation. Created the strategy paper and active documentation sprint plan for Catalogue Provider Knowledge Packs, AI conversational search, governance, and marketplace business model.

**Next:** Use the target Capability Pack catalogue to classify current prototype packs/nodes for retirement or temporary compatibility, complete the canonical capability registry, workflow template index, Catalogue Provider Knowledge Pack specification, AI retrieval requirements, screen specification, governance checklist, business model notes, and Phase 21+ backlog.

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

**Next:** Continue with the canonical capability registry, workflow template index, current prototype node classification, then the Catalogue Provider Knowledge Pack specification and marketplace screen specification.

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

**Next:** Completed in Phase 20B.4. Continue with remaining professional skeletons and first template pack skeletons.

**Ad-hoc:** This validation remains manifest-only. It does not activate aliases, register official packs, migrate workflow JSON, or remove prototype packs.

**Verification:** `corepack pnpm validate:official-packs` passed: 5 packs, 14 nodes, 40 canonical capabilities, 12 compatibility aliases.

### 2026-07-03 - Phase 20B.4 expanded official skeleton set

**Done:** Added fresh official manifest-only skeletons for `lados.communication`, `lados.task-case`, `lados.commercial-finance`, `lados.procurement`, and `lados.construction-operations`. Expanded typed compatibility aliases for notification, finance, procurement, and construction prototype families where official node skeleton targets now exist. Created `Design/Lados_V4_Phase20B4_Expanded_Official_Skeleton_Set.md`.

**Next:** Completed in Phase 20B.5. Continue with official node design standard, pack visual metadata, template schema, and official pack surfacing.

**Ad-hoc:** Still manifest-only. No official runtime registration, alias activation, workflow migration, Marketplace surfacing, or prototype deletion happened.

**Verification:** `corepack pnpm validate:official-packs` passed: 10 packs, 36 nodes, 68 canonical capabilities, 28 compatibility aliases.

### 2026-07-03 - Phase 20B.5 remaining professional and template skeletons

**Done:** Added fresh manifest-only skeletons for `lados.contract-admin`, `lados.asset-fleet`, and `lados.people-payroll`. Added template-only L3 solution packs for `lados.solution.contractor-ops` and `lados.solution.qs-practice`. Added first L5 template pack skeletons for invoice approval, procurement RFQ, progress claim, defect management, and CIPAA preparation. Extended the official manifest SDK and validation script so L3/L5 template-only packs may use `nodes: []` only when they declare existing `workflowTemplates`. Expanded planned compatibility aliases for contractor job, trip, fuel, maintenance, payroll, and expense prototype concepts.

**Next:** Phase 20B.6 - finalize official node design standard, pack colors/icons/categories, template manifest schema, and official pack Marketplace surfacing plan.

**Ad-hoc:** Still manifest-only. No official runtime registration, alias activation, workflow migration, Marketplace surfacing, prototype deletion, or executable template workflow generation happened.

**Verification:** `corepack pnpm validate:official-packs` passed: 20 packs, 51 nodes, 96 canonical capabilities, 38 compatibility aliases. `corepack pnpm --filter @lados/pack-sdk build` passed. `corepack pnpm --filter web typecheck` passed. Full `corepack pnpm build` was attempted but remains blocked in `apps/web` by a Next page-collection manifest issue where compiled route files exist but `app-paths-manifest.json` omits routes such as `/login` and `/packs`.

### 2026-07-03 - Phase 20B.6 official design, visual metadata, template schema, and closeout

**Done:** Added official pack visual metadata across all 20 skeleton packs. Added node category, icon, and search keyword metadata across official node skeletons. Extended the SDK official manifest/node validators to require pack visual metadata and node category/icon metadata. Extended `validate:official-packs` to validate template skeleton files. Created `Design/Lados_V4_Phase20B6_Official_Node_Design_Visual_Metadata_Template_Schema_Closeout.md` with official node design standard, high-input node rule, visual catalogue, template manifest schema, Marketplace surfacing plan, runtime activation boundary, and Phase 20B closure criteria.

**Next:** Proceed to Phase 20D - Marketplace Screen Specification and Knowledge Catalogue UX Wire Plan, or separately start a runtime activation phase for official pack registration/executors.

**Ad-hoc:** Phase 20B is complete only at the contract/design/skeleton layer. Official packs remain manifest-only and prototype runtime support remains untouched.

**Verification:** `corepack pnpm validate:official-packs` passed: 20 packs, 51 nodes, 96 canonical capabilities, 38 compatibility aliases.

### 2026-07-03 - Phase 20C Catalogue Provider and AI Marketplace Search specification

**Done:** Selected **Catalogue Provider** as the broad Lados Marketplace publisher term, replacing broad use of Supplier/Seller. Documented Supplier as still valid for procurement/RFQ counterparties. Created `Design/Lados_V4_Phase20C_Catalogue_Provider_Knowledge_Pack_AI_Search_Spec.md` covering Catalogue Provider types, Provider Profile fields, Provider Knowledge Pack listing fields, Knowledge Pack Item metadata, AI marketplace search requirements, retrieval result shape, and UI/UX wording changes from Data Pack/Supplier language to Knowledge Catalogue/Knowledge Pack/Catalogue Provider language.

**Next:** Phase 20D - Marketplace Screen Specification and Knowledge Catalogue UX Wire Plan.

**Ad-hoc:** UI code still uses `Data Pack` in multiple places because `data_pack_*` remains the Phase 19 technical implementation. Rename should be planned as a compatibility/UI copy pass, not a blind DB/API rename.

**Verification:** Documentation-only update. No code verification required.

### 2026-07-03 - Phase 20 master sprint control created

**Done:** Created `Sprint/Lados_V4_Phase20_Master_Sprint_Plan.md` to define Phase 20 objective, non-goals, workstreams, exit gates, stop condition, and Phase 20E as the final Phase 20 workstream.

**Next:** Execute Phase 20E, then close Phase 20 and move implementation to Phase 21+.

**Ad-hoc:** Existing Phase 20 docs remain supporting references. New ideas should go into Phase 21+ backlog unless they are required to close Phase 20E.

**Verification:** Documentation-only update. No code verification required.

### 2026-07-03 - Phase 20D Marketplace screen specification and Knowledge Catalogue UX wire plan

**Done:** Created `Design/Lados_V4_Phase20D_Marketplace_Screen_Spec_Knowledge_Catalogue_UX_Wire_Plan.md`. Defined Marketplace information architecture, route plan, Marketplace Home, Capability Pack Browse, Knowledge Catalogue Browse, Provider Profile, Knowledge Pack Detail, Knowledge Pack Item Detail, Installed Knowledge, Publish Knowledge Pack, Review Queue, AI Search Preview, cross-screen badges/copy, existing UI copy change register, and Buyer/Provider/Admin journeys.

**Next:** Phase 20E - Governance, Verification Checklist, Business Model Notes, and Phase 21+ Implementation Backlog.

**Ad-hoc:** This phase intentionally did not rename UI code yet. The next implementation backlog should include a safe UI copy pass from Data Pack wording to Knowledge Pack wording while leaving `data_pack_*` technical identifiers intact.

**Verification:** Documentation-only update. No code verification required.

### 2026-07-03 - Phase 20E governance, business model, and Phase 21 backlog closeout

**Done:** Created `Design/Lados_V4_Phase20E_Governance_Business_Model_Phase21_Backlog.md`. Documented governance principles, Catalogue Provider/Knowledge Pack/item verification statuses, Knowledge Pack review checklist, stale/expired-data rules, standard advisory wording, Catalogue Provider business tiers, Buyer/Provider/Lados value propositions, Phase 21+ backlog, and deferred work.

**Next:** Close Phase 20 and proceed to Phase 21A - UI Copy and Compatibility Pass.

**Ad-hoc:** Phase 21A should change product UI wording first while preserving `data_pack_*` technical identifiers. Full database/API rename remains deferred.

**Verification:** Documentation-only update. No code verification required.

### 2026-07-03 - Phase 20 canonical design consolidation

**Done:** Consolidated Phase 20 design work into two canonical design papers: `Design/Lados_V4_Capability_Packs_Product_and_Technical_Design.md` and `Design/Lados_V4_Knowledge_Packs_Product_and_Technical_Design.md`. Created Phase 21 sprint plan and checklist.

**Next:** Start Phase 21A - UI Copy and Compatibility Pass.

**Ad-hoc:** Existing Phase 20A-E documents remain supporting history. The two canonical design papers should be the main references going forward.

**Verification:** Documentation-only update. No code verification required.
