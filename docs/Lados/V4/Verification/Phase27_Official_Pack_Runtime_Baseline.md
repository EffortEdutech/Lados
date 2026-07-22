# Phase 27 Official Pack Runtime Baseline

**Generated:** 2026-07-22T07:50:54.578Z

**Scope:** Static repository evidence for S27.0. Archived packs are excluded. Provider sandbox health, live credentials, Supabase state, and browser execution are not claimed by this report.

## Executive findings

- Official workspaces: **22** (15 with nodes; 7 composition-only).
- Official nodes: **103** (99 declared implemented; 4 declared stub).
- Resolver declarations: **103/103** node types are present in a pack resolver that is wired into the API resolver.
- Template descriptors: **16**; importable workflow bodies: **3**; descriptor-only assets: **13**.
- No live official L4 pack was found. Exact provider demand remains under-specified for descriptor-only L3/L5 assets.
- All manifest configuration groups still provide field keys rather than typed field definitions; the API derives generic string inputs for **102** nodes with configuration fields.

## Readiness interpretation

- `runtime_ready` means manifest status, resolver declaration, and executor declarations align statically. It is not provider or E2E certification.
- `degraded` means an explicit stub exists or the pack declares a non-runtime-enabled status.
- `catalogue_only` means a composition pack contains descriptors but no node executors.
- `blocked` means a declared node is not wired through the live API resolver path.

## Pack matrix

| Pack | Layer | Runtime status | Nodes | Implemented | Stub | Resolver | Templates | Bodies | Baseline | Direct tests |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| lados.asset-fleet | L2 | runtime_enabled | 7 | 7 | 0 | 7/7 | 0 | 0 | runtime_ready | official-asset-fleet.spec.ts |
| lados.commercial-finance | L1 | runtime_enabled | 8 | 8 | 0 | 8/8 | 0 | 0 | runtime_ready | official-commercial-finance.spec.ts |
| lados.communication | L1 | stub_executors | 4 | 3 | 1 | 4/4 | 0 | 0 | degraded | official-communication.spec.ts |
| lados.construction-operations | L2 | runtime_enabled | 6 | 6 | 0 | 6/6 | 0 | 0 | runtime_ready | official-construction-operations.spec.ts |
| lados.contract-admin | L2 | runtime_enabled | 5 | 5 | 0 | 5/5 | 0 | 0 | runtime_ready | official-contract-admin.spec.ts |
| lados.document-intelligence | L1 | stub_executors | 6 | 4 | 2 | 6/6 | 0 | 0 | degraded | official-document-intelligence.spec.ts |
| lados.human-work | L0 | runtime_enabled | 5 | 5 | 0 | 5/5 | 0 | 0 | runtime_ready | official-human-work.spec.ts |
| lados.people-payroll | L2 | runtime_enabled | 3 | 3 | 0 | 3/3 | 0 | 0 | runtime_ready | official-people-payroll.spec.ts |
| lados.procurement | L1 | runtime_enabled | 6 | 6 | 0 | 6/6 | 0 | 0 | runtime_ready | official-procurement.spec.ts |
| lados.qs-commercial | L2 | runtime_enabled | 7 | 7 | 0 | 7/7 | 0 | 0 | runtime_ready | official-qs-commercial.spec.ts |
| lados.quran-media | L2 | stub_executors | 13 | 13 | 0 | 13/13 | 2 | 2 | degraded | official-quran-media-e2e.spec.ts, official-quran-media.spec.ts |
| lados.resource-operations | L0 | runtime_enabled | 9 | 9 | 0 | 9/9 | 0 | 0 | runtime_ready | official-resource-operations.spec.ts |
| lados.solution.contractor-ops | L3 | manifest_only | 0 | 0 | 0 | 0/0 | 5 | 0 | catalogue_only | none |
| lados.solution.qs-practice | L3 | manifest_only | 0 | 0 | 0 | 0/0 | 3 | 0 | catalogue_only | none |
| lados.task-case | L1 | runtime_enabled | 4 | 4 | 0 | 4/4 | 0 | 0 | runtime_ready | official-task-case.spec.ts |
| lados.template.cipaa-preparation | L5 | manifest_only | 0 | 0 | 0 | 0/0 | 1 | 0 | catalogue_only | none |
| lados.template.defect-management | L5 | manifest_only | 0 | 0 | 0 | 0/0 | 1 | 0 | catalogue_only | none |
| lados.template.invoice-approval | L5 | manifest_only | 0 | 0 | 0 | 0/0 | 1 | 0 | catalogue_only | none |
| lados.template.procurement-rfq | L5 | manifest_only | 0 | 0 | 0 | 0/0 | 1 | 0 | catalogue_only | none |
| lados.template.progress-claim | L5 | manifest_only | 0 | 0 | 0 | 0/0 | 1 | 0 | catalogue_only | none |
| lados.video-production | L2 | stub_executors | 8 | 7 | 1 | 8/8 | 1 | 1 | degraded | official-video-production-e2e.spec.ts, official-video-production.spec.ts |
| lados.workflow-foundation | L0 | runtime_enabled | 12 | 12 | 0 | 12/12 | 0 | 0 | runtime_ready | official-workflow-foundation.spec.ts |

## Runtime dependency signals

| Pack | Injected/runtime services | External/configuration requirements | Capability-only declarations |
|---|---|---|---|
| lados.asset-fleet | ResourceService, AiService | AI provider for fuel-receipt vision | none |
| lados.commercial-finance | ResourceService | none identified | none |
| lados.communication | EmailService, SmsService, NotificationService | SMTP configuration, SMS provider (missing) | none |
| lados.construction-operations | ResourceService | none identified | none |
| lados.contract-admin | ResourceService | none identified | none |
| lados.document-intelligence | FileService, LibraryService, DocumentService, IDocumentStorageService (missing) | PDF/DOCX parser dependency (missing) | none |
| lados.human-work | ApprovalTaskCreator, NotificationService, ResourceService | none identified | none |
| lados.people-payroll | ResourceService | none identified | none |
| lados.procurement | ResourceService | none identified | none |
| lados.qs-commercial | ResourceService | none identified | qs.boq.generate_draft, qs.claim.submit, qs.claim.record_certification, qs.variation.submit, qs.variation.record_approval |
| lados.quran-media | AiService, ReligiousSourceService, CurrentIssueResearchService | QUL dataset path, approved current-issue source allowlist, AI provider for editorial nodes | none |
| lados.resource-operations | ResourceService, ArtifactService | none identified | none |
| lados.task-case | ResourceService | none identified | none |
| lados.video-production | FileService, RenderService (missing) | Remotion render backend (missing) | none |
| lados.workflow-foundation | EventBusService, ProgramArtifactService | none identified | workflow.trigger.event |

## Declared stub nodes

| Node | Pack | Capability | Referenced by graph-backed workflows |
|---|---|---|---|
| lados.communication.send_sms | lados.communication | communication.sms.send | none |
| lados.document.read_pdf | lados.document-intelligence | document.pdf.read | none |
| lados.document.read_docx | lados.document-intelligence | document.docx.read | none |
| lados.video.render_scenes | lados.video-production | video.scene.render | lados.video_production.script_to_scene_plan |

## Template and workflow dependency matrix

| Template | Owner | Required packs | Graph body | Nodes | Unknown nodes | Stub nodes | Result |
|---|---|---|---|---:|---|---|---|
| lados.quran_media.issue_to_dakwah_video | lados.quran-media | lados.workflow-foundation, lados.human-work, lados.video-production | packs/official/lados-quran-media/templates/issue-to-dakwah-video.workflow.json | 23 | none | none | graph_ready |
| lados.quran_media.issue_to_dakwah_video_revision | lados.quran-media | lados.workflow-foundation, lados.human-work, lados.video-production | packs/official/lados-quran-media/templates/issue-to-dakwah-video-revision.workflow.json | 13 | none | none | graph_ready |
| lados.solution.contractor_ops.fleet_job_to_invoice | lados.solution.contractor-ops | lados.asset-fleet, lados.commercial-finance, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.solution.contractor_ops.trip_dispatch_and_completion | lados.solution.contractor-ops | lados.asset-fleet, lados.task-case | missing | 0 | none | none | descriptor_only |
| lados.solution.contractor_ops.fuel_receipt_review | lados.solution.contractor-ops | lados.asset-fleet, lados.document-intelligence, lados.people-payroll, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.solution.contractor_ops.fleet_maintenance | lados.solution.contractor-ops | lados.asset-fleet, lados.task-case, lados.procurement | missing | 0 | none | none | descriptor_only |
| lados.solution.contractor_ops.payroll_prepare_to_approval | lados.solution.contractor-ops | lados.people-payroll, lados.human-work, lados.communication | missing | 0 | none | none | descriptor_only |
| lados.solution.qs_practice.boq_upload_to_cost_summary | lados.solution.qs-practice | lados.document-intelligence, lados.qs-commercial, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.solution.qs_practice.variation_notice_to_valuation | lados.solution.qs-practice | lados.contract-admin, lados.qs-commercial, lados.document-intelligence, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.solution.qs_practice.final_account_reconciliation | lados.solution.qs-practice | lados.qs-commercial, lados.commercial-finance, lados.document-intelligence, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.template.cipaa_preparation.cipaa_preparation_bundle | lados.template.cipaa-preparation | lados.contract-admin, lados.qs-commercial, lados.document-intelligence, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.template.defect_management.defect_report_to_notification | lados.template.defect-management | lados.construction-operations, lados.task-case, lados.communication, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.template.invoice_approval.submit_invoice_to_approval | lados.template.invoice-approval | lados.commercial-finance, lados.human-work, lados.communication | missing | 0 | none | none | descriptor_only |
| lados.template.procurement_rfq.rfq_to_quotation_comparison | lados.template.procurement-rfq | lados.procurement, lados.document-intelligence, lados.human-work, lados.communication | missing | 0 | none | none | descriptor_only |
| lados.template.progress_claim.progress_claim_evidence_check | lados.template.progress-claim | lados.qs-commercial, lados.construction-operations, lados.document-intelligence, lados.human-work | missing | 0 | none | none | descriptor_only |
| lados.video_production.script_to_scene_plan | lados.video-production | lados.workflow-foundation | packs/official/lados-video-production/templates/script-to-scene-plan.workflow.json | 10 | none | lados.video.render_scenes | degraded |

## Ranked blockers

| Rank | Blocker | Affected assets | Why it matters | Recommended sprint |
|---:|---|---:|---|---|
| 1 | missing_workflow_graph_bodies | 13 | Descriptor-only L3/L5 assets cannot prove node, service, resource, connector, or port dependencies and cannot be imported as runnable workflows. | S27.0 follow-up / S27.6 activation |
| 2 | generic_string_configuration | 102 | Official configGroups declare keys only, so the API derives optional string fields instead of typed, validated, resource-, knowledge-, or connection-aware controls. | S27.2 |
| 3 | explicit_stub_executors | 4 | Declared stubs (lados.communication.send_sms, lados.document.read_pdf, lados.document.read_docx, lados.video.render_scenes) block any graph that requires their real behavior. | S27.2 / S27.4 / S27.5 by demand |
| 4 | missing_l4_provider_catalogue | 1 | No live official L4 pack exists; provider selection must follow workflow graph completion rather than assumptions. | S27.3-S27.4 |
| 5 | degraded_runtime_status | 4 | lados.communication, lados.document-intelligence, lados.quran-media, lados.video-production declare or derive degraded readiness and require explicit service/configuration verification. | S27.2-S27.5 |

## Recommended activation waves

### First activation wave

- Complete the 13 missing workflow graph bodies before using L3/L5 assets to choose connectors.
- Activate Document Intelligence first: implement PDF/DOCX extraction and document-library persistence because document handling is a dependency of multiple solution/template packs.
- Finish typed configuration for Workflow Foundation, Human Work, Document Intelligence, Communication, and the professional packs used by the first graph bodies.
- Add production-strict missing-executor behavior before certifying any workflow.

### Connector decision

- Do not select Microsoft 365 versus Google Workspace from descriptor prose alone.
- After graph bodies exist, extract exact triggers/actions and score provider demand across the prepared workflows.
- Generic HTTP/webhook, file/attachment, connection profile, OAuth, retry, pagination, and rate-limit foundations remain provider-neutral prerequisites.

### First certification set

- Author and validate lados.solution.contractor_ops.trip_dispatch_and_completion first because its declared dependencies (Asset Fleet and Task Case) are both statically runtime-ready and contain no declared stubs.
- Use lados.solution.contractor_ops.fleet_maintenance as the second business graph because Asset Fleet, Task Case, and Procurement are statically runtime-ready.
- Video Production script-to-scene-plan is graph-backed but degraded by lados.video.render_scenes; certify an inspection/planning-only variant or implement the render backend before full certification.
- Quran Media main and revision workflows are graph-backed and statically resolvable; they require configuration/service and live import/run verification rather than graph authoring.
- Begin QS graph authoring after Document Intelligence PDF/DOCX and storage gaps are resolved, because all three QS Practice descriptors depend on that degraded pack.

## Ad-hoc findings

- Phase 27 was correctly numbered after existing Phase 25 and reserved Phase 26 plans were discovered.
- The API real-node resolver comment still states that WorkflowRunner falls back to mock execution; this confirms S27.1 production-strict work remains required.
- The Quran Media source header still describes all nodes as stubs while nodes.json and the manifest now declare 13 implemented executors; documentation/runtime comments have drifted.
- Composition descriptors validate required pack IDs but do not declare the path to a workflow body, even where sibling workflow JSON exists; matching currently relies on filename convention.
- Direct spec files exist for every executable pack, but direct spec presence alone is not proof of provider or live E2E readiness.

## Evidence limitations

- This report does not read environment files and does not evaluate credentials or secrets.
- Resolver evidence is static: API import wiring plus node-type declaration in each pack resolver. S27.1 should replace this with executable resolver probes.
- Test evidence is filename-based. S27.1/S27.5 should add machine-readable test evidence or probe results.
- Generic configuration readiness is inferred from the current official loader, which derives string fields from configGroups.
- Provider readiness cannot be certified without sandbox/test accounts and real round trips.
- Supabase migration/application state and browser import/run behavior are outside this static baseline.

