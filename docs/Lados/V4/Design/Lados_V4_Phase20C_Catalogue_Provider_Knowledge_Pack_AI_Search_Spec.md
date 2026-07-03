# Lados V4 Phase 20C: Catalogue Provider, Knowledge Pack, and AI Marketplace Search Specification

**Document ID:** LADOS-V4-P20C-CATALOGUE-PROVIDER-KNOWLEDGE-AI-SEARCH  
**Phase:** 20C  
**Status:** Draft specification  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20B6_Official_Node_Design_Visual_Metadata_Template_Schema_Closeout.md`

---

## 1. Purpose

Phase 20C defines the future Lados Marketplace knowledge layer.

The first correction is terminology. The word **Supplier** is too narrow for Lados Marketplace. It only fits procurement sellers, but Lados Knowledge Packs may be published by:

- material suppliers,
- manufacturers,
- plant and equipment owners,
- specialist subcontractors,
- consultants,
- QS/rate library publishers,
- standards and compliance publishers,
- industry associations,
- internal company SOP owners,
- project owners,
- Lados official catalogue maintainers.

The canonical marketplace identity is therefore:

> **Catalogue Provider**

A Catalogue Provider is any verified person, company, organization, publisher, or official Lados team that owns and publishes Knowledge Packs into the Lados Knowledge Catalogue.

---

## 2. Terminology Lock

| Term | Meaning | Use in UI |
|---|---|---|
| Knowledge Catalogue | The searchable marketplace and organization knowledge layer | Marketplace navigation, search pages, AI search |
| Knowledge Pack | A governed package of non-executable knowledge, catalogues, rules, rates, standards references, SOPs, products, services, or evidence requirements | Pack cards, install/subscribe buttons, node requirements |
| Catalogue Provider | The publisher/owner of Knowledge Packs | Profile pages, listing owner, publish flow |
| Provider Profile | Marketplace identity page for a Catalogue Provider | Profile screen |
| Provider Knowledge Pack | A Knowledge Pack published by a Catalogue Provider | Listing cards and review queue |
| Official Knowledge Pack | A Knowledge Pack published or verified by Lados | Official catalogue badge |
| Organization Knowledge Pack | Internal company/project knowledge pack | Private org knowledge area |
| Knowledge Pack Item | A single searchable row/reference/product/rate/rule/evidence item inside a Knowledge Pack | Item picker, item detail, provenance |
| Knowledge Pack Provenance | Source/version/provider/date metadata logged when an item influences workflow output | Execution log and audit |

Deprecated product wording:

| Old wording | Replacement | Notes |
|---|---|---|
| Supplier Knowledge Pack | Provider Knowledge Pack | Supplier remains valid only in RFQ/procurement workflows |
| Supplier Profile | Provider Profile | Marketplace profile, not RFQ contact record |
| Data Pack | Knowledge Pack | `data_pack_*` remains legacy technical naming until migration |
| Data Pack Item | Knowledge Pack Item | UI should change first; API/database can alias later |
| Data Pack Provenance | Knowledge Pack Provenance | Execution UI wording |

---

## 3. Catalogue Provider Types

Catalogue Providers should be typed so marketplace search, verification, and UI labels can be precise.

| Provider type | Examples | Typical Knowledge Packs |
|---|---|---|
| Supplier | concrete supplier, steel stockist, waterproofing supplier | product catalogue, delivery zones, commercial terms |
| Manufacturer | system manufacturer, material brand owner | technical sheets, compliance certificates, product systems |
| Specialist Contractor | M&E subcontractor, piling contractor, waterproofing specialist | capability catalogue, productivity assumptions, certifications |
| Consultant | QS consultant, engineer, claims consultant | checklists, scope templates, review rules |
| Publisher | QS rate library publisher, standards index provider | rates, benchmarks, standards references |
| Association | trade association, professional body | best-practice guidance, competency criteria |
| Organization | internal company team | SOPs, approval rules, preferred supplier lists |
| Lados Official | Lados-maintained catalogue | official seed Knowledge Packs, demo catalogues |

Procurement pages may still say **Supplier** when the user is distributing RFQs or comparing quotations. Marketplace knowledge publishing should say **Catalogue Provider**.

---

## 4. Provider Profile Specification

A Provider Profile is the public or organization-private identity that owns Knowledge Packs.

Required fields:

| Field | Required | Notes |
|---|---:|---|
| `providerId` | yes | Stable ID |
| `displayName` | yes | Marketplace name |
| `legalName` | optional | Required for verified commercial providers |
| `providerType` | yes | Supplier, Manufacturer, Consultant, Publisher, Organization, etc. |
| `verificationStatus` | yes | Unverified, submitted, verified, suspended |
| `regionsServed` | yes | Country/state/city/coverage zones |
| `categories` | yes | Trade, product, service, knowledge categories |
| `contactRoute` | yes | RFQ, email, website, API, private org route |
| `description` | yes | Short provider description |
| `certifications` | optional | CIDB, ISO, product approvals, professional registrations |
| `commercialTermsSummary` | optional | Payment, delivery, warranty, validity notes |
| `lastReviewedAt` | yes | Review timestamp |
| `publishedKnowledgePackCount` | yes | Marketplace display metric |

Provider Profile must make a clear distinction between:

- provider-claimed information,
- Lados-verified metadata,
- official/reference information,
- organization-private information.

---

## 5. Provider Knowledge Pack Listing Specification

A Provider Knowledge Pack Listing is the marketplace wrapper around a versioned Knowledge Pack.

Required fields:

| Field | Required | Notes |
|---|---:|---|
| `listingId` | yes | Stable listing ID |
| `providerId` | yes | Owner Catalogue Provider |
| `packSlug` | yes | Stable Knowledge Pack slug |
| `displayName` | yes | User-facing pack name |
| `description` | yes | Short purpose |
| `knowledgeType` | yes | Product catalogue, rate library, SOP, standards index, evidence rules, etc. |
| `visibility` | yes | Public, organization-private, invitation-only |
| `verificationStatus` | yes | Draft, pending review, verified, stale, rejected, suspended |
| `version` | yes | Current published version |
| `regions` | yes | Applicability |
| `categories` | yes | Marketplace browse/search filters |
| `requiredLicence` | optional | Public, subscription, private, contractual |
| `sourcePolicy` | yes | Provider-provided, official, reference-only, mixed |
| `updateFrequency` | yes | Manual, monthly, quarterly, annual, API-synced |
| `lastUpdatedAt` | yes | Freshness display |
| `itemCount` | yes | Search/browse display |
| `workflowFit` | optional | RFQ, BOQ, claim, procurement, compliance, operations |

---

## 6. Knowledge Pack Item Metadata

Every Knowledge Pack Item should be AI-searchable and provenance-ready.

Required core fields:

- item key
- title
- description
- category path
- tags/synonyms
- provider ID
- pack ID/version
- collection key
- region/applicability
- effective date range
- source name
- source date
- source URL or document reference
- verification status
- advisory/commercial-use wording

Commercial item fields where applicable:

- unit
- currency
- rate/price/value
- price basis
- minimum order quantity
- lead time
- delivery zone
- warranty
- exclusions
- assumptions
- validity period
- last confirmed date

Compliance/reference item fields where applicable:

- standard/code/guideline reference
- clause/section reference
- jurisdiction
- issuing body
- publication date
- licensing note
- excerpt policy
- full-document link/reference

---

## 7. AI Marketplace Search Requirements

AI search should return explainable results, not just cards.

Natural-language examples:

- "Find basement waterproofing systems available in Klang Valley."
- "Show verified concrete suppliers with Grade 30 delivery to Shah Alam."
- "What evidence is needed for a progress claim on preliminaries?"
- "Find ISO-related quality SOP packs for construction document control."
- "Compare plant hire providers for 20-ton excavators in Selangor."

Ranking factors:

| Factor | Purpose |
|---|---|
| Relevance | Match query intent, category, synonyms, and item fields |
| Region fit | Prefer applicable location/coverage |
| Verification status | Prefer verified providers and packs |
| Freshness | Prefer current effective dates and recently confirmed items |
| Source quality | Prefer official/reference/cited data |
| Workflow fit | Prefer items usable by the active workflow/node |
| Organization install status | Prefer already installed Knowledge Packs when working inside a project |
| Human review requirement | Surface advisory or restricted-use warnings |

AI answer rules:

1. Always cite Provider, Knowledge Pack, version, item key, and source date where available.
2. Clearly label provider-provided data.
3. Do not present rates, prices, standards, or legal/compliance references as final truth without review.
4. Offer workflow actions only when the item has enough metadata.
5. Preserve selected item IDs for workflow provenance logging.

---

## 8. Retrieval Result Shape

AI and search APIs should return a structure similar to:

```json
{
  "query": "waterproofing suppliers Klang Valley",
  "results": [
    {
      "provider": {
        "id": "provider_abc",
        "displayName": "Example Waterproofing Sdn Bhd",
        "providerType": "Supplier",
        "verificationStatus": "verified"
      },
      "knowledgePack": {
        "slug": "example.waterproofing-catalogue",
        "version": "2026.1",
        "displayName": "Waterproofing Product Catalogue"
      },
      "item": {
        "id": "item_xyz",
        "key": "PU-BASEMENT-001",
        "title": "PU injection basement waterproofing system",
        "region": "Klang Valley",
        "sourceDate": "2026-01-01"
      },
      "fit": {
        "score": 0.87,
        "reasons": ["region match", "verified provider", "workflow-compatible RFQ item"]
      },
      "warnings": ["Provider-provided pricing must be confirmed by quotation."]
    }
  ]
}
```

---

## 9. UI/UX Wording Change Register

This is the UI/UX backlog required to align Lados with the new terminology.

### Global Navigation

| Current | Target | Notes |
|---|---|---|
| Marketplace | Marketplace | Keep |
| Suppliers | Trade Partners or Suppliers | Keep **Suppliers** only for RFQ/procurement contact management. Consider **Trade Partners** if the page expands beyond RFQ suppliers. |

### Marketplace Tabs

| Current | Target |
|---|---|
| Installed Packs | Installed Capability Packs |
| Browse Registry | Browse Capability Packs |
| Data Packs | Knowledge Packs |
| Publish Pack | Publish Capability Pack |
| Review Queue | Review Queue |

Future tabs:

- Knowledge Catalogue
- Provider Profiles
- Publish Knowledge Pack
- Installed Knowledge
- AI Search Preview

### Marketplace Data/Knowledge Copy

| Current copy | Target copy |
|---|---|
| Data Packs are governed datasets and knowledge packs | Knowledge Packs are governed catalogues of rates, rules, standards references, SOPs, products, services, and evidence requirements |
| Organization Data Packs | Installed Knowledge Packs |
| Browse Official Data Packs | Browse Official Knowledge Packs |
| Install Data Pack | Install Knowledge Pack |
| Disable Data Pack | Disable Knowledge Pack |
| Data Pack values are references... | Knowledge Pack values are references until accepted by a human reviewer or confirmed by contract/source authority |

### Explorer / Canvas

| Current | Target |
|---|---|
| Data Packs panel | Knowledge Catalogue panel |
| Data Packs | Knowledge Packs |
| Search Data Pack items | Search Knowledge Pack Items |
| Install Data Packs from Marketplace | Install Knowledge Packs from Marketplace |
| No Data Pack items found | No Knowledge Pack Items found |

### Property Panel

| Current | Target |
|---|---|
| Requires Data Packs | Requires Knowledge Packs |
| Data Pack item picker | Knowledge Pack Item picker |
| Choose Data Pack item | Choose Knowledge Pack Item |
| Failed to search Data Pack items | Failed to search Knowledge Pack Items |

### Execution Log / Audit

| Current | Target |
|---|---|
| Data Pack Provenance | Knowledge Pack Provenance |
| Data Pack usage | Knowledge Pack usage |
| data_pack_usages | Keep as technical/database field until migration; hide from UI copy |

### Provider Marketplace

| Current | Target |
|---|---|
| Supplier Profile | Provider Profile |
| Supplier Knowledge Pack | Provider Knowledge Pack |
| Supplier publishes catalogue | Catalogue Provider publishes Knowledge Pack |
| supplier/seller | Catalogue Provider, with type labels Supplier, Manufacturer, Consultant, Publisher, Organization |

---

## 10. What Should Not Change Yet

Do not rename these technical items immediately:

- `data_packs`
- `data_pack_versions`
- `data_pack_collections`
- `data_pack_items`
- `org_data_pack_installs`
- `data_pack_usages`
- API routes under `/data-packs`
- Phase 19 smoke test names

Reason:

These are working implementation identifiers. A future compatibility phase should add aliases or migrations deliberately.

Do not rename procurement/RFQ business objects blindly:

- supplier quote
- supplier contact
- RFQ supplier
- suppliers page, if it remains strictly procurement/RFQ contact management

Reason:

Supplier is still the correct term for procurement counterparties. The broader marketplace publisher identity is Catalogue Provider.

---

## 11. Phase 20C Acceptance Criteria

- [x] Better term than Supplier selected: **Catalogue Provider**.
- [x] Terminology distinction documented: Supplier for procurement, Catalogue Provider for marketplace publishing.
- [x] Provider Profile fields drafted.
- [x] Provider Knowledge Pack listing fields drafted.
- [x] Knowledge Pack Item metadata drafted.
- [x] AI search requirements drafted.
- [x] Retrieval result shape drafted.
- [x] UI/UX wording change register drafted.
- [x] Technical rename deferral documented.

---

## 12. Next Work

Recommended next step:

**Phase 20D - Marketplace Screen Specification and Knowledge Catalogue UX Wire Plan**

This should convert the wording and data contracts into screen-level plans for:

- Marketplace Home,
- Knowledge Catalogue Browse,
- Provider Profile,
- Knowledge Pack Detail,
- Knowledge Pack Item Detail,
- Publish Knowledge Pack,
- Installed Knowledge,
- AI Search Preview,
- Review Queue.
