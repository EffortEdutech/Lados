# Lados V4 Phase 20A: Target Workflow Template Index

**Document ID:** LADOS-V4-P20A-TARGET-WORKFLOW-TEMPLATE-INDEX  
**Phase:** 20A  
**Status:** Draft template index  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`  

---

## 1. Purpose

This document defines the target workflow template index for Lados V4.

Templates are the user-facing operating layer above nodes. As Lados grows from dozens to hundreds or thousands of nodes, users should start from business operations, not from a flat node palette.

This index defines:

- official template IDs
- template owner packs
- required Capability Packs
- required or recommended Knowledge Packs
- intended user roles
- maturity level
- prototype template mapping
- governance and human-review boundaries

---

## 2. Template ID Standard

```text
lados.template.<family>.<process>
lados.solution.<solution>.<process>
```

Examples:

```text
lados.template.invoice_approval.submit_invoice_to_approval
lados.template.procurement_rfq.rfq_to_quotation_comparison
lados.solution.qs_practice.variation_notice_to_valuation
```

---

## 3. Template Maturity Values

| Maturity | Meaning |
|---|---|
| Demo | Demonstrates UI/UX or workflow shape only |
| Draft | Usable as a starting point but not production verified |
| Production-ready | Can be used after configuration and organization review |
| Advisory | Produces recommendations, checks, or drafts requiring human acceptance |
| Restricted | Requires contract, legal, statutory, payroll, or finance review before use |

---

## 4. Target Template Index

### 4.1 Platform and General Business Templates

| Template ID | Display name | Owner pack | Required Capability Packs | Required/Recommended Knowledge Packs | Roles | Maturity |
|---|---|---|---|---|---|---|
| `lados.template.invoice_approval.submit_invoice_to_approval` | Submit Invoice to Approval | `lados.template.invoice-approval` | Commercial Finance, Human Work, Communication, Resource Operations | invoice validation rules, finance approval SOP | accounts, project admin, owner | Production-ready |
| `lados.template.invoice_approval.vendor_invoice_review` | Vendor Invoice Review | `lados.template.invoice-approval` | Document Intelligence, Commercial Finance, Human Work | invoice validation rules, tax/compliance references | accounts, reviewer | Draft |
| `lados.template.document_control.review_and_signoff` | Document Review and Signoff | `lados.solution.sme-ops` | Document Intelligence, Task and Case, Human Work, Communication | document control SOP | admin, reviewer, approver | Production-ready |
| `lados.template.task_case.customer_case_followup` | Customer Case Follow-up | `lados.solution.sme-ops` | Task and Case, Communication, Human Work | customer service SOP | support, operations | Draft |
| `lados.template.resource_ops.resource_intake_to_assignment` | Resource Intake to Assignment | `lados.solution.sme-ops` | Resource Operations, Human Work, Task and Case | resource naming SOP | operations, admin | Draft |

### 4.2 Procurement Templates

| Template ID | Display name | Owner pack | Required Capability Packs | Required/Recommended Knowledge Packs | Roles | Maturity |
|---|---|---|---|---|---|---|
| `lados.template.procurement_rfq.rfq_to_quotation_comparison` | RFQ to Quotation Comparison | `lados.template.procurement-rfq` | Procurement, Document Intelligence, Human Work, Communication | supplier catalogues, procurement SOP, quotation comparison rules | procurement, QS, project manager | Production-ready |
| `lados.template.procurement_rfq.material_sourcing_shortlist` | Material Sourcing Shortlist | `lados.template.procurement-rfq` | Procurement, AI Operations, Human Work | supplier catalogues, material specification catalogue | procurement, buyer | Advisory |
| `lados.template.procurement_rfq.award_recommendation` | Award Recommendation Review | `lados.template.procurement-rfq` | Procurement, Human Work, Commercial Finance | procurement SOP, approval matrix | procurement, owner, QS | Restricted |
| `lados.template.procurement_rfq.po_request_handoff` | PO Request Handoff | `lados.template.procurement-rfq` | Procurement, Commercial Finance, Human Work | procurement SOP, finance approval SOP | procurement, accounts | Draft |

### 4.3 QS and Commercial Templates

| Template ID | Display name | Owner pack | Required Capability Packs | Required/Recommended Knowledge Packs | Roles | Maturity |
|---|---|---|---|---|---|---|
| `lados.solution.qs_practice.boq_upload_to_cost_summary` | BOQ Upload to Cost Summary | `lados.solution.qs-practice` | QS Commercial, Document Intelligence, AI Operations | BOQ item library, QS rate library, measurement rules | QS, estimator | Advisory |
| `lados.template.progress_claim.evidence_check` | Progress Claim Evidence Check | `lados.template.progress-claim` | QS Commercial, Construction Operations, Document Intelligence, Human Work | claim evidence rules, standards index, site diary SOP | QS, site team, commercial manager | Production-ready with human review |
| `lados.template.progress_claim.monthly_claim_review` | Monthly Progress Claim Review | `lados.template.progress-claim` | QS Commercial, Construction Operations, Human Work, Communication | claim evidence rules, contract reference pack | QS, project manager, owner | Advisory |
| `lados.solution.qs_practice.variation_notice_to_valuation` | Variation Notice to Valuation | `lados.solution.qs-practice` | Contract Administration, QS Commercial, Document Intelligence, Human Work | contract clause reference, variation evidence rules | QS, contract admin | Advisory |
| `lados.solution.qs_practice.final_account_reconciliation` | Final Account Reconciliation | `lados.solution.qs-practice` | QS Commercial, Commercial Finance, Contract Administration | contract reference, payment history, variation register | QS, commercial manager | Advisory |
| `lados.template.cipaa_preparation.claim_evidence_bundle` | CIPAA Claim Evidence Bundle | `lados.template.cipaa-preparation` | QS Commercial, Contract Administration, Document Intelligence, Task and Case | contract clause reference, claim evidence rules, correspondence SOP | QS, contract admin, management | Restricted |

Professional guardrail:

QS and contract templates prepare records, reviews, checks, valuations, and evidence packs. They do not certify payment, decide entitlement, or provide legal advice. Human review and project contract confirmation remain mandatory.

### 4.4 Construction Operations Templates

| Template ID | Display name | Owner pack | Required Capability Packs | Required/Recommended Knowledge Packs | Roles | Maturity |
|---|---|---|---|---|---|---|
| `lados.template.defect_management.defect_report_to_notification` | Defect Report to Notification | `lados.template.defect-management` | Construction Operations, Task and Case, Communication, Human Work | defect classification rules | site team, QA/QC, project manager | Production-ready |
| `lados.solution.contractor_ops.site_diary_to_claim_evidence` | Site Diary to Claim Evidence | `lados.solution.contractor-ops` | Construction Operations, QS Commercial, Document Intelligence | site diary SOP, claim evidence rules | site team, QS | Draft |
| `lados.solution.contractor_ops.inspection_to_closeout` | Inspection to Closeout | `lados.solution.contractor-ops` | Construction Operations, Task and Case, Communication | inspection checklist pack, standards index | QA/QC, site supervisor | Draft |
| `lados.solution.contractor_ops.handover_checklist` | Handover Checklist | `lados.solution.contractor-ops` | Construction Operations, Task and Case, Human Work | handover SOP, testing and commissioning checklist | project manager, QA/QC | Draft |

### 4.5 Contractor Operations Templates

| Template ID | Display name | Owner pack | Required Capability Packs | Required/Recommended Knowledge Packs | Roles | Maturity |
|---|---|---|---|---|---|---|
| `lados.solution.contractor_ops.fleet_job_to_invoice` | Fleet Job to Invoice | `lados.solution.contractor-ops` | Asset and Fleet, Commercial Finance, Human Work, Communication | fleet SOP, invoice rules | operations, accounts, owner | Demo-to-production |
| `lados.solution.contractor_ops.trip_dispatch_and_completion` | Trip Dispatch and Completion | `lados.solution.contractor-ops` | Asset and Fleet, Communication, Task and Case | fleet SOP | dispatcher, driver, operations | Draft |
| `lados.solution.contractor_ops.fuel_receipt_review` | Fuel Receipt Review | `lados.solution.contractor-ops` | Asset and Fleet, AI Operations, Human Work, Commercial Finance | fuel receipt validation rules, expense policy | operations, accounts, owner | Advisory |
| `lados.solution.contractor_ops.fleet_maintenance` | Fleet Maintenance | `lados.solution.contractor-ops` | Asset and Fleet, Task and Case, Communication | maintenance schedule, fleet SOP | operations, mechanic, owner | Draft |
| `lados.solution.contractor_ops.payroll_prepare_to_approval` | Payroll Prepare to Approval | `lados.solution.contractor-ops` | People and Payroll, Human Work, Commercial Finance | payroll SOP, timesheet evidence rules | HR/admin, owner, accounts | Restricted |
| `lados.solution.contractor_ops.expense_review` | Expense Review | `lados.solution.contractor-ops` | People and Payroll, Human Work, Commercial Finance | expense policy, receipt evidence rules | admin, owner, accounts | Restricted |

---

## 5. Current Prototype Template Audit

Current prototype templates live under `packs/contractor-pack/workflow_templates`. They should not become official without retargeting to the new catalogue.

| Current file | Current meaning | Target template | Decision |
|---|---|---|---|
| `job-creation.json` | create contractor job | `lados.solution.contractor_ops.fleet_job_to_invoice` or resource intake template | Merge into solution template |
| `trip-dispatch.json` | dispatch trip | `lados.solution.contractor_ops.trip_dispatch_and_completion` | Rename and depend on Asset and Fleet |
| `invoice-generation.json` | generate contractor invoice | `lados.solution.contractor_ops.fleet_job_to_invoice` | Merge; invoice node belongs to Commercial Finance |
| `finance.record-payment.json` | record payment | `lados.template.invoice_approval.submit_invoice_to_approval` or contractor receivable template | Move finance capability to Commercial Finance |
| `finance.approve-expense.json` | approve expense | `lados.solution.contractor_ops.expense_review` | Rename to Review/Record Approval |
| `fuel.extract-and-approve.json` | AI fuel extraction plus approval | `lados.solution.contractor_ops.fuel_receipt_review` | Rename; AI extraction advisory only |
| `fleet.request-maintenance.json` | create maintenance request | `lados.solution.contractor_ops.fleet_maintenance` | Merge pair |
| `fleet.complete-maintenance.json` | clear maintenance | `lados.solution.contractor_ops.fleet_maintenance` | Merge pair |
| `payroll.prepare-run.json` | prepare payroll | `lados.solution.contractor_ops.payroll_prepare_to_approval` | Merge pair |
| `payroll.approve-and-pay.json` | approve/pay payroll | `lados.solution.contractor_ops.payroll_prepare_to_approval` | Rename; system must not initiate payment without controlled integration |

---

## 6. Template Manifest Fields

Every official template should declare:

| Field | Purpose |
|---|---|
| `templateId` | stable ID |
| `displayName` | user-facing name |
| `ownerPack` | pack that owns the template |
| `businessProcess` | operation name |
| `requiredPacks` | Capability Packs needed to run |
| `optionalPacks` | Capability Packs that enhance the template |
| `requiredKnowledgePacks` | Knowledge Packs needed for safe use |
| `recommendedKnowledgePacks` | Knowledge Packs that improve quality |
| `primaryRoles` | intended users |
| `resourceTypes` | Workspace Resources used |
| `inputs` | expected user or workflow inputs |
| `outputs` | expected resources, artifacts, or decisions |
| `humanReviewRequired` | whether a human gate is mandatory |
| `maturity` | demo, draft, production-ready, advisory, restricted |
| `verificationStatus` | unverified, browser-verified, smoke-tested, production-tested |

---

## 7. Acceptance Gate

Before an official template ships:

- [ ] Template has stable ID and owner pack.
- [ ] Template uses only canonical capability keys.
- [ ] Template declares required Capability Packs.
- [ ] Template declares Knowledge Pack dependencies.
- [ ] Template declares Workspace Resources and Resource Bindings.
- [ ] Template has no hidden AI decision authority.
- [ ] Commercial/QS/payroll/legal-sensitive templates require human review.
- [ ] Canvas layout is readable at default zoom.
- [ ] High-input nodes use inspector config, Resource Bindings, or Knowledge Pack item selectors.
- [ ] Template has test data or setup notes.
- [ ] Template has browser verification instructions.

---

## 8. Immediate Next Work

1. Convert the target template rows into template manifest drafts.
2. Select the first three professional demo templates for Phase 20B.
3. Retire or migrate current contractor prototype templates.
4. Add template discovery metadata to Marketplace planning.
5. Add UI categories: Operations, Procurement, QS Commercial, Construction, Contractor, SME.
