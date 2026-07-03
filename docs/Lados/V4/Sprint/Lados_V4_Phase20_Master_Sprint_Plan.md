# Lados V4 Phase 20 Master Sprint Plan

**Document ID:** LADOS-V4-P20-MASTER-SPRINT  
**Phase:** 20  
**Status:** Complete - Phase 20 closed at product-contract layer  
**Date:** 2026-07-03  
**Purpose:** Put a fixed execution boundary around Phase 20 so the work stops expanding without an agreed target.

---

## 1. Why This Plan Exists

Phase 20 began as "Professional Lados Pack Bundles" and then correctly expanded after the marketplace strategy discussion:

- prototype packs should not become the official product line,
- Capability Packs need a fresh professional architecture,
- Data Packs should become the product concept **Knowledge Packs**,
- Supplier is too narrow; the marketplace publisher identity is **Catalogue Provider**,
- the future Marketplace needs screen-level UX and AI search planning.

That expansion was useful, but it created a planning problem: Phase 20 became a set of growing documents instead of a sprint with a clear finish line.

This document is now the controlling Phase 20 sprint plan. Other Phase 20 documents are supporting papers.

---

## 2. Phase 20 Objective

Phase 20 is a **documentation, product architecture, and planning sprint**.

Its objective is:

> Define the official Lados pack and marketplace knowledge architecture clearly enough that Phase 21 can start implementation without debating terminology, pack ownership, screen scope, trust rules, or sequencing.

Phase 20 does not need to make all of this runtime-functional. It must create the agreed product contract.

---

## 3. Phase 20 Exit Criteria

Phase 20 is complete only when these five gates are done:

| Gate | Required output | Status |
|---|---|---|
| P20-A Capability Architecture | Fresh official Capability Pack taxonomy, registry, template index, prototype audit | Complete |
| P20-B Official Pack Skeleton Contract | Manifest-only official pack skeletons, SDK validator, visual metadata, template schema | Complete |
| P20-C Knowledge Marketplace Terminology and AI Search | Catalogue Provider, Knowledge Pack spec, AI search requirements, UI wording register | Complete |
| P20-D Marketplace Screen Specification | Marketplace IA, route plan, screen specs, UX wire plan | Complete |
| P20-E Governance, Business Model, and Phase 21 Backlog | Verification checklist, subscription/business notes, implementation backlog | Complete |

Once P20-E is complete, Phase 20 closes. Any new feature idea after that moves to Phase 21+ backlog unless it blocks one of these gates.

---

## 4. Non-Goals

The following are explicitly not Phase 20 implementation work:

- runtime activation of official packs,
- deletion of prototype runtime packs,
- workflow JSON migration,
- dynamic execution of uploaded pack code,
- payment/subscription implementation,
- full vector search implementation,
- public SEO marketplace pages,
- production provider onboarding automation,
- database/API rename from `data_pack_*` to `knowledge_pack_*`,
- complete Marketplace UI rebuild.

Phase 20 may define these, but implementation belongs to Phase 21+.

---

## 5. Workstreams

### P20-A - Capability Architecture

**Goal:** Decide what official Lados packs, nodes, templates, and ownership boundaries should be.

**Deliverables:**

- Capability Pack planning and node taxonomy.
- Fresh official build decision.
- Target Capability Pack catalogue.
- Canonical capability registry.
- Target workflow template index.
- Prototype node audit.

**Status:** Complete.

**Supporting documents:**

- `Design/Lados_V4_Phase20A_Capability_Pack_Planning_and_Node_Taxonomy.md`
- `Design/Lados_V4_Phase20A_Fresh_Capability_Build_Decision.md`
- `Design/Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`
- `Design/Lados_V4_Phase20A_Canonical_Capability_Registry.md`
- `Design/Lados_V4_Phase20A_Target_Workflow_Template_Index.md`
- `Design/Lados_V4_Phase20A_Prototype_Node_Audit.md`

---

### P20-B - Official Pack Skeleton Contract

**Goal:** Create the manifest-only official pack contract and skeletons without activating them at runtime yet.

**Deliverables:**

- Official manifest contract standard.
- Official manifest SDK types.
- Official validator and cross-pack duplicate checks.
- Compatibility alias plan.
- Official pack skeletons under `packs/official`.
- Visual metadata and template schema.
- Runtime activation boundary.

**Status:** Complete at contract/design/skeleton layer.

**Supporting documents:**

- `Design/Lados_V4_Phase20B1_Official_Pack_Manifest_Contract_Standard.md`
- `Design/Lados_V4_Phase20B2_Official_Manifest_SDK_Validator_Compatibility_Alias_Plan.md`
- `Design/Lados_V4_Phase20B3_Official_Skeleton_Validation_and_Capability_Check.md`
- `Design/Lados_V4_Phase20B4_Expanded_Official_Skeleton_Set.md`
- `Design/Lados_V4_Phase20B5_Remaining_Professional_and_Template_Skeletons.md`
- `Design/Lados_V4_Phase20B6_Official_Node_Design_Visual_Metadata_Template_Schema_Closeout.md`

**Verification already achieved:**

- `corepack pnpm validate:official-packs` passed.
- `corepack pnpm --filter @lados/pack-sdk build` passed.
- `corepack pnpm --filter web typecheck` passed.

**Known residual risk:**

- Full `corepack pnpm build` was previously blocked by an existing Next page-collection manifest issue in `apps/web`. This is not a Phase 20B contract blocker, but it must be tracked before production release.

---

### P20-C - Knowledge Marketplace Terminology and AI Search

**Goal:** Lock marketplace knowledge terminology and define Knowledge Pack search behavior.

**Decisions:**

- Use **Knowledge Pack** as product terminology.
- Keep `data_pack_*` only as legacy technical implementation naming until a compatibility phase.
- Use **Catalogue Provider** as the marketplace publisher identity.
- Keep **Supplier** only for procurement/RFQ counterparties and as one Catalogue Provider type.

**Deliverables:**

- Provider Profile specification.
- Provider Knowledge Pack listing specification.
- Knowledge Pack Item metadata.
- AI marketplace search requirements.
- Retrieval result shape.
- UI wording change register.

**Status:** Complete.

**Supporting document:**

- `Design/Lados_V4_Phase20C_Catalogue_Provider_Knowledge_Pack_AI_Search_Spec.md`

---

### P20-D - Marketplace Screen Specification

**Goal:** Convert the Phase 20C terminology and search contract into screen-level UX.

**Deliverables:**

- Marketplace information architecture.
- Route plan.
- Screen specs for:
  - Marketplace Home,
  - Capability Pack Browse,
  - Knowledge Catalogue Browse,
  - Provider Profile,
  - Knowledge Pack Detail,
  - Knowledge Pack Item Detail,
  - Installed Knowledge,
  - Publish Knowledge Pack,
  - Review Queue,
  - AI Search Preview.
- Cross-screen naming, badges, and advisory copy.
- Buyer, Catalogue Provider, and Admin journeys.

**Status:** Complete.

**Supporting document:**

- `Design/Lados_V4_Phase20D_Marketplace_Screen_Spec_Knowledge_Catalogue_UX_Wire_Plan.md`

---

### P20-E - Governance, Business Model, and Phase 21 Backlog

**Goal:** Close Phase 20 by converting the strategy and screen plan into implementable gates.

**Deliverables:**

- Governance and verification checklist.
- Provider verification status model.
- Knowledge Pack stale/expired-data rules.
- Standard advisory/human-review wording.
- Business/subscription model notes.
- Buyer and Catalogue Provider value propositions.
- Phase 21+ implementation backlog.
- Implementation sequencing and dependencies.
- Testing and browser verification plan.

**Status:** Complete.

**Supporting document:**

- `Design/Lados_V4_Phase20E_Governance_Business_Model_Phase21_Backlog.md`

**Stop condition:** When this workstream is complete, Phase 20 closes. No further Phase 20 workstreams should be added without explicit approval.

---

## 6. Phase 20 Source of Truth

This document controls Phase 20 scope.

The consolidated canonical design papers for Phase 21+ are:

| Pillar | Canonical design |
|---|---|
| Capability Packs | `Design/Lados_V4_Capability_Packs_Product_and_Technical_Design.md` |
| Knowledge Packs | `Design/Lados_V4_Knowledge_Packs_Product_and_Technical_Design.md` |

Use the following documents as detailed supporting references:

| Area | Source |
|---|---|
| Current Phase 20 execution checklist | `Sprint/Lados_V4_P18P-P20_Master_Checklist.md` |
| Long historical productization log | `Sprint/Lados_V4_Sprint_P18P-P20_Productization_DataPacks_ProfessionalBundles.md` |
| Original active documentation sprint | `Sprint/Lados_V4_Phase20_Marketplace_Knowledge_Catalogue_Documentation.md` |
| Capability architecture | Phase 20A design papers |
| Official pack skeleton contract | Phase 20B design papers |
| Knowledge marketplace terminology and AI search | Phase 20C design paper |
| Marketplace screen specification | Phase 20D design paper |

Going forward, if a Phase 20 task is not listed in this master plan, it should become Phase 21+ backlog unless the user explicitly approves changing Phase 20 scope.

---

## 7. Phase 20 Current Status

| Workstream | Status | Notes |
|---|---|---|
| P20-A | Complete | Fresh official architecture and prototype reset defined |
| P20-B | Complete | Official skeleton contract complete; runtime activation deferred |
| P20-C | Complete | Catalogue Provider and Knowledge Pack terminology locked |
| P20-D | Complete | Marketplace screen spec complete |
| P20-E | Complete | Governance, business model, and Phase 21 backlog complete |

---

## 8. Next Step

Phase 20 is now closed at the documentation and product-contract layer.

Next recommended execution phase:

**Phase 21A - UI Copy and Compatibility Pass**

Purpose:

- update user-facing UI wording from Data Packs to Knowledge Packs,
- preserve `data_pack_*` technical identifiers,
- browser verify Marketplace, Explorer, PropertyPanel, and Execution Log wording,
- keep schema/API rename for a later compatibility phase.

---

## 9. Handover

### 2026-07-03 - Phase 20 master sprint plan created

Done:
- Created this controlling Phase 20 master sprint plan.
- Defined Phase 20 objective, non-goals, workstreams, exit criteria, and stop condition.
- Reframed existing Phase 20A-D work as completed gates instead of open-ended expansion.
- Identified Phase 20E as the final Phase 20 workstream.

Next:
- Execute Phase 20E and then close Phase 20.

Ad-hoc:
- Existing Phase 20 supporting docs remain valid but should not be used to add unbounded new work.
- Future implementation belongs to Phase 21+ unless it is required to close Phase 20E documentation.

Docs updated:
- `Sprint/Lados_V4_Phase20_Master_Sprint_Plan.md`

Verification:
- Documentation-only update. No code verification required.

### 2026-07-03 - Phase 20E closeout completed

Done:
- Created `Design/Lados_V4_Phase20E_Governance_Business_Model_Phase21_Backlog.md`.
- Documented governance principles, verification statuses, Knowledge Pack review checklist, stale/expired-data rules, advisory wording, Catalogue Provider tiers, value propositions, Phase 21 backlog, and deferred work.
- Marked P20-E complete.
- Marked Phase 20 ready to close.

Next:
- Proceed to Phase 21A - UI Copy and Compatibility Pass.

Ad-hoc:
- Phase 20 is now a completed product contract. New implementation work should move to Phase 21+.

Docs updated:
- `Design/Lados_V4_Phase20E_Governance_Business_Model_Phase21_Backlog.md`
- `Sprint/Lados_V4_Phase20_Master_Sprint_Plan.md`

Verification:
- Documentation-only update. No code verification required.
