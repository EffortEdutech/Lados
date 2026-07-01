# Lados Platform — Canvas Upgrade Design Paper
## rgthree-Inspired Skill Grouping & Selective Group Execution

| | |
|---|---|
| **Document Type** | Upgrade Design Paper & Implementation Specification |
| **Platform** | Lados V4 |
| **Version** | 1.0 |
| **Date** | June 30, 2026 |
| **Prepared By** | EffortEdutech Platform Team |
| **Status** | DRAFT — For Internal Review |

---

## 1. Executive Summary

This paper proposes the addition of ComfyUI rgthree-inspired canvas features to the Lados workflow designer. rgthree is the most widely adopted node organisation extension for ComfyUI — a node-based AI pipeline tool — and its grouping and selective execution model is the clearest open-source reference for what professional node canvas tools need.

Lados already ships individual node execution modes (Active, Mute, Bypass) and bulk pack-level controls in the Skill Library. What is missing is the canvas-level counterpart: visual Skill Groups, bulk mode control per group, and — most importantly — the ability to run only a selected group without executing the entire workflow.

| Feature | Status |
|---|---|
| Individual node Active / Mute / Bypass | ✅ Done |
| Skill Library pack-level bulk mode buttons | ✅ Done |
| Canvas Skill Groups (visual container) | ❌ Not built |
| Group header Mute All / Bypass All | ❌ Not built |
| Group Collapse / Expand | ❌ Not built |
| Selective Group Execution ("Run This Group") | ❌ Not built |
| Group Toggle Restriction (radio mode) | ❌ Not built |

This paper specifies all four missing features and provides a phased implementation plan aligned with the existing Lados sprint structure.

---

## 2. What rgthree Got Right

rgthree is a ComfyUI extension that adds advanced node control on top of LiteGraph (the same graph engine paradigm that Lados builds upon via React Flow). Its design is the clearest available reference for how to extend a node canvas beyond simple drag-and-connect.

### 2.1 The Core Insight: Groups as Execution Units

In stock ComfyUI, a Group is purely visual — a coloured bounding box that helps the designer read the canvas. rgthree elevates Groups to first-class execution units:

- A Group can be **muted**: all nodes inside are skipped, all outputs emit null.
- A Group can be **bypassed**: all nodes inside are skipped, primary inputs pass through.
- A Group can be **selectively queued**: only the nodes inside that group are sent to the execution engine; the rest of the workflow is not run.
- Groups can have a **Toggle Restriction**: at most one active at a time (radio-button mode), or always exactly one active (forced choice mode).

### 2.2 Fast Groups Muter / Bypasser

rgthree provides a sidebar widget that lists all named groups in the current workflow and lets the designer toggle any group between Active, Muted, and Bypassed with a single click. This eliminates the need to locate specific nodes on a large canvas.

The Lados equivalent is the **Skill Group Controls panel** — accessible from the canvas toolbar, listing groups, with one-click bulk toggles.

### 2.3 Selective Execution ("Queue Group")

The most powerful rgthree feature — and the one most requested by ComfyUI power users — is the ability to right-click a group and choose "Queue Group". This sends only that group's nodes to the execution engine for a run. The rest of the workflow is not touched.

This is transformative for iterative design: a designer working on the RFQ Generation section of a workflow can run just that section with test inputs, without waiting for the entire BOQ-to-Finance pipeline to complete.

In Lados terms, this becomes **"Run Group"** — a right-click action on any named group that triggers a partial workflow execution scoped to that group's nodes.

---

## 3. Current State in Lados

### 3.1 What Is Already Built

| Component | What It Does | Location |
|---|---|---|
| Individual node mode | Active / Mute / Bypass per node. Saved in workflow JSON as `mode` field. Execution engine checks mode before running each node. | WorkflowCanvas, WorkflowRunner |
| Pack-level bulk mode | Hovering over a pack section header in the Skill Library reveals Active All / Mute All / Bypass All buttons that set all nodes of a pack to that mode at once. | `NodePalette.tsx` BULK_ACTIONS |
| `core.condition` node | Data-driven routing node. Evaluates an expression against an input value and routes to `true_path` or `false_path`. Registered in DB, executor built. | core-pack, WorkflowRunner |
| Workflow JSON `ui.groups[]` | Schema field for groups already defined. Accepted but not rendered. | `packages/workflow-json` |

### 3.2 The Gap

The individual mode toggles and the pack-level bulk buttons exist, but there is no canvas-level visual grouping. A designer cannot draw a boundary around a set of related nodes, name it, and then operate on it as a unit. The "Run Group" concept does not exist at all in the current execution engine.

The workflow JSON schema already reserves the `ui.groups[]` array for this purpose — it has never been populated or rendered.

---

## 4. Feature Specifications

### 4.1 Canvas Skill Groups

**What it is:** A named, coloured bounding box on the workflow canvas that visually and logically groups related skill nodes. Stored in workflow JSON. Has no effect on execution unless a group mode is set.

#### Visual Design

| Property | Design |
|---|---|
| Container | Semi-transparent coloured background with a 2px solid border in the group colour. Rounded corners (8px). |
| Header bar | Full-width bar at the top of the group with group colour background. Contains group name (editable), group mode badge, and action buttons. |
| Group name | Editable inline text. Default: "Group 1", "Group 2" etc. Click to rename. |
| Colour picker | Small swatch in the header. Clicking opens a palette of 8 preset colours + custom hex. |
| Mode badge | Small pill badge in header: `ACTIVE` (green), `MUTED` (gray + 🔇), `BYPASSED` (blue + →). |
| Resize handles | Drag handles on all 4 corners and 4 edge midpoints. |
| Z-order | Groups render behind skill nodes. Nodes dragged inside a group automatically become group members. |

#### Creating a Group

- Select two or more nodes on the canvas.
- Press `G`, or right-click and choose "Group selected nodes", or click the Group toolbar button.
- A group is drawn around the selection with auto-determined bounds + 40px padding.
- The group is added to `ui.groups[]` in the workflow JSON immediately.

#### Collapse / Expand

- Clicking the arrow icon in the group header collapses the group to a single compact card showing only the group name, mode badge, and node count.
- All member nodes are hidden. Edges connecting into/out of the group are shown as dashed stubs at the group boundary.
- Clicking again restores all nodes.
- Collapsed state is saved in `ui.groups[].collapsed = true`.

---

### 4.2 Group Execution Modes

**What it does:** Sets the mode of all nodes inside a group simultaneously. Identical semantics to individual node modes — the group control is a convenience shortcut, not a different mechanism.

#### Mode Behaviours

| Group Mode | Effect on Member Nodes | Visual |
|---|---|---|
| **Active** | All nodes execute normally. Individual node overrides still apply. | Group border in group colour. ACTIVE badge. |
| **Muted** | All member nodes are forced to `mode: muted`. Their outputs emit null. Downstream nodes outside the group receive null on all connected ports. | Group border and background gray. 🔇 MUTED badge. Member nodes show gray muted appearance. |
| **Bypassed** | All member nodes are forced to `mode: bypassed`. Each node's primary input is passed directly to its primary output. | Group border blue-dashed. → BYPASSED badge. Member nodes show dashed border appearance. |

#### Controls

- Three buttons in the group header: `▶ Activate` | `🔇 Mute` | `→ Bypass`
- Clicking a button sets `ui.groups[].mode` and propagates to all member nodes' `mode` field in the workflow JSON.
- Individual node overrides within a group are preserved in the JSON but overridden at runtime while the group mode is active.

---

### 4.3 Selective Group Execution ("Run Group")

**What it does:** Executes only the nodes within a specific group, ignoring all other nodes in the workflow. The group receives user-supplied test inputs and produces outputs viewable in the Execution Console.

This is the highest-value feature in this paper. It transforms Lados from a tool where the designer must run the entire workflow to test a change, into a tool where individual stages of a complex workflow can be developed, tested, and debugged in isolation.

#### User Interaction

- Right-click on a group header → **"Run Group"** menu item.
- A Run Group modal appears, showing the group's entry input ports (the inputs of nodes in the group that have no source from within the group).
- Designer provides test values for each entry input.
- Click "Run" — only the group's nodes execute.
- Execution Console shows output scoped to the group run: node results, timing, any errors.
- Full workflow run history is not affected.

#### Execution Engine Design

The runner receives a `GroupRunRequest` instead of a full `WorkflowRunRequest`:

```typescript
interface GroupRunRequest {
  workflowId:  string;
  groupId:     string;                    // ui.groups[].id
  testInputs:  Record<string, unknown>;  // port id → value
  orgId:       string;
}
```

The execution engine:

1. Loads the full workflow JSON.
2. Filters nodes to only those listed in `ui.groups[groupId].nodeIds`.
3. Builds a sub-graph: only the filtered nodes and the edges between them.
4. Injects `testInputs` as synthetic outputs on the sub-graph entry ports.
5. Runs the sub-graph through the existing BFS runner (no changes to core execution logic).
6. Stores results in a `group_run_logs` table (separate from `workflow_run_logs`).

#### Use Cases

| Use Case | Example |
|---|---|
| Test one stage | Run only the "RFQ Generation" group with a sample BOQ JSON, without running BOQ Reading or Finance Approval stages. |
| Debug a failing node | Run the "AI Classification" group with the exact input that caused a previous run to fail. |
| Develop in isolation | Build and test a new "Cost Validation" group before wiring it into the main workflow. |
| Regression check | After changing a node configuration, re-run only the affected group with a known-good test input to verify the change. |

---

### 4.4 Group Toggle Restriction (Radio Mode)

**What it does:** Optional property on a group that controls how it interacts with other groups when activated. Inspired by rgthree's `toggleRestriction`.

| Mode | Behaviour |
|---|---|
| `default` | Any combination of groups can be active simultaneously. No interaction between groups. |
| `max-one` | When this group is activated, all other groups with `max-one` restriction are automatically muted. At most one group is active at a time. |
| `always-one` | Exactly one group must always be active. Deactivating the current group is blocked unless another group is activated first. |

**Use case:** A workflow designer has three processing strategy groups — "Standard Processing", "Fast Processing", and "High-Accuracy Processing". Setting all three to `max-one` means activating any one automatically mutes the other two. This pattern enables mutually-exclusive workflow branches without using condition nodes.

---

### 4.5 Skill Group Controls Panel

**What it does:** A collapsible panel in the canvas left sidebar (below Skill Library) that lists all named groups in the current workflow and allows toggling their modes without navigating the canvas.

- One row per group: group colour swatch, group name, node count, and Active / Mute / Bypass buttons.
- Clicking a group name zooms the canvas to centre on that group.
- Provides the same function as rgthree's Fast Groups Muter/Bypasser widget.
- Only visible when the current workflow has at least one group.

---

## 5. Technical Design

### 5.1 Workflow JSON Schema Changes

The `ui.groups[]` array already exists in the schema. It needs the following additions:

```json
"ui": {
  "groups": [
    {
      "id":                "group_rfq",
      "name":              "RFQ Generation",
      "color":             "#8B5CF6",
      "nodeIds":           ["node-a", "node-b", "node-c"],
      "collapsed":         false,
      "mode":              "active",           // NEW: active | muted | bypassed
      "toggleRestriction": "default",         // NEW: default | max-one | always-one
      "bounds": {                             // NEW: canvas position + size
        "x": 120, "y": 80,
        "width": 600, "height": 400
      }
    }
  ]
}
```

### 5.2 Canvas Component Changes

| Component | Change Required |
|---|---|
| `WorkflowCanvas.tsx` | Render groups as React Flow node type `"group"`. On select-then-press-`G`, create group. Handle right-click context menu with "Run Group" option. |
| `SkillGroupNode.tsx` *(new)* | React Flow custom node type. Renders the group container, header bar, mode buttons, name editor, collapse toggle, resize handles. |
| `SkillGroupControlsPanel.tsx` *(new)* | Left sidebar panel listing all groups with bulk toggle buttons. Reads `ui.groups[]` from workflow state. |
| `RunGroupModal.tsx` *(new)* | Modal for "Run Group". Lists entry input ports, accepts test values, triggers `POST /workflows/{id}/run-group`. |
| `ExecutionConsole.tsx` | Add a "Group Runs" tab showing `group_run_logs` separate from `workflow_run_logs`. |

### 5.3 Execution Engine Changes

| File | Change |
|---|---|
| WorkflowRunner / execution engine | Add group mode resolution: before running a node, check if it belongs to a group with `mode != "active"`. If so, apply the group mode. |
| `WorkflowController` | Add `POST /workflows/{id}/run-group` endpoint accepting `GroupRunRequest`. |
| Group execution handler | Extract sub-graph from full workflow JSON. Inject test inputs. Run via existing BFS runner. Return results. |
| Migration *(new)* | Create `group_run_logs` table: `id`, `workflow_id`, `group_id`, `run_at`, `status`, `node_results JSONB`, `duration_ms`, `triggered_by`. |

### 5.4 Group Mode Precedence Rules

To avoid ambiguity when both individual node mode and group mode are set:

| Group Mode | Node Mode | Effective Behaviour |
|---|---|---|
| `active` | `active` | Node runs normally |
| `active` | `muted` | Node is muted (individual override respected) |
| `active` | `bypassed` | Node is bypassed (individual override respected) |
| `muted` | `active` | Node is muted (group wins) |
| `muted` | `bypassed` | Node is muted (group wins — mute is stronger) |
| `bypassed` | `active` | Node is bypassed (group wins) |
| `bypassed` | `muted` | Node is muted (individual mute wins over group bypass) |

> **Rule:** Group mute > individual bypass > group bypass > individual active. Individual mute always wins.

---

## 6. Implementation Plan

### 6.1 Phase A — Canvas Groups (Visual Only)

> Prerequisite for everything else. Estimated: 1 sprint.

| Task | Files |
|---|---|
| Create `SkillGroupNode` React Flow component (container, header, resize) | `SkillGroupNode.tsx` |
| Register `"group"` as a custom node type in `WorkflowCanvas` | `WorkflowCanvas.tsx` |
| Add "Group selected" keyboard shortcut (`G`) and toolbar button | `WorkflowCanvas.tsx` |
| Implement drag-to-group membership (node dragged into group boundary joins it) | `WorkflowCanvas.tsx` |
| Add collapse / expand to group header | `SkillGroupNode.tsx` |
| Persist groups to workflow JSON `ui.groups[]` on save | WorkflowCanvas serialisation |
| Restore groups from workflow JSON on canvas load | WorkflowCanvas serialisation |
| Update workflow JSON schema validation to accept new group fields | `packages/workflow-json` |

### 6.2 Phase B — Group Execution Modes

> Depends on Phase A. Estimated: ½ sprint (combined with Phase A sprint).

| Task | Files |
|---|---|
| Add Active / Mute / Bypass buttons to `SkillGroupNode` header | `SkillGroupNode.tsx` |
| On group mode change, update all member nodes' `mode` in workflow JSON | `WorkflowCanvas.tsx` |
| Execution engine: resolve group mode before running each node (precedence table) | WorkflowRunner / execution engine |
| Add `SkillGroupControlsPanel` to left sidebar | `SkillGroupControlsPanel.tsx` |
| Implement `max-one` and `always-one` toggle restrictions | `WorkflowCanvas.tsx` |

### 6.3 Phase C — Selective Group Execution

> Depends on Phase A and B. Estimated: 1 sprint.

| Task | Files |
|---|---|
| Create `group_run_logs` table migration | `supabase/migrations/0048_group_run_logs.sql` |
| Add `POST /workflows/{id}/run-group` API endpoint | `WorkflowController`, `WorkflowService` |
| Implement sub-graph extraction (filter nodes + edges to group members) | Execution engine (new helper) |
| Implement test input injection for sub-graph entry ports | Execution engine |
| Run sub-graph via existing BFS runner | WorkflowRunner (reuse) |
| Create `RunGroupModal` component (entry port inputs + run button) | `RunGroupModal.tsx` |
| Add "Run Group" to right-click context menu on group header | `SkillGroupNode.tsx` |
| Add "Group Runs" tab to `ExecutionConsole` | `ExecutionConsole.tsx` |

### 6.4 Summary Timeline

| Phase | Feature | Effort | Sprint |
|---|---|---|---|
| A | Canvas Groups (visual) | High — canvas component work | Sprint 14A |
| B | Group Execution Modes | Medium — extends existing mode system | Sprint 14A (tail) |
| C | Selective Group Execution | High — new API + sub-graph engine | Sprint 14B |

---

## 7. What Does Not Change

- **Individual node Active / Mute / Bypass toggles** — already built. Groups sit on top of this system; they do not replace it.
- **The core BFS execution engine** — selective group execution reuses it entirely. No changes to the runner core.
- **Pack-level bulk controls in Skill Library** — remain as-is. Groups are canvas-level, not pack-level.
- **The workflow JSON node format** — the `mode` field on individual nodes is unchanged. Groups add to the `ui.groups[]` array only.
- **The Condition Node (`core.condition`)** — unrelated to grouping. Groups are organisational; Condition is a routing node.

---

## Appendix A — rgthree Feature Mapping

| rgthree Feature | Lados Equivalent | Status |
|---|---|---|
| Group (visual bounding box) | Canvas Skill Group | Sprint 14A — Phase A |
| Group mute (all nodes inside muted) | Group mode: muted | Sprint 14A — Phase B |
| Group bypass (all nodes inside bypassed) | Group mode: bypassed | Sprint 14A — Phase B |
| Fast Groups Muter/Bypasser widget | Skill Group Controls Panel | Sprint 14A — Phase B |
| Queue Group (run only group nodes) | Run Group (selective execution) | Sprint 14B — Phase C |
| `toggleRestriction: max-one` | Group Toggle Restriction: max-one | Sprint 14A — Phase B |
| `toggleRestriction: always-one` | Group Toggle Restriction: always-one | Sprint 14A — Phase B |
| Group collapse/expand | Group collapse/expand | Sprint 14A — Phase A |
| Reroute node (clean edge routing) | Not planned (React Flow handles routing) | — |
| Node Fixer (repair broken graphs) | Health Check endpoint (already built) | Done |
| Individual node mute | Individual node mode: muted | ✅ Done |
| Individual node bypass | Individual node mode: bypassed | ✅ Done |

---

*© 2026 EffortEdutech Sdn Bhd — Lados Platform — CONFIDENTIAL*
