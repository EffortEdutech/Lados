# QS-OS Workflow Engine Blueprint
# Volume 15 — V3 UI/UX Product Specification
Version: 1.0 (V3)

> **Document status:** V3 CURRENT  
> **Architecture version:** V3  
> **Created:** 2026-06-18  
> **Source reference:** `QS-OS_V3_Architecture_and_QS-WFUI_Continuation_Blueprint.md` §11–14  
> **Supersedes:** Vol 9 (UI/UX Product Specification V1) — for all V3 UI decisions  
> **Related documents:** Vol 4 (Workflow JSON), Vol 5 (Execution Engine), Vol 11 (Core Services), Vol 12 (Data Packs)

---

## 1. Product Purpose

QS-WFUI is the **graphical workflow interface** for QS-OS.

Its primary purpose:

```
Visual builder for Project-based AI business workflows.
```

Users build, run, and manage AI-powered construction workflows without writing code. They work with **Skills** (the business capabilities) rather than low-level API nodes.

This specification supersedes Vol 9 for all V3 UI design decisions. Vol 9 remains useful as historical context for the V1/V2 screen structure, but this document is authoritative for what to build.

---

## 2. V3 UI vs V2 UI — Key Changes

| V2 UI | V3 UI | Change |
|---|---|---|
| Node Library | Skill Library | Renamed + reorganized by Capability Pack |
| Property Panel | Skill Inspector | Renamed + enriched (pack info, version, data deps) |
| Node card | Skill card | V3 skill cards show pack badge, version, mode indicator |
| Node palette (flat list) | Pack-grouped sidebar | Skills organized under their Capability Pack |
| No data source concept | Data Pack Browser | New left panel section for Data Packs |
| No execution mode | Mode indicators (Mute/Bypass) | Right-click context menu + node visual states |
| No group concept | Skill Groups | React Flow parentNode, visual container |
| No condition node | Condition Node (◇ teal) | Data-driven routing diamond |
| Execution log panel | Bottom Drawer (tabbed) | Logs + data preview + artifacts + audit |
| Single workflow tab | Workflow Canvas + Pipeline Canvas | Two canvas tabs |

---

## 3. Overall Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Top Bar: [Project] ▾  [Workflow] ▾  [Save]  [▶ Run]  [Publish]  [User] │
├────────────────────┬────────────────────────────────────┬───────────────┤
│ Left Panel         │ Canvas                             │ Right Panel   │
│ (280px)            │                                    │ (320px)       │
│                    │  Workflow Canvas / Pipeline Canvas  │               │
│ Skill Library      │  (React Flow)                      │ Skill         │
│ Data Packs         │                                    │ Inspector     │
│ Templates          │                                    │               │
│                    │                                    │ Configuration │
│                    │                                    │ Form          │
├────────────────────┴────────────────────────────────────┴───────────────┤
│ Bottom Drawer (collapsible, ~240px):                                     │
│ [Execution Logs] [Data Preview] [Artifacts] [Audit Trail]                │
└─────────────────────────────────────────────────────────────────────────┘
```

All three panels are collapsible. The canvas takes remaining width.

---

## 4. Top Bar

### 4.1 Components

| Component | Behaviour |
|---|---|
| Project selector | Dropdown of user's projects. Clicking changes active project. |
| Workflow selector | Dropdown of workflows in current project. |
| Save button | Saves current workflow JSON. Shows unsaved indicator (dot) when dirty. |
| ▶ Run button | Runs the current workflow or pipeline. Shows ■ Stop when running. |
| Publish button | Publishes workflow as a template (Sprint 15+). Disabled in MVP. |
| User menu | Avatar dropdown: Profile, Settings, Sign Out. |

### 4.2 Canvas tab selector

Between the top bar and the canvas, two tabs:

```
[Workflow Canvas]  [Pipeline Canvas]
```

These switch between the single-workflow skill canvas and the multi-workflow pipeline canvas.

---

## 5. Left Panel — Skill Library

The left panel is the primary tool palette. It has three sections, toggled by icon tabs at the top of the panel:

```
[Skills] [Data Packs] [Templates]
```

### 5.1 Skills section

Skills are organized by **Capability Pack**. Each pack is a collapsible group.

```
▼ Document Pack
   📄 Upload BOQ
   📄 Read Excel
   📄 Read PDF
   📄 Export Document

▼ AI Pack
   🤖 Classify Trade
   🤖 Summarize Work Package
   🤖 Detect Missing Data

▼ Procurement Pack
   📋 Create Work Package
   📋 Generate RFQ
   📋 Compare Quotes
   📋 Create Purchase Order

▼ Workflow Pack
   ⏸ Approval Gate
   🔀 Condition Node
   📦 Group

▶ Estimation Pack ...
▶ Contract Pack ...
▶ Geometry Pack ...
```

**Search bar** at the top of the Skills section: full-text search across all skill names and descriptions. Results shown flat (no pack grouping) when searching.

**Drag to canvas:** Drag any skill card onto the canvas to add it as a node.

**Pack badge:** Each skill card shows a small colored tag with the pack name.

**Service indicators:** Small icons below the skill name showing which Core Services it uses (AI, OCR, etc.).

**Data Pack dependency:** If a skill requires a Data Pack not installed by the org, the skill card shows an ⚠️ indicator and is non-draggable until the pack is installed.

### 5.2 Data Packs section

List of all available Data Packs with installation status.

```
INSTALLED
✅ Malaysian Supplier Registry
   supplier-my | v1.0.0 | Active

AVAILABLE
⬜ Price Intelligence Pack
   price-intelligence | v1.0.0 | [Install]

⬜ Material Catalogue Pack
   material-catalogue | v1.0.0 | [Install]

⬜ Labour Rate Pack
   labour-rates | v1.0.0 | [Install]
```

Clicking a Data Pack opens a detail panel in the right panel area with:
- Pack description
- Included data tables / categories
- Config form (if API key required)
- Install / Uninstall button

### 5.3 Templates section

List of workflow templates available to the org:

```
★ BOQ-to-RFQ (Demo)
  Standard BOQ → Classify → RFQ → Approval

☆ Tender Comparison
  Multi-supplier RFQ → Quote Analysis → Award Recommendation

☆ Progress Claim Review
  Claim → Verify Quantities → Certify → Payment
```

Click a template to preview; "Use Template" creates a new workflow from it.

---

## 6. Canvas — Workflow Canvas

The Workflow Canvas is the primary work area. Built on React Flow.

### 6.1 Skill nodes

Each skill on the canvas is a **Skill Card**:

```
┌─────────────────────────────────────────────┐
│  [Pack icon]  Classify Trade           [⋮]  │
│               AI Pack · v1.0.0              │
│                                             │
│  ◀ items ···················· classifiedItems ▶  │
│                                             │
│  [🤖] [Status badge when running]           │
└─────────────────────────────────────────────┘
```

**Port handles:** Left side = inputs, right side = outputs. Port labels shown on hover.

**Status badges (during execution):**
- `queued` → small gray spinner indicator
- `running` → pulsing blue border
- `completed` → green checkmark badge
- `failed` → red X badge
- `skipped` → gray strikethrough
- `muted` → 🔇 icon, grayed out card
- `bypassed` → → icon, dashed border

**Top-right menu (⋮):** Opens context menu (see §6.4).

### 6.2 Condition Node (◇ teal)

The Condition Node is a diamond shape in teal, used for data-driven branching:

```
         ┌─────┐
  value ─│  ◇  │─── ✓ true_path
         │     │─── ✗ false_path
         └─────┘
         Condition
```

Color: teal (`#0D9488`)  
Shape: diamond (rotated 45° square in React Flow)  
Size: compact (140×80px)  
Left handle: value input  
Right-top handle: true_path  
Right-bottom handle: false_path

The condition expression is configured in the Skill Inspector (see §8).

### 6.3 Skill Groups

A Skill Group is a visual container. Any set of nodes can be grouped.

```
┌──────────────────────────────────────────────────┐
│ ▾ RFQ Generation                    [🔇] [→] [✓] │  ← group header
│  ┌────────────┐   ┌──────────────┐               │
│  │ Split WP   │──▶│ Generate RFQ │               │
│  └────────────┘   └──────────────┘               │
└──────────────────────────────────────────────────┘
```

**Group header controls:** Mute Group (🔇) / Bypass Group (→) / Activate Group (✓)  
**Collapse/expand:** Click ▾ to collapse group to a single bar.  
**Color:** Customizable via right-click → Set Color.

To create a group: Select multiple nodes → Right-click → Group Selected.

### 6.4 Canvas context menu (right-click on node)

```
✓ Activate
🔇 Mute
→  Bypass
─────────────
📋 Duplicate
🗑 Delete Node
─────────────
◻ Add to Group
🔍 View Details
```

**Note:** Delete key on keyboard deletes selected nodes (disabled while execution is running).

### 6.5 Canvas toolbar

```
[▶ Run Workflow]  [+ Add Skill]  [Fit View]  [1:1]  [🔒 Lock]  [Settings]
```

**Run Workflow** button: triggers workflow execution. Shows ■ Stop when running.

### 6.6 Canvas minimap

Bottom-right corner: minimap showing current viewport position. Can be toggled off.

---

## 7. Canvas — Pipeline Canvas

The Pipeline Canvas is the second canvas tab. It shows the multi-workflow pipeline.

### 7.1 Pipeline nodes

Pipeline nodes represent whole **Workflows** (not individual skills):

```
┌─────────────────────┐
│  📋 BOQ-to-RFQ      │
│     Workflow        │
│                     │
│  ◀ trigger  done ▶  │
└─────────────────────┘
```

**Status:** Same status badge set as skill nodes.

### 7.2 SwitchNode (◆ violet)

The Pipeline SwitchNode represents a **user-driven branch** — the user picks which workflow to run next:

```
             ┌─────────────┐
 previous ──▶│  ◆ Switch   │──▶ Workflow A
             │  "Which     │──▶ Workflow B
             │   path?"    │──▶ Workflow C
             └─────────────┘
```

Color: violet (`#7C3AED`)  
Shape: diamond (◆)  

When execution reaches a SwitchNode, the **SwitchPathModal** appears — a centered modal asking the user to pick a path. Unchosen paths are marked `skipped`.

### 7.3 Pipeline toolbar

```
[▶ Run Pipeline]  [+ Add Workflow]  [Fit View]  [Settings]
```

---

## 8. Right Panel — Skill Inspector

The Skill Inspector appears when a node is selected on the canvas.

### 8.1 Inspector structure

```
┌─────────────────────────────────────────────┐
│ Classify Trade                         [×]  │
│ AI Pack · v1.0.0 · skill_classify_v1        │
│                                             │
│ ─ Description ──────────────────────────── │
│ Classifies BOQ line items into construction │
│ trade categories using AI.                  │
│                                             │
│ ─ Configuration ────────────────────────── │
│ Classification Standard                     │
│ [construction-trades ▾]                     │
│                                             │
│ Confidence Threshold                        │
│ [0.85    ]                                  │
│                                             │
│ ─ Inputs ───────────────────────────────── │
│ items  → BoqItem[]                          │
│                                             │
│ ─ Outputs ──────────────────────────────── │
│ classifiedItems  → ClassifiedBoqItem[]      │
│ lowConfidenceItems → BoqItem[]              │
│                                             │
│ ─ Requires ─────────────────────────────── │
│ Services: 🤖 AI Service                     │
│ Data Packs: (none)                          │
│                                             │
│ ─ Permissions ──────────────────────────── │
│ workflow.read, ai.classify                  │
│                                             │
│ [Test This Skill]                           │
└─────────────────────────────────────────────┘
```

### 8.2 Condition Node inspector

When a Condition Node is selected:

```
┌─────────────────────────────────────────────┐
│ ◇ Condition                            [×]  │
│ Core · Condition Node                        │
│                                             │
│ ─ Condition Expression ─────────────────── │
│ [{{value}} >= 0.9                      ]    │
│                                             │
│ ─ Labels ───────────────────────────────── │
│ True path label:  [High Confidence    ]     │
│ False path label: [Needs Review       ]     │
│                                             │
│ ─ Expression Guide ─────────────────────── │
│ {{value}} — input value                     │
│ {{value}} >= 0.9 — number comparison        │
│ {{value}} == "approved" — string match      │
│ {{value}} != null — null check              │
└─────────────────────────────────────────────┘
```

### 8.3 Node mode indicator in inspector

At the top of the inspector, a three-state toggle for node mode:

```
Mode:  [● Active]  [🔇 Mute]  [→ Bypass]
```

Clicking a mode updates the node immediately and persists to workflow JSON.

---

## 9. Bottom Drawer

The bottom drawer is a **collapsible tabbed panel** at the bottom of the screen, appearing during and after execution.

```
═══════════════════════════════════════════════════════════════
 [Execution Logs]  [Data Preview]  [Artifacts]  [Audit Trail]
───────────────────────────────────────────────────────────────
  Execution log content / Data preview / Artifacts list here
═══════════════════════════════════════════════════════════════
```

Toggle via the bottom toolbar: [📋 Logs] button, or auto-expands when execution starts.

### 9.1 Execution Logs tab

Timeline view of skill executions in the current run:

```
▶ Pipeline Running…                              [Collapse ∧]  [×]

──────────────────────────────────────────────────────────
●  Upload BOQ          document  12:04:01  0.3s  ✓
●  Read Excel BOQ      document  12:04:01  1.2s  ✓
●  Classify Trade      ai        12:04:02  2.8s  ✓
⟳  Generate RFQ        proc      12:04:05  …  ⟳ running
──────────────────────────────────────────────────────────
```

Status icons: ✓ completed, ✗ failed, → bypassed, 🔇 muted, ⟳ running, ○ queued.

Error details shown inline for failed nodes (expandable).

### 9.2 Data Preview tab

Shows the output data of the **currently selected node** on the canvas.

```
Output: classifiedItems (12 items)

[
  { "description": "Reinforced Concrete...", "trade": "Civil", "confidence": 0.96 },
  { "description": "M&E First Fix...",       "trade": "M&E",   "confidence": 0.91 },
  ...
]
```

Renders as formatted JSON. Long strings are truncated with expand button.

### 9.3 Artifacts tab

Lists documents and artifacts generated by the current execution:

```
📄 RFQ_Hospital_B_20260618.pdf          [Download]  [Preview]
📊 BOQ_Classified_20260618.xlsx         [Download]
```

Clicking Preview opens the artifact in a side panel or modal.

### 9.4 Audit Trail tab

Compact log of all significant actions in the current session:

```
12:04:01  system  Workflow execution started  run_abc123
12:04:05  system  Node completed  qs.classify_trade
12:04:07  john@co  Approval submitted  approved
12:04:08  system  Artifact saved  RFQ_Hospital_B.pdf
```

---

## 10. Project Shell

The project shell is the top-level environment wrapping the workflow canvas. It provides navigation to other project modules.

### 10.1 Left sidebar (project modules)

```
📂 Project: Hospital B

── Overview
── Workflows         ← current section
── Pipeline
── Files
── Suppliers
── Artifacts
── Approvals
── Audit Log
── Settings
```

### 10.2 Project selector (top bar)

A dropdown listing all organizations and their projects the user has access to.

```
EffortEdutech
  › Hospital B Phase 1  ✓ (current)
  › Sunway Office Tower
  › Road Upgrade Package A

My Draft Projects
  › Untitled Project 1
```

---

## 11. Visual Design System

### 11.1 Color coding

| Element | Color | Hex |
|---|---|---|
| Document Pack skills | Blue | `#3B82F6` |
| AI Pack skills | Purple | `#8B5CF6` |
| Procurement Pack skills | Amber | `#F59E0B` |
| Contract Pack skills | Rose | `#F43F5E` |
| Workflow Pack skills | Gray | `#6B7280` |
| Estimation Pack skills | Emerald | `#10B981` |
| Geometry Pack skills | Cyan | `#06B6D4` |
| Condition Node | Teal | `#0D9488` |
| Pipeline SwitchNode | Violet | `#7C3AED` |
| Skill Group frame | Configurable | Default `#8B5CF6` |

### 11.2 Node execution state colors

| State | Border | Background | Icon |
|---|---|---|---|
| idle | gray-200 | white | — |
| queued | blue-200 | blue-50 | ○ gray |
| running | blue-400 (animated) | blue-50 | ⟳ blue |
| completed | green-400 | green-50 | ✓ green |
| failed | red-400 | red-50 | ✗ red |
| skipped | gray-300 | gray-50 | — strikethrough |
| muted | gray-300 | gray-100 | 🔇 gray |
| bypassed | blue-300 (dashed) | white | → blue |

### 11.3 Typography

- Font: Inter (system-ui fallback)
- Canvas labels: 12px
- Skill card names: 13px medium
- Inspector headings: 11px uppercase tracking-wide
- Panel headers: 14px semibold
- Bottom drawer: 12px monospace for logs

### 11.4 Spacing and sizing

- Skill card: 200×80px (standard), 200×60px (compact)
- Condition Node: 140×80px
- Group frame: variable, min 200×120px
- Left panel: 280px collapsed to 48px (icon-only)
- Right panel: 320px collapsed to 48px (icon-only)
- Bottom drawer: 240px, collapsed to 32px (tab strip only)

---

## 12. User Journeys

### 12.1 First-time workflow builder

```
1. Land on Project dashboard
2. Click "New Workflow" → name it
3. Workflow Canvas opens (empty)
4. See Skill Library on left
5. Drag "Upload BOQ" from Document Pack to canvas
6. Drag "Classify Trade" from AI Pack to canvas
7. Connect Upload BOQ output → Classify Trade input
8. Click Classify Trade → configure in right Inspector
9. Click ▶ Run Workflow → upload a BOQ Excel file
10. Watch status badges update on nodes
11. Bottom drawer opens → Execution Logs tab
12. Click "classifiedItems" output → Data Preview tab shows result
```

### 12.2 Adding a Condition Node

```
1. Drag Condition from Workflow Pack to canvas
2. Connect previous node's confidence output → Condition value input
3. Click Condition Node → configure in Inspector:
   Expression: {{value}} >= 0.9
   True label: High Confidence
   False label: Needs Review
4. Connect true_path → Generate RFQ node
5. Connect false_path → Manual Review node
6. Run → see which branch executes
```

### 12.3 Muting a skill

```
1. Right-click a skill node on canvas
2. Select "🔇 Mute"
3. Node turns gray with 🔇 icon
4. Run workflow → node is skipped, downstream gets null
5. Right-click → Activate to restore
```

### 12.4 Installing a Data Pack

```
1. Click [Data Packs] in left panel
2. See "Malaysian Supplier Registry" in Available list
3. Click [Install]
4. Right panel shows Data Pack detail + config form
5. Enter API key (optional for public packs)
6. Click [Install Pack]
7. Pack appears in Installed list
8. "Match Suppliers" skill in Procurement Pack becomes available
```

---

## 13. Screens Summary

| Screen | Route | Status |
|---|---|---|
| Dashboard | `/` | ✅ Built (Sprint 3-4) |
| Projects list | `/projects` | ✅ Built (Sprint 3) |
| Project detail | `/projects/:id` | 🔲 Sprint 13 |
| Workflow Canvas | `/projects/:id/workflows/:wid` | ✅ Built (Sprint 2, extended S5-12) |
| Pipeline Canvas | `/projects/:id/pipeline` | ✅ Built (Sprint 11-12) |
| Skill Library (V2 Node Palette) | (sidebar component) | ✅ Built, needs V3 update (Sprint 13) |
| Skill Inspector (V2 Property Panel) | (sidebar component) | ✅ Built, needs V3 update (Sprint 13) |
| Data Pack Browser | (left panel tab) | 🔲 Sprint 13 |
| Execution Logs (V2 log panel) | (bottom drawer) | ✅ Built (Sprint 6, extended S12) |
| Artifacts viewer | (bottom drawer tab) | 🔲 Sprint 14 |
| Approval Inbox | `/approvals` | 🔲 Sprint 14 |
| Pack Manager | `/packs` | 🔲 Sprint 15 |
| Marketplace Preview | `/marketplace` | 🔲 Sprint 15+ |
| Admin Settings | `/settings` | 🔲 Sprint 16+ |

---

## 14. Sprint 13 UI Changes (V3 Surface Adaptation)

These UI changes are the minimum needed to reflect V3 architecture in the existing interface:

| Task | Component | Change |
|---|---|---|
| Rename "Node Library" → "Skill Library" | NodePalette sidebar | Text label change |
| Rename "Property Panel" → "Skill Inspector" | PropertyPanel component | Text label change |
| Group skills by Capability Pack in sidebar | NodePalette | API response now grouped by pack; render pack headers |
| Show `packId` and `version` on skill card | NodePalette item | Add pack badge from registered_nodes |
| Show `uses_services[]` on skill card | NodePalette item | Small icon row from registered_nodes |
| Show `data_pack_deps[]` with install check | NodePalette item | ⚠️ if not installed |
| Add Data Pack Browser tab to left panel | New component | New tab: calls `/data-packs` API |
| Mute/Bypass context menu | WorkflowCanvas | Right-click menu on nodes |
| Mode visual states (gray/dashed) | WorkflowNode component | Check `data.mode` for visual state |

---

## 15. Accessibility and Responsive Design

- All interactive elements: keyboard navigable (`Tab`, `Enter`, `Escape`, `Arrow keys`)
- Canvas keyboard shortcuts: `Delete` to remove selected node, `Escape` to deselect
- Color blind safe: status states use icons in addition to color (never color alone)
- Minimum target size: 40×40px for all clickable elements
- Screen reader: skill names and statuses have `aria-label` attributes
- Responsive: left and right panels collapse on screens < 1280px; canvas-only mode < 768px

---

## 16. Security and Role-Based UI

The UI enforces role-based permissions:

| Role | Workflow Canvas | Run | Approve | Settings |
|---|---|---|---|---|
| Viewer | Read-only | ✗ | ✗ | ✗ |
| Editor | Full edit | ✅ | ✗ | ✗ |
| Approver | Read-only | ✗ | ✅ | ✗ |
| Admin | Full edit | ✅ | ✅ | ✅ |

**AI advisory constraint (mandatory in all UI):**  
Any AI-generated output displayed in the UI — classification results, generated RFQ text, cost estimates — must be clearly labelled:

```
⚠️ AI-generated — Review required before submission
```

This label must not be removable by users. A registered Professional Quantity Surveyor must certify any AI output before it is used in an official document.

---

## 17. Conclusion

This specification defines the V3 QS-WFUI product interface.

The core philosophy:

```
Skills from Capability Packs.
Data from Data Packs.
Infrastructure from Core Services.
All of it visible, controllable, and auditable on the canvas.
```

Business users should be able to build construction workflows using domain vocabulary they already understand — without knowing what's running underneath.
