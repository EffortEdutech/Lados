# Lados V4 Phase 26 Checklist

**Document ID:** LADOS-V4-P26-CHECKLIST
**Status:** Draft — not started (planned to begin after Phase 25 completes)
**Date:** 2026-07-14
**Primary sprint plan:** `Sprint/Lados_V4_Phase26_Flexible_MultiTenant_Org_Structure_Master_Plan.md`

---

## Status Summary

| Sprint | Title | Status |
|---|---|---|
| S26.1 | Schema Foundations (`org_units`) | Not started — unblocked, §8.2 resolved 2026-07-14 |
| S26.2 | Security/RBAC Extension | Not started |
| S26.3 | Compatibility Layer (opt-in) | Not started |
| S26.4 | Admin UI — Org Chart Builder | Not started |
| S26.5 | Rollout decision + close-out | Not started |

---

## Before S26.1 starts

- [x] Resolve open decision §8.2 with eff: does a project need to belong to only one `org_unit` (single nullable FK) or possibly more than one at once (many-to-many `project_org_units` join table)? **Resolved 2026-07-14: a project can belong to several org units at once — join table confirmed, master plan §3.4/§5/§7.3 updated accordingly.**
- [ ] Confirm Phase 25 is complete (build-order decision from eff, 2026-07-14) — Phase 25 S25.1 delivered but not yet built/typechecked/tested; wait for eff's verification before starting S26.1.

## S26.1 — Schema Foundations

- [ ] Migration: `org_units` table (id, organization_id, parent_unit_id, type, name, metadata, timestamps).
- [ ] Migration: `org_unit_types` table (per-org display config: label/icon/color per type).
- [ ] Migration: `org_unit_members` table (mirrors `department_members`).
- [ ] Migration: `project_org_units` join table (project_id, org_unit_id, UNIQUE pair) — additive, parallel to `department_id`/`program_id`.
- [ ] RLS policies mirroring `departments`/`department_members` (migration 0069) shape.
- [ ] Confirm zero impact on existing `departments`/`programs` data (purely additive).
- [ ] Tests + typecheck for the migration.
- [ ] Update this checklist + master plan doc with S26.1 completion notes.

## S26.2 — Security / RBAC Extension

- [ ] Add `SecurityEngineService.getOrgUnitRole(userId, orgUnitId)`.
- [ ] Add `SecurityEngineService.requireOrgUnitPermission(userId, orgUnitId, permission)`.
- [ ] Implement ancestor-chain role resolution (walk `parent_unit_id` up to root — recursive CTE recommended, see master plan §4 / §8.3).
- [ ] Flag to eff: this is a real behavior upgrade vs. today's department check (today's does NOT walk the parent chain) — confirm this is wanted before shipping.
- [ ] Unit tests: role resolution at various depths, permission cascading from ancestor units.
- [ ] Do NOT remove or touch existing `getDepartmentRole`/`requireDepartmentPermission` in this sprint.

## S26.3 — Compatibility Layer (opt-in, reversible)

- [ ] Build backfill script: `departments` → `org_units` (type='department'), preserving parent structure.
- [ ] Build backfill script: `programs` → `org_units` (type='program').
- [ ] Build backfill script: `department_members`/equivalent program membership → `org_unit_members`.
- [ ] Seed default `org_unit_types` rows for 'department'/'program' (labels/icons matching existing UI).
- [ ] Backfill `project_org_units` rows from existing `department_id`/`program_id` — one row per non-null value (a project with both gets two rows, no tie-break needed).
- [ ] Dry-run mode first (per project's standing migration-safety convention) — no live run without eff's explicit go-ahead.
- [ ] Confirm reversibility: old tables/UI fully functional whether or not backfill has run.

## S26.4 — Admin UI: Org Chart Builder

- [ ] New settings page: define custom unit types (name/icon/color).
- [ ] Build/edit org chart: create, nest, rename, reparent units.
- [ ] Assign members + roles per unit.
- [ ] Assign projects to unit(s).
- [ ] Decide UI relationship to existing Departments/Programs assignment UI (replace, supplement, or hide old one behind a flag) — design decision at sprint kickoff.
- [ ] Verify backfilled orgs render their pre-existing structure correctly on first visit.

## S26.5 — Rollout Decision + Close-out

- [ ] Decide with eff: deprecate old Department/Program-specific UI, or keep both indefinitely (master plan §8.1, deliberately left open).
- [ ] Full verification loop: `pnpm build:packages && pnpm build:packs && pnpm typecheck && pnpm --filter api test && pnpm --filter web typecheck && pnpm validate:official-packs`.
- [ ] Update master plan doc Status to Complete.
- [ ] Update memory with Phase 26 outcome + rollout decision.
- [ ] SOP close-out: "What's next" + "Ad-hoc tasks outstanding" handoff message to eff.
