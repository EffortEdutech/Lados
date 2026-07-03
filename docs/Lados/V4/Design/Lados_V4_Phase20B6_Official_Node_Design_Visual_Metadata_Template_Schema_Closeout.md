# Lados V4 Phase 20B.6: Official Node Design, Visual Metadata, Template Schema, and Closeout

**Document ID:** LADOS-V4-P20B6-OFFICIAL-DESIGN-VISUAL-TEMPLATE-CLOSEOUT  
**Phase:** 20B.6  
**Status:** Implemented contract closeout  
**Date:** 2026-07-03  
**Depends on:** `Lados_V4_Phase20B5_Remaining_Professional_and_Template_Skeletons.md`

---

## 1. Purpose

Phase 20B.6 closes the manifest/design layer for Professional Lados Pack Bundles.

The result is a complete official skeleton catalogue with:

- professional pack ownership boundaries,
- official node design standards,
- pack visual metadata,
- node category/icon/search metadata,
- template-only solution/template pack rules,
- template manifest validation,
- Marketplace surfacing plan,
- runtime activation boundary.

This phase does not activate official packs at runtime. It creates the contract baseline that future runtime and Marketplace work must follow.

---

## 2. Official Node Design Standard

Every official node must satisfy these standards before it becomes runtime-enabled:

| Area | Standard |
|---|---|
| Display name | Short verb phrase or business noun phrase; no long explanatory canvas title |
| Node type | Stable `lados.<domain>.<verb_object>` type |
| Category | Must match the official pack visual category |
| Icon | Must use a recognizable product icon token, preferably Lucide-compatible |
| Canvas size | `canvasUx.minWidth` and `canvasUx.minHeight` must fit title and visible port labels |
| Visible ports | Keep graph wiring ports minimal; do not expose every form field as a port |
| Port labels | Short nouns such as `Invoice`, `Claim`, `BOQ`, `Evidence`, `Decision` |
| Inspector fields | Business inputs belong in grouped inspector config |
| Resource Bindings | High-input business nodes should prefer Workspace Resource or Resource Binding inputs |
| Knowledge Packs | Rule/rate/reference content must be selected from Knowledge Packs, not embedded in nodes |
| Human boundary | Commercial, QS, contract, payroll, payment, and compliance decisions must explicitly preserve human review |
| AI boundary | AI-supported nodes must be `advisory` or `requires_human_review` unless later verifier phases approve otherwise |
| Search metadata | Nodes must have category, icon, and search keywords for palette/Marketplace discovery |

---

## 3. High-Input Node Rule

High-input nodes such as `Submit Invoice` must not become unreadable canvas boxes.

The official rule is:

```text
Canvas = flow wiring
Inspector = business fields
Workspace Resource = primary business object
Resource Binding = run-time object mapping
Knowledge Pack = rules, rates, standards, policies, evidence requirements
```

For example, `lados.finance.submit_invoice` should expose one primary `Invoice` input/output on canvas while the inspector carries supplier, amount, currency, PO reference, contract reference, evidence, and rule references.

This rule is now reflected in the official node manifests through:

- `inputPattern`,
- `configGroups`,
- `resourceBindings`,
- `knowledgePackRequirements`,
- `canvasUx`.

---

## 4. Visual Metadata Contract

Each official pack manifest now declares:

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

Each official node manifest now declares:

```json
{
  "category": "Commercial Finance",
  "icon": "ReceiptText",
  "searchKeywords": ["commercial finance", "submit", "invoice"]
}
```

The official validator enforces the shape of these fields.

---

## 5. Official Pack Visual Catalogue

| Pack | Category | Icon | Color | Palette group |
|---|---|---|---|---|
| `lados.workflow-foundation` | Workflow Foundation | `GitBranch` | `#2563eb` | Platform Foundation |
| `lados.resource-operations` | Resource Operations | `Database` | `#0f766e` | Platform Foundation |
| `lados.human-work` | Human Work | `UserCheck` | `#7c3aed` | Platform Foundation |
| `lados.document-intelligence` | Document Intelligence | `FileSearch` | `#0891b2` | Business Foundation |
| `lados.qs-commercial` | QS Commercial | `Ruler` | `#ca8a04` | QS and Construction |
| `lados.communication` | Communication | `MessagesSquare` | `#16a34a` | Business Operations |
| `lados.task-case` | Task and Case | `ListChecks` | `#475569` | Business Operations |
| `lados.commercial-finance` | Commercial Finance | `ReceiptText` | `#dc2626` | Business Operations |
| `lados.procurement` | Procurement | `ShoppingCart` | `#9333ea` | Business Operations |
| `lados.construction-operations` | Construction Operations | `HardHat` | `#ea580c` | QS and Construction |
| `lados.contract-admin` | Contract Administration | `FileSignature` | `#1d4ed8` | QS and Construction |
| `lados.asset-fleet` | Asset and Fleet | `Truck` | `#15803d` | Operations |
| `lados.people-payroll` | People and Payroll | `UsersRound` | `#be123c` | Operations |
| `lados.solution.contractor-ops` | Contractor Operations Solution | `BriefcaseBusiness` | `#0d9488` | Solution Packs |
| `lados.solution.qs-practice` | QS Practice Solution | `Calculator` | `#b45309` | Solution Packs |
| `lados.template.invoice-approval` | Invoice Approval Templates | `Receipt` | `#b91c1c` | Template Packs |
| `lados.template.procurement-rfq` | Procurement RFQ Templates | `ClipboardList` | `#7e22ce` | Template Packs |
| `lados.template.progress-claim` | Progress Claim Templates | `Landmark` | `#a16207` | Template Packs |
| `lados.template.defect-management` | Defect Management Templates | `Bug` | `#c2410c` | Template Packs |
| `lados.template.cipaa-preparation` | CIPAA Preparation Templates | `Scale` | `#1e40af` | Template Packs |

---

## 6. Template Manifest Schema

Phase 20B template skeleton files are not executable workflow definitions yet. They are template planning manifests.

Each declared `workflowTemplates` file must contain:

| Field | Required | Meaning |
|---|---:|---|
| `templateId` | yes | Stable template ID under the owner pack namespace |
| `displayName` | yes | User-facing template name |
| `ownerPack` | yes | Official pack that owns the template |
| `status` | yes | Current template status, usually `skeleton` |
| `maturity` | yes | `draft`, `advisory`, `restricted`, or future maturity label |
| `requiredPacks` | yes | Capability Packs required by the template |
| `recommendedKnowledgePacks` | yes | Knowledge Pack categories that improve or govern the template |
| `summary` | yes | Short workflow purpose |

The validator now checks these fields and confirms `ownerPack` matches the containing pack manifest.

Future executable workflow templates should add:

- `workflowDefinition`,
- `requiredWorkspaceResources`,
- `resourceBindingPlan`,
- `knowledgePackItemRequirements`,
- `canvasLayout`,
- `verificationSteps`.

---

## 7. Marketplace Surfacing Plan

Official packs should surface differently from prototype/runtime packs.

Recommended Marketplace sections:

| Section | Content | Runtime status |
|---|---|---|
| Official Capability Packs | Verified Lados official packs from `packs/official` | Show as planned/manifest-only until runtime-enabled |
| Installed Runtime Packs | Current installed executable packs from `packs` and `registered_nodes` | Active runtime |
| Template Packs | L5 template packs and solution templates | Preview templates; apply only when workflow definition exists |
| Knowledge Packs | Governed knowledge catalogues | Current Phase 19 Data Pack engine, product-named Knowledge Packs |
| External Registry | Submitted `.ladosPack` bundles | Manifest-only external install until sandbox verifier exists |

The official pack UI must not imply that manifest-only packs execute.

Required labels:

- `Manifest only`
- `Runtime not enabled`
- `Template skeleton`
- `Compatibility alias planned`
- `Prototype runtime still active`

---

## 8. Runtime Activation Boundary

Phase 20B is complete at the contract/design/skeleton layer.

Runtime activation belongs to a later phase and must include:

1. official runtime executor implementation order,
2. official pack sync into `packs` and `registered_nodes`,
3. palette grouping for official packs,
4. compatibility alias activation or workflow migration,
5. saved workflow migration test,
6. browser visual verification of official nodes,
7. prototype pack retirement plan,
8. rollback path.

Prototype runtime support must remain until those items are verified.

---

## 9. Phase 20B Closure Criteria

| Criterion | Status |
|---|---|
| Official pack manifest contract exists | Complete |
| SDK types and validators exist | Complete |
| Cross-pack validation command exists | Complete |
| All first-wave official skeleton packs exist | Complete |
| Professional L2 packs exist | Complete |
| Solution/template packs exist | Complete |
| Template-only pack rule exists | Complete |
| Pack visual metadata exists | Complete |
| Node visual/search metadata exists | Complete |
| Template manifest validation exists | Complete |
| Marketplace surfacing plan exists | Complete |
| Runtime activation boundary documented | Complete |

---

## 10. Verification

Command:

```powershell
corepack pnpm validate:official-packs
```

Result:

```text
Official pack validation passed.
Packs: 20
Nodes: 51
Canonical capabilities: 96
Compatibility aliases: 38
```

---

## 11. Next Phase Recommendation

Proceed to:

**Phase 20C - Catalogue Provider Knowledge Pack Specification and AI Marketplace Search**

Reason:

The official Capability Pack contract baseline is now stable enough. Marketplace Knowledge Packs can be specified against a clear Capability Pack/Template Pack model without being tangled with prototype node families.
