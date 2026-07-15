# Lados V4 Phase 26 — Flexible Multi-Tenant Org Structure Master Plan

| | |
|---|---|
| **Document ID** | LADOS-V4-P26-MASTER-PLAN |
| **Status** | Draft — awaiting eff review before any sprint starts |
| **Date** | 2026-07-14 |
| **Depends on** | Phase 22 (Departments), Phase 24 (Program Restructure — `projects.program_id` real FK), Phase 25 (build first per eff, no hard technical dependency) |
| **Build order** | Confirmed by eff 2026-07-14: build **after** Phase 25 |
| **Origin** | Chat discussion 2026-07-14: "how our architecture is handling support for multi tenant of organization with departments, portfolios etc which should be flexible and maybe we should also consider user define" |

**Decisions confirmed by eff (2026-07-14), see §7 for full record:**
1. Go fully generic — replace the fixed tier vocabulary with a generic, organization-defined hierarchy (not just relabeling, not just one more fixed "Portfolio" tier).
2. Org-units remain a grouping/visibility/approval-routing layer only, on top of the existing RBAC model — **no per-unit billing/quota boundary** in this phase. Billing stays at the organization level.
3. A project can belong to **more than one org unit at once** — the open decision originally flagged as §8.2 is resolved: `projects.org_unit_id` (§3.4) is a join table (`project_org_units`), not a single nullable FK. Updated throughout this document, see §7.3.

---

## 0. Framing

Today's hierarchy is fixed and code-defined: **Organization → Department (optional, nestable via `parent_department_id`) → Program (optional) → Project → Workflow.** Departments already support arbitrary nesting depth (e.g. "Commercial" → "QS" → "Cost Control") and their own RBAC layer independent of org-level roles (`department_members`, Phase 22 S22.1) — but the *vocabulary* is fixed: every org gets exactly "Department" and "Program" as their only two grouping concepts, in that fixed relationship to Project. There is no "Portfolio" concept anywhere in the schema today (only in old, unimplemented planning docs), and no way for an org to invent its own tier (e.g. "Region" → "Client" → "Site", or whatever actually matches how that organization runs).

Phase 26 replaces the fixed department/program tier pair with a single generic **`org_units`** concept: one self-referencing table with a `type` field an organization defines for itself, so the hierarchy's shape and vocabulary become data, not schema. Department and Program become two specific `type` values an org can use (or not) rather than hardcoded table concepts — following the same "keep old thing working, converge later" migration discipline eff has approved before (Phase 24's Pipeline→Program rename, Phase 22→23's additive-only schema changes).

**This is the biggest single architectural change since Phase 23's orchestration layer.** It touches schema, `SecurityEngineService`'s permission-resolution core, every place `department_id`/`program_id` is read or written, and adds new admin UI. Sequenced deliberately after Phase 25 (smaller, contained) per eff's call.

---

## 1. Concerns Being Addressed

1. **Fixed tier vocabulary.** An org that organizes around "Region" or "Client" or "Business Line" instead of "Department"/"Program" has no way to model that today — they're stuck relabeling concepts that don't actually fit their shape, or leaving projects unassigned.
2. **No portfolio-style cross-cutting grouping.** Nothing today lets an org build a view like "everything for Client X" spanning multiple departments/programs — the fixed tier order (department → program → project) can't represent a grouping that cuts across it.
3. **Two parallel, near-identical implementations.** `departments`/`department_members` and `programs` (project-grouping half) are structurally almost the same pattern (self-referencing or grouping table + members-with-role + nullable FK on `projects`) built twice, independently, in two different phases. A generic model collapses this into one implementation, maintained once.
4. **Permission resolution isn't generic.** `SecurityEngineService.getDepartmentRole()`/`requireDepartmentPermission()` only know about the `departments` table. A generic hierarchy needs a generic "resolve my role for this unit, walking up its ancestor chain" mechanism usable regardless of what the org named its tiers.

---

## 2. Sprint Overview

| Sprint | Title | Addresses | Type |
|---|---|---|---|
| S26.1 | Schema Foundations (`org_units`) | #1, #2, #3 | Additive migration |
| S26.2 | Security/RBAC Extension | #4 | Backend service |
| S26.3 | Compatibility Layer (departments/programs → org_units) | #3 | Backend, data migration (opt-in) |
| S26.4 | Admin UI — Org Chart Builder | #1, #2 | Frontend |
| S26.5 | Rollout Decision + Docs/Memory Close-out | all | Decision + verification |

**Sequencing rationale:** S26.1 is purely additive (new tables, nullable FK) — zero risk to existing department/program data, mirrors the additive discipline of every prior phase in this project. S26.2 must land before S26.4's UI can actually enforce anything real. S26.3 is deliberately **optional and reversible** — old `departments`/`programs` tables keep working throughout; nothing forces a cutover. S26.4 is the user-facing payoff. S26.5 is a decision point, not a fixed scope: whether/when old department/program-specific UI gets deprecated in favor of the generic org chart, following the exact same "decide later, don't force it" precedent as Phase 22 S22.5 / Phase 23 S23.5.

---

## 3. S26.1 — Schema Foundations

### 3.1 `org_units` — the generic hierarchy table

```sql
CREATE TABLE org_units (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_unit_id    uuid REFERENCES org_units(id) ON DELETE SET NULL,
  type              text NOT NULL,   -- free text, org-defined (e.g. 'department', 'region', 'client')
  name              text NOT NULL,
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, parent_unit_id, name)
);
```

- `type` is free text, not a fixed enum — the whole point of "fully generic" (eff's decision §7.1) is that an org invents its own tier names. No `CHECK` constraint on allowed values.
- `parent_unit_id` self-references, exactly like `departments.parent_department_id` — arbitrary depth, arbitrary shape, including a flat single-tier org that just uses one `type` with no nesting.
- `metadata jsonb` — open extension point (e.g. a client-code, cost-centre number, or anything an org wants to attach without a schema change).

### 3.2 `org_unit_types` — per-org display config (name/icon/color per type)

```sql
CREATE TABLE org_unit_types (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type              text NOT NULL,
  display_label     text NOT NULL,     -- e.g. "Region" — org_units.type is the stable key, this is what's shown
  icon              text,
  color             text,
  sort_order         integer NOT NULL DEFAULT 0,
  UNIQUE (organization_id, type)
);
```

- Solves the "free text loses UI polish" problem: an org's chosen `type` string is a stable key, but this table lets them attach a nice label/icon/color for it in the admin UI, without constraining what values are allowed.
- Seed data note: for orgs that opt into the S26.3 compatibility migration, this table gets pre-populated with `type: 'department'` / `type: 'program'` rows carrying sensible defaults, so the transition is visually seamless.

### 3.3 `org_unit_members` — mirrors `department_members`

```sql
CREATE TABLE org_unit_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id    uuid NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  joined_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_unit_id, user_id)
);
```

- Same shape and same "independent from org-level role" property as `department_members` (Phase 22 §9.4 precedent) — a user's org role and their role within a specific unit can differ.

### 3.4 `project_org_units` — join table, additive, parallel to existing FKs

Resolved 2026-07-14 (§7.3, was open decision §8.2): a project can belong to **more than one org unit at once** (e.g. visible under both "Department: QS" and "Client: Acme Corp" simultaneously), so this is a many-to-many join table, not a single nullable FK on `projects`.

```sql
CREATE TABLE project_org_units (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_unit_id    uuid NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, org_unit_id)
);
CREATE INDEX idx_project_org_units_project_id  ON project_org_units(project_id);
CREATE INDEX idx_project_org_units_org_unit_id ON project_org_units(org_unit_id);
```

- Added **alongside** `department_id`/`program_id`, not replacing them yet — no existing project's assignment changes unless explicitly migrated (S26.3, opt-in).
- A project with zero rows here is simply unassigned to any generic org unit (same "NULL means unassigned" convention `department_id`/`program_id` already use).

### 3.5 RLS

Mirrors `departments`/`department_members` policies from migration `0069` exactly (org-member visibility, org owner/admin or unit owner/admin manage membership) — same defense-in-depth note applies: API uses the service-role client and enforces authorization in `SecurityEngineService` (§4); these policies only matter for any future direct client access.

---

## 4. S26.2 — Security / RBAC Extension

`SecurityEngineService` gains a generic equivalent of today's `getDepartmentRole()` / department-permission check:

```ts
async getOrgUnitRole(userId: string, orgUnitId: string): Promise<OrgUnitRole | null>
async requireOrgUnitPermission(userId: string, orgUnitId: string, permission: string): Promise<void>
```

**Ancestor-chain resolution:** a permission/role check for a unit must also consider roles granted on its *ancestors* — e.g. a role granted at "Region" should cascade down to every child unit under it, the same way nested departments conceptually should (today's department check does **not** currently walk the parent chain — this is a real behavior upgrade, not just a rename, and should be flagged to eff as such during S26.2 review). Implementation: walk `parent_unit_id` up to the root, checking `org_unit_members` at each level, same pattern as any materialized-path/adjacency-list permission walk — likely a recursive CTE (`WITH RECURSIVE`) query rather than N round-trips.

**Call sites to migrate (found via this session's grep of `SecurityEngineService`):** anywhere `getDepartmentRole`/`requireDepartmentPermission` is called today (approval routing from Phase 22 S22.2 is the primary one) gets an equivalent `org_unit`-based check once S26.3's compatibility layer exists — but old department-based checks are **not removed** until eff confirms cutover (§6, S26.5).

---

## 5. S26.3 — Compatibility Layer (opt-in, reversible)

**Not a forced migration.** `departments` and `programs` keep working exactly as they do today, indefinitely, unless an organization explicitly opts in.

- **Backfill script** (dry-run mode first, per this project's standing migration-safety convention): for an org that opts in, create one `org_units` row per existing `departments` row (`type: 'department'`, preserving `parent_department_id` → `parent_unit_id` shape) and one per existing `programs` row (`type: 'program'`), plus matching `org_unit_members` rows from `department_members`, plus seeded `org_unit_types` rows for `'department'`/`'program'` with sensible default labels/icons so the org chart UI looks identical to what they had before.
- **`project_org_units` backfill:** for each project with a non-null `department_id` and/or `program_id`, insert one `project_org_units` row per non-null value (a project with both set gets two rows, one per unit — no tie-break needed now that this is a join table, unlike the single-FK design this superseded).
- **Reversibility:** since nothing is deleted or renamed (this is purely additive, like every migration in this project to date), an org can be backfilled and, if it doesn't like the generic model, simply keep using the old Department/Program UI untouched — the backfilled `org_units` rows are inert until the org actually starts using the new UI (S26.4).

---

## 6. S26.4 — Admin UI: Org Chart Builder

A new settings page (mirrors the existing minimal Departments settings page from Phase 22 S22.1, generalized):

- Define custom unit types (name/icon/color) — writes to `org_unit_types`.
- Build the org chart: create units, nest them under a parent, rename/reparent, assign members + roles per unit.
- Assign projects to a unit (replaces/supplements the existing "assign department" / "assign program" UI built in Phase 22/24 — exact relationship between old and new assignment UI is an S26.4 design decision, not fixed here).
- For orgs that ran the S26.3 backfill: the org chart should render pre-populated exactly matching their existing department/program structure, so nothing looks broken on first visit.

---

## 7. Decisions Confirmed by eff (2026-07-14)

**§7.1 — Hierarchy flexibility.** Chosen: **fully generic hierarchy** (not relabeling-only, not a single fixed added "Portfolio" tier). Rationale given: organizations should be able to define their own tier names/depth, not be limited to Lados's chosen vocabulary. This is the single decision driving the entire `org_units` design in §3.

**§7.2 — Unit semantics.** Chosen: **grouping + existing RBAC only.** Org-units affect approval routing/visibility scoping the same way departments already do today — they are **not** a billing or quota boundary. Billing/entitlements stay at the organization level for the entirety of this phase. If per-unit billing is ever wanted, that is explicitly out of scope here and would need its own future phase.

**§7.3 — Project ↔ org unit cardinality.** Chosen 2026-07-14: a project can belong to **more than one org unit at once**. `projects.org_unit_id` (originally drafted as a single nullable FK, §3.4) is a many-to-many join table, `project_org_units`, instead — see §3.4 for the resolved schema. This was originally flagged as open decision §8.2; now resolved, no tie-break rule needed for backfill (§5).

**§7.4 — Build order.** Chosen: build Phase 25 (multi-run canvas tracking) first, then this phase.

---

## 8. Open Decisions (not yet resolved — flag before/during the relevant sprint)

1. **Cutover timing (S26.5).** Whether/when to deprecate the old Department/Program-specific settings UI in favor of the generic org chart, or keep both indefinitely. Deliberately left open, same precedent as Phase 22 S22.5 / Phase 23 S23.5's deferred-by-default optional work.
2. **Ancestor-chain permission walk performance (§4).** Recursive CTE vs. a materialized-path column (e.g. storing a precomputed `ancestor_ids uuid[]` on each `org_units` row, updated on reparent) — only matters if org charts get deep/wide enough for a live recursive query to be slow. Not a concern at expected scale, flagged for awareness only.

---

## 9. What does NOT change in this phase

- Billing/entitlements — organization-level only (§7.2).
- Existing `departments`/`department_members`/`programs`/`program_id` tables and every service/UI reading them — fully functional throughout, no forced migration.
- `SecurityEngineService`'s existing department-based checks — left in place until eff confirms cutover.
