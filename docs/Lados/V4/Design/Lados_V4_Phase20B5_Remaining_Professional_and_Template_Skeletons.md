# Lados V4 Phase 20B.5: Remaining Professional and Template Skeletons

**Document ID:** LADOS-V4-P20B5-REMAINING-PROFESSIONAL-TEMPLATE-SKELETONS  
**Phase:** 20B.5  
**Status:** Implemented manifest-only skeleton expansion  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20B4_Expanded_Official_Skeleton_Set.md`

---

## 1. Purpose

Phase 20B.5 completes the first official Capability Pack skeleton catalogue.

This phase adds the remaining professional L2 packs, L3 solution packs, and first L5 template packs from the Phase 20A target catalogue and canonical capability registry.

The work remains manifest-only. These packs are not yet synced into the runtime pack registry, Marketplace, or canvas palette.

---

## 2. Professional L2 Packs Added

| Pack | Node skeletons | Purpose |
|---|---:|---|
| `lados.contract-admin` | 5 | instructions, notices, due dates, clause references, correspondence evidence |
| `lados.asset-fleet` | 7 | fleet jobs, trip dispatch/completion, fuel receipts, maintenance |
| `lados.people-payroll` | 3 | payroll preparation, payroll approval records, expense approval records |

These packs keep the product boundaries clean:

- Contract Administration supports notices and records but does not give legal advice.
- Asset/Fleet owns operational evidence, not finance or payroll approval.
- People/Payroll records preparation and human approvals, not autonomous payment.

---

## 3. Solution Packs Added

| Pack | Layer | Templates | Purpose |
|---|---|---:|---|
| `lados.solution.contractor-ops` | L3 | 5 | contractor operating workflows across fleet, finance, payroll, procurement, tasks, and communication |
| `lados.solution.qs-practice` | L3 | 3 | QS practice workflows across BOQ, valuation, contract evidence, final account, and human review |

Solution packs intentionally declare no nodes. They own workflow templates and playbooks that compose lower-layer Capability Packs.

---

## 4. First Template Packs Added

| Pack | Layer | Template |
|---|---|---|
| `lados.template.invoice-approval` | L5 | Submit Invoice to Approval |
| `lados.template.procurement-rfq` | L5 | RFQ to Quotation Comparison |
| `lados.template.progress-claim` | L5 | Progress Claim Evidence Check |
| `lados.template.defect-management` | L5 | Defect Report to Notification |
| `lados.template.cipaa-preparation` | L5 | CIPAA Preparation Bundle |

Template packs are also node-free. Their job is to provide workflow blueprints without duplicating lower-layer node contracts.

---

## 5. SDK and Validator Contract Update

The official manifest SDK validator now allows template-only packs when all conditions are true:

1. The pack layer is `L3` or `L5`.
2. `workflowTemplates` is present and non-empty.
3. Every declared template file exists inside the pack folder.

All other official packs must still declare at least one node.

This prevents empty placeholder packs while allowing proper solution/template architecture.

---

## 6. Alias Expansion

The planned compatibility alias map now covers remaining contractor prototype concepts:

- contractor jobs and trips to `lados.asset-fleet`
- fuel receipt upload/extraction to `lados.asset-fleet`
- maintenance create/clear to `lados.asset-fleet`
- payroll preparation and approval records to `lados.people-payroll`
- expense approval records to `lados.people-payroll`

Aliases remain `planned`. They are not active runtime rewrites.

---

## 7. Validation Result

Command:

```powershell
corepack pnpm validate:official-packs
```

Result:

```text
Official pack validation passed.
Packs: 20
Nodes: 51
Canonical capabilities: 96
Compatibility aliases: 38
```

---

## 8. What Is Not Done Yet

Phase 20B.5 does not:

- implement official runtime executors,
- register official packs into `packs` or `registered_nodes`,
- show official packs in Marketplace,
- activate compatibility aliases,
- migrate saved workflows,
- remove prototype runtime packs,
- create full canvas-ready workflow definitions from the template skeleton files.

---

## 9. Next Work

Recommended next step:

**Phase 20B.6 - Official Node Design Standard + Pack Visual Metadata**

Target outcomes:

1. finalize pack colors, icons, categories, and canvas sizing rules,
2. standardize official node display metadata,
3. define template manifest schema beyond the current skeleton JSON,
4. prepare official pack registry surfacing plan,
5. plan runtime executor implementation order without deleting prototype support prematurely.
