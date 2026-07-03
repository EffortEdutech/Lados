# Lados V4 Phase 21 Checklist

**Document ID:** LADOS-V4-P21-CHECKLIST  
**Status:** Ready to start  
**Date:** 2026-07-03  
**Primary sprint plan:** `Sprint/Lados_V4_Phase21_Sprint_Plan.md`

---

## Status Summary

| Workstream | Title | Status |
|---|---|---|
| 21A | UI Copy and Compatibility Pass | Ready |
| 21B | Provider Profile Data Model | Planned |
| 21C | Knowledge Pack Listing Layer | Planned |
| 21D | Review Queue Expansion | Planned |
| 21E | AI Search Preview | Planned |
| 21F | Official Capability Runtime Activation Plan | Planned |

---

## Phase 21A - UI Copy and Compatibility Pass

### Marketplace

- [ ] Change visible `Data Packs` tab/copy to `Knowledge Packs`.
- [ ] Change `Organization Data Packs` to `Installed Knowledge Packs`.
- [ ] Change `Browse Official Data Packs` to `Browse Official Knowledge Packs`.
- [ ] Change `Install Data Pack` to `Install Knowledge Pack`.
- [ ] Change `Disable Data Pack` to `Disable Knowledge Pack`.
- [ ] Change `Installed Packs` to `Installed Capability Packs` where it means executable/action packs.
- [ ] Change `Browse Registry` to `Browse Capability Packs`.
- [ ] Change `Publish Pack` to `Publish Capability Pack`.
- [ ] Keep Review Queue wording unless expanded later.

### Explorer / Canvas

- [ ] Change Explorer `Data Packs` panel title to `Knowledge Catalogue`.
- [ ] Change panel body copy to use `Knowledge Packs`.
- [ ] Change empty states to use `Knowledge Pack Items`.
- [ ] Keep component/API technical identifiers unchanged.

### Property Panel

- [ ] Change `Requires Data Packs` to `Requires Knowledge Packs`.
- [ ] Change `Data Pack item` labels to `Knowledge Pack Item`.
- [ ] Preserve manifest field type `data_pack_item`.

### Execution Log

- [ ] Change `Data Pack Provenance` to `Knowledge Pack Provenance`.
- [ ] Change `Data Pack usage` to `Knowledge Pack usage`.
- [ ] Preserve `execution_logs.data_pack_usages` technical naming.

### Documentation

- [ ] Update Phase 21 sprint plan handover.
- [ ] Update Phase 21 checklist.
- [ ] Update V4 README if any route or document reference changes.

### Verification

- [ ] `corepack pnpm --filter web typecheck` passes.
- [ ] Browser verify `/marketplace`.
- [ ] Browser verify Explorer Knowledge Catalogue panel.
- [ ] Browser verify PropertyPanel Knowledge Pack Item field where available.
- [ ] Browser verify Execution Log provenance label where sample run exists.

---

## Phase 21B - Provider Profile Data Model

- [ ] Draft migration plan.
- [ ] Add provider profile schema.
- [ ] Add provider profile service/API.
- [ ] Add owner/admin permission checks.
- [ ] Add Provider Profile page.
- [ ] Link Knowledge Packs to provider identity.
- [ ] Add smoke test.
- [ ] Browser verify profile view.

---

## Phase 21C - Knowledge Pack Listing Layer

- [ ] Decide alias-vs-new-table strategy over `data_packs`.
- [ ] Add listing fields: verification, source policy, visibility, stale status.
- [ ] Add Knowledge Pack detail route.
- [ ] Add Installed Knowledge route.
- [ ] Preserve Phase 19 Data Pack API compatibility.
- [ ] Update tests.
- [ ] Browser verify install/disable.

---

## Phase 21D - Review Queue Expansion

- [ ] Add Provider Profile submissions.
- [ ] Add Knowledge Pack submissions.
- [ ] Add approve/reject/request-changes/suspend actions.
- [ ] Add reviewer notes.
- [ ] Add owner/admin checks.
- [ ] Browser verify admin flow.
- [ ] Browser verify non-admin denial.

---

## Phase 21E - AI Search Preview

- [ ] Draft endpoint contract.
- [ ] Implement installed Knowledge Pack search scope.
- [ ] Implement marketplace Knowledge Pack search scope if listing layer exists.
- [ ] Return provider, pack, version, item, source date, warnings.
- [ ] Build AI Search Preview screen.
- [ ] Verify advisory warnings.

---

## Phase 21F - Official Capability Runtime Activation Plan

- [ ] Choose official pack activation order.
- [ ] Identify executor implementation requirements.
- [ ] Plan `registered_nodes` sync.
- [ ] Plan compatibility alias activation.
- [ ] Plan saved workflow migration.
- [ ] Plan browser visual verification.
- [ ] Keep prototype runtime rollback path.

---

## Product Safety Rules

- [ ] Do not rename `.env*` files or inspect their contents.
- [ ] Do not rename `data_pack_*` technical identifiers in Phase 21A.
- [ ] Do not delete prototype packs until official runtime migration is verified.
- [ ] Do not execute uploaded external runtime code.
- [ ] Keep commercial/QS/contract outputs advisory until human review.

---

## Handover

### 2026-07-03 - Phase 21 checklist created

Done:
- Created Phase 21 checklist.
- Defined 21A as the immediate implementation start.
- Listed future 21B-21F workstreams as planned, not active.

Next:
- Start Phase 21A - UI Copy and Compatibility Pass.

Ad-hoc:
- Phase 21A should be intentionally small and safe.

Docs updated:
- `Sprint/Lados_V4_Phase21_Checklist.md`

Verification:
- Documentation-only update. No code verification required.
