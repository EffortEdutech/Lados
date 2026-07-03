# Lados V4 Phase 20B.3: Official Skeleton Validation and Capability Check

**Document ID:** LADOS-V4-P20B3-OFFICIAL-SKELETON-VALIDATION  
**Phase:** 20B.3  
**Status:** Implemented  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20B2_Official_Manifest_SDK_Validator_Compatibility_Alias_Plan.md`

---

## 1. Purpose

Phase 20B.3 makes official Capability Pack skeleton validation repeatable.

The previous phase added SDK types and validator APIs. This phase adds a repo-level command that validates every official skeleton pack under:

```text
packs/official
```

The validator is intentionally focused on manifest-only official skeletons. It does not register packs into runtime, sync database rows, execute official nodes, or migrate saved workflows.

---

## 2. Command

Run from the repository root:

```powershell
corepack pnpm validate:official-packs
```

The command performs:

```text
pnpm --filter @lados/pack-sdk build
node tools/validate-official-packs.cjs
```

---

## 3. Validation Scope

The script validates:

- every `packs/official/*/manifest.json`
- every `packs/official/*/nodes.json`
- official pack manifest contract fields
- official node manifest contract fields
- pack-to-node ownership
- node type declarations
- canonical capability declarations
- duplicate canonical capability keys across official packs
- duplicate official node types across official packs
- compatibility aliases point to existing official node skeletons
- compatibility alias target pack and canonical capability match the target node

---

## 4. Current Result

Latest verification:

```text
Official pack validation passed.
Packs: 5
Nodes: 14
Canonical capabilities: 40
Compatibility aliases: 12
```

Validated first skeleton set:

| Pack | Status |
|---|---|
| `lados.workflow-foundation` | validated |
| `lados.resource-operations` | validated |
| `lados.human-work` | validated |
| `lados.document-intelligence` | validated |
| `lados.qs-commercial` | validated |

---

## 5. Files Added Or Updated

| File | Purpose |
|---|---|
| `tools/validate-official-packs.cjs` | Repo-level official pack skeleton validator |
| `package.json` | Adds `validate:official-packs` command |
| `packages/@lados/pack-sdk` | Provides official validator APIs used by the script |

---

## 6. What This Does Not Do

Phase 20B.3 does not:

- enable official packs in Marketplace,
- write to `packs` or `registered_nodes`,
- execute official node types,
- migrate workflow JSON,
- activate compatibility aliases,
- delete prototype packs.

Prototype packs remain temporary runtime support.

---

## 7. Next Work

Recommended next step:

**Phase 20B.4 - Expand Fresh Official Skeleton Set**

Target next packs:

1. `lados.communication`
2. `lados.task-case`
3. `lados.commercial-finance`
4. `lados.procurement`
5. `lados.construction-operations`

After each new skeleton pack is added, run:

```powershell
corepack pnpm validate:official-packs
```

Only after the official skeleton set is stable should runtime registration, Marketplace surfacing, and migration planning begin.
