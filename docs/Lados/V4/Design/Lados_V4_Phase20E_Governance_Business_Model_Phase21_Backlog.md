# Lados V4 Phase 20E: Governance, Verification, Business Model, and Phase 21 Backlog

**Document ID:** LADOS-V4-P20E-GOVERNANCE-BUSINESS-BACKLOG  
**Phase:** 20E  
**Status:** Complete closeout specification  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20D_Marketplace_Screen_Spec_Knowledge_Catalogue_UX_Wire_Plan.md`

---

## 1. Purpose

Phase 20E closes Phase 20 by defining how the Lados Marketplace Knowledge Catalogue should be trusted, reviewed, commercialized, and converted into implementation work.

This is not a coding phase. It is the final Phase 20 product contract.

After Phase 20E, new Marketplace implementation should move into Phase 21+.

---

## 2. Governance Principles

1. **Knowledge Packs are non-executable.** They may contain structured knowledge, catalogues, references, rates, products, services, standards indexes, SOPs, rules, and evidence requirements, but they must not run uploaded runtime code.
2. **Provider-provided data remains labelled.** Verification does not make provider claims official truth.
3. **Commercial values are advisory until confirmed.** Rates, prices, lead times, delivery terms, and availability must be confirmed by quotation, contract, or human reviewer before commercial reliance.
4. **Standards and compliance content must respect licensing.** Lados may store references, indexes, summaries, and user-owned documents, but must not copy restricted copyrighted standards text into public packs.
5. **Workflow provenance is mandatory.** If a Knowledge Pack Item influences a workflow output, Lados should log pack, version, item, provider, source, and source date.
6. **Human accountability stays visible.** QS, commercial, contractual, compliance, payroll, payment, and legal outcomes require human review boundaries.
7. **Stale knowledge must not be hidden.** Freshness, effective dates, last review dates, and stale warnings must be visible in UI and AI answers.

---

## 3. Verification Status Model

### 3.1 Catalogue Provider Status

| Status | Meaning | Marketplace behavior |
|---|---|---|
| Draft | Provider profile is incomplete or not submitted | Hidden from public marketplace |
| Submitted | Provider profile submitted for review | Visible only to owner/admin |
| Verified | Identity and minimum metadata reviewed | Public or organization-visible, depending on visibility |
| Changes requested | Reviewer needs corrections | Hidden or shown as pending to owner |
| Suspended | Provider is blocked due to trust, policy, or commercial issue | Hidden from public marketplace |
| Archived | Provider no longer active | Read-only historical references only |

### 3.2 Knowledge Pack Status

| Status | Meaning | Marketplace behavior |
|---|---|---|
| Draft | Pack is being prepared | Not searchable publicly |
| Pending review | Submitted for verification | Review Queue only |
| Verified | Metadata, source policy, and advisory wording accepted | Searchable/installable |
| Rejected | Failed review | Hidden except to provider/admin |
| Changes requested | Needs correction before verification | Provider can resubmit |
| Stale | Effective dates, review date, or source date require attention | Searchable with warning; ranked lower |
| Suspended | Policy/trust issue | Not installable; existing installs warned |
| Archived | Retired version | Historical provenance only |

### 3.3 Knowledge Pack Item Status

| Status | Meaning | Use behavior |
|---|---|---|
| Active | Current item within effective dates | Normal search/use |
| Advisory | Reference item requiring human judgement | Show warning before use |
| Expired | Effective date has passed | Searchable only with warning or historical filter |
| Superseded | Replaced by newer item/version | Link to replacement |
| Restricted | Licensing, project, or user role limits use | Show access limitation |
| Flagged | Reported or under review | Lower rank and show review warning |

---

## 4. Knowledge Pack Review Checklist

Every Knowledge Pack submission must pass these checks before becoming verified.

### 4.1 Identity and Ownership

- [ ] Catalogue Provider profile exists.
- [ ] Provider type is selected.
- [ ] Contact route is present.
- [ ] Regions served are declared.
- [ ] Provider verification status is clear.
- [ ] Pack owner matches submitting provider or organization.

### 4.2 Pack Metadata

- [ ] Pack slug is stable and unique.
- [ ] Display name is clear.
- [ ] Knowledge type is selected.
- [ ] Visibility is declared.
- [ ] Version is declared.
- [ ] Regions/applicability are declared.
- [ ] Update frequency is declared.
- [ ] Source policy is declared.
- [ ] Advisory/commercial-use wording is present.

### 4.3 Item Metadata

- [ ] Every item has key, title, description, and category path.
- [ ] Every item has provider, pack, version, and collection reference.
- [ ] Every item has source name.
- [ ] Every item has source date or publication date.
- [ ] Every item has region/applicability.
- [ ] Every item has verification/use status.
- [ ] Commercial items include unit, currency, basis, assumptions, exclusions, and validity where applicable.
- [ ] Compliance/reference items include issuing body, jurisdiction, clause/reference, and licensing note where applicable.

### 4.4 Licensing and Copyright

- [ ] Standards references are stored as indexes or references unless the provider owns the content or has rights to include it.
- [ ] Source URLs or document references are present where available.
- [ ] Excerpt policy is declared for standards, guidelines, technical documents, and third-party publications.
- [ ] Provider confirms upload rights.

### 4.5 Human Review and Advisory Boundaries

- [ ] Rates/prices are not presented as final contract rates.
- [ ] Legal/compliance/standards references are not presented as legal advice.
- [ ] QS/commercial outputs require human confirmation before certification, payment, entitlement, or contractual action.
- [ ] AI answer warnings are configured for restricted/advisory data.

### 4.6 Security

- [ ] Pack contains no executable runtime code.
- [ ] Uploaded files are scanned or constrained by allowed file types in implementation phase.
- [ ] Public visibility does not expose organization-private documents.
- [ ] Provider cannot approve its own public verified listing unless user is an authorized Lados/admin reviewer.

---

## 5. Stale and Expired Data Rules

| Condition | Status | Required UI behavior | AI behavior |
|---|---|---|---|
| `effective_to` is past | Expired | Show expired badge; hide from default current search | Do not recommend unless user asks for historical data |
| `lastReviewedAt` exceeds review window | Stale | Show stale badge; allow install with warning | Lower ranking and cite stale warning |
| Newer version exists | Superseded | Link to current version | Prefer newer version |
| Provider suspended | Suspended | Block new installs; warn existing installs | Do not recommend |
| Source date missing | Incomplete | Review should fail for verified status | Do not cite as high-confidence |
| Region does not match query/project | Region mismatch | Show mismatch warning | Lower ranking |

Default review windows:

| Knowledge type | Suggested review window |
|---|---|
| Product catalogue | 90 days |
| Pricing/rate references | 30-90 days |
| Supplier/service availability | 30 days |
| SOP/internal policy | 180 days |
| Standards/reference index | 365 days or when source updates |
| Evidence checklist | 180 days |
| Productivity benchmark | 180-365 days |

---

## 6. Standard Advisory Wording

Use consistent wording across Marketplace, AI Search, item detail, workflow config, and execution logs.

### 6.1 General Knowledge Pack Notice

```text
Knowledge Pack values are references until confirmed by contract, source authority, or a human reviewer.
```

### 6.2 Provider-Provided Data

```text
This information is provider-provided. Verification confirms metadata and review status, not commercial truth.
```

### 6.3 Rates and Prices

```text
Provider-provided pricing must be confirmed by quotation before commercial use.
```

### 6.4 QS and Commercial Decisions

```text
This reference may support assessment, but certification, valuation, entitlement, and payment decisions require human review.
```

### 6.5 Standards and Compliance

```text
This is a reference index, not a substitute for the licensed source document or professional review.
```

### 6.6 AI Search Answers

```text
AI search results must cite provider, Knowledge Pack, version, item key, source, and source date where available.
```

---

## 7. Business Model Notes

These are planning notes, not pricing commitments.

### 7.1 Catalogue Provider Tiers

| Tier | Purpose | Candidate capabilities |
|---|---|---|
| Free Provider Profile | Basic discoverability | Profile, limited public listing, manual review |
| Catalogue Publisher | Publish verified Knowledge Packs | Multiple packs, versioning, review queue, richer metadata |
| Featured Provider | Higher marketplace visibility | Featured ranking, richer profile, analytics summary |
| Workflow Integrated Provider | Items can be inserted into RFQ/procurement/workflow contexts | workflow-fit metadata, item insertion, provenance, RFQ route |
| Private Organization Provider | Internal company knowledge publishing | organization-private SOPs, preferred catalogues, internal review |
| Lados Official | Lados-maintained official knowledge | official seed packs, governance examples, demo packs |

### 7.2 Buyer Value Proposition

- Search structured knowledge instead of manually browsing supplier websites.
- Compare provider, product, rate, evidence, and compliance references with provenance.
- Install trusted Knowledge Packs into the organization.
- Use Knowledge Pack Items inside workflows with audit trail.
- Preserve human review for commercial and compliance decisions.

### 7.3 Catalogue Provider Value Proposition

- Become discoverable to AI-assisted procurement and workflow users.
- Publish machine-readable product/service/rate/SOP catalogues.
- Keep catalogue versions, regions, and source metadata controlled.
- Connect catalogue items to RFQ, procurement, QS, operations, and compliance workflows.
- Receive future analytics on search visibility and workflow engagement.

### 7.4 Lados Platform Value Proposition

- Marketplace becomes a governed knowledge layer, not only a pack store.
- Capability Packs provide the operating grammar.
- Knowledge Packs provide the domain knowledge.
- AI Search becomes explainable because every answer can cite pack, provider, version, item, and source.

---

## 8. Phase 21+ Implementation Backlog

Phase 21 should begin implementation from the smallest safe surface first.

### Phase 21A - UI Copy and Compatibility Pass

Goal: update user-facing UI wording without renaming stable technical identifiers.

Tasks:

- Change Marketplace Data Packs copy to Knowledge Packs.
- Change Explorer Data Packs panel copy to Knowledge Catalogue.
- Change PropertyPanel labels to Knowledge Pack Item.
- Change Execution Log label to Knowledge Pack Provenance.
- Keep API/database identifiers as `data_pack_*`.
- Add notes in code comments only where needed to explain legacy technical naming.

Verification:

- Browser verify Marketplace, Explorer, PropertyPanel, and Execution Log labels.
- Typecheck.

### Phase 21B - Provider Profile Data Model

Goal: add Catalogue Provider profiles as the owner identity for Knowledge Packs.

Tasks:

- Add provider profile schema.
- Add provider profile API.
- Add provider profile admin/review fields.
- Link existing official/organization Knowledge Packs to provider identity.
- Add Provider Profile page.

Verification:

- API smoke test for create/read/update/review provider.
- Browser verify Provider Profile.

### Phase 21C - Knowledge Pack Listing Layer

Goal: separate product-level Knowledge Pack listings from technical Data Pack implementation.

Tasks:

- Add listing layer or alias over existing `data_packs`.
- Add verification, source policy, visibility, and stale status fields.
- Add installed Knowledge screen.
- Add Knowledge Pack detail route.

Verification:

- Install/disable still works.
- Existing Phase 19 smoke test remains green.
- Browser verify Knowledge Pack Browse and Detail.

### Phase 21D - Review Queue Expansion

Goal: expand Review Queue beyond Capability Pack registry submissions.

Tasks:

- Add Provider Profile review queue.
- Add Knowledge Pack review queue.
- Add approve/reject/request-changes/suspend actions.
- Record reviewer, timestamp, and notes.

Verification:

- Owner/admin browser flow.
- Non-admin access denied.

### Phase 21E - AI Search Preview

Goal: build a safe explainable search preview before full marketplace agent automation.

Tasks:

- Add search endpoint across installed and marketplace Knowledge Packs.
- Add ranking factors: relevance, region, verification, freshness, workflow fit.
- Return cited result shape from Phase 20C.
- Build AI Search Preview screen.

Verification:

- Search returns cited provider, pack, version, item, source date.
- Advisory warnings shown.
- No unsupported final legal/commercial conclusions.

### Phase 21F - Official Pack Runtime Activation Planning

Goal: prepare official Capability Packs for runtime surfacing without breaking saved workflows.

Tasks:

- Decide official pack activation order.
- Implement executors where needed.
- Sync official manifests into registry/palette.
- Activate compatibility aliases or workflow migration.
- Keep rollback path.

Verification:

- `validate:official-packs`.
- Typecheck.
- Saved workflow compatibility test.
- Browser visual verification of official nodes.

---

## 9. Deferred Beyond Phase 21

- Payment/billing integration.
- Public SEO provider pages.
- Full vector database search.
- Automated document ingestion and copyrighted content verification.
- Provider analytics dashboard.
- Dynamic execution of uploaded external runtime code.
- Full rename migration from `data_pack_*` to `knowledge_pack_*`.

---

## 10. Phase 20E Acceptance Criteria

- [x] Governance principles documented.
- [x] Provider, Knowledge Pack, and item verification status models documented.
- [x] Knowledge Pack review checklist documented.
- [x] Stale/expired data rules documented.
- [x] Standard advisory/human-review wording documented.
- [x] Catalogue Provider business tiers drafted.
- [x] Buyer, Catalogue Provider, and Lados value propositions documented.
- [x] Phase 21+ implementation backlog drafted.
- [x] Deferred work explicitly listed.

---

## 11. Phase 20 Closeout Decision

Phase 20 is closed at the documentation and product-contract layer by this document.

Closed Phase 20 means:

- Capability Pack target architecture is defined.
- Official pack skeleton contract is defined and validated.
- Knowledge Pack and Catalogue Provider terminology is locked.
- Marketplace screen specification is complete.
- Governance, business model notes, and Phase 21 implementation backlog are complete.

Implementation should proceed in Phase 21+.
