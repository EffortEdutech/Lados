# QS-WFUI — Sprint Plan: Sprint 11
**Version:** 1.0  
**Date:** 2026-06-17  
**Covers:** Sprint 11 — Project Pipeline  
**Prerequisite:** Sprint 10 complete (workflow templates, human approval, audit log)

---

## Overview

Sprint 11 introduces the **Project Pipeline** — a higher-level canvas where each node is a
whole workflow, connected by directed edges that represent data flow. This is the feature
that transforms QS-OS from a workflow productivity tool into a business process platform.

**Design principle: pipeline is behind the existing experience, not in front of it.**  
The workflow list remains the default landing page for every project. The pipeline is an
opt-in tab. Users who never click it are unaffected. Users who want to connect workflows
into a full procurement lifecycle use it as a power feature.

**Sprint 11 Goal:**  
A QS firm can map their full project procurement pipeline — BOQ→RFQ feeds into
Quotation workflows, which branch by trade via a Switch node — view it as a visual
graph, and pass data between workflows through shared project artifacts.

---

## Sprint Map

```
Sprint 1  — Monorepo Skeleton                   ✓
Sprint 2  — Auth + Canvas + Workflow JSON        ✓
Sprint 3  — Node SDK + Pack Registry             ✓
Sprint 4  — Execution Engine                     ✓ (merged into S6)
Sprint 5  — Node Palette + Property Panel        ✓
Sprint 6  — Execution Engine + Run Log           ✓
Sprint 7  — File Upload + Real Nodes             ✓
Sprint 8  — Library Panel                        ✓
Sprint 9  — AI Classify + RFQ Generation         ✓
Sprint 10 — Templates + Approval + Audit         ✓
Sprint 11 — Project Pipeline                     ← YOU ARE HERE
Sprint 12 — (TBD — post-pipeline polish)
```

---

## Architecture

### The Full Hierarchy

```
Organisation
  └─ Project
       ├─ Workflows tab  (default — unchanged from Sprint 10)
       └─ Pipeline tab   (new — opt-in)
            └─ Pipeline Canvas
                 ├─ Workflow Node  (represents an existing workflow)
                 ├─ Switch Node    (manual runtime branching)
                 └─ Edges          (directed, represent data flow intention)
```

### Inter-Workflow Data: Project Artifacts

Workflows do not call each other directly. Instead they share data through a
`project_artifacts` store — a key-value table scoped to a project.

```
Workflow A (BOQ→RFQ)
  └─ [project.save_artifact]  key="rfq_package"  value={...RFQ outputs}
       ↓
project_artifacts table  (projectId + key + value JSONB)
       ↓
Workflow B (Quotation→Supplier Rec)
  └─ [project.read_artifact]  key="rfq_package"  → reads the saved data
```

This keeps workflows **fully decoupled**. A workflow doesn't know or care which
upstream workflow produced its inputs — it just reads from a named artifact key.

### Pipeline Switch Node (MVP: Manual)

At runtime, when a user triggers a workflow that feeds a Switch node in the pipeline,
the UI presents the available outgoing paths and asks the user to pick one. No
automatic/conditional routing in Sprint 11 — that is Sprint 12+.

```
BOQ→RFQ  ──→  [Switch: Trade Router]
                  ├─ "Civil Works"        → Quotation (Civil)
                  ├─ "M&E Works"          → Quotation (MEP)
                  └─ "Structural Works"   → Quotation (Structural)
```

The Switch node on the pipeline canvas is purely a routing visual — it does not execute
inside a workflow. It lives only on the pipeline canvas.

---

## Database Changes

### Migration: `0011_sprint11_pipeline.sql`

**Table: `project_pipelines`**
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
layout        jsonb NOT NULL DEFAULT '{}'   -- React Flow nodes + edges
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
UNIQUE(project_id)   -- one pipeline per project
```

**Table: `project_artifacts`**
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
source_workflow_id  uuid REFERENCES workflows(id) ON DELETE SET NULL
execution_run_id    uuid REFERENCES execution_runs(id) ON DELETE SET NULL
artifact_key        text NOT NULL            -- e.g. "rfq_package", "quotation_draft"
value               jsonb NOT NULL DEFAULT '{}'
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
UNIQUE(project_id, artifact_key)             -- upsert by project + key
```

**Indexes:**
```sql
CREATE INDEX idx_project_artifacts_project ON project_artifacts(project_id);
CREATE INDEX idx_project_artifacts_key ON project_artifacts(project_id, artifact_key);
```

### Pipeline Layout JSON Shape (stored in `project_pipelines.layout`)

```jsonc
{
  "nodes": [
    {
      "id": "wf-<workflowId>",
      "type": "workflowNode",
      "position": { "x": 100, "y": 200 },
      "data": {
        "workflowId": "<uuid>",
        "name": "BOQ to RFQ",
        "status": "draft"        // synced from workflows table
      }
    },
    {
      "id": "switch-<uuid>",
      "type": "switchNode",
      "position": { "x": 400, "y": 200 },
      "data": {
        "label": "Trade Router",
        "paths": ["Civil Works", "M&E Works", "Structural Works"]
      }
    }
  ],
  "edges": [
    {
      "id": "e-wf-abc-switch-1",
      "source": "wf-<workflowId>",
      "target": "switch-<uuid>",
      "animated": true
    },
    {
      "id": "e-switch-1-wf-def",
      "source": "switch-<uuid>",
      "target": "wf-<workflowId2>",
      "data": { "path": "Civil Works" },
      "label": "Civil Works"
    }
  ]
}
```

---

## API Changes

### PipelineModule — `apps/api/src/pipeline/`

```
GET  /projects/:projectId/pipeline        — get pipeline layout (or empty layout)
PUT  /projects/:projectId/pipeline        — save/upsert pipeline layout
```

Both endpoints require JWT. Response envelope: `{ success, data, error }`.

### ArtifactModule — `apps/api/src/artifact/`

```
GET  /projects/:projectId/artifacts              — list all artifacts for project
GET  /projects/:projectId/artifacts/:key         — get single artifact by key
POST /projects/:projectId/artifacts              — upsert artifact (called by node internally)
```

`POST` requires JWT. `GET` endpoints require JWT.

---

## New Nodes

These are added to the node registry and available in the workflow canvas palette under
a new **"Pipeline"** category.

### `project.save_artifact`

**Config fields:**
- `artifact_key` (string, required) — the name to save under, e.g. `rfq_package`
- `include_keys` (string[], optional) — which input keys to save; defaults to all inputs

**Behaviour:** Takes its node inputs, writes them to `project_artifacts` as a JSONB value
under the given key (upsert). Returns `{ saved: true, artifact_key, saved_at }`.

### `project.read_artifact`

**Config fields:**
- `artifact_key` (string, required) — the key to read

**Behaviour:** Reads from `project_artifacts` for the current `projectId` + key.
Returns the stored value merged into outputs so downstream nodes can use it directly.
Fails with `ARTIFACT_NOT_FOUND` if key doesn't exist yet.

---

## Frontend Changes

### 1. Project Page — Add Pipeline Tab

**File:** `apps/web/src/app/(app)/projects/[projectId]/page.tsx`

Add a tab bar below the project header:

```
[ Workflows ]  [ Pipeline ]
```

Default tab: `workflows` (existing content unchanged).  
`Pipeline` tab renders `<PipelineCanvas projectId={projectId} />`.

### 2. PipelineCanvas Component

**File:** `apps/web/src/components/pipeline/PipelineCanvas.tsx`

- Uses React Flow (same library as workflow canvas)
- On mount: `GET /projects/:id/pipeline` to load layout; if empty, auto-populate
  with all existing workflows as un-connected nodes
- Custom node types:
  - `workflowNode` — card showing workflow name, status badge, "Open →" link
  - `switchNode` — diamond card with editable path labels
- Toolbar: **+ Add Switch** button, **Save** button (PUT layout to API)
- Auto-saves on edge connect/disconnect (debounced 1s)
- Read-only view of workflow status (draft / running / completed) pulled from DB

### 3. WorkflowNode (pipeline canvas node)

**File:** `apps/web/src/components/pipeline/WorkflowNode.tsx`

```
┌─────────────────────────────┐
│  ⬡  BOQ to RFQ              │
│     status: draft           │
│     Last run: never         │
│                    Open →   │
└─────────────────────────────┘
```

Clicking "Open →" navigates to the workflow canvas.  
Shows a live status badge (draft / running / completed) polled every 10s.

### 4. SwitchNode (pipeline canvas node)

**File:** `apps/web/src/components/pipeline/SwitchNode.tsx`

```
       ┌──────────────┐
       │  ◆ Switch    │
       │  Trade Router│
       │  ──────────  │
       │  Civil Works │──→
       │  M&E Works   │──→
       │  Structural  │──→
       └──────────────┘
```

Editable label and path list (click to rename, + to add path, × to remove).  
Each path becomes a labelled outgoing handle in React Flow.

---

## Task Breakdown

### S11-001 — DB Migration
Write and apply `supabase/migrations/0011_sprint11_pipeline.sql`.  
Creates `project_pipelines` and `project_artifacts` tables with indexes.

### S11-002 — PipelineModule (NestJS)
`apps/api/src/pipeline/`  
- `pipeline.module.ts`
- `pipeline.service.ts` — `get(projectId)`, `upsert(projectId, layout)`
- `pipeline.controller.ts` — GET + PUT endpoints, JWT guarded

### S11-003 — ArtifactModule (NestJS)
`apps/api/src/artifact/`  
- `artifact.module.ts`
- `artifact.service.ts` — `list(projectId)`, `get(projectId, key)`, `upsert(projectId, key, value, meta)`
- `artifact.controller.ts` — GET list, GET one, POST upsert, JWT guarded

### S11-004 — Register New Nodes
`apps/api/src/node/` — add to registered_nodes seed/migration:  
- `project.save_artifact` — category: Pipeline, icon: upload-cloud
- `project.read_artifact` — category: Pipeline, icon: download-cloud

`apps/api/src/execution/real-nodes/`:  
- `project-save-artifact.ts` — calls ArtifactService (or direct Supabase admin)
- `project-read-artifact.ts` — reads from project_artifacts
- `index.ts` — register both in realNodes map

### S11-005 — Pipeline Canvas UI
`apps/web/src/components/pipeline/`:
- `PipelineCanvas.tsx` — main canvas, React Flow, load/save layout
- `WorkflowNode.tsx` — workflow card node type
- `SwitchNode.tsx` — switch diamond node type

`apps/web/src/app/(app)/projects/[projectId]/page.tsx`:
- Add `activeTab` state (`'workflows' | 'pipeline'`)
- Render tab bar
- Conditionally render pipeline canvas or workflow list

### S11-006 — Build Verification + E2E Test

Verify:
1. `pnpm typecheck` passes across all packages
2. API starts clean, both new module routes respond
3. Pipeline tab visible on project page, doesn't break workflow tab
4. Can draw an edge between two workflow nodes and save
5. `project.save_artifact` node saves data in a workflow run
6. `project.read_artifact` node reads it back in the same or subsequent run
7. Switch node renders with labelled outgoing paths

---

## Definition of Done

- [ ] Migration 0011 applied to Supabase
- [ ] `GET/PUT /projects/:id/pipeline` working
- [ ] `GET/POST /projects/:id/artifacts` working
- [ ] `project.save_artifact` and `project.read_artifact` in node palette and executable
- [ ] Pipeline tab on project page, default tab still Workflows
- [ ] Pipeline canvas loads existing workflows as nodes automatically
- [ ] Can wire, save and reload a pipeline layout
- [ ] Switch node renders with editable paths
- [ ] All TypeScript passes, no new `any` without comment
- [ ] Committed: `feat: Sprint 11 — project pipeline canvas + artifacts`

---

## What Sprint 11 Does NOT Include

These are deliberately deferred to keep scope tight:

- **Automatic/conditional switch routing** (value-based conditions) — Sprint 12
- **Pipeline-level run trigger** (click Run on the pipeline to execute all workflows in order) — Sprint 12
- **Artifact versioning** (history of past artifact values) — Sprint 12
- **Cross-project artifact sharing** — post-MVP
- **Pipeline templates** (pre-wired pipeline layouts) — post-MVP
