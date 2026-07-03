# Lados V4 Phase 20A: Fresh Capability Build Decision

**Document ID:** LADOS-V4-P20A-FRESH-CAPABILITY-BUILD  
**Phase:** 20A  
**Status:** Accepted product direction  
**Date:** 2026-07-03  

---

## 1. Decision

Lados V4 will **not** refactor the prototype packs into the official Capability Pack catalogue.

The official Lados Capability Packs, nodes, and workflow templates will be built fresh from:

- the Target Capability Pack Catalogue
- the Canonical Capability Registry
- the Target Workflow Template Index
- the Prototype Node Audit
- the Naming Lock for Capability Packs and Knowledge Packs

Prototype packs and nodes are now **reference-only**. They may be studied for implementation lessons, but they should not become official product architecture.

---

## 2. Why

The prototype packs served their purpose:

- tested runtime wiring
- proved manifest-driven nodes
- proved workflow execution paths
- exposed canvas/readability problems
- exposed unsafe or unclear business wording
- helped define the future target architecture

But they also carry early-phase compromises:

- test-era pack boundaries
- inconsistent naming
- duplicated capabilities
- mixed construction/QS/finance ownership
- high-input nodes that clutter the canvas
- approval/certification wording that should be human-boundary safe
- workflow templates tied to prototype resource assumptions

Keeping them as the official foundation would lock Lados into old structure. The better product path is a clean official build.

---

## 3. Product Rule

```text
Prototype packs are not official Lados packs.
Prototype nodes are not official Lados nodes.
Prototype templates are not official Lados templates.

Official packs, nodes, and templates must be created fresh from the Phase 20A registry and template index.
```

---

## 4. What Happens to Prototype Assets

| Asset type | Product decision | Technical handling |
|---|---|---|
| Current prototype pack folders | Remove from official roadmap | Keep temporarily until replacement packs are ready |
| Current prototype node manifests | Reference only | Do not promote as official node manifests |
| Current prototype executors | Reference only | Reuse logic only after rewriting under target node contracts |
| Current prototype templates | Reference only | Recreate templates from the target template index |
| Demo/test packs | Remove from product story | Keep only as test fixtures if useful |
| Existing saved workflows | Legacy compatibility concern | Add migration/alias strategy before removing runtime support |

---

## 5. Fresh Build Requirements

Every fresh official Capability Pack must:

- use target pack IDs
- use canonical capability keys
- use target node types
- declare owner boundary and layer
- declare dependencies
- declare required/recommended Knowledge Packs
- declare resource types, events, and permissions
- use professional display names
- avoid duplicate capabilities
- avoid autonomous approval/certification/payment wording
- support readable canvas nodes
- move high-input details into inspector config, Resource Bindings, Workspace Resources, or Knowledge Pack references
- include README, examples, and verification path

---

## 6. Fresh Build Sequence

1. Freeze the target Capability Pack catalogue.
2. Freeze the canonical capability registry.
3. Freeze the target workflow template index.
4. Create clean official pack skeletons.
5. Create clean official node manifests.
6. Rebuild executors under the new node contracts.
7. Rebuild workflow templates from the target index.
8. Add compatibility aliases or workflow migration for existing saved prototype workflows.
9. Remove prototype packs from official UI and product documentation.
10. Retire prototype runtime support after migration is verified.

---

## 7. Compatibility Position

The fresh build decision does not mean immediately deleting working code.

Until fresh official packs are implemented and verified:

- prototype packs may remain in the repository as legacy/reference implementation
- existing workflows may continue to run if they depend on prototype node types
- new official Marketplace/pack documentation should not present prototype packs as product packs
- implementation should add migration tooling or compatibility aliases before removing runtime support

---

## 8. Documentation Rule

From this point forward:

- use **target official pack names** in product planning
- describe current packs as **prototype packs**
- describe current nodes as **prototype nodes**
- do not say "rename current pack into target pack" as the official product path
- say "build fresh official pack using prototype lessons"

---

## 9. Locked Decision

The accepted direction is:

```text
Remove prototype packs/nodes/templates from the official Lados product line.
Build new official planned packs, nodes, and templates fresh.
Use prototype code only as temporary reference or compatibility support.
```
