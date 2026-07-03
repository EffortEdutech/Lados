# Lados V4 Phase 20 Sprint Plan: Marketplace Knowledge Catalogue Documentation

**Document ID:** LADOS-V4-SPRINT-P20-MARKETPLACE-KNOWLEDGE  
**Phase:** 20  
**Status:** Complete - Phase 20E closeout complete  
**Date:** 2026-07-02  

> **Controlling plan:** Use `Sprint/Lados_V4_Phase20_Master_Sprint_Plan.md` as the Phase 20 source of truth. This document remains a supporting detailed work log for Marketplace Knowledge Catalogue documentation.

---

## 1. Phase 20 Objective

Document the future Lados Marketplace as an AI-ready knowledge catalogue platform, starting with a greenfield Capability Pack plan before Marketplace Knowledge Pack expansion.

Phase 20 should not start by coding more marketplace UI. It should first define the new target Capability Pack taxonomy and node governance model, then define the business, product, knowledge, screen, trust, and implementation model for Catalogue Provider Knowledge Packs.

The central decision:

> Lados Marketplace is not only a pack marketplace. It is a catalogue marketplace where Catalogue Providers subscribe to publish structured knowledge that AI agents and workflows can search, cite, compare, and use.

---

## 2. Why This Phase Exists

AI conversational search will reduce the value of traditional website-only strategies. A supplier page may still exist, but AI agents need structured, retrievable, source-aware knowledge.

Capability Packs are the operating grammar of Lados. Knowledge Packs become the carrier of marketplace knowledge.

Phase 20 prepares Lados to serve:

- suppliers
- sellers
- manufacturers
- subcontractors
- consultants
- QS data providers
- contractors and buyers
- AI agents searching for commercial/project knowledge

---

## 3. Phase 20 Scope

### In Scope

- Capability Pack planning and node taxonomy
- current prototype pack/node retirement plan
- canonical node ownership and overlap control
- workflow template ownership and indexing
- Marketplace strategy
- Catalogue Provider Knowledge Pack model
- Knowledge Pack publisher requirements
- AI search and retrieval requirements
- marketplace information architecture
- Catalogue Provider profile model
- review and verification rules
- business model options
- Phase 21+ implementation backlog

### Out of Scope

- Executing uploaded external runtime code
- Payment/subscription implementation
- Public SEO pages
- Full vector search implementation
- Automated supplier onboarding
- Production billing

---

## 4. Key Product Decisions

| Decision | Position |
|---|---|
| Phase 20 ordering | New target Capability Packs first, Marketplace Knowledge Packs second |
| Capability Pack role | Actions, nodes, templates, workflow operating grammar |
| Current packs | Prototype/test assets, not binding target architecture |
| Marketplace direction | AI-ready knowledge catalogue, not only app store |
| Marketplace publisher unit | Catalogue Provider Profile plus Knowledge Pack Listings |
| Publishable product | Knowledge Pack version with collections and items |
| Runtime behavior | Data is non-executable and source-aware |
| AI behavior | Search, summarize, cite, compare, and hand off to workflow |
| Trust model | Verification status, source metadata, stale-data warnings |
| Commercial boundary | Advisory until human/project confirmation |

---

## 5. Documentation Work Packages

### P20-000 - Naming Lock

Lock the product terms before further marketplace planning:

- Capability Pack: workflow capabilities, nodes, templates, and action grammar
- Knowledge Pack: governed knowledge catalogues, supplier listings, standards references, SOPs, compliance rules, technical guidelines, rates, and evidence rules
- Data Pack: legacy Phase 19 technical implementation term for existing database/API/test identifiers

Output:

- `Design/Lados_V4_Phase20_Naming_Lock_Capability_Packs_Knowledge_Packs.md`

Acceptance:

- [x] Capability Pack term is locked.
- [x] Knowledge Pack term is locked.
- [x] Data Pack is documented as legacy technical terminology.
- [x] Active Phase 20 docs use Knowledge Pack for product language.

### P20-001 - Capability Pack Planning and Node Taxonomy

Create the Capability Pack planning paper explaining:

- how packs are layered
- how pack ownership boundaries work
- how nodes are indexed
- how canonical node capability keys prevent overlap
- how workflow templates are owned and indexed
- how users and AI find the right node among hundreds or thousands
- how current prototype packs/nodes are kept, renamed, merged, deprecated, or removed

Output:

- `Design/Lados_V4_Phase20A_Fresh_Capability_Build_Decision.md`
- `Design/Lados_V4_Phase20B1_Official_Pack_Manifest_Contract_Standard.md`
- `Design/Lados_V4_Phase20B2_Official_Manifest_SDK_Validator_Compatibility_Alias_Plan.md`
- `Design/Lados_V4_Phase20B3_Official_Skeleton_Validation_and_Capability_Check.md`
- `Design/Lados_V4_Phase20B4_Expanded_Official_Skeleton_Set.md`
- `Design/Lados_V4_Phase20A_Capability_Pack_Planning_and_Node_Taxonomy.md`
- `Design/Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`
- `Design/Lados_V4_Phase20A_Canonical_Capability_Registry.md`
- `Design/Lados_V4_Phase20A_Target_Workflow_Template_Index.md`
- `Design/Lados_V4_Phase20A_Prototype_Node_Audit.md`

Acceptance:

- [x] Fresh-build decision is documented.
- [x] Capability Pack taxonomy is documented.
- [x] Node indexing model is documented.
- [x] Overlap-control rules are documented.
- [x] Workflow template ownership is documented.
- [x] Manifest extension direction is documented.
- [x] Prototype reset policy is documented.
- [x] Draft target Capability Pack catalogue is documented.
- [x] Canonical capability registry is drafted.
- [x] Target workflow template index is drafted.
- [x] Current prototype nodes are audited against the target catalogue.

### P20-002 - Marketplace Strategy Paper

Create the strategic paper explaining:

- why AI search changes supplier websites
- why structured catalogues matter
- why Knowledge Packs are the Lados catalogue unit
- how Lados can become the agentic catalogue layer for suppliers/sellers

Output:

- `Design/Lados_V4_Phase20_Marketplace_Knowledge_Catalogue_Strategy.md`
- `Design/Lados_V4_Phase20C_Catalogue_Provider_Knowledge_Pack_AI_Search_Spec.md`
- `Design/Lados_V4_Phase20D_Marketplace_Screen_Spec_Knowledge_Catalogue_UX_Wire_Plan.md`

Acceptance:

- [x] Explains AI-search business shift.
- [x] Defines Lados as Catalogue Provider knowledge catalogue agent.
- [x] Links Knowledge Packs to marketplace business model.

### P20-003 - Catalogue Provider Knowledge Pack Specification

Define:

- Catalogue Provider profile fields
- Knowledge Pack listing fields
- Knowledge Pack item fields
- product/service/rate/evidence catalogue structures
- source, assumption, and verification metadata

Acceptance:

- [x] Required metadata fields are listed.
- [x] Provider catalogue examples are provided.
- [x] Official vs provider-provided data distinction is documented.

### P20-004 - AI Retrieval and Search Requirements

Define:

- natural language search behavior
- ranking factors
- freshness scoring
- verification scoring
- region and trade filters
- workflow compatibility scoring
- answer citation requirements

Acceptance:

- [x] AI search requirements are written.
- [x] Retrieval result shape is documented.
- [x] AI answer provenance rules are documented.

### P20-005 - Marketplace Screen Specification

Define screens:

- Marketplace Home
- Knowledge Pack Browse
- Catalogue Provider Profile
- Knowledge Pack Detail
- Item Detail
- Publish Knowledge Pack
- Review Queue
- Installed Knowledge
- AI Search Preview

Output:

- `Design/Lados_V4_Phase20D_Marketplace_Screen_Spec_Knowledge_Catalogue_UX_Wire_Plan.md`

Acceptance:

- [x] Each screen has purpose, primary actions, empty state, and data dependencies.
- [x] Buyer and Catalogue Provider journeys are both represented.

### P20-006 - Governance and Verification Checklist

Define:

- verification statuses
- stale data rules
- provider-provided disclaimers
- QS/commercial advisory boundaries
- audit/provenance rules
- human approval requirements

Acceptance:

- [x] Review checklist exists.
- [x] Human approval language is standardized.
- [x] Stale/expired data handling is documented.

### P20-007 - Business Model Notes

Define:

- subscription tiers
- supplier publishing rights
- featured listing ideas
- workflow-integrated supplier model
- marketplace analytics direction

Acceptance:

- [x] Business tiers are documented.
- [x] Buyer and Catalogue Provider value propositions are documented.

### P20-008 - Phase 21+ Implementation Backlog

Convert documentation into implementable backlog:

- database migrations
- API endpoints
- frontend screens
- AI retrieval service
- admin review flow
- tests and browser verification

Acceptance:

- [x] Phase 21+ backlog is created.
- [x] Dependencies and sequencing are clear.

---

## 6. Proposed Future Architecture

```text
Capability Pack
  -> Pack taxonomy and ownership boundary
  -> Canonical capability keys
  -> Nodes
  -> Workflow templates
  -> Required lower-layer packs
  -> Suggested/required Knowledge Packs

Catalogue Provider Profile
  -> Knowledge Pack Listing
    -> Knowledge Pack Version
      -> Collections
        -> Items
          -> Source / Evidence / Region / Unit / Availability

Lados AI Search
  -> reads marketplace and installed Knowledge Packs
  -> ranks by relevance, region, freshness, verification, workflow fit
  -> cites Knowledge Pack provenance
  -> inserts selected item references into workflow nodes

Workflow Runtime
  -> resolves Knowledge Pack item ids
  -> logs data_pack_usages
  -> shows provenance in Execution Log
```

Note: `data_pack_usages` is the current Phase 19C technical column name. Product documentation should use **Knowledge Pack provenance** unless referring to existing database/API identifiers.

---

## 7. Phase 20 Done Criteria

- [x] Capability Pack planning paper complete.
- [x] Node taxonomy and overlap-control model drafted.
- [x] Draft target Capability Pack catalogue complete.
- [x] Canonical capability registry drafted.
- [x] Target workflow template index drafted.
- [x] Prototype node audit drafted.
- [x] Prototype assets marked reference-only for the official product line.
- [x] Marketplace strategy paper complete.
- [x] Catalogue Provider Knowledge Pack specification complete.
- [x] AI retrieval requirements complete.
- [x] Marketplace screen specification complete.
- [x] Governance checklist complete.
- [x] Business model notes complete.
- [x] Phase 21+ implementation backlog complete.
- [x] Existing P18P-P20 plan updated to show Phase 20 documentation pivot.
- [x] V4 README links updated.

---

## 8. Handover

### 2026-07-02 - Phase 20 documentation kickoff

Done:
- Reframed Phase 20 as Marketplace Knowledge Catalogue documentation.
- Added Capability Packs as the first Phase 20 documentation priority before Marketplace Knowledge Packs.
- Captured AI-search shift and Catalogue Provider Knowledge Pack marketplace thesis.
- Created strategy paper and sprint plan.
- Created Capability Pack planning and node taxonomy paper.
- Created draft target Capability Pack catalogue.
- Created canonical capability registry.
- Created target workflow template index.
- Created prototype node audit.
- Accepted fresh-build direction: prototype packs/nodes/templates are reference-only and official assets will be built fresh.
- Created Phase 20B.1 official pack manifest contract standard and first manifest-only official pack skeletons.
- Created Phase 20B.2 official SDK types, validators, and compatibility alias plan.
- Created Phase 20B.3 official skeleton validation script and cross-pack capability checks.
- Created Phase 20B.4 expanded official skeleton set.
- Created Phase 20B.5 remaining professional skeletons, solution packs, and first template packs.
- Created Phase 20B.6 official node design standard, visual metadata, template manifest schema, Marketplace surfacing plan, and Phase 20B contract closeout.
- Created Phase 20C Catalogue Provider, Knowledge Pack, and AI Marketplace Search specification.
- Created Phase 20D Marketplace screen specification and Knowledge Catalogue UX wire plan.
- Created Phase 20E governance, verification, business model, and Phase 21 backlog closeout.

Next:
- Close Phase 20.
- Proceed to Phase 21A UI Copy and Compatibility Pass.
- Keep official runtime activation as a separate later phase with executor, registry sync, compatibility alias activation, workflow migration, and browser verification.

Ad-hoc:
- Phase 19C runtime provenance test remains deferred until a workflow can practically include a Knowledge Pack item.

Docs updated:
- `Design/Lados_V4_Phase20_Marketplace_Knowledge_Catalogue_Strategy.md`
- `Design/Lados_V4_Phase20_Naming_Lock_Capability_Packs_Knowledge_Packs.md`
- `Design/Lados_V4_Phase20A_Fresh_Capability_Build_Decision.md`
- `Design/Lados_V4_Phase20B1_Official_Pack_Manifest_Contract_Standard.md`
- `Design/Lados_V4_Phase20B2_Official_Manifest_SDK_Validator_Compatibility_Alias_Plan.md`
- `Design/Lados_V4_Phase20B3_Official_Skeleton_Validation_and_Capability_Check.md`
- `Design/Lados_V4_Phase20B4_Expanded_Official_Skeleton_Set.md`
- `Design/Lados_V4_Phase20B5_Remaining_Professional_and_Template_Skeletons.md`
- `Design/Lados_V4_Phase20B6_Official_Node_Design_Visual_Metadata_Template_Schema_Closeout.md`
- `Design/Lados_V4_Phase20C_Catalogue_Provider_Knowledge_Pack_AI_Search_Spec.md`
- `Design/Lados_V4_Phase20D_Marketplace_Screen_Spec_Knowledge_Catalogue_UX_Wire_Plan.md`
- `Design/Lados_V4_Phase20E_Governance_Business_Model_Phase21_Backlog.md`
- `Design/Lados_V4_Phase20A_Capability_Pack_Planning_and_Node_Taxonomy.md`
- `Design/Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`
- `Design/Lados_V4_Phase20A_Canonical_Capability_Registry.md`
- `Design/Lados_V4_Phase20A_Target_Workflow_Template_Index.md`
- `Design/Lados_V4_Phase20A_Prototype_Node_Audit.md`
- `Sprint/Lados_V4_Phase20_Marketplace_Knowledge_Catalogue_Documentation.md`

Verification:
- Documentation-only phase; no code verification required.

