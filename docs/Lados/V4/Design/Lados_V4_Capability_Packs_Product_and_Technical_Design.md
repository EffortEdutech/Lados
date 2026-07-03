# Lados V4 Capability Packs: Product and Technical Design

**Document ID:** LADOS-V4-CAPABILITY-PACKS-CANONICAL  
**Status:** Canonical design paper  
**Date:** 2026-07-03  
**Consolidates:** Phase 20A and Phase 20B Capability Pack planning, official skeleton, manifest, validator, visual metadata, template, and runtime activation boundary documents.

---

## 1. Purpose

Capability Packs are the action layer of Lados.

They define what workflows can do: nodes, templates, categories, ports, config fields, resource binding patterns, and execution boundaries.

This paper is the canonical Capability Pack design reference for Phase 21+ implementation. The earlier Phase 20A and Phase 20B documents remain supporting historical papers.

---

## 2. Product Definition

| Term | Meaning |
|---|---|
| Capability Pack | A governed package of workflow capabilities, node declarations, templates, visual metadata, and optional runtime executors |
| Official Capability Pack | A Lados-owned pack under the official architecture |
| External Capability Pack | A submitted `.ladosPack` bundle from outside Lados |
| Template Pack | A pack whose primary product is workflow templates |
| Solution Pack | A curated group of templates and pack dependencies for a business domain |
| Manifest-only Pack | A pack that declares capabilities but is not runtime-enabled yet |

Capability Packs are different from Knowledge Packs:

- Capability Packs provide actions.
- Knowledge Packs provide governed knowledge.
- A workflow node from a Capability Pack may reference Knowledge Pack Items.

---

## 3. Phase 20 Decision

Phase 20 made a fresh-build decision:

> Prototype packs, nodes, and templates are reference-only. They are not the binding official Lados product architecture.

This means:

- current prototype packs remain temporary runtime support,
- fresh official packs are planned separately under `packs/official`,
- compatibility aliases or workflow migration must exist before prototype runtime support is retired,
- official packs should not appear as executable unless runtime activation has been implemented and verified.

---

## 4. Official Pack Layers

| Layer | Purpose | Examples |
|---|---|---|
| L0 Platform Foundation | workflow primitives and platform resources | workflow foundation, resource operations, human work |
| L1 Business Foundation | document intelligence and shared business operations | document intelligence, communication, task/case |
| L2 Domain Packs | domain capability groups | commercial finance, procurement, construction operations |
| L3 Solution Packs | curated business solutions | contractor operations, QS practice |
| L4 Marketplace Extensions | external verified capability packs | external registry packs |
| L5 Template Packs | workflow templates | invoice approval, procurement RFQ, progress claim |

---

## 5. Official Pack Catalogue

| Pack ID | Category | Layer | Runtime status |
|---|---|---|---|
| `lados.workflow-foundation` | Workflow Foundation | L0 | manifest only |
| `lados.resource-operations` | Resource Operations | L0 | manifest only |
| `lados.human-work` | Human Work | L0 | manifest only |
| `lados.document-intelligence` | Document Intelligence | L1 | manifest only |
| `lados.communication` | Communication | L1 | manifest only |
| `lados.task-case` | Task and Case | L1 | manifest only |
| `lados.qs-commercial` | QS Commercial | L2 | manifest only |
| `lados.commercial-finance` | Commercial Finance | L2 | manifest only |
| `lados.procurement` | Procurement | L2 | manifest only |
| `lados.construction-operations` | Construction Operations | L2 | manifest only |
| `lados.contract-admin` | Contract Administration | L2 | manifest only |
| `lados.asset-fleet` | Asset and Fleet | L2 | manifest only |
| `lados.people-payroll` | People and Payroll | L2 | manifest only |
| `lados.solution.contractor-ops` | Contractor Operations Solution | L3 | template only |
| `lados.solution.qs-practice` | QS Practice Solution | L3 | template only |
| `lados.template.invoice-approval` | Invoice Approval Templates | L5 | template only |
| `lados.template.procurement-rfq` | Procurement RFQ Templates | L5 | template only |
| `lados.template.progress-claim` | Progress Claim Templates | L5 | template only |
| `lados.template.defect-management` | Defect Management Templates | L5 | template only |
| `lados.template.cipaa-preparation` | CIPAA Preparation Templates | L5 | template only |

---

## 6. Manifest Contract

Every official pack manifest should define:

- pack ID,
- display name,
- version,
- layer,
- domain/category,
- runtime status,
- owner,
- dependencies,
- canonical capability keys,
- visual metadata,
- nodes,
- workflow templates where applicable,
- compatibility aliases where applicable.

Every official node manifest should define:

- stable node type,
- display name,
- short description,
- category,
- icon,
- search keywords,
- typed input/output ports,
- grouped config fields,
- resource binding strategy,
- Knowledge Pack requirements where useful,
- human review boundary,
- canvas UX sizing rules.

---

## 7. Official Node Design Standard

Every official node must be readable and professional on the canvas.

| Area | Rule |
|---|---|
| Display name | short business phrase |
| Node type | stable `lados.<domain>.<verb_object>` identifier |
| Ports | minimal visible graph wiring only |
| Port labels | short nouns such as `Invoice`, `Claim`, `Evidence` |
| Business fields | belong in inspector config, not as tiny canvas ports |
| Resource-heavy nodes | prefer Workspace Resource and Resource Binding patterns |
| Knowledge-heavy nodes | select Knowledge Pack Items through inspector fields |
| Commercial/QS decisions | must preserve human review language |
| AI-supported outputs | advisory unless later verifier phases approve more automation |

High-input nodes such as `Submit Invoice` should expose one primary business object on the canvas and keep detailed fields in the inspector.

---

## 8. Visual Metadata Standard

Official packs declare visual metadata:

```json
{
  "visual": {
    "category": "Commercial Finance",
    "icon": "ReceiptText",
    "color": "#dc2626",
    "paletteGroup": "Business Operations"
  }
}
```

Official nodes declare category, icon, and search metadata:

```json
{
  "category": "Commercial Finance",
  "icon": "ReceiptText",
  "searchKeywords": ["commercial finance", "submit", "invoice"]
}
```

The official pack validator enforces this metadata.

---

## 9. Template Pack Standard

Template-only packs may declare no nodes only when they declare workflow templates.

Template skeleton files must include:

- `templateId`,
- `displayName`,
- `ownerPack`,
- `status`,
- `maturity`,
- `requiredPacks`,
- `recommendedKnowledgePacks`,
- `summary`.

Future executable workflow templates should add:

- workflow definition,
- required Workspace Resources,
- resource binding plan,
- Knowledge Pack item requirements,
- canvas layout,
- verification steps.

---

## 10. Compatibility Alias Plan

Compatibility aliases map prototype node types to official node types.

Alias states:

| State | Meaning |
|---|---|
| planned | documented but not active |
| active | runtime or migration layer resolves old type to new official type |
| retirement | old prototype type can be removed after saved workflow migration |

Aliases must not be activated until:

- official executors exist where required,
- saved workflow compatibility is tested,
- rollback path exists,
- prototype runtime support can remain available during transition.

---

## 11. Runtime Activation Boundary

Phase 20 completed only the contract/design/skeleton layer.

Runtime activation is a later phase and must include:

1. official runtime executor implementation order,
2. official pack sync into `packs` and `registered_nodes`,
3. palette grouping for official packs,
4. compatibility alias activation or workflow migration,
5. saved workflow migration test,
6. browser visual verification of official nodes,
7. prototype pack retirement plan,
8. rollback path.

---

## 12. Validation

Current validation command:

```powershell
corepack pnpm validate:official-packs
```

Known passing baseline:

```text
Official pack validation passed.
Packs: 20
Nodes: 51
Canonical capabilities: 96
Compatibility aliases: 38
```

Additional checks previously passed:

```powershell
corepack pnpm --filter @lados/pack-sdk build
corepack pnpm --filter web typecheck
```

Known residual risk:

- full workspace build was previously blocked by a Next page-collection manifest issue in `apps/web`; this is tracked outside the Capability Pack contract.

---

## 13. Marketplace Surfacing

Capability Packs should appear under a distinct Marketplace surface:

| Section | Content |
|---|---|
| Installed Capability Packs | currently active executable/runtime packs |
| Browse Capability Packs | verified registry packs |
| Official Capability Packs | manifest-only official pack catalogue until runtime-enabled |
| Template Packs | workflow template packs and solution templates |

Required labels:

- `Manifest only`
- `Runtime not enabled`
- `Template skeleton`
- `Compatibility alias planned`
- `Prototype runtime still active`

---

## 14. Phase 21+ Implementation Backlog

Recommended implementation sequence:

1. UI copy pass: make Marketplace labels distinguish Capability Packs from Knowledge Packs.
2. Provider/Knowledge Pack work can proceed separately without activating official capability runtime.
3. Official Capability Pack runtime activation planning.
4. Official pack palette surfacing.
5. Compatibility alias activation or saved workflow migration.
6. Prototype runtime retirement only after verified migration.

---

## 15. Supporting Phase 20 Papers

The following documents remain supporting history:

- `Lados_V4_Phase20A_Capability_Pack_Planning_and_Node_Taxonomy.md`
- `Lados_V4_Phase20A_Fresh_Capability_Build_Decision.md`
- `Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md`
- `Lados_V4_Phase20A_Canonical_Capability_Registry.md`
- `Lados_V4_Phase20A_Target_Workflow_Template_Index.md`
- `Lados_V4_Phase20A_Prototype_Node_Audit.md`
- `Lados_V4_Phase20B1_Official_Pack_Manifest_Contract_Standard.md`
- `Lados_V4_Phase20B2_Official_Manifest_SDK_Validator_Compatibility_Alias_Plan.md`
- `Lados_V4_Phase20B3_Official_Skeleton_Validation_and_Capability_Check.md`
- `Lados_V4_Phase20B4_Expanded_Official_Skeleton_Set.md`
- `Lados_V4_Phase20B5_Remaining_Professional_and_Template_Skeletons.md`
- `Lados_V4_Phase20B6_Official_Node_Design_Visual_Metadata_Template_Schema_Closeout.md`
