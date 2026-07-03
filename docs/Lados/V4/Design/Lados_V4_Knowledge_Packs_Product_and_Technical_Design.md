# Lados V4 Knowledge Packs: Product and Technical Design

**Document ID:** LADOS-V4-KNOWLEDGE-PACKS-CANONICAL  
**Status:** Canonical design paper  
**Date:** 2026-07-03  
**Consolidates:** Phase 19 Data Pack Engine and Phase 20 Knowledge Pack, Catalogue Provider, AI Search, Marketplace UX, governance, business model, and Phase 21 backlog documents.

---

## 1. Purpose

Knowledge Packs are the governed knowledge layer of Lados.

They provide structured, source-aware, versioned knowledge that workflows and AI search can cite, compare, and use. They are non-executable.

This paper is the canonical Knowledge Pack design reference for Phase 21+ implementation.

---

## 2. Naming Lock

| Term | Meaning |
|---|---|
| Knowledge Pack | Product/domain term for governed catalogues, rules, rates, SOPs, standards indexes, product/service catalogues, evidence requirements, and reference data |
| Data Pack | Legacy Phase 19 technical implementation term currently used in database/API/code identifiers |
| Knowledge Catalogue | Searchable marketplace and organization knowledge layer |
| Knowledge Pack Item | Single row/reference/product/rate/rule/evidence item inside a Knowledge Pack |
| Knowledge Pack Provenance | Source/version/provider/date metadata logged when an item influences workflow output |
| Catalogue Provider | Marketplace publisher identity for Knowledge Packs |
| Provider Profile | Marketplace identity page for a Catalogue Provider |
| Provider Knowledge Pack | A Knowledge Pack published by a Catalogue Provider |

Product UI should use **Knowledge Pack**. Existing implementation identifiers may remain `data_pack_*` until a deliberate compatibility phase.

Do not blindly rename procurement/RFQ business objects:

- supplier quote,
- supplier contact,
- RFQ supplier,
- suppliers page if it remains strictly procurement contact management.

Supplier remains valid for procurement counterparties and as one Catalogue Provider type.

---

## 3. Product Definition

A Knowledge Pack may contain:

- rate libraries,
- BOQ item libraries,
- evidence checklists,
- standards/specification indexes,
- contract clause indexes,
- productivity norms,
- supplier/product/service catalogues,
- material price reference tables,
- SOPs and policies,
- regulatory/compliance references,
- technical guideline indexes,
- workflow prompt/context datasets.

Knowledge Packs are not executable code.

---

## 4. Existing Technical Implementation

Phase 19 implemented the first technical layer under the name **Data Pack Engine**.

Current technical identifiers:

- `data_packs`
- `data_pack_versions`
- `data_pack_collections`
- `data_pack_items`
- `org_data_pack_installs`
- `execution_logs.data_pack_usages`
- API routes under `/data-packs`
- Phase 19 smoke test scripts using `data_packs`

These should not be renamed during the Phase 21A UI copy pass.

Future compatibility work may add:

- UI aliases,
- DTO aliases,
- route aliases,
- eventual database migration if justified.

---

## 5. Technical Data Model

### 5.1 Pack Identity

`data_packs`

Key fields:

- `id`
- `slug`
- `display_name`
- `description`
- `publisher`
- `domain`
- `category`
- `is_official`
- `status`
- `created_at`
- `updated_at`

### 5.2 Version

`data_pack_versions`

Key fields:

- `id`
- `data_pack_id`
- `version`
- `source_summary`
- `effective_from`
- `effective_to`
- `region`
- `currency`
- `unit_system`
- `checksum`
- `manifest_json`
- `published_at`

Versions should be treated as immutable for workflow provenance.

### 5.3 Collection

`data_pack_collections`

Examples:

- `rates`
- `boq_items`
- `claim_evidence_rules`
- `standards_index`
- `product_catalogue`
- `sop_rules`

Key fields:

- `id`
- `version_id`
- `key`
- `display_name`
- `schema_json`
- `item_count`

### 5.4 Item

`data_pack_items`

Key fields:

- `id`
- `collection_id`
- `item_key`
- `title`
- `description`
- `unit`
- `value_json`
- `tags`
- `source_name`
- `source_url`
- `source_date`
- `region`
- `effective_from`
- `effective_to`

### 5.5 Organization Install

`org_data_pack_installs`

Key fields:

- `id`
- `organization_id`
- `data_pack_id`
- `version_id`
- `installed_by`
- `status`
- `installed_at`

---

## 6. Existing API Surface

Current Phase 19 API shape:

| Endpoint | Purpose |
|---|---|
| `GET /data-packs` | Browse available technical Data Packs |
| `GET /data-packs/:slug` | Pack details and versions |
| `GET /data-packs/:slug/versions/:version` | Version manifest |
| `POST /data-packs/:slug/install?organizationId=` | Install version to organization |
| `DELETE /data-packs/:slug?organizationId=` | Disable/uninstall from organization |
| `GET /org/data-packs?organizationId=` | Installed organization packs |
| `GET /data-pack-items/search` | Search installed data items |
| `GET /data-pack-items/:itemId` | Item detail and provenance |

Phase 21 should preserve this API while updating user-facing copy.

---

## 7. Official Seed Knowledge Packs

Implemented under Phase 19 Data Pack Engine:

| Product label | Technical seed |
|---|---|
| Lados QS Rate Library | `lados.qs-rate-library` |
| Lados BOQ Item Library | `lados.boq-item-library` |
| Lados Claim Evidence Rules | `lados.claim-evidence-rules` |
| Lados Construction Standards Index | `lados.construction-standards-index` |
| Lados Contractor Productivity Library | `lados.contractor-productivity-library` |

These seed packs should be presented as **Official Knowledge Packs** in product UI.

---

## 8. Runtime Consumption and Provenance

Nodes should consume Knowledge Pack Items through explicit references.

Current technical node field type:

```ts
{
  key: "rate_item",
  label: "Rate Item",
  type: "data_pack_item",
  dataPackCollection: "rates",
  required: true
}
```

Product UI should label this as **Knowledge Pack Item** while preserving the technical field type for compatibility.

Runtime should:

1. resolve Resource Bindings,
2. detect Knowledge Pack/Data Pack item references in node config,
3. resolve item metadata,
4. pass resolved payload to node execution where applicable,
5. log provenance to `execution_logs.data_pack_usages`,
6. display it as **Knowledge Pack Provenance** in UI.

---

## 9. Catalogue Provider Model

A Catalogue Provider is any verified person, company, organization, publisher, or official Lados team that owns and publishes Knowledge Packs into the Lados Knowledge Catalogue.

Provider types:

| Provider type | Examples |
|---|---|
| Supplier | concrete supplier, steel stockist, waterproofing supplier |
| Manufacturer | material brand owner, product system manufacturer |
| Specialist Contractor | piling contractor, waterproofing specialist |
| Consultant | QS consultant, engineer, claims consultant |
| Publisher | rate library publisher, standards index provider |
| Association | professional body, trade association |
| Organization | internal company SOP owner |
| Lados Official | official Lados catalogue maintainer |

Provider Profile required fields:

- provider ID,
- display name,
- legal name where required,
- provider type,
- verification status,
- regions served,
- categories,
- contact route,
- description,
- certifications,
- commercial terms summary,
- last reviewed date,
- published Knowledge Pack count.

---

## 10. Provider Knowledge Pack Listing

A Provider Knowledge Pack Listing is the marketplace wrapper around a versioned Knowledge Pack.

Required fields:

- listing ID,
- provider ID,
- pack slug,
- display name,
- description,
- knowledge type,
- visibility,
- verification status,
- version,
- regions,
- categories,
- required licence,
- source policy,
- update frequency,
- last updated date,
- item count,
- workflow fit.

---

## 11. AI Marketplace Search

AI search should return explainable results, not just cards.

Ranking factors:

| Factor | Purpose |
|---|---|
| Relevance | match query intent, category, synonyms, and item fields |
| Region fit | prefer applicable location/coverage |
| Verification status | prefer verified providers and packs |
| Freshness | prefer current effective dates and recently reviewed items |
| Source quality | prefer official/reference/cited data |
| Workflow fit | prefer items usable by the active workflow/node |
| Organization install status | prefer installed Knowledge Packs inside projects |
| Human review requirement | surface advisory or restricted-use warnings |

AI answer rules:

1. cite Provider, Knowledge Pack, version, item key, source, and source date where available,
2. label provider-provided data,
3. do not present rates, prices, standards, legal, or compliance references as final truth,
4. offer workflow actions only when metadata is sufficient,
5. preserve item IDs for workflow provenance.

---

## 12. Marketplace UX

Recommended Marketplace information architecture:

```text
Marketplace
  Overview
  Capability Packs
  Knowledge Catalogue
  Installed Knowledge
  Provider Profiles
  Publish Knowledge Pack
  Review Queue
  AI Search Preview
```

Core screens:

- Marketplace Home,
- Knowledge Catalogue Browse,
- Provider Profile,
- Knowledge Pack Detail,
- Knowledge Pack Item Detail,
- Installed Knowledge,
- Publish Knowledge Pack,
- Review Queue,
- AI Search Preview.

Key UI copy changes:

| Current | Target |
|---|---|
| Data Packs | Knowledge Packs |
| Data Packs panel | Knowledge Catalogue panel |
| Data Pack item | Knowledge Pack Item |
| Data Pack Provenance | Knowledge Pack Provenance |
| Organization Data Packs | Installed Knowledge Packs |
| Browse Official Data Packs | Browse Official Knowledge Packs |
| Install Data Pack | Install Knowledge Pack |

---

## 13. Governance

Governance principles:

1. Knowledge Packs are non-executable.
2. Provider-provided data remains labelled.
3. Commercial values are advisory until confirmed.
4. Standards/compliance references must respect licensing.
5. Workflow provenance is mandatory.
6. Human accountability stays visible.
7. Stale knowledge must not be hidden.

Verification statuses:

| Entity | Statuses |
|---|---|
| Catalogue Provider | Draft, Submitted, Verified, Changes requested, Suspended, Archived |
| Knowledge Pack | Draft, Pending review, Verified, Rejected, Changes requested, Stale, Suspended, Archived |
| Knowledge Pack Item | Active, Advisory, Expired, Superseded, Restricted, Flagged |

---

## 14. Review Checklist

Knowledge Pack submissions should verify:

- provider profile exists,
- provider type and region are declared,
- pack slug/version are stable,
- source policy is declared,
- item metadata is complete,
- source name/date are present,
- licensing/copyright status is acceptable,
- advisory/human-review wording exists,
- no executable runtime code is included,
- organization-private data is not exposed publicly.

---

## 15. Stale and Expired Data Rules

| Condition | UI behavior | AI behavior |
|---|---|---|
| expired effective date | show expired badge | do not recommend unless historical |
| stale review date | show stale badge | lower ranking |
| newer version exists | link to current version | prefer newer version |
| suspended provider | block new installs | do not recommend |
| missing source date | fail verified review | do not cite as high-confidence |
| region mismatch | show warning | lower ranking |

---

## 16. Standard Advisory Wording

General:

```text
Knowledge Pack values are references until confirmed by contract, source authority, or a human reviewer.
```

Provider-provided data:

```text
This information is provider-provided. Verification confirms metadata and review status, not commercial truth.
```

Rates and prices:

```text
Provider-provided pricing must be confirmed by quotation before commercial use.
```

QS/commercial decisions:

```text
This reference may support assessment, but certification, valuation, entitlement, and payment decisions require human review.
```

Standards/compliance:

```text
This is a reference index, not a substitute for the licensed source document or professional review.
```

---

## 17. Business Model Notes

Potential Catalogue Provider tiers:

| Tier | Purpose |
|---|---|
| Free Provider Profile | basic discoverability |
| Catalogue Publisher | publish verified Knowledge Packs |
| Featured Provider | boosted marketplace visibility and richer profile |
| Workflow Integrated Provider | item insertion into RFQ/procurement/workflow contexts |
| Private Organization Provider | internal company knowledge publishing |
| Lados Official | Lados-maintained official knowledge |

Buyer value:

- search structured knowledge,
- compare provenance,
- install trusted Knowledge Packs,
- use items in workflows with audit trail,
- preserve human review.

Catalogue Provider value:

- become discoverable to AI-assisted users,
- publish machine-readable catalogues,
- control version and region metadata,
- connect catalogue items to workflows.

---

## 18. Phase 21+ Implementation Backlog

Recommended sequence:

1. **Phase 21A - UI Copy and Compatibility Pass**
   - change visible product wording to Knowledge Packs,
   - keep `data_pack_*` technical identifiers.
2. **Phase 21B - Provider Profile Data Model**
   - add Catalogue Provider schema, API, and profile page.
3. **Phase 21C - Knowledge Pack Listing Layer**
   - add product-level listing/alias over existing Data Pack implementation.
4. **Phase 21D - Review Queue Expansion**
   - review Provider Profiles and Knowledge Packs.
5. **Phase 21E - AI Search Preview**
   - add safe cited search over installed and marketplace knowledge.
6. **Phase 21F - Official Pack Runtime Activation Planning**
   - plan official Capability Pack runtime surfacing separately.

Deferred beyond Phase 21:

- payment/billing,
- public SEO provider pages,
- full vector database search,
- automated copyrighted content verification,
- provider analytics dashboard,
- dynamic uploaded executor runtime,
- full `data_pack_*` to `knowledge_pack_*` technical rename.

---

## 19. Supporting Documents

The following documents remain supporting history:

- `Lados_V4_DataPacks_ProfessionalBundles_Tech_Paper.md`
- `Lados_V4_Phase20_Naming_Lock_Capability_Packs_Knowledge_Packs.md`
- `Lados_V4_Phase20_Marketplace_Knowledge_Catalogue_Strategy.md`
- `Lados_V4_Phase20C_Catalogue_Provider_Knowledge_Pack_AI_Search_Spec.md`
- `Lados_V4_Phase20D_Marketplace_Screen_Spec_Knowledge_Catalogue_UX_Wire_Plan.md`
- `Lados_V4_Phase20E_Governance_Business_Model_Phase21_Backlog.md`
