> **⚠️ HISTORICAL DOCUMENT — Phases 10 & 11 are complete.**
> Preserved for reference. Platform formerly called QS-WFUI, now Lados — a universal business workflow engine.

---

# Lados — Sprint Plan: Phase 10 + Phase 11
**Version:** 2.0 (revised from original Project Pipeline plan)
**Date:** 2026-06-24
**Covers:** Phase 10 — AI Runtime Upgrade · Phase 11 — AI Workflow Design Studio
**Status:** ✅ COMPLETE

> **Note:** The original Sprint 11 plan described a "Project Pipeline" canvas feature. That scope was deferred. Phases 10 and 11 were instead devoted to completing the AI Runtime layer and building the AI Workflow Design Studio — a higher-priority capability that enables owners to design, refine, and trigger workflows through natural language.

---

## Sprint Map

```
Phase 0   — Identity & Namespace Migration         ✅ COMPLETE
Phase 1   — Workflow Engine Stabilisation           ✅ COMPLETE
Phase 2   — Node Isolation (Nodes into Packs)       ✅ COMPLETE
Phase 3   — Resource Engine                         ✅ COMPLETE
Phase 4   — Event Bus                               ✅ COMPLETE
Phase 5   — State Engine                            ✅ COMPLETE
Phase 6   — Security Engine Hardening               ✅ COMPLETE
Phase 7   — Foundation Pack                         ✅ COMPLETE
Phase 8   — Pack Installer & Registry               ✅ COMPLETE
Phase 9   — Contractor Edition Pack Build           ✅ COMPLETE
Phase 10  — AI Runtime Upgrade                      ✅ COMPLETE  ← this document
Phase 11  — AI Workflow Design Studio               ✅ COMPLETE  ← this document
Phase 12  — Async Execution Queue                   (next)
Phase 13  — LEOS / JKR Layer Preparation            (deferred)
```

---

## Phase 10 — AI Runtime Upgrade

### Goal

Upgrade the thin `AiService` wrapper into a full LCE-aware AI Runtime with context assembly, tool calling, output ledger, and multi-modal vision support.

### Delivered

#### S10-001 — AI Output Ledger (Migration 0035)

Table `lados_ai_outputs` added to Supabase:

```sql
id, org_id, user_id, session_id, intent, response,
tokens_used, model, created_at
```

Stores every AI interaction for auditability. Advisory flag is implicit — AI output never directly commits financial or legal facts without a human approval node.

#### S10-002 — AiContextBuilderService

`apps/api/src/ai/ai-context-builder.service.ts`

Assembles structured LCE context before every AI call:
- Current user, role, organisation
- Recent resources (jobs, trips, invoices)
- Recent events from the Event Bus
- Available tools registered in the AI Tool Registry
- Workflow run state (if called from inside a workflow node)

#### S10-003 — AI Tool Calling Layer

`runAssist()` in `AiService` runs a tool-calling loop (up to 5 iterations):

| Tool | What it does |
|---|---|
| `search_resources` | Queries `lados_resources` by type and filter |
| `get_events` | Reads event history from `lados_events` |
| `get_workflow_status` | Returns the current state of an execution run |

Every tool result is injected back into the prompt context. AI answers are grounded in live LCE data, not training memory.

#### S10-004 — Owner Assistant Chat (M5)

`POST /ai/assist` — JWT-guarded, owner/admin only.

Multi-turn chat endpoint. Each response stored in `lados_ai_outputs`. Dashboard widget at `/dashboard` with session-based history. AI can answer: trip counts, uninvoiced jobs, fuel cost summaries, resource state queries.

#### S10-005 — AiService.runVision()

GPT-4o multimodal call: accepts a base64 image + prompt, returns structured JSON. Used by the fuel receipt extraction node.

#### S10-006 — contractor.extract_fuel_data Node

`packs/contractor-pack/src/nodes/extract-fuel-data.ts`

AI-powered fuel receipt scanner:
1. Receives a Supabase Storage URL for the uploaded receipt image
2. Calls `AiService.runVision()` with an extraction prompt
3. Returns structured fields: `{ vendor, date, amount, litres, vehicle_id, ... }`
4. Output is marked advisory — downstream nodes handle DB writes

Seeded with a fuel receipt workflow template.

#### S10-007 — Multi-Turn Workflow Trigger

`POST /ai/workflow-trigger` — stateless multi-turn endpoint.

Full session object is returned to the client and re-sent on each turn (no server-side session state). Phases:

```
ask_project → ask_workflow → fill_inputs (one field per turn)
           → skip_review (AI auto-detects existing resources)
           → ready
```

When client sends `execute: true` with a `ready` session, the API calls `ExecutionService.triggerRun()`.

**Skip Nodes:** AI auto-detects when a resource already exists (e.g. a Job was already created today) and proposes skipping that node. User can un-skip any node before confirming.

#### S10-008 — AiCommandBar UI (Multi-Turn)

`apps/web/src/components/AiCommandBar.tsx`

Floating 🤖 button. Full phase state machine: `idle → input → working → question → plan → executing → done/error`.

Two tabs:
- **⚡ Trigger Workflow** — multi-turn conversational trigger
- **✨ Design Workflow** — opens AI Workflow Designer

---

## Phase 11 — AI Workflow Design Studio

### Goal

Enable owners to design new workflows from scratch using natural language, with AI as a librarian + sorter (not a decider), full visibility of available nodes, and a conversational co-pilot for refining the design.

### Design Philosophy

> AI surfaces the pieces. The human is the designer.

The AI does not publish workflows. It drafts a starting sequence, surfaces all relevant nodes from installed packs, and assists with refinement through chat. The human reviews, edits, and saves as draft. Publish is always a manual human action.

### Pack Contract (Non-Negotiable)

All AI suggestions are constrained to `registered_nodes WHERE is_enabled = true AND pack_id IN (enabled packs)`. Any node type the AI hallucinates is stripped server-side before the response reaches the client. This is enforced in both `WorkflowSuggestService` and `WorkflowEditService`.

### Delivered

#### S11-001 — WorkflowSuggestService

`apps/api/src/ai/workflow-suggest.service.ts`

Given a natural language description, returns:

```typescript
{
  name:           string;       // AI-suggested workflow name
  description:    string;       // one-sentence summary
  suggestedNodes: DesignNode[]; // AI-ordered sequence (4-6 nodes)
  availableNodes: DesignNode[]; // full palette — all relevant nodes from packs
  connections:    WorkflowConnection[]; // sequential connections for the sequence
}
```

AI prompt uses a two-list JSON schema: `suggestedSequence` (the starting plan) + `alsoRelevant` (optional nodes user might add). Server merges, deduplicates, enforces pack contract, rebuilds positions and connections.

#### S11-002 — WorkflowEditService

`apps/api/src/ai/workflow-edit.service.ts`

Handles each chat message in the Design Studio co-pilot session. Returns one of four actions:

| Action | Effect |
|---|---|
| `update_sequence` | Returns a complete revised node list; client replaces sequence |
| `highlight_nodes` | Returns type strings to highlight in the palette for 3 seconds |
| `suggest_pack` | Returns a pack slug + explanation for unavailable capabilities |
| `answer` | Plain text response, no sequence change |

Pack contract enforced on `updatedNodes` and `highlights` before returning to client.

#### S11-003 — POST /ai/workflow-suggest + /ai/workflow-edit

`apps/api/src/ai/ai.controller.ts`

Both endpoints: JWT-guarded, owner/admin only, membership verified against `organization_members`.

```
POST /ai/workflow-suggest  { orgId, description }
  → { suggestion: WorkflowSuggestion }

POST /ai/workflow-edit     { orgId, message, currentNodes[], allAvailableNodes[] }
  → { action, updatedNodes?, highlights?, message, suggestPack? }
```

#### S11-004 — AiWorkflowDesigner — Design Studio UI

`apps/web/src/components/AiWorkflowDesigner.tsx`

Self-contained modal. Fetches its own org and projects on mount (no dependency on parent state). Full phase flow:

```
loading → input → [create_project] → [project_pick] → generating → design → saving → done
```

**create_project phase:** When no projects exist, the designer guides the user to create one inline via `POST /organizations/:orgId/projects`. Project code is auto-generated from the name initials (`PKO-419` style). Continues immediately to workflow generation on success.

**design phase — three panels:**

```
┌─────────────────────────────────────────┐
│  📁 Project Name   [Workflow Name ____] │  ← editable header
├─────────────────────────────────────────┤
│  WORKFLOW SEQUENCE          4 steps     │
│  ▲▼ ➕ Receive Order          #1  ✕    │  ← reorder, remove, click to rename
│  ▲▼ ⏸ Manager Approval       #2  ✕    │
│  ▲▼ 🚛 Dispatch Driver        #3  ✕    │
│  ▲▼ 🧾 Generate Invoice       #4  ✕    │
├─────────────────────────────────────────┤
│  AVAILABLE NODES  6 available · click   │
│  [✅ Complete Trip] [📬 Notify] [💾...] │  ← palette chips, highlighted on find
├─────────────────────────────────────────┤
│  AI CO-PILOT                chat to edit│
│  ┌ AI: I've drafted a 4-step workflow…  │
│  └ You: add approval before invoice     │
│  ┌ AI: ✓ Sequence updated — added…     │
│  [Add approval] [Find fuel] [Redesign]  │  ← quick chips
│  [type here…                    Send]   │
└─────────────────────────────────────────┘
         [ 💾 Save Draft ]  (header button, always visible)
```

**Palette behaviour:** Shows all relevant nodes NOT currently in the sequence. Click any chip → appends to sequence. Sequence and palette stay in sync automatically. AI `highlight_nodes` action causes matching chips to pulse violet for 3 seconds.

**Chat co-pilot examples:**
- `"add approval before invoice"` → AI inserts `foundation.request_approval` before the invoice node
- `"find fuel nodes"` → AI highlights `contractor.extract_fuel_data` in palette
- `"what pack has SMS notification?"` → AI responds with pack suggestion, no sequence change
- `"redesign as a simpler 3-step flow"` → AI returns a revised sequence

**Save flow:**
1. `POST /projects/:projectId/workflows` → creates workflow record (status: draft)
2. `PUT /projects/:projectId/workflows/:id/definition` → saves full definition JSON
3. Redirects to `/projects/:id/workflows/:wfId` canvas editor on "Open in Canvas Editor →"

---

## Definition of Done

- [x] `lados_ai_outputs` ledger table live
- [x] `AiContextBuilderService` assembles LCE context for every AI call
- [x] Tool calling loop: `search_resources`, `get_events`, `get_workflow_status`
- [x] Owner Assistant chat at `/dashboard` — grounded, audited, advisory
- [x] `AiService.runVision()` — multimodal fuel receipt extraction
- [x] `contractor.extract_fuel_data` node in contractor-pack
- [x] Multi-turn `POST /ai/workflow-trigger` — stateless session, skip detection
- [x] `AiCommandBar` — ⚡ Trigger + ✨ Design tabs
- [x] `WorkflowSuggestService` — two-list AI prompt (suggestedSequence + alsoRelevant)
- [x] `WorkflowEditService` — 4-action co-pilot (update/highlight/suggest/answer)
- [x] `POST /ai/workflow-suggest` + `POST /ai/workflow-edit` endpoints
- [x] `AiWorkflowDesigner` — Design Studio with sequence + palette + AI chat
- [x] Project creation inline (no projects → guided create-project step)
- [x] Pack contract enforced server-side on all AI suggestions
- [x] AI never publishes — all output saved as draft, human reviews and publishes

---

## What Phase 11 Does NOT Include

These are deliberately deferred:

- **Project Pipeline canvas** (visual graph of connected workflows) — deferred indefinitely
- **AI-generated workflow configs** (node property values, not just type selection) — future
- **Drag-and-drop palette** (click-to-add implemented; drag is future) — Phase 12+
- **Conditional branching suggestions** (AI suggesting Switch nodes with conditions) — future
- **Workflow template sharing from the designer** (save as template) — future
