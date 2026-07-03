# Lados V4 Phase 20D: Marketplace Screen Specification and Knowledge Catalogue UX Wire Plan

**Document ID:** LADOS-V4-P20D-MARKETPLACE-SCREENS-KNOWLEDGE-UX  
**Phase:** 20D  
**Status:** Draft screen specification  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20C_Catalogue_Provider_Knowledge_Pack_AI_Search_Spec.md`

---

## 1. Purpose

Phase 20D converts the Phase 20C terminology and Knowledge Pack contracts into screen-level UX plans.

This is still a documentation phase. It does not rename working database/API identifiers or rebuild the UI yet. Its purpose is to define what the future Lados Marketplace should look like before implementation begins.

The Marketplace must clearly separate:

- **Capability Packs**: executable workflow capabilities, nodes, and templates.
- **Knowledge Packs**: governed non-executable catalogues, references, rates, rules, SOPs, standards indexes, products, services, and evidence requirements.
- **Catalogue Providers**: verified publishers/owners of Knowledge Packs.

---

## 2. Marketplace Information Architecture

Recommended top-level Marketplace areas:

| Area | Purpose | Primary user |
|---|---|---|
| Marketplace Home | Search-first overview for Capability Packs and Knowledge Catalogue | All users |
| Capability Packs | Browse/install executable or manifest-only Capability Packs | Workflow builders/admins |
| Knowledge Catalogue | Browse/search Knowledge Packs and Knowledge Pack Items | Workflow builders, buyers, QS, operations |
| Provider Profiles | View Catalogue Provider identity, verification, regions, packs, and contact route | Buyers/admins |
| Installed Knowledge | Organization-installed Knowledge Packs and enabled versions | Admins/workflow builders |
| Publish Knowledge Pack | Provider upload/editor flow | Catalogue Providers/admins |
| Review Queue | Owner/admin verification flow | Lados/admin users |
| AI Search Preview | Conversational search over marketplace and installed knowledge | All users |

Recommended navigation model:

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

Short-term implementation can keep a tabbed Marketplace page, but the IA should be ready to split into child routes when the screens become deeper.

---

## 3. Route Plan

| Screen | Recommended route | Current nearest UI |
|---|---|---|
| Marketplace Home | `/marketplace` | `/marketplace` |
| Capability Pack Browse | `/marketplace/capability-packs` | `/marketplace` Browse Registry / Installed tabs |
| Capability Pack Detail | `/marketplace/capability-packs/[packId]` | `/packs/[packId]` |
| Knowledge Catalogue Browse | `/marketplace/knowledge` | `/marketplace` Data Packs tab |
| Knowledge Pack Detail | `/marketplace/knowledge/[packSlug]` | Marketplace Data Pack detail drawer |
| Knowledge Pack Item Detail | `/marketplace/knowledge/[packSlug]/items/[itemId]` | Data Pack item detail modal |
| Installed Knowledge | `/marketplace/knowledge/installed` | Marketplace Data Packs installed section |
| Provider Profile | `/marketplace/providers/[providerId]` | New |
| Publish Knowledge Pack | `/marketplace/knowledge/publish` | New |
| Review Queue | `/marketplace/review` | `/marketplace` Review Queue tab |
| AI Search Preview | `/marketplace/search` | New |

Route names should use `knowledge` for product UI. API/database may continue to use `/data-packs` until a deliberate compatibility migration.

---

## 4. Screen Specifications

### 4.1 Marketplace Home

**Purpose:** Give users a search-first entry into Lados Marketplace while separating Capability Packs from Knowledge Packs.

**Primary actions:**

- Search marketplace.
- Browse Capability Packs.
- Browse Knowledge Catalogue.
- View Installed Knowledge.
- Publish Knowledge Pack if user has provider/admin rights.

**Layout wire plan:**

```text
Header: Marketplace
Search bar: "Search capability packs, knowledge packs, providers, rates, rules, products..."

Two primary bands:
  Capability Packs
    Installed Capability Packs count
    Browse Capability Packs
    Official manifest-only packs note

  Knowledge Catalogue
    Installed Knowledge count
    Browse Knowledge Packs
    AI Search Preview

Secondary band:
  Featured Providers
  Recently Updated Knowledge Packs
  Pending Review Queue alert for owner/admin
```

**Empty state:** "No installed knowledge yet. Browse the Knowledge Catalogue to install governed references for workflows."

**Data dependencies:**

- installed capability pack count
- registry capability pack count
- installed Knowledge Pack count
- browseable Knowledge Pack count
- pending review count for owner/admin

---

### 4.2 Capability Pack Browse

**Purpose:** Browse executable or manifest-only node/template packs without confusing them with Knowledge Packs.

**Primary actions:**

- Search Capability Packs.
- Filter by category, runtime status, official/external, installed status.
- Install verified manifest-only external pack.
- Open pack detail.

**Required labels:**

- `Official Capability Pack`
- `External Capability Pack`
- `Manifest only`
- `Runtime not enabled`
- `Installed`
- `Verified`

**Data dependencies:**

- current registry packs
- installed packs
- official `packs/official` manifest-only catalogue when runtime surfacing is implemented

**Current UI copy changes:**

| Current | Target |
|---|---|
| Installed Packs | Installed Capability Packs |
| Browse Registry | Browse Capability Packs |
| Publish Pack | Publish Capability Pack |

---

### 4.3 Knowledge Catalogue Browse

**Purpose:** Browse and search Knowledge Packs, including official, provider-published, and organization-private knowledge.

**Primary actions:**

- Search Knowledge Packs and Knowledge Pack Items.
- Filter by knowledge type, provider type, region, verification status, source policy, installed status, and freshness.
- Open Knowledge Pack detail.
- Install Knowledge Pack.
- Open Provider Profile.

**Layout wire plan:**

```text
Title: Knowledge Catalogue
Search: "Search rates, standards references, SOPs, products, evidence rules..."

Left filters:
  Knowledge type
  Provider type
  Region
  Verification
  Source policy
  Installed status
  Effective date

Results:
  Knowledge Pack cards
  Inline matching item snippets
  Provider badge
  Verification/freshness badge
```

**Empty state:** "No Knowledge Packs match this search. Try another region, provider type, or knowledge type."

**Data dependencies:**

- Knowledge Pack listings
- Provider profile summary
- install status
- item search snippets

**Current UI source to refactor later:**

- `apps/web/src/app/(app)/marketplace/page.tsx`
- existing Phase 19 Data Packs tab should become Knowledge Catalogue browse/installed surfaces in UI copy first.

---

### 4.4 Provider Profile

**Purpose:** Show the verified identity and published Knowledge Packs of a Catalogue Provider.

**Primary actions:**

- View published Knowledge Packs.
- Filter provider packs by category/region/status.
- Contact provider or open RFQ route where applicable.
- Follow/subscribe to provider if business model supports it later.

**Layout wire plan:**

```text
Provider header:
  display name
  provider type
  verification status
  regions served
  categories
  last reviewed date

Tabs:
  Knowledge Packs
  Certifications
  Commercial Terms
  Contact / RFQ Route
  Verification Notes
```

**Important wording:** Use **Provider Profile**, not Supplier Profile. If provider type is Supplier, show a `Supplier` type badge inside the profile.

**Empty state:** "This provider has no verified Knowledge Packs yet."

**Data dependencies:**

- provider profile fields from Phase 20C
- provider Knowledge Pack listings
- verification metadata

---

### 4.5 Knowledge Pack Detail

**Purpose:** Explain one Knowledge Pack, its version, collections, provenance, governance status, and workflow fit.

**Primary actions:**

- Install/disable Knowledge Pack.
- Open collection.
- Search items within this pack.
- View version/source information.
- Open Provider Profile.
- Insert/select item when launched from node config.

**Layout wire plan:**

```text
Header:
  Knowledge Pack name
  Provider
  version
  verification status
  source policy
  install status

Summary:
  description
  regions
  categories
  workflow fit
  update frequency
  item count

Sections:
  Collections
  Search Items
  Provenance and Source Policy
  Governance / Advisory Notice
  Version History
```

**Empty state:** "This Knowledge Pack has no searchable items in the selected version."

**Data dependencies:**

- pack listing
- current version
- collections
- install status
- provenance/source metadata

---

### 4.6 Knowledge Pack Item Detail

**Purpose:** Give users enough context to trust or reject a single item before using it in a workflow.

**Primary actions:**

- Add/select item for node config.
- Copy item reference.
- Open Knowledge Pack.
- Open source/provenance.

**Required visible fields:**

- item title and key
- provider
- Knowledge Pack slug/version
- collection
- description
- region/applicability
- effective dates
- source name/date/reference
- verification status
- advisory/commercial-use warning
- value fields where applicable: unit, currency, rate/price/value, assumptions, exclusions

**Layout wire plan:**

```text
Item header:
  title
  key
  verification badge

Details:
  value / rule / reference summary
  applicability
  assumptions and exclusions

Provenance:
  provider
  Knowledge Pack version
  source name/date/reference

Actions:
  Select for workflow
  Open pack
```

**Current UI source to refactor later:**

- `apps/web/src/components/canvas/fields/DataPackItemField.tsx`
- `apps/web/src/components/canvas/DataPackBrowser.tsx`
- `apps/web/src/app/(app)/marketplace/page.tsx`

---

### 4.7 Installed Knowledge

**Purpose:** Manage organization-installed Knowledge Packs and enabled versions.

**Primary actions:**

- View installed Knowledge Packs.
- Search installed items.
- Disable Knowledge Pack.
- Open detail.
- Check stale/expired packs.

**Required states:**

- Installed
- Disabled
- Stale
- Update available
- Verification changed

**Layout wire plan:**

```text
Title: Installed Knowledge
Summary counters:
  Installed
  Stale
  Update available

Table/cards:
  Knowledge Pack
  Provider
  version
  installed by/date
  item count
  status
  actions
```

**Empty state:** "No Knowledge Packs installed for this organization."

---

### 4.8 Publish Knowledge Pack

**Purpose:** Let a Catalogue Provider submit or edit a Knowledge Pack for review.

**Primary actions:**

- Create/edit Provider Profile.
- Upload/import Knowledge Pack manifest.
- Validate metadata.
- Preview collections/items.
- Submit for review.

**Required steps:**

1. Provider identity
2. Pack metadata
3. Version and source policy
4. Collections and item schema
5. Upload/import items
6. Provenance and advisory wording
7. Preview
8. Submit for review

**Required validation:**

- provider profile completeness
- pack slug/version uniqueness
- source policy
- required item metadata
- region/effective date rules
- no executable code
- copyright/licensing note for standards/documents

**Empty state:** "Create a Provider Profile before publishing Knowledge Packs."

---

### 4.9 Review Queue

**Purpose:** Give owner/admin users a governed review path for Capability Packs and Knowledge Packs.

**Primary actions:**

- Review submitted Knowledge Packs.
- Review submitted Capability Packs.
- Approve, reject, suspend, or request changes.
- Add review notes.

**Recommended tabs:**

- Capability Pack submissions
- Knowledge Pack submissions
- Provider Profile verification

**Required checks for Knowledge Packs:**

- Provider identity verified or clearly labelled unverified.
- Source policy declared.
- Required provenance fields present.
- Stale/effective date rules clear.
- Provider-provided content labelled.
- Advisory/human-review wording present.
- No uploaded executor/runtime code.

**Current UI source to refactor later:**

- existing `/marketplace` Review Queue is Capability Pack registry only.

---

### 4.10 AI Search Preview

**Purpose:** Test and explain conversational search over installed and marketplace knowledge before full agent integration.

**Primary actions:**

- Ask natural-language marketplace question.
- Filter search scope: installed only, marketplace, official only, provider-published.
- View cited results.
- Open result item.
- Insert compatible item into workflow context later.

**Layout wire plan:**

```text
Question input:
  "Find concrete Grade 30 references for Selangor..."

Scope selector:
  Installed Knowledge
  Marketplace Knowledge
  Official Knowledge
  Provider Knowledge

Answer panel:
  summary
  cited Knowledge Pack Items
  warnings
  suggested workflow action

Results panel:
  item cards with provider, pack/version, source date, score reasons
```

**AI answer rules:**

- Cite provider, Knowledge Pack, version, item key, and source date.
- Label provider-provided data.
- Show warnings for price/rate/compliance uncertainty.
- Do not imply contract/legal/commercial finality.

---

## 5. Cross-Screen UX Rules

### 5.1 Naming Rules

| Concept | UI label |
|---|---|
| executable node/template bundle | Capability Pack |
| governed knowledge catalogue | Knowledge Pack |
| searchable marketplace/org knowledge layer | Knowledge Catalogue |
| publisher/owner of Knowledge Packs | Catalogue Provider |
| provider page | Provider Profile |
| single data/rule/rate/reference row | Knowledge Pack Item |
| execution audit label | Knowledge Pack Provenance |

### 5.2 Badge Rules

Required badges:

- Official
- Provider-provided
- Organization-private
- Verified
- Pending review
- Stale
- Advisory
- Installed
- Manifest only
- Runtime not enabled

### 5.3 Human Review Copy

Use short, consistent language:

```text
Knowledge Pack values are references until confirmed by contract, source authority, or a human reviewer.
```

For rates/prices:

```text
Provider-provided pricing must be confirmed by quotation before commercial use.
```

For standards/compliance:

```text
This is a reference index, not a substitute for the licensed source document or professional review.
```

---

## 6. Existing UI/UX Change Register

These are the code areas to update in a later implementation phase.

| Area | File | Required UI copy change |
|---|---|---|
| Marketplace tabs and pack copy | `apps/web/src/app/(app)/marketplace/page.tsx` | Data Packs -> Knowledge Packs, Browse Registry -> Browse Capability Packs, Publish Pack -> Publish Capability Pack |
| Explorer data panel | `apps/web/src/components/canvas/DataPackBrowser.tsx` | Data Packs panel -> Knowledge Catalogue panel |
| Property panel requirements | `apps/web/src/components/canvas/PropertyPanel.tsx` | Requires Data Packs -> Requires Knowledge Packs |
| Data item field picker | `apps/web/src/components/canvas/fields/DataPackItemField.tsx` | Data Pack item -> Knowledge Pack Item |
| Execution log provenance | `apps/web/src/components/canvas/ExecutionLogPanel.tsx` | Data Pack Provenance -> Knowledge Pack Provenance |
| Navigation suppliers | `apps/web/src/app/(app)/layout.tsx` | Keep Suppliers only if strictly RFQ/procurement; otherwise consider Trade Partners |
| Supplier management page | `apps/web/src/app/(app)/suppliers/page.tsx` | Keep as Suppliers if it remains procurement contact management |

Do not rename API/database paths in the UI copy pass unless the backend compatibility plan is ready.

---

## 7. Buyer Journey

```text
Buyer asks marketplace question
  -> AI Search Preview returns cited Knowledge Pack Items
  -> Buyer opens item detail
  -> Buyer opens provider or pack detail
  -> Buyer installs Knowledge Pack or selects item into workflow
  -> Workflow logs Knowledge Pack Provenance
```

Acceptance:

- buyer can see where the knowledge came from
- buyer can tell whether it is official, provider-provided, or organization-private
- buyer sees advisory warnings before using commercial/compliance data

---

## 8. Catalogue Provider Journey

```text
Provider creates profile
  -> Provider prepares Knowledge Pack
  -> Provider validates metadata/source policy
  -> Provider submits for review
  -> Admin verifies or requests changes
  -> Knowledge Pack becomes searchable
  -> Provider receives analytics in a later business-model phase
```

Acceptance:

- provider identity is separate from procurement supplier record
- review status is visible
- source and licensing requirements are visible before submission

---

## 9. Admin Review Journey

```text
Admin opens Review Queue
  -> selects Provider Profile, Capability Pack, or Knowledge Pack submission
  -> checks metadata, provenance, warnings, and licensing notes
  -> approves, rejects, suspends, or requests changes
```

Acceptance:

- review actions are auditable
- Knowledge Packs cannot be approved without required provenance fields
- provider-provided data remains labelled even after verification

---

## 10. Phase 20D Acceptance Criteria

- [x] Marketplace information architecture drafted.
- [x] Route plan drafted.
- [x] Marketplace Home screen specified.
- [x] Capability Pack Browse screen specified.
- [x] Knowledge Catalogue Browse screen specified.
- [x] Provider Profile screen specified.
- [x] Knowledge Pack Detail screen specified.
- [x] Knowledge Pack Item Detail screen specified.
- [x] Installed Knowledge screen specified.
- [x] Publish Knowledge Pack screen specified.
- [x] Review Queue screen specified.
- [x] AI Search Preview screen specified.
- [x] Existing UI/UX copy change register drafted.
- [x] Buyer, Provider, and Admin journeys documented.

---

## 11. Next Work

Recommended next step:

**Phase 20E - Governance, Verification Checklist, Business Model Notes, and Phase 21+ Implementation Backlog**

Phase 20E should convert this UX plan into implementation sequencing:

- schema/API additions for Provider Profiles and Knowledge Pack listings,
- UI copy-only pass for Data Pack -> Knowledge Pack wording,
- Marketplace child route implementation order,
- AI Search Preview service boundary,
- review queue expansion,
- provider subscription/business tiers,
- test and browser verification plan.
