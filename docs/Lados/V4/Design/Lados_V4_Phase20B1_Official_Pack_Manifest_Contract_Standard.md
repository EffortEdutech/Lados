# Lados V4 Phase 20B.1: Official Pack Manifest Contract Standard

**Document ID:** LADOS-V4-P20B1-OFFICIAL-PACK-MANIFEST-CONTRACT  
**Phase:** 20B.1  
**Status:** Draft implementation contract  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20A_Fresh_Capability_Build_Decision.md`, `Lados_V4_Phase20A_Canonical_Capability_Registry.md`, `Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`

---

## 1. Purpose

Phase 20B.1 creates the clean contract for official Lados Capability Packs.

The official packs are not copied from the prototype packs. They are new product assets built from:

- canonical capability keys
- target pack ownership boundaries
- professional node display rules
- Resource Binding and Knowledge Pack dependency rules
- human decision guardrails
- readable canvas UX requirements

Prototype packs remain temporary compatibility/runtime references until fresh official packs, aliases, migrations, and verification are ready.

---

## 2. Skeleton Location

Fresh official pack skeletons live under:

```text
packs/official/
```

This is intentional.

The existing runtime compiles `packs/*` package folders. The new `packs/official/*` skeletons are manifest-first product contracts and are not registered as executable runtime packs yet.

Official runtime wiring should happen in a later Phase 20B implementation step after:

1. manifest review,
2. compatibility alias planning,
3. executor contract review,
4. UI palette grouping review,
5. workflow template verification.

---

## 3. Official Pack Manifest

Each official pack skeleton must contain:

```text
manifest.json
nodes.json
templates/
README.md
```

`manifest.json` is the pack-level contract.

Required fields:

| Field | Required | Meaning |
|---|---:|---|
| `contractVersion` | yes | Contract version, currently `lados.capability-pack.v1` |
| `id` | yes | Stable official pack ID, e.g. `lados.qs-commercial` |
| `displayName` | yes | Professional user-facing pack name |
| `layer` | yes | `L0`, `L1`, `L2`, `L3`, `L4`, or `L5` |
| `status` | yes | `skeleton`, `draft`, `verified`, or `retired` |
| `runtimeStatus` | yes | `manifest_only`, `stub_executors`, `runtime_enabled`, or `retired` |
| `version` | yes | Semantic version of the official pack |
| `ownerBoundary` | yes | What this pack owns |
| `mustNotOwn` | yes | Capabilities this pack must not absorb |
| `dependencies` | yes | Required lower-layer Capability Packs |
| `capabilities` | yes | Canonical capability keys owned by this pack |
| `nodes` | yes | Official node type IDs owned by this pack |
| `knowledgePacks` | yes | Required/recommended Knowledge Pack categories |
| `guardrails` | yes | Human decision, AI, QS, finance, and safety rules |
| `prototypeReferences` | yes | Prototype packs studied only as reference |
| `verification` | yes | Verification state for manifest, UI, runtime, and templates |

---

## 4. Official Node Manifest

`nodes.json` is the node-level contract. Each node entry must declare:

| Field | Required | Meaning |
|---|---:|---|
| `type` | yes | Official node type, e.g. `lados.qs.read_boq` |
| `displayName` | yes | Short canvas label |
| `canonicalCapability` | yes | Registry key, e.g. `qs.boq.read` |
| `ownerPack` | yes | Official pack ID |
| `status` | yes | `skeleton`, `draft`, `verified`, or `retired` |
| `intent` | yes | One-sentence business purpose |
| `inputPattern` | yes | `ports`, `inspector`, `resource_binding`, `knowledge_reference`, or combined |
| `outputPattern` | yes | Expected output resource/artifact/decision/advisory shape |
| `ports` | yes | Minimal readable canvas ports |
| `configGroups` | yes | Inspector grouping plan |
| `resourceBindings` | yes | Workspace Resource Binding support |
| `knowledgePackRequirements` | yes | Required/recommended Knowledge Pack categories |
| `humanDecisionBoundary` | yes | Explicit human review/approval boundary |
| `aiBoundary` | yes | `none`, `advisory`, or `requires_human_review` |
| `canvasUx` | yes | Node size and port readability requirements |
| `compatibilityAliases` | yes | Prototype node types to alias or migrate later |
| `executorStatus` | yes | `not_started`, `planned`, `stub`, or `implemented` |

---

## 5. Canvas UX Rules

Official nodes must be designed for a professional workflow canvas.

Rules:

1. A node should expose only the ports needed for graph wiring.
2. High-input nodes must move detailed fields into inspector groups, Resource Bindings, or Knowledge Pack selectors.
3. The default node size must allow the display name and critical port labels to be readable.
4. Input and output port labels must not overlap.
5. Handles must be single, aligned, and stable.
6. Ports should describe data movement, not every form field.
7. A node with more than five business fields must define inspector groups.

---

## 6. Human And AI Guardrails

Official Capability Packs must not hide professional decisions inside automation.

Required guardrails:

- `approve`, `certify`, `determine`, and `entitle` should be avoided unless the node records a human decision.
- AI outputs are advisory unless a later governed verifier phase says otherwise.
- QS, finance, contract, payroll, and compliance nodes must expose source references and review status.
- Knowledge Pack citations should be preserved in outputs when used.
- Runtime logs should capture Knowledge Pack item references when a node consumes governed knowledge.

---

## 7. Phase 20B.1 Initial Skeleton Set

The first official skeleton set is deliberately small:

| Pack | Layer | Reason |
|---|---|---|
| `lados.workflow-foundation` | L0 | Makes workflow control readable and stable |
| `lados.resource-operations` | L0 | Makes Workspace Resources and bindings first-class |
| `lados.human-work` | L0 | Separates human approval/decision gates from automation |
| `lados.document-intelligence` | L1 | Provides document intake and extraction base |
| `lados.qs-commercial` | L2 | Starts the professional Lados QS identity |

Commercial Finance, Procurement, Communication, Task/Case, Construction Operations, Contract Admin, Asset/Fleet, People/Payroll, and template packs follow after this contract is accepted.

---

## 8. Compatibility Rule

Prototype runtime support must not be removed until:

1. official replacements exist,
2. saved workflows have aliases or migration,
3. Marketplace and Explorer hide prototype packs from official product surfaces,
4. browser verification confirms the official palette and inspector UX,
5. at least one official template runs or is intentionally marked manifest-only.

---

## 9. Acceptance Checklist

- [x] Official manifest contract drafted.
- [x] Skeleton location separated from prototype runtime packages.
- [x] Initial official pack set selected.
- [x] Fresh official pack skeletons created.
- [x] Prototype packs remain temporary compatibility/runtime references.
- [x] Manifest validator updated for official contract fields.
- [x] Compatibility alias plan created in SDK.
- [ ] Official pack skeletons reviewed in product/design pass.
- [ ] Runtime registration plan drafted.
- [ ] Compatibility alias/migration plan drafted.
- [ ] First official template manifest drafted.

---

## 10. Next Work

Phase 20B.2 completed the SDK type and validator foundation. Phase 20B.3 should make validation easy to run across the repository:

1. Add a workspace script that validates every `packs/official/*/manifest.json` and `nodes.json`.
2. Check duplicate canonical capability keys across official packs.
3. Check compatibility aliases point to existing official node skeletons.
4. Create stub executors only after the manifests are accepted.
5. Update Marketplace/Explorer planning so official packs are shown separately from prototype packs.
