# 05 LCE Intelligence

**Layer 2 — Engine: "How does Lados work?"**

> This document covers the AI Runtime — how Lados makes AI context-aware, auditable, and trustworthy. Audience: platform engineers and anyone integrating AI into LCE workflows.

---

## 1. Design Philosophy

AI in Lados is not a chatbot bolted onto the side. It is a runtime capability that reads the same resources, events, workflows, and permissions that the rest of the engine uses — and answers grounded in that data.

The core principle:

> AI output is advisory unless explicitly accepted by a human workflow step.

This is not optional. It is enforced at every AI call site and must never be relaxed.

---

## 2. Current State

**Phase 10 and Phase 11 are complete (2026-06-24).** The AI Runtime is fully operational.

| Capability | Status |
|---|---|
| `AiService` — OpenAI Chat Completions wrapper | ✅ Live |
| `AiContextBuilderService` — LCE-aware context assembly | ✅ Live |
| Tool calling loop (`search_resources`, `get_events`, `get_workflow_status`) | ✅ Live |
| `lados_ai_outputs` output ledger | ✅ Live |
| Owner Assistant chat — grounded, multi-turn, audited | ✅ Live |
| `AiService.runVision()` — GPT-4o multimodal | ✅ Live |
| `contractor.extract_fuel_data` — AI receipt scanner | ✅ Live |
| Multi-turn workflow trigger (`POST /ai/workflow-trigger`) | ✅ Live |
| AI Workflow Design Studio (`POST /ai/workflow-suggest`, `POST /ai/workflow-edit`) | ✅ Live |

---

## 3. AI Runtime Architecture (Phase 10 Target)

```
Owner question or workflow trigger
          ↓
    ┌─────────────────────────────┐
    │         AI Runtime          │
    │                             │
    │  ┌──────────────────────┐   │
    │  │   Context Builder    │   │
    │  │  • Current user      │   │
    │  │  • Permissions       │   │
    │  │  • Recent resources  │   │
    │  │  • Recent events     │   │
    │  │  • Available tools   │   │
    │  └──────────────────────┘   │
    │             ↓               │
    │  ┌──────────────────────┐   │
    │  │  Prompt Template     │   │
    │  │  Registry            │   │
    │  └──────────────────────┘   │
    │             ↓               │
    │  ┌──────────────────────┐   │
    │  │   Tool Calling Layer │   │
    │  │  • search_resources  │   │
    │  │  • get_events        │   │
    │  │  • get_workflow_status│  │
    │  └──────────────────────┘   │
    │             ↓               │
    │  ┌──────────────────────┐   │
    │  │   Output Ledger      │   │
    │  │  • Response stored   │   │
    │  │  • Source references │   │
    │  │  • Advisory marked   │   │
    │  └──────────────────────┘   │
    └─────────────────────────────┘
```

---

## 4. Context Builder

The context builder assembles a structured prompt context before every AI call:

```typescript
interface AIContext {
  user: {
    id: string;
    role: string;
    organisation: string;
  };
  resources: Resource[];          // relevant recent resources
  events: Event[];                // relevant recent events
  permissions: string[];          // what this user can do
  availableTools: AITool[];       // what the AI can call
  workflowState?: {               // if called from a workflow node
    runId: string;
    currentNode: string;
    previousOutputs: Record<string, unknown>;
  };
}
```

This context is injected into every prompt. The AI does not operate from conversation memory alone.

---

## 5. Prompt Template Registry

Named prompt templates per use case avoid hard-coded prompt strings scattered across nodes:

```typescript
interface PromptTemplate {
  id: string;                    // e.g. 'owner_assistant', 'boq_classifier'
  systemPrompt: string;
  userPromptTemplate: string;    // Handlebars-style {{variables}}
  outputSchema?: object;         // JSON schema for structured output
  requiredContext: string[];     // which context fields are required
}
```

Templates are registered per pack. The AI Runtime selects the appropriate template by ID.

---

## 6. Tool Calling Layer

The tool calling layer lets the AI call LCE engine functions rather than hallucinating data:

```typescript
interface AITool {
  name: string;                  // e.g. 'search_resources'
  description: string;
  parameters: JSONSchema;
  execute(args: unknown): Promise<unknown>;
}

// Available tools (Phase 10 initial set)
const tools: AITool[] = [
  {
    name: 'search_resources',
    description: 'Search business resources by type and filter',
    parameters: { type: 'object', properties: { resourceType: ..., filter: ... } },
    execute: async ({ resourceType, filter }) => resourceEngine.searchResources(resourceType, filter, orgId),
  },
  {
    name: 'get_events',
    description: 'Get recent events of a type, optionally filtered by resource ID',
    execute: async ({ eventType, resourceId, since }) => eventBus.getHistory({ eventType, resourceId, since }),
  },
  {
    name: 'get_workflow_status',
    description: 'Get the current status of a workflow run',
    execute: async ({ runId }) => executionService.getRun(runId, userId),
  },
];
```

---

## 7. Owner Assistant Examples

**Trip summary:**
```
Owner asks: "How many trips today?"

AI Runtime:
  1. Build context: org, user, permissions
  2. call search_resources('Trip', { state: 'Completed', date: today })
  3. Answer: "9 trips completed today — RM 5,200 revenue, RM 630 fuel, estimated profit RM 2,700"
  4. Store in output ledger with source Trip resource IDs
```

**Uninvoiced jobs:**
```
Owner asks: "Which jobs are not invoiced yet?"

AI Runtime:
  1. call search_resources('Job', { state: 'Completed' })
  2. call get_events('Invoice.Generated', { since: '7d' })
  3. Subtract — Jobs with no matching invoice event
  4. Answer: "3 completed jobs have no invoice: Job-047, Job-051, Job-053"
```

**LEOS example (future):**
```
Owner asks: "Which projects are delayed?"

AI Runtime:
  1. call search_resources('Project', { state: 'Construction' })
  2. call get_events('Milestone.Passed', { since: 'projectStartDate' })
  3. Compare milestones vs. planned schedule
  4. Answer with project IDs and delay durations
```

---

## 8. Output Ledger

Every AI response is stored with its source context and marked advisory:

```typescript
interface AIOutputRecord {
  id: string;
  organisationId: string;
  userId: string;
  templateId: string;
  prompt: string;
  response: string;
  sourceResourceIds: string[];    // resources that grounded this answer
  sourceEventIds: string[];
  isAdvisory: boolean;            // always true unless accepted by human step
  acceptedBy?: string;            // userId who accepted in a workflow step
  acceptedAt?: string;
  createdAt: string;
}
```

The output ledger is separate from `audit_log` and `lados_events`. It is the AI-specific fact store.

---

## 9. Current AI Nodes

| Node | Pack | AI used for |
|---|---|---|
| `qs.classify_trade` | qs-pack | BOQ trade classification — AI suggests, human confirms |
| `procurement.generate_rfq` | procurement-pack | RFQ document generation from BOQ data |
| `document.read_excel` | document-pack | Table extraction from uploaded Excel files |
| `qs.clean_boq` | qs-pack | BOQ normalisation and deduplication |
| `contractor.extract_fuel_data` | contractor-pack | Fuel receipt image → structured fields (vendor, date, amount, litres, vehicle) |

All AI nodes mark outputs as extracted/advisory. None commit a result directly to a financial record — a human review node is always required downstream.

---

## 10. AI Guardrails (Non-Negotiable)

These rules are enforced at every AI call site and must never be relaxed — not for demo mode, not for testing convenience:

| Rule | Enforcement |
|---|---|
| AI cannot approve | Approval nodes are separate human-required workflow steps |
| AI cannot certify | Certification requires a professional human sign-off node |
| AI cannot release payment | Payment nodes require explicit human approval |
| AI cannot create final commercial facts | All AI output is marked advisory until a human accepts it |
| AI must preserve source references | Every answer records the resource and event IDs it was based on |
| AI outputs are stored | All responses go into the output ledger |
| Human review nodes are mandatory | Any AI output used in a financial or legal document must pass through a human review node |

### Guardrail Checklist (apply to every AI feature)

- [ ] AI output is not committed directly to a financial or legal record
- [ ] AI output passes through a human review node before becoming a workflow decision
- [ ] AI-generated content is visually marked advisory in the UI
- [ ] AI response is stored in the output ledger with source resource references
- [ ] The approval path is tested for both approved and rejected outcomes
- [ ] No bypass exists — not for any mode or environment

---

## 11. Multi-Turn Workflow Trigger (Phase 10)

`POST /ai/workflow-trigger` enables natural language workflow execution through a guided multi-turn conversation. The session is stateless on the server — the full session object is returned to the client and re-sent on each turn.

**Turn sequence:**

```
Turn 1: { command: "I received an order for 5 tan pasir kasar" }
  → phase: asking, question: { type: 'project', options: [...] }

Turn 2: { command, session, answer: "<projectId>" }
  → phase: asking, question: { type: 'workflow', options: [...] }

Turn 3: { command, session, answer: "<workflowId>" }
  → phase: asking, question: { type: 'text', field: 'customer_name' }

Turn N: { command, session, execute: true }
  → phase: done, runId: "<uuid>"
```

**Skip detection:** AI detects when a required resource (e.g. a Job) already exists today and proposes skipping that creation node. The user reviews the skip plan and can un-skip any node before confirming execution.

**AiCommandBar:** Floating 🤖 button in the platform shell. Supports both trigger mode (⚡) and design mode (✨) via tab toggle.

---

## 12. AI Workflow Design Studio (Phase 11)

The Design Studio lets owners create new workflows from scratch using natural language, with full visibility of available nodes from installed packs.

### Philosophy

> AI is a librarian + sorter. The human is the designer.

AI never decides the final workflow — it drafts a starting sequence and surfaces relevant nodes. The human reviews, edits, and saves as draft. Publish is always a manual human action.

### Pack Contract (Enforced at Every Layer)

```
registered_nodes WHERE is_enabled = true
  AND pack_id IN (SELECT id FROM packs WHERE is_enabled = true)
```

AI suggestions reference only this set. Any hallucinated type string is stripped server-side in `WorkflowSuggestService` and `WorkflowEditService` before reaching the client. The client never renders an unvalidated node type.

### API

```
POST /ai/workflow-suggest
  Body:    { orgId, description }
  Returns: { suggestion: { name, description, suggestedNodes[], availableNodes[], connections[] } }

POST /ai/workflow-edit
  Body:    { orgId, message, currentNodes[], allAvailableNodes[] }
  Returns: { action, updatedNodes?, highlights?, message, suggestPack? }
```

### WorkflowSuggestService

AI prompt requests two lists:
- `suggestedSequence` — 4-6 ordered nodes forming a complete business cycle (trigger → intermediates → final outcome)
- `alsoRelevant` — other applicable nodes from the catalogue the user might want to add

Server merges both into `suggestedNodes` (the starting sequence) and `availableNodes` (the full palette), deduplicates by type, enforces pack contract, and rebuilds sequential connections.

### WorkflowEditService

Handles each chat message during a design session. Four action types:

| Action | Server behaviour | Client effect |
|---|---|---|
| `update_sequence` | Returns full revised node list | Sequence replaced live |
| `highlight_nodes` | Returns type strings (pack-validated) | Matching palette chips pulse violet for 3s |
| `suggest_pack` | Returns pack slug + explanation | Chat message with 📦 badge |
| `answer` | Returns text only | Chat message, no sequence change |

### Design Studio UI (`AiWorkflowDesigner`)

Three-panel modal (`apps/web/src/components/AiWorkflowDesigner.tsx`):

```
┌─────────────────────────────────────────┐
│  📁 Project   [Workflow Name ________]  │
├─────────────────────────────────────────┤
│  WORKFLOW SEQUENCE              4 steps │
│  ▲▼ ➕ Receive Order    #1  ✕          │
│  ▲▼ ⏸ Approve Order    #2  ✕          │
│  ▲▼ 🚛 Dispatch Driver  #3  ✕          │
│  ▲▼ 🧾 Generate Invoice #4  ✕          │
├─────────────────────────────────────────┤
│  AVAILABLE NODES   6 available · click  │
│  [✅ Complete Trip] [📬 Notify] [💾 …] │
├─────────────────────────────────────────┤
│  AI CO-PILOT                            │
│  ┌ AI: Drafted a 4-step workflow…      │
│  └ You: add approval before invoice    │
│  ┌ AI: ✓ Sequence updated              │
│  [Add approval step] [Find fuel nodes] │
│  [__type here________________] [Send]  │
└─────────────────────────────────────────┘
            [ 💾 Save Draft ]
```

**Inline project creation:** If the organisation has no projects, the designer shows a `create_project` phase — user confirms/edits a pre-filled project name (derived from the workflow description), designer calls `POST /organizations/:orgId/projects`, then continues to generation seamlessly.

**Save flow:**
1. `POST /projects/:id/workflows` — creates draft workflow record
2. `PUT /projects/:id/workflows/:wfId/definition` — saves full definition JSON
3. Redirects to canvas editor on "Open in Canvas Editor →"

---

*Previous: [04 LCE Platform](04_LCE_Platform.md) · Next: [06 LCE Ecosystem](06_LCE_Ecosystem.md)*
