# Lados V4 Phase 20B.2: Official Manifest SDK Types, Validator, and Compatibility Alias Plan

**Document ID:** LADOS-V4-P20B2-OFFICIAL-MANIFEST-SDK-VALIDATOR-ALIASES  
**Phase:** 20B.2  
**Status:** Implemented SDK foundation; runtime migration not started  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20B1_Official_Pack_Manifest_Contract_Standard.md`

---

## 1. Purpose

Phase 20B.2 turns the Phase 20B.1 manifest contract into SDK-level types and validation helpers.

The goal is to let Lados validate fresh official Capability Pack skeletons without registering them into runtime yet.

This phase also creates the first typed compatibility alias map so prototype node types can be mapped to official node types later without deleting prototype runtime support prematurely.

---

## 2. SDK Additions

Updated package:

```text
packages/@lados/pack-sdk
```

New official contract types:

| Type | Purpose |
|---|---|
| `OfficialCapabilityPackManifest` | Pack-level official manifest contract |
| `OfficialNodeManifest` | Node-level official manifest contract |
| `OfficialPackSkeleton` | Combined manifest and nodes shape |
| `OfficialCompatibilityAlias` | Prototype-to-official node mapping |
| `OfficialCapabilityPackLayer` | `L0` to `L5` target layer |
| `OfficialRuntimeStatus` | `manifest_only`, `stub_executors`, `runtime_enabled`, `retired` |
| `OfficialInputPattern` | `ports`, `inspector`, `resource_binding`, `knowledge_reference` |
| `OfficialAiBoundary` | `none`, `advisory`, `requires_human_review` |
| `OfficialExecutorStatus` | executor implementation maturity |

New validator APIs:

| API | Purpose |
|---|---|
| `validateOfficialCapabilityPackManifest(manifest)` | Returns validation result for official pack manifest |
| `assertOfficialCapabilityPackManifest(manifest)` | Throws if official pack manifest is invalid |
| `validateOfficialNodeManifests(nodes, packManifest?)` | Validates node contracts, ownership, declared capabilities, and duplicate keys |
| `assertOfficialNodeManifests(nodes, packManifest?)` | Throws if node contracts are invalid |

Existing APIs are preserved:

- `validatePackManifest`
- `assertPackManifest`

Prototype packs are not forced into the official contract.

---

## 3. Official Validator Scope

The official manifest validator currently checks:

- official contract version is `lados.capability-pack.v1`
- pack ID starts with `lados.`
- layer is `L0` to `L5`
- status and runtime status are valid
- capabilities and nodes are non-empty arrays
- duplicate capability keys are rejected within a pack
- duplicate node types are rejected within a pack
- Knowledge Pack requirement shape is present
- verification object is present

The official node validator currently checks:

- node type starts with `lados.`
- owner pack matches the pack manifest
- canonical capability is declared by the pack manifest
- node type is declared by the pack manifest
- input pattern values are valid
- ports, config groups, Resource Binding contract, Knowledge Pack requirements, canvas UX, and compatibility aliases are present
- duplicate node types and duplicate canonical capabilities are rejected within the provided node list

Later validator hardening should add:

- cross-pack duplicate canonical capability detection
- registry-backed canonical capability verification
- guardrail wording checks for risky verbs
- required human review for QS, finance, payroll, contract, and compliance nodes
- Marketplace bundle verification for uploaded `.ladosPack` manifests

---

## 4. Compatibility Alias Plan

Compatibility aliases are typed in:

```text
packages/@lados/pack-sdk/src/compatibility-aliases.ts
```

Exported APIs:

```ts
officialCompatibilityAliases
resolveOfficialCompatibilityAlias(prototypeType)
```

Current alias statuses are `planned`. They are not active runtime rewrites yet.

### Initial Alias Map

| Prototype node | Official node | Mode |
|---|---|---|
| `core.condition` | `lados.workflow.condition` | alias |
| `core.logger` | `lados.workflow.write_log` | alias |
| `resource.create` | `lados.resource.create` | alias |
| `artifact.write` | `lados.artifact.write` | alias |
| `project.save_artifact` | `lados.artifact.write` | merge |
| `core.human_approval` | `lados.human.request_approval` | merge |
| `foundation.request_approval` | `lados.human.request_approval` | merge |
| `document.upload_file` | `lados.document.upload_file` | alias |
| `document.read_excel` | `lados.document.read_excel` | alias |
| `qs.read_boq` | `lados.qs.read_boq` | alias |
| `qs.classify_trade` | `lados.qs.classify_trade` | alias |
| `construction.assess_progress_claim` | `lados.qs.assess_progress_claim` | manual review |

---

## 5. Migration Policy

Compatibility has three separate stages.

### Stage 1: Planned Alias

Aliases are documented and typed, but runtime behavior is unchanged.

This is the current Phase 20B.2 state.

### Stage 2: Active Alias

The workflow loader or migration service may resolve prototype node types to official node types.

Active aliases must:

- preserve saved workflow behavior,
- log that a compatibility alias was used,
- avoid changing commercial/human-review meaning silently,
- require manual review for split, merge, or domain-boundary moves.

### Stage 3: Retirement

Prototype runtime support may be removed only after:

- official pack runtime executors exist,
- saved workflows are migrated or explicitly archived,
- browser verification confirms official pack UI behavior,
- at least one official template is verified,
- rollback plan is documented.

---

## 6. What Is Not Done Yet

Phase 20B.2 does not:

- register official skeleton packs into the database,
- add official packs to Marketplace UI,
- execute official skeleton node types,
- delete prototype packs,
- migrate saved workflow JSON,
- rewrite existing `registered_nodes`.

Those are later Phase 20B implementation steps.

---

## 7. Verification

Completed:

- `corepack pnpm --filter @lados/pack-sdk typecheck`

Expected:

- SDK typecheck passes.
- Existing prototype pack manifest validation remains backward compatible.
- Official skeleton manifests can be validated by the new official APIs after `@lados/pack-sdk` build.

---

## 8. Phase 20B.3 Completion

Phase 20B.3 completed the recommended next step.

Implemented:

- local validator script for `packs/official`
- validation for all `manifest.json` and `nodes.json` files
- duplicate canonical capability key checks across official packs
- compatibility alias target checks
- package/workspace command: `corepack pnpm validate:official-packs`

Next:

**Phase 20B.4 - Expand Fresh Official Skeleton Set**

Target next packs:

1. `lados.communication`
2. `lados.task-case`
3. `lados.commercial-finance`
4. `lados.procurement`
5. `lados.construction-operations`
