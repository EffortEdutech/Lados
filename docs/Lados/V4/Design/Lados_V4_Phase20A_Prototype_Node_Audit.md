# Lados V4 Phase 20A: Prototype Node Audit

**Document ID:** LADOS-V4-P20A-PROTOTYPE-NODE-AUDIT  
**Phase:** 20A  
**Status:** Draft audit; prototype removal direction accepted  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20A_Canonical_Capability_Registry.md`  

---

## 1. Purpose

This audit maps current prototype nodes to the new target Capability Pack catalogue and canonical capability registry.

The current nodes are useful implementation references, but they are **not** official Lados nodes and should not be refactored forward as the official product line.

Accepted Phase 20A direction:

> Remove prototype packs, nodes, and templates from the official Lados product line. Build fresh official planned packs, nodes, and templates from the target catalogue and registry. Use prototype assets only as reference or temporary compatibility support.

This audit classifies each current node as a reference source for fresh implementation:

- Reference
- Rebuild fresh
- Merge concept into fresh capability
- Split concept into fresh capabilities
- Retire from official product
- Keep temporarily for compatibility
- New target gap

---

## 2. Audit Summary

| Current pack | Current role | Target result |
|---|---|---|
| `core-pack` | mixed workflow, artifact, resource, event, human approval primitives | retire from official line after fresh Workflow Foundation, Resource Operations, and Human Work are built |
| `foundation-pack` | notification, approval, assignment | retire from official line after fresh Human Work, Communication, and Task/Case are built |
| `document-pack` | file upload and Excel read | retire from official line after fresh Document Intelligence is built |
| `ai-pack` | AI capability stubs | retire from official line after fresh AI Operations is built |
| `notifications-pack` | email, SMS, in-app | retire from official line after fresh Communication is built |
| `finance-pack` | invoice, payment, PO, retention | retire from official line after fresh Commercial Finance is built |
| `procurement-pack` | RFQ/PO generation | retire from official line after fresh Procurement is built |
| `qs-pack` | BOQ read/clean/classify/split | retire from official line after fresh QS Commercial is built |
| `construction-pack` | construction + QS claim/variation mixed | retire from official line after fresh Construction Operations and QS Commercial are built |
| `contractor-pack` | contractor jobs, fleet, invoice, payroll, fuel, maintenance | retire from official line after fresh Asset/Fleet, People/Payroll, Commercial Finance, and Contractor Operations templates are built |

---

## 3. Audit Decision Rules

1. Current prototype nodes are reference only.
2. Fresh official nodes must be created from canonical capability keys.
3. If a prototype node has useful logic, reuse the lesson or executor approach only after rewriting under the target node contract.
4. If a prototype node implies AI/system approval, certification, entitlement, or payment authority, the fresh node must use safer human-boundary wording.
5. If a prototype node mixes solution-specific orchestration with a reusable domain action, the fresh build must separate reusable node capability from template orchestration.
6. Demo shortcuts should be retired from the official product story.

---

## 4. Node Audit by Pack

### 4.1 `core-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `core.logger` | Logger | `workflow.log.write` | Workflow Foundation | Rename | Use Write Log. |
| `core.cron_trigger` | Cron Trigger | `workflow.trigger.schedule` | Workflow Foundation | Rename | Use Schedule Trigger with timezone metadata. |
| `core.human_approval` | Human Approval | `human.approval.request` | Human Work | Merge | Merge with `foundation.request_approval`. |
| `core.condition` | Condition | `workflow.control.condition` | Workflow Foundation | Rename | Keep logic. |
| `artifact.write` | Write Artifact | `artifact.write` | Resource Operations | Merge | Merge with `project.save_artifact`. |
| `artifact.read` | Read Artifact | `artifact.read` | Resource Operations | Merge | Merge with `project.read_artifact`. |
| `project.save_artifact` | Save Project Artifact | `artifact.write` | Resource Operations | Merge | Prefer one artifact write capability. |
| `project.read_artifact` | Read Project Artifact | `artifact.read` | Resource Operations | Merge | Prefer one artifact read capability. |
| `resource.create` | Create Resource | `resource.create` | Resource Operations | Rebuild fresh under target pack | Good generic capability. |
| `resource.read` | Read Resource | `resource.read` | Resource Operations | Rebuild fresh under target pack | Good generic capability. |
| `resource.update` | Update Resource | `resource.update` | Resource Operations | Rebuild fresh under target pack | Good generic capability. |
| `resource.transition` | Transition Resource | `resource.transition` | Resource Operations | Merge | Merge with `state.change`. |
| `resource.list` | List Resources | `resource.list` | Resource Operations | Rebuild fresh under target pack | Good generic capability. |
| `event.publish` | Publish Event | `workflow.event.publish` | Workflow Foundation | Rename | Event taxonomy needed later. |
| `state.change` | Change State | `resource.transition` | Resource Operations | Merge | Duplicate state-transition concept. |
| `core.loop` | Loop | `workflow.control.loop` | Workflow Foundation | Rename | Keep as technical advanced node. |
| `core.parallel` | Parallel | `workflow.control.parallel` | Workflow Foundation | Rename | Keep as technical advanced node. |
| `core.merge` | Merge | `workflow.control.merge` | Workflow Foundation | Rename | Keep as technical advanced node. |
| `core.delay` | Delay | `workflow.control.delay` | Workflow Foundation | Rename | Keep. |

### 4.2 `foundation-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `foundation.send_notification` | Send Notification | `communication.in_app.send` or `communication.route_notification` | Communication | Merge | Merge with notifications pack; use clearer channel-specific nodes. |
| `foundation.request_approval` | Request Approval | `human.approval.request` | Human Work | Merge | Canonical approval request. |
| `foundation.assign_user` | Assign User | `human.assignment.assign` | Human Work | Rename | Keep under Human Work. |

### 4.3 `document-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `document.upload_file` | Upload File | `document.file.upload` | Document Intelligence | Rebuild fresh under target pack | Good primitive. |
| `document.read_excel` | Read Excel | `document.table.read_excel` | Document Intelligence | Rebuild fresh under target pack | Good primitive; expand for CSV/PDF/DOCX later. |

### 4.4 `ai-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `ai.classifier` | AI Classifier | `ai.classify` | AI Operations | Rename | Advisory output and confidence required. |
| `ai.extractor` | AI Extractor | `ai.extract` | AI Operations | Rename | Advisory output and source capture required. |
| `ai.reviewer` | AI Reviewer | `ai.review` | AI Operations | Rename | Must not approve. |
| `ai.comparator` | AI Comparator | `ai.compare` | AI Operations | Rename | Must cite compared inputs. |
| `ai.summarizer` | AI Summarizer | `ai.summarize` | AI Operations | Rename | Must preserve source references. |
| `ai.risk-detector` | AI Risk Detector | `ai.risk.detect` | AI Operations | Rename | Use underscore node type in target. |

### 4.5 `notifications-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `notification.send_email` | Send Email | `communication.email.send` | Communication | Rename | Provider-specific variants later belong in integration packs. |
| `notification.send_sms` | Send SMS | `communication.sms.send` | Communication | Rename | Keep generic stub/provider boundary. |
| `notification.send_in_app` | Send In-App | `communication.in_app.send` | Communication | Merge concept into fresh target capability | Merge with foundation notification concept. |

### 4.6 `finance-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `finance.submit_invoice` | Submit Invoice | `finance.invoice.submit` | Commercial Finance | Rebuild fresh under target pack | High-input design must use Resource Bindings and inspector groups. |
| `finance.verify_invoice` | Verify Invoice | `finance.invoice.verify` | Commercial Finance | Rebuild fresh under target pack | Verification is acceptable if advisory/checking, not certification. |
| `finance.approve_invoice` | Approve Invoice | `finance.invoice.approval_record` | Commercial Finance | Rename | Should record human approval, not perform autonomous approval. |
| `finance.process_payment` | Process Payment | `finance.payment.record` | Commercial Finance | Rename | Use Record Payment unless actual payment provider integration exists. |
| `finance.create_purchase_order` | Create Purchase Order | `finance.po.create` | Commercial Finance | Rebuild fresh under target pack | Finance PO creation remains here; procurement generates PO request. |
| `finance.approve_purchase_order` | Approve Purchase Order | `finance.po.approval_record` | Commercial Finance | Rename | Should record human approval. |
| `finance.claim_retention_release` | Claim Retention Release | `finance.retention.claim_release` | Commercial Finance | Rebuild fresh under target pack | Needs contract/payment terms Knowledge Pack later. |
| `finance.process_retention_release` | Process Retention Release | `finance.retention.record_release` | Commercial Finance | Rename | Use Record Retention Release. |

### 4.7 `procurement-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `procurement.generate_rfq` | Generate RFQ | `procurement.rfq.create` | Procurement | Rename | Use Create RFQ. |
| `procurement.generate_po` | Generate PO | `procurement.po.generate` | Procurement | Split concept into fresh target capabilities | Rename to Generate PO Request; final finance PO belongs to Commercial Finance. |

### 4.8 `qs-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `qs.read_boq` | Read BOQ | `qs.boq.read` | QS Commercial | Rebuild fresh under target pack | Keep. |
| `qs.clean_boq` | Clean BOQ | `qs.boq.normalize` | QS Commercial | Rename | Use Normalize BOQ. |
| `qs.classify_trade` | Classify Trade | `qs.trade.classify` | QS Commercial | Rebuild fresh under target pack | Keep with confidence/advisory metadata. |
| `qs.split_work_package` | Split Work Package | `qs.work_package.split` | QS Commercial | Rename | Use plural Work Packages. |

### 4.9 `construction-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `construction.create_project` | Create Project | `construction.project.create` | Construction Operations | Rebuild fresh under target pack | Good construction resource action. |
| `construction.submit_progress_claim` | Submit Progress Claim | `qs.claim.submit` | QS Commercial | Rebuild fresh under target owner | Claim is QS/commercial, not construction operations. |
| `construction.assess_progress_claim` | Assess Progress Claim | `qs.claim.assess` | QS Commercial | Rebuild fresh under target owner | Keep advisory/human review boundary. |
| `construction.certify_progress_claim` | Certify Progress Claim | `qs.claim.record_certification` | QS Commercial | Rebuild fresh with restrictions | Must record human certification; system must not certify. |
| `construction.submit_variation` | Submit Variation | `qs.variation.submit` | QS Commercial | Rebuild fresh under target owner | Variation is QS/contract commercial. |
| `construction.approve_variation` | Approve Variation | `qs.variation.record_approval` and `qs.variation.value` | QS Commercial | Split concept into fresh target capabilities | Separate valuation from human approval record. |
| `construction.create_site_inspection` | Create Site Inspection | `construction.inspection.create` | Construction Operations | Rebuild fresh under target pack | Good construction operation. |
| `construction.submit_inspection_report` | Submit Inspection Report | `construction.inspection.submit_report` | Construction Operations | Rebuild fresh under target pack | Good construction operation. |
| `construction.log_defect` | Log Defect | `construction.defect.log` | Construction Operations | Rebuild fresh under target pack | Good construction operation. |
| `construction.generate_boq` | Generate BOQ | `qs.boq.generate_draft` | QS Commercial | Rebuild fresh under target owner with restrictions | Must be Draft BOQ with assumptions and provisional quantities. |

### 4.10 `contractor-pack`

| Current node type | Current display | Target capability key | Target owner pack | Decision | Notes |
|---|---|---|---|---|---|
| `contractor.create_job` | Create Job | `asset_fleet.job.create` or `resource.create` | Asset and Fleet / Resource Operations | Move/Split | If logistics/fleet job, move to Asset and Fleet; generic job can be Resource Operations. |
| `contractor.dispatch_trip` | Dispatch Trip | `asset_fleet.trip.dispatch` | Asset and Fleet | Rebuild fresh under target owner | Good asset/fleet capability. |
| `contractor.complete_trip` | Complete Trip | `asset_fleet.trip.complete` | Asset and Fleet | Rebuild fresh under target owner | Good asset/fleet capability. |
| `contractor.upload_fuel_receipt` | Upload Fuel Receipt | `asset_fleet.fuel_receipt.upload` | Asset and Fleet | Rebuild fresh under target owner | Keep. |
| `contractor.generate_invoice` | Generate Invoice | `finance.invoice.submit` or `finance.invoice.generate_draft` | Commercial Finance | Move/Split | Reusable finance action; contractor template can orchestrate. |
| `contractor.record_payment` | Record Payment | `finance.payment.record` | Commercial Finance | Merge | Merge with finance payment record. |
| `contractor.approve_expense` | Approve Expense | `people_payroll.expense.record_approval` | People and Payroll | Rename | Record human decision; do not autonomously approve. |
| `contractor.create_maintenance_record` | Create Maintenance Record | `asset_fleet.maintenance.create` | Asset and Fleet | Rebuild fresh under target owner | Good asset/fleet capability. |
| `contractor.clear_maintenance` | Clear Maintenance | `asset_fleet.maintenance.clear` | Asset and Fleet | Rebuild fresh under target owner | Good asset/fleet capability. |
| `contractor.prepare_payroll_run` | Prepare Payroll Run | `people_payroll.payroll.prepare` | People and Payroll | Rebuild fresh under target owner | Restricted/human review required. |
| `contractor.approve_payroll` | Approve Payroll | `people_payroll.payroll.record_approval` | People and Payroll | Rebuild fresh with restrictions | Record human approval; system must not initiate payment. |
| `contractor.extract_fuel_data` | Extract Fuel Data | `asset_fleet.fuel_receipt.extract` | Asset and Fleet | Rebuild fresh under target owner | AI advisory; preserve confidence and human review. |

---

## 5. Target Gaps Found During Audit

The current prototype set does not yet cover these target capabilities:

| Gap | Target pack | Why it matters |
|---|---|---|
| `resource.binding.resolve` | Resource Operations | Needed to make Resource Bindings first-class in templates. |
| `human.decision.record` | Human Work | Needed to separate human approval from automated action. |
| `task.create`, `case.open` | Task and Case | Needed for operational workflows beyond approvals. |
| `document.read_pdf`, `document.read_docx` | Document Intelligence | Needed for professional document workflows. |
| `document.extract_table` | Document Intelligence | Needed for BOQ, invoice, RFQ, and claim evidence workflows. |
| `procurement.compare_quotations` | Procurement | Needed for RFQ workflow to be complete. |
| `procurement.receive_quotation` | Procurement | Needed before comparison. |
| `qs.measure_quantity` | QS Commercial | Needed for professional quantity workflows. |
| `qs.value_variation` | QS Commercial | Needed to separate valuation from approval. |
| `qs.reconcile_final_account` | QS Commercial | Needed for full QS lifecycle. |
| `contract.prepare_notice` | Contract Administration | Needed for contract-admin workflows and CIPAA prep. |
| `contract.lookup_clause_reference` | Contract Administration | Needed for Knowledge Pack-backed contract references. |
| `construction.create_site_diary` | Construction Operations | Needed for claim evidence and site records. |
| `construction.run_handover_checklist` | Construction Operations | Needed for handover workflows. |

---

## 6. Fresh Build and Retirement Order

### Priority 1: Safety and Naming

- Define fresh human-boundary-safe node names for approval/certification/payment concepts.
- Build fresh Human Work approval/decision nodes.
- Build fresh Resource Operations artifact nodes.
- Build fresh QS Commercial claim/variation nodes separately from Construction Operations.

### Priority 2: Fresh Foundation Packs

- Build `lados.workflow-foundation`.
- Build `lados.resource-operations`.
- Build `lados.human-work`.
- Build `lados.communication`.
- Keep prototype runtime only as temporary compatibility support.

### Priority 3: Fresh Professional Domain Packs

- Build `lados.qs-commercial`.
- Build `lados.construction-operations`.
- Build `lados.asset-fleet`.
- Build `lados.people-payroll`.
- Build `lados.commercial-finance`.
- Recreate Contractor Operations as solution templates, not a monolithic contractor node pack.

### Priority 4: Missing Target Capabilities

- Add quotation receive/compare.
- Add task/case primitives.
- Add document PDF/DOCX/table extraction.
- Add contract-admin primitives.
- Add site diary and handover checklist.

### Priority 5: Prototype Retirement

- Hide prototype packs from official Marketplace/UI surfaces.
- Migrate or alias existing saved workflow node types.
- Remove prototype packs from the official product story.
- Delete or archive prototype code only after fresh replacements and compatibility migration are verified.

---

## 7. Acceptance Before Refactor

Before implementation begins:

- [ ] Product owner accepts target pack names.
- [ ] Canonical capability registry rows are accepted.
- [ ] Template index is accepted.
- [ ] Fresh-build decision is accepted as the official product direction.
- [ ] Prototype packs are marked reference-only in UI/product planning.
- [ ] Compatibility plan preserves existing workflows or provides aliases/migration.
- [ ] Browser/canvas design rules are applied to fresh high-input nodes.
- [ ] Knowledge Pack references are kept separate from Capability Pack nodes.

