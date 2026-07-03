# Lados V4 Phase 20B.4: Expanded Official Skeleton Set

**Document ID:** LADOS-V4-P20B4-EXPANDED-OFFICIAL-SKELETON-SET  
**Phase:** 20B.4  
**Status:** Implemented manifest-only skeleton expansion  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20B3_Official_Skeleton_Validation_and_Capability_Check.md`

---

## 1. Purpose

Phase 20B.4 expands the fresh official Capability Pack skeleton set beyond the first foundation/QS wave.

This phase adds manifest-only official skeletons for:

1. `lados.communication`
2. `lados.task-case`
3. `lados.commercial-finance`
4. `lados.procurement`
5. `lados.construction-operations`

These packs are still not runtime-enabled. They exist to freeze ownership boundaries, canonical capabilities, clean node contracts, Resource Binding patterns, Knowledge Pack dependencies, and human decision guardrails.

---

## 2. New Official Skeleton Packs

| Pack | Layer | Node skeletons added | Purpose |
|---|---|---:|---|
| `lados.communication` | L1 | 4 | email, SMS, in-app, reminders |
| `lados.task-case` | L1 | 4 | tasks, task status, cases |
| `lados.commercial-finance` | L1 | 5 | invoice, verification, approval record, payment record, PO creation |
| `lados.procurement` | L1 | 4 | RFQ, quotation comparison, award recommendation, PO request |
| `lados.construction-operations` | L2 | 5 | project, inspection, report, defect, site diary |

The official skeleton set now contains:

```text
packs/official/lados-workflow-foundation
packs/official/lados-resource-operations
packs/official/lados-human-work
packs/official/lados-document-intelligence
packs/official/lados-qs-commercial
packs/official/lados-communication
packs/official/lados-task-case
packs/official/lados-commercial-finance
packs/official/lados-procurement
packs/official/lados-construction-operations
```

---

## 3. Alias Expansion

The typed compatibility alias map now includes aliases for the newly represented prototype families:

- notifications to `lados.communication`
- foundation notification to `lados.communication`
- finance invoice/payment/PO concepts to `lados.commercial-finance`
- procurement RFQ/PO request concepts to `lados.procurement`
- construction project/inspection/defect concepts to `lados.construction-operations`

Aliases remain `planned`. They are not active runtime rewrites.

---

## 4. Validation Result

Command:

```powershell
corepack pnpm validate:official-packs
```

Result:

```text
Official pack validation passed.
Packs: 10
Nodes: 36
Canonical capabilities: 68
Compatibility aliases: 28
```

---

## 5. Guardrails Preserved

Phase 20B.4 keeps these product boundaries:

- Communication sends messages; it does not approve.
- Task and Case tracks operational work; Human Work owns approval gates.
- Commercial Finance records approval/payment decisions; it does not silently approve or pay.
- Procurement recommends award; humans approve award.
- Construction Operations captures site records; QS Commercial owns valuation and claim assessment.
- Supplier, standards, rule, rate, and evidence data belongs in Knowledge Packs.

---

## 6. What Is Not Done Yet

This phase does not:

- add runtime executors,
- register official packs in Marketplace,
- sync official nodes to `registered_nodes`,
- activate compatibility aliases,
- migrate saved workflows,
- remove prototype packs,
- create official workflow templates.

---

## 7. Next Work

Recommended next step:

**Phase 20B.5 - Remaining Professional Skeletons + Template Pack Planning**

Target remaining skeletons:

1. `lados.contract-admin`
2. `lados.asset-fleet`
3. `lados.people-payroll`
4. `lados.solution.contractor-ops`
5. `lados.solution.qs-practice`
6. first template pack skeletons for invoice approval, procurement RFQ, progress claim, and defect management

After that, Lados can start planning official template manifests and Marketplace surfacing for official packs.
