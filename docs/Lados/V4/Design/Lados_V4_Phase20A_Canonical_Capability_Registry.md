# Lados V4 Phase 20A: Canonical Capability Registry

**Document ID:** LADOS-V4-P20A-CANONICAL-CAPABILITY-REGISTRY  
**Phase:** 20A  
**Status:** Draft registry; fresh-build direction accepted  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`  

---

## 1. Purpose

This registry is the control table for official Lados Capability Packs.

Every official node should map to one canonical capability key. If a proposed node cannot map to a key, the product team must either add a justified new key or reject the node as duplicate, vague, or prototype-only.

This prevents future Marketplace packs from producing hundreds of overlapping nodes with different names but the same business meaning.

Phase 20A decision update:

> Prototype packs and nodes are reference-only. Official Lados Capability Packs must be built fresh from this registry. Rows that mention current prototype nodes identify lessons, compatibility concerns, or possible executor reference points; they are not instructions to promote old manifests into the official catalogue.

---

## 2. Registry Rules

1. A canonical capability key has one owner pack.
2. Other packs may depend on the owner pack, but should not duplicate the capability.
3. Capability keys describe business intent, not implementation folders.
4. Risky commercial and QS actions must use advisory/review wording unless a human decision is being recorded.
5. Vendor/integration packs may provide vendor-specific execution variants, but not generic business policy.
6. Knowledge Pack references are declared as requirements or recommendations; Knowledge Pack data must not be embedded inside Capability Packs.

---

## 3. Capability Key Format

```text
<domain>.<object-or-process>.<action>
```

Examples:

```text
workflow.control.condition
finance.invoice.submit
procurement.rfq.create
qs.claim.assess_evidence
construction.defect.log
```

---

## 4. Status Values

| Status | Meaning |
|---|---|
| Target | Accepted target capability for official catalogue |
| Rename | Current prototype name should not be official; fresh target node uses the registry name |
| Merge | Current prototype concept should be consolidated into one fresh canonical capability |
| Split | Current prototype mixes multiple concepts; fresh target capabilities should be separate |
| Deprecate | Prototype/demo-only or unsafe as official product wording; do not rebuild unless justified |
| New | Target capability does not exist in prototype yet |

---

## 5. Canonical Capability Registry

### L0 Platform Foundation

| Capability key | Owner target pack | Target node type | Display name | Current prototype | Decision |
|---|---|---|---|---|---|
| `workflow.trigger.manual` | `lados.workflow-foundation` | `lados.workflow.trigger_manual` | Manual Trigger | implicit/manual start | New |
| `workflow.trigger.schedule` | `lados.workflow-foundation` | `lados.workflow.trigger_schedule` | Schedule Trigger | `core.cron_trigger` | Rename |
| `workflow.trigger.event` | `lados.workflow-foundation` | `lados.workflow.trigger_event` | Event Trigger | future event trigger | New |
| `workflow.control.condition` | `lados.workflow-foundation` | `lados.workflow.condition` | Condition | `core.condition` | Rename |
| `workflow.control.loop` | `lados.workflow-foundation` | `lados.workflow.loop` | Loop | `core.loop` | Rename |
| `workflow.control.parallel` | `lados.workflow-foundation` | `lados.workflow.parallel` | Parallel | `core.parallel` | Rename |
| `workflow.control.merge` | `lados.workflow-foundation` | `lados.workflow.merge` | Merge | `core.merge` | Rename |
| `workflow.control.delay` | `lados.workflow-foundation` | `lados.workflow.delay` | Delay | `core.delay` | Rename |
| `workflow.log.write` | `lados.workflow-foundation` | `lados.workflow.write_log` | Write Log | `core.logger` | Rename |
| `workflow.event.publish` | `lados.workflow-foundation` | `lados.workflow.publish_event` | Publish Event | `event.publish` | Rename |
| `resource.create` | `lados.resource-operations` | `lados.resource.create` | Create Resource | `resource.create` | Rebuild fresh under target pack |
| `resource.read` | `lados.resource-operations` | `lados.resource.read` | Read Resource | `resource.read` | Rebuild fresh under target pack |
| `resource.list` | `lados.resource-operations` | `lados.resource.list` | List Resources | `resource.list` | Rebuild fresh under target pack |
| `resource.update` | `lados.resource-operations` | `lados.resource.update` | Update Resource | `resource.update` | Rebuild fresh under target pack |
| `resource.transition` | `lados.resource-operations` | `lados.resource.transition_state` | Transition Resource State | `resource.transition`, `state.change` | Merge |
| `artifact.write` | `lados.resource-operations` | `lados.artifact.write` | Write Artifact | `artifact.write`, `project.save_artifact` | Merge |
| `artifact.read` | `lados.resource-operations` | `lados.artifact.read` | Read Artifact | `artifact.read`, `project.read_artifact` | Merge |
| `resource.binding.resolve` | `lados.resource-operations` | `lados.resource.resolve_binding` | Resolve Resource Binding | Phase 15 binding runtime | New official node/helper |
| `human.approval.request` | `lados.human-work` | `lados.human.request_approval` | Request Approval | `foundation.request_approval`, `core.human_approval` | Merge |
| `human.assignment.assign` | `lados.human-work` | `lados.human.assign_user` | Assign User | `foundation.assign_user` | Rename |
| `human.decision.record` | `lados.human-work` | `lados.human.record_decision` | Record Decision | none | New |
| `human.review.checkpoint` | `lados.human-work` | `lados.human.review_checkpoint` | Review Checkpoint | none | New |

### L1 Core Business Domains

| Capability key | Owner target pack | Target node type | Display name | Current prototype | Decision |
|---|---|---|---|---|---|
| `document.file.upload` | `lados.document-intelligence` | `lados.document.upload_file` | Upload File | `document.upload_file` | Rebuild fresh under target pack |
| `document.table.read_excel` | `lados.document-intelligence` | `lados.document.read_excel` | Read Excel | `document.read_excel` | Rebuild fresh under target pack |
| `document.pdf.read` | `lados.document-intelligence` | `lados.document.read_pdf` | Read PDF | none | New |
| `document.docx.read` | `lados.document-intelligence` | `lados.document.read_docx` | Read DOCX | none | New |
| `document.table.extract` | `lados.document-intelligence` | `lados.document.extract_table` | Extract Table | none | New |
| `document.generate` | `lados.document-intelligence` | `lados.document.generate_document` | Generate Document | partial/future | New |
| `ai.classify` | `lados.ai-operations` | `lados.ai.classify` | Classify | `ai.classifier` | Rename |
| `ai.extract` | `lados.ai-operations` | `lados.ai.extract` | Extract | `ai.extractor` | Rename |
| `ai.review` | `lados.ai-operations` | `lados.ai.review` | Review | `ai.reviewer` | Rename |
| `ai.compare` | `lados.ai-operations` | `lados.ai.compare` | Compare | `ai.comparator` | Rename |
| `ai.summarize` | `lados.ai-operations` | `lados.ai.summarize` | Summarize | `ai.summarizer` | Rename |
| `ai.risk.detect` | `lados.ai-operations` | `lados.ai.detect_risk` | Detect Risk | `ai.risk-detector` | Rename |
| `communication.email.send` | `lados.communication` | `lados.communication.send_email` | Send Email | `notification.send_email` | Rename |
| `communication.sms.send` | `lados.communication` | `lados.communication.send_sms` | Send SMS | `notification.send_sms` | Rename |
| `communication.in_app.send` | `lados.communication` | `lados.communication.send_in_app` | Send In-App Message | `notification.send_in_app`, `foundation.send_notification` | Merge |
| `communication.reminder.send` | `lados.communication` | `lados.communication.send_reminder` | Send Reminder | none | New |
| `task.create` | `lados.task-case` | `lados.task.create` | Create Task | none | New |
| `task.status.update` | `lados.task-case` | `lados.task.update_status` | Update Task Status | none | New |
| `case.open` | `lados.task-case` | `lados.case.open` | Open Case | none | New |
| `case.close` | `lados.task-case` | `lados.case.close` | Close Case | none | New |
| `finance.invoice.submit` | `lados.commercial-finance` | `lados.finance.submit_invoice` | Submit Invoice | `finance.submit_invoice` | Rebuild fresh under target pack |
| `finance.invoice.verify` | `lados.commercial-finance` | `lados.finance.verify_invoice` | Verify Invoice | `finance.verify_invoice` | Rebuild fresh under target pack |
| `finance.invoice.approval_record` | `lados.commercial-finance` | `lados.finance.record_invoice_approval` | Record Invoice Approval | `finance.approve_invoice` | Rename for human boundary |
| `finance.payment.record` | `lados.commercial-finance` | `lados.finance.record_payment` | Record Payment | `finance.process_payment`, `contractor.record_payment` | Merge/Rename |
| `finance.po.create` | `lados.commercial-finance` | `lados.finance.create_purchase_order` | Create Purchase Order | `finance.create_purchase_order` | Rebuild fresh under target pack |
| `finance.po.approval_record` | `lados.commercial-finance` | `lados.finance.record_purchase_order_approval` | Record PO Approval | `finance.approve_purchase_order` | Rename for human boundary |
| `finance.retention.claim_release` | `lados.commercial-finance` | `lados.finance.claim_retention_release` | Claim Retention Release | `finance.claim_retention_release` | Rebuild fresh under target pack |
| `finance.retention.record_release` | `lados.commercial-finance` | `lados.finance.record_retention_release` | Record Retention Release | `finance.process_retention_release` | Rename |
| `procurement.rfq.create` | `lados.procurement` | `lados.procurement.create_rfq` | Create RFQ | `procurement.generate_rfq` | Rename |
| `procurement.rfq.issue` | `lados.procurement` | `lados.procurement.issue_rfq` | Issue RFQ | none | New |
| `procurement.quotation.receive` | `lados.procurement` | `lados.procurement.receive_quotation` | Receive Quotation | none | New |
| `procurement.quotation.compare` | `lados.procurement` | `lados.procurement.compare_quotations` | Compare Quotations | none | New |
| `procurement.award.recommend` | `lados.procurement` | `lados.procurement.recommend_award` | Recommend Award | none | New |
| `procurement.po.generate` | `lados.procurement` | `lados.procurement.generate_po_request` | Generate PO Request | `procurement.generate_po` | Rename to avoid finance PO ownership confusion |

### L2 Professional Domains

| Capability key | Owner target pack | Target node type | Display name | Current prototype | Decision |
|---|---|---|---|---|---|
| `qs.boq.read` | `lados.qs-commercial` | `lados.qs.read_boq` | Read BOQ | `qs.read_boq` | Rebuild fresh under target pack |
| `qs.boq.normalize` | `lados.qs-commercial` | `lados.qs.normalize_boq` | Normalize BOQ | `qs.clean_boq` | Rename |
| `qs.trade.classify` | `lados.qs-commercial` | `lados.qs.classify_trade` | Classify Trade | `qs.classify_trade` | Rebuild fresh under target pack |
| `qs.work_package.split` | `lados.qs-commercial` | `lados.qs.split_work_packages` | Split Work Packages | `qs.split_work_package` | Rename plural |
| `qs.boq.generate_draft` | `lados.qs-commercial` | `lados.qs.generate_draft_boq` | Generate Draft BOQ | `construction.generate_boq` | Rebuild fresh under target owner with provisional guardrail |
| `qs.claim.submit` | `lados.qs-commercial` | `lados.qs.submit_progress_claim` | Submit Progress Claim | `construction.submit_progress_claim` | Rebuild fresh under target owner |
| `qs.claim.assess` | `lados.qs-commercial` | `lados.qs.assess_progress_claim` | Assess Progress Claim | `construction.assess_progress_claim` | Rebuild fresh under target owner |
| `qs.claim.record_certification` | `lados.qs-commercial` | `lados.qs.record_claim_certification` | Record Claim Certification | `construction.certify_progress_claim` | Rename to record human certification |
| `qs.variation.submit` | `lados.qs-commercial` | `lados.qs.submit_variation` | Submit Variation | `construction.submit_variation` | Rebuild fresh under target owner |
| `qs.variation.value` | `lados.qs-commercial` | `lados.qs.value_variation` | Value Variation | part of `construction.approve_variation` missing | New/Split |
| `qs.variation.record_approval` | `lados.qs-commercial` | `lados.qs.record_variation_approval` | Record Variation Approval | `construction.approve_variation` | Rename for human boundary |
| `qs.final_account.reconcile` | `lados.qs-commercial` | `lados.qs.reconcile_final_account` | Reconcile Final Account | none | New |
| `contract.instruction.register` | `lados.contract-admin` | `lados.contract.register_instruction` | Register Instruction | none | New |
| `contract.notice.prepare` | `lados.contract-admin` | `lados.contract.prepare_notice` | Prepare Notice | none | New |
| `contract.notice.track_due_date` | `lados.contract-admin` | `lados.contract.track_notice_due_date` | Track Notice Due Date | none | New |
| `contract.clause.lookup` | `lados.contract-admin` | `lados.contract.lookup_clause_reference` | Lookup Clause Reference | none | New, Knowledge Pack-backed |
| `contract.correspondence.link_evidence` | `lados.contract-admin` | `lados.contract.link_correspondence_evidence` | Link Correspondence Evidence | none | New |
| `construction.project.create` | `lados.construction-operations` | `lados.construction.create_project` | Create Project | `construction.create_project` | Rebuild fresh under target pack |
| `construction.inspection.create` | `lados.construction-operations` | `lados.construction.create_site_inspection` | Create Site Inspection | `construction.create_site_inspection` | Rebuild fresh under target pack |
| `construction.inspection.submit_report` | `lados.construction-operations` | `lados.construction.submit_inspection_report` | Submit Inspection Report | `construction.submit_inspection_report` | Rebuild fresh under target pack |
| `construction.defect.log` | `lados.construction-operations` | `lados.construction.log_defect` | Log Defect | `construction.log_defect` | Rebuild fresh under target pack |
| `construction.site_diary.create` | `lados.construction-operations` | `lados.construction.create_site_diary` | Create Site Diary | none | New |
| `construction.handover.checklist` | `lados.construction-operations` | `lados.construction.run_handover_checklist` | Run Handover Checklist | none | New |
| `asset_fleet.job.create` | `lados.asset-fleet` | `lados.asset_fleet.create_job` | Create Job | `contractor.create_job` | Rebuild fresh under target owner |
| `asset_fleet.trip.dispatch` | `lados.asset-fleet` | `lados.asset_fleet.dispatch_trip` | Dispatch Trip | `contractor.dispatch_trip` | Rebuild fresh under target owner |
| `asset_fleet.trip.complete` | `lados.asset-fleet` | `lados.asset_fleet.complete_trip` | Complete Trip | `contractor.complete_trip` | Rebuild fresh under target owner |
| `asset_fleet.fuel_receipt.upload` | `lados.asset-fleet` | `lados.asset_fleet.upload_fuel_receipt` | Upload Fuel Receipt | `contractor.upload_fuel_receipt` | Rebuild fresh under target owner |
| `asset_fleet.fuel_receipt.extract` | `lados.asset-fleet` | `lados.asset_fleet.extract_fuel_receipt` | Extract Fuel Receipt | `contractor.extract_fuel_data` | Rebuild fresh under target owner with AI advisory boundary |
| `asset_fleet.maintenance.create` | `lados.asset-fleet` | `lados.asset_fleet.create_maintenance_record` | Create Maintenance Record | `contractor.create_maintenance_record` | Rebuild fresh under target owner |
| `asset_fleet.maintenance.clear` | `lados.asset-fleet` | `lados.asset_fleet.clear_maintenance` | Clear Maintenance | `contractor.clear_maintenance` | Rebuild fresh under target owner |
| `people_payroll.payroll.prepare` | `lados.people-payroll` | `lados.people_payroll.prepare_payroll_run` | Prepare Payroll Run | `contractor.prepare_payroll_run` | Rebuild fresh under target owner |
| `people_payroll.payroll.record_approval` | `lados.people-payroll` | `lados.people_payroll.record_payroll_approval` | Record Payroll Approval | `contractor.approve_payroll` | Rename for human boundary |
| `people_payroll.expense.record_approval` | `lados.people-payroll` | `lados.people_payroll.record_expense_approval` | Record Expense Approval | `contractor.approve_expense` | Rename for human boundary |

### L3-L5 Solution, Integration, and Template Capabilities

| Capability key | Owner target pack | Target node/template type | Display name | Current prototype | Decision |
|---|---|---|---|---|---|
| `solution.contractor_ops.template.job_to_invoice` | `lados.solution.contractor-ops` | template | Fleet Job to Invoice | `job-creation`, `invoice-generation` | Merge into solution template |
| `solution.contractor_ops.template.fleet_trip` | `lados.solution.contractor-ops` | template | Trip Dispatch and Completion | `trip-dispatch` | Rename template |
| `solution.contractor_ops.template.fuel_review` | `lados.solution.contractor-ops` | template | Fuel Receipt Review | `fuel.extract-and-approve` | Rename with human review wording |
| `solution.contractor_ops.template.maintenance` | `lados.solution.contractor-ops` | template | Fleet Maintenance | `fleet.request-maintenance`, `fleet.complete-maintenance` | Merge template pair |
| `solution.contractor_ops.template.payroll` | `lados.solution.contractor-ops` | template | Payroll Prepare to Approval | `payroll.prepare-run`, `payroll.approve-and-pay` | Rename for human approval/payment boundary |
| `template.invoice_approval` | `lados.template.invoice-approval` | template | Submit Invoice to Approval | none/current finance nodes | New |
| `template.procurement_rfq` | `lados.template.procurement-rfq` | template | RFQ to Quotation Comparison | none/current procurement nodes | New |
| `template.progress_claim` | `lados.template.progress-claim` | template | Progress Claim Evidence Check | none/current QS/construction nodes | New |
| `template.defect_management` | `lados.template.defect-management` | template | Defect Report to Notification | none/current construction nodes | New |
| `template.cipaa_preparation` | `lados.template.cipaa-preparation` | template | CIPAA Preparation Bundle | none | New |

---

## 6. Required Follow-Up

1. Turn accepted rows into fresh manifest metadata fields: `canonicalCapability`, `ownerPack`, `businessStage`, `inputPattern`, `outputPattern`, and `knowledgePackRequirements`.
2. Use this registry during the fresh official node implementation. No fresh official node should be built without a registry row.
3. Add a registry validation check later: manifests that declare duplicate canonical capability keys should fail pack verification.
4. Revisit risky commercial verbs before implementation: `approve`, `certify`, `determine`, and `entitle` should usually be replaced with `request`, `assess`, `prepare`, or `record human decision`.


