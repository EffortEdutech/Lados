# Lados V4 Phase 21 Sprint Plan: Knowledge Pack UI Compatibility and Marketplace Foundation

> **ARCHIVED 2026-07-03 — merged into `Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md` (§3A).**
> Workstreams 21A–21E were absorbed (21A → S0, 21B–21E → S9A); 21F is superseded by master plan sprints S1–S6.
> Detailed tick-items remain live in `Sprint/Lados_V4_Phase21_Checklist.md`. This file is preserved for reference only.

**Document ID:** LADOS-V4-P21-SPRINT  
**Phase:** 21  
**Status:** Archived — merged into master plan  
**Date:** 2026-07-03  
**Depends on:** Phase 20 closed at product-contract layer

---

## 1. Objective

Phase 21 starts implementation from the Phase 20 product contract.

The immediate goal is to align the product UI with the new canonical language:

- Capability Packs = workflow actions, nodes, templates.
- Knowledge Packs = governed knowledge, catalogues, references, rates, SOPs, standards indexes, products, services, and evidence rules.
- Data Pack = legacy technical implementation term that remains in database/API/code identifiers until a deliberate compatibility migration.

Phase 21 must avoid a risky rename of working backend identifiers. It starts with a safe UI copy and compatibility pass.

---

## 2. Source Documents

Canonical:

- `Design/Lados_V4_Capability_Packs_Product_and_Technical_Design.md`
- `Design/Lados_V4_Knowledge_Packs_Product_and_Technical_Design.md`

Supporting:

- `Sprint/Lados_V4_Phase20_Master_Sprint_Plan.md`
- `Design/Lados_V4_Phase20E_Governance_Business_Model_Phase21_Backlog.md`

---

## 3. Phase 21 Scope

### In Scope

- visible UI wording from Data Packs to Knowledge Packs,
- Marketplace tab and copy cleanup,
- Explorer Knowledge Catalogue wording,
- PropertyPanel Knowledge Pack Item wording,
- Execution Log Knowledge Pack Provenance wording,
- documentation updates,
- browser verification,
- typecheck,
- planning next data model steps for Provider Profiles and Knowledge Pack listings.

### Out of Scope for Phase 21A

- database rename from `data_pack_*` to `knowledge_pack_*`,
- API route rename from `/data-packs`,
- dynamic uploaded runtime code,
- payment/subscription implementation,
- full AI search implementation,
- official Capability Pack runtime activation,
- prototype pack deletion.

---

## 4. Phase 21 Workstreams

| Workstream | Title | Goal | Status |
|---|---|---|---|
| 21A | UI Copy and Compatibility Pass | Update visible UI language while preserving technical identifiers | Ready |
| 21B | Provider Profile Data Model | Add Catalogue Provider identity model | Planned |
| 21C | Knowledge Pack Listing Layer | Add product-level Knowledge Pack listing layer over technical Data Packs | Planned |
| 21D | Review Queue Expansion | Review Provider Profiles and Knowledge Packs | Planned |
| 21E | AI Search Preview | Safe cited search over installed and marketplace knowledge | Planned |
| 21F | Official Capability Runtime Activation Plan | Plan official pack runtime surfacing separately | Planned |

---

## 5. Phase 21A Detailed Plan

### Goal

Make Lados UI speak the new product language:

- users see **Knowledge Packs** and **Knowledge Catalogue**,
- developers can still rely on existing `data_pack_*` technical implementation,
- no backend rename risk.

### Target Files

| Area | File | Change |
|---|---|---|
| Marketplace | `apps/web/src/app/(app)/marketplace/page.tsx` | Data Packs -> Knowledge Packs; Browse Registry -> Browse Capability Packs; Publish Pack -> Publish Capability Pack where appropriate |
| Explorer | `apps/web/src/components/canvas/DataPackBrowser.tsx` | Data Packs panel -> Knowledge Catalogue panel |
| Property Panel | `apps/web/src/components/canvas/PropertyPanel.tsx` | Requires Data Packs -> Requires Knowledge Packs |
| Item Picker | `apps/web/src/components/canvas/fields/DataPackItemField.tsx` | Data Pack item -> Knowledge Pack Item |
| Execution Log | `apps/web/src/components/canvas/ExecutionLogPanel.tsx` | Data Pack Provenance -> Knowledge Pack Provenance |
| Docs | Phase 21 plan/checklist/README | mark UI copy pass complete after verification |

### Copy Rules

| Current | Target |
|---|---|
| Data Packs | Knowledge Packs |
| Data Pack | Knowledge Pack |
| Data Pack item | Knowledge Pack Item |
| Data Packs panel | Knowledge Catalogue |
| Organization Data Packs | Installed Knowledge Packs |
| Browse Official Data Packs | Browse Official Knowledge Packs |
| Data Pack Provenance | Knowledge Pack Provenance |
| Browse Registry | Browse Capability Packs |
| Installed Packs | Installed Capability Packs |
| Publish Pack | Publish Capability Pack |

### Technical Compatibility Rule

Do not rename:

- `data_pack_*` database fields,
- `/data-packs` API routes,
- `DataPacksService`,
- `DataPackBrowser` component filename,
- `data_pack_item` manifest field type,
- Phase 19 tests.

Visible UI copy can say Knowledge Pack even when technical code still says Data Pack.

---

## 6. Verification Plan

Run after Phase 21A implementation:

```powershell
corepack pnpm --filter web typecheck
```

Browser verify:

- `/marketplace`
- Explorer data/knowledge panel in workflow builder
- PropertyPanel field with `data_pack_item`
- Execution Log provenance area if sample run exists

Acceptance:

- user-facing UI no longer presents Data Packs as the product label,
- Capability Packs and Knowledge Packs are visibly separated,
- no API route or schema rename is required,
- typecheck passes.

---

## 7. Phase 21 Done Criteria

Phase 21 is complete when at least 21A is implemented and verified, and 21B+ are either completed or explicitly moved to Phase 22+.

For now, Phase 21 starts with 21A only. Later workstreams should be started one by one with explicit approval.

---

## 8. Handover Template

At the end of every Phase 21 task:

```text
Done:
Next:
Ad-hoc:
Docs updated:
Verification:
```

---

## 9. Starting Recommendation

Proceed with:

**Phase 21A - UI Copy and Compatibility Pass**

This is the safest bridge from Phase 20 documentation into user-visible product improvement.

---

## 10. Handover

### 2026-07-03 - Phase 21 plan created

Done:
- Created Phase 21 sprint plan.
- Set canonical design inputs as Capability Packs and Knowledge Packs design papers.
- Set 21A as the immediate implementation start.

Next:
- Start Phase 21A - UI Copy and Compatibility Pass.

Ad-hoc:
- 21B-21F are planned but should only begin with explicit approval after 21A verification.

Docs updated:
- `Sprint/Lados_V4_Phase21_Sprint_Plan.md`

Verification:
- Documentation-only update. No code verification required.
