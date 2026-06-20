# Lados Core Engine V1 - Implementation Blueprint

Date: 2026-06-20 (revised from initial draft)

Source note: This revision incorporates a full audit of the actual monorepo at `QS-WFUI/`. Every phase and guardrail has been reconciled against what is already built, partially built, or not yet started.

---

## 1. Purpose

Lados Core Engine V1 (LCE V1) is the reusable platform engine on which all Lados solutions are built. It was previously called Lados V3 and the codebase package namespace was `@qsos/`. Both names are retired.

The new identity:

```
Platform name:     Lados
Engine:            Lados Core Engine  (LCE)
Version:           LCE V1
Package namespace: @lados/
Former names:      QS-OS, V3, @qsos/  (historical references only)
```

LCE is not a single business application. It is a software platform. Solutions — Contractor Edition, Procurement Edition, LEOS — are configurations of packs, resources, workflows, nodes, states, and AI tools built on top of LCE.

```
LCE
  = Workflow Engine
  + Node System
  + Pack System
  + Resource Engine
  + Event Bus
  + State Engine
  + Security Engine
  + Foundation Pack
  + AI Runtime
  + Internal Registry
```

The minimum successful product is a working engine with one real solution: Contractor Edition.

---

## 2. Current Codebase Reality

The monorepo at `QS-WFUI/` is the starting point for LCE V1. It is not a greenfield project. Understanding what is already built changes the implementation sequence.

### 2.1 Monorepo Structure

```
QS-WFUI/
  apps/
    api/          NestJS 10 — REST API, execution host, Supabase client
    web/          Next.js 14 App Router — canvas UI, project/workflow management
  packages/
    execution-engine/   @lados/execution-engine  (was @qsos/)
    node-sdk/           @lados/node-sdk
    pack-sdk/           @lados/pack-sdk
    shared-types/       @lados/shared-types
    workflow-json/      @lados/workflow-json
  packs/
    core-pack/          @lados/core-pack
    ai-pack/            @lados/ai-pack
    document-pack/      @lados/document-pack
    procurement-pack/   @lados/procurement-pack
    qs-pack/            @lados/qs-pack
  supabase/
    migrations/         24 applied migrations
    functions/          Edge function stubs
```

Tech stack:

| Layer | Technology |
| --- | --- |
| API runtime | NestJS 10, TypeScript |
| Frontend | Next.js 14 App Router, React Flow, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT guard |
| File storage | Supabase Storage |
| AI | OpenAI Chat Completions API |
| Monorepo | pnpm workspaces + Turborepo |

### 2.2 What Is Already Built

**Workflow Engine — foundation present**

- Workflow JSON schema, versioning, and validation (`@lados/workflow-json`)
- Graph planner with cycle detection (`execution-engine/graph-planner.ts`)
- Sequential in-process runner with node log capture (`execution-engine/runner.ts`)
- Execution runs and logs persisted to Supabase (`execution_runs`, `execution_logs` tables)
- Workflow save/load, export/import, version history
- Audit log entries on run start and completion

**Node System — contract solid, real nodes partial**

- Node SDK contract: `NodeManifest`, `NodeContext`, `NodeExecuteResult` (`@lados/node-sdk`)
- Node categories: core, qs, procurement, document, ai, integration
- Real nodes implemented (in `api/src/execution/real-nodes/`):
  - `core.human_approval` — records approval task, auto-approves in MVP
  - `core.logger`, `core.cron_trigger`, `workflow.condition`
  - `project.save_artifact`, `project.read_artifact`
  - `document.upload_file`, `document.read_excel`
  - `qs.read_boq`, `qs.clean_boq`, `qs.classify_trade`, `qs.split_work_package`
  - `procurement.generate_rfq`, `procurement.generate_po`
- Node palette, PropertyPanel, and canvas connection validation on the UI

**Pack System — manifest defined, installer missing**

- Pack SDK: `PackManifest`, `PackPermission`, `PackNodeRegistration` (`@lados/pack-sdk`)
- Five packs declared with manifests: core, ai, document, procurement, qs
- Pack and node registry in Supabase (`packs`, `registered_nodes` tables)
- Pack browser UI at `/packs` and `/packs/[packId]`
- Packs currently seeded via SQL migrations — no dynamic installer yet

**Security Engine — auth and membership present**

- Supabase JWT guard on all protected routes
- Organisation and project membership model
- Role-based membership check on every workflow/execution/project action
- Audit log table (`audit_log`) wired through workflow and execution events

**UI — canvas and navigation present**

- React Flow canvas with SkillNode (active/muted/bypassed modes)
- Node palette, property panel, execution log panel, run history panel, version history drawer
- Navigation: Dashboard, Projects, Suppliers, Packs, Marketplace, Services
- Notification bell wired to backend notification service

**AI — advisory service present**

- OpenAI Chat Completions wrapper (`AiService`) with JSON mode support
- AI nodes used for BOQ classification, RFQ extraction, document understanding
- AI output marked advisory throughout; AI cannot approve or certify

**Other modules present**

- Supplier, RFQ distribution, quotation, organisation, project CRUD
- Notification service (in-app notifications with `notification_tasks` table)
- Pipeline canvas (parallel to workflow canvas — purpose: data pipeline)
- File upload to Supabase Storage via FileService

### 2.3 What Is Not Yet Built

| Missing capability | Why it matters |
| --- | --- |
| Resource Engine | Business objects (Customer, Job, Trip, Vehicle, Invoice) do not exist as a unified resource layer. Currently each domain is its own module with its own tables. |
| Event Bus | The audit_log exists but is not a formal typed event system. There are no event subscribers, handlers, or event-to-dashboard projections. |
| State Engine | Resource lifecycle states exist as ad-hoc column values. There is no configurable state machine, no transition guard enforcement, and no state history. |
| Real blocking approvals | `core.human_approval` auto-approves in MVP. No pause/resume async execution. |
| Async execution queue | The runner is synchronous and in-process. Long workflows block the request thread. |
| Pack installer | Packs are seeded via SQL. No runtime pack install, upgrade, enable/disable, or dependency resolution. |
| Foundation Pack | Foundation is conceptual. Its capabilities (files, approvals, notifications, audit, AI context) live in separate modules, not in a single installable pack. |
| Contractor Edition resources | Customer, Job, Trip, Driver, Vehicle, FuelReceipt, MaintenanceRecord do not exist in the schema. |
| Namespace rename | All packages still use `@qsos/` — must be renamed to `@lados/`. |
| UI identity rename | Sidebar and branding still show "QS-OS". |
| Node isolation | Real node implementations live inside `api/src/execution/real-nodes/` rather than in their respective packs. `qs.read_boq` belongs in `@lados/qs-pack`, not in the API module. |

---

## 3. Architecture Decisions

### 3.1 Locked Product Direction

| Decision | Locked Direction |
| --- | --- |
| Platform name | Lados |
| Engine name | Lados Core Engine (LCE) |
| Engine version | LCE V1 |
| Package namespace | @lados/ |
| API app | apps/api (NestJS) |
| Web app | apps/web (Next.js 14) |
| Database | Supabase (PostgreSQL) |
| First validation solution | Contractor Edition |
| Deferred solutions | LEOS, JKR, Full Procurement |

### 3.2 Engine Before Solution

Every feature question must be asked at two levels:

```
Level 1 — Engine:    What reusable LCE capability does this need?
Level 2 — Solution:  How does Contractor Edition configure or compose that capability?
```

The screen is the last expression. The workflow and resource model are the product.

### 3.3 Solutions Are Pack Compositions

A solution is a named composition of packs installed on LCE:

| Solution | Packs |
| --- | --- |
| Contractor Edition | Foundation, Job, Fleet, Equipment, Finance, HR, Document, Dashboard, AI |
| Procurement Edition | Foundation, Procurement, Approval, Finance, Document, Dashboard, AI |
| LEOS / JKR | Foundation, Project, Tender, BOQ, Contract, Inspection, Payment, Variation, Asset, Archive |

The existing packs (core, qs, document, procurement, ai) map into this composition model. They must be refactored to be proper LCE packs — not API modules with their implementation hard-wired into the execution host.

### 3.4 Resources Are First-Class Objects

Every important business object must be a Resource, not a one-off table with its own module.

A Resource has:

```
id, tenantId / organisationId, resourceType, resourceKey,
title, status, state, data (typed payload),
relationships, createdBy, createdAt, updatedAt, archivedAt
```

Existing entities (Supplier, Quotation, Project) will eventually move into the Resource layer. This migration is incremental — do not break existing modules before the Resource Engine is stable.

### 3.5 Events Are Mandatory

Every important action must emit a typed event. The existing `audit_log` table is the seed of the Event Bus but it is not the Event Bus. The Event Bus must be:

- Typed (each event has a declared schema and version)
- Immutable (events are never updated or deleted)
- Subscribable (handlers can react to events asynchronously)
- Projectable (dashboards and AI can read event history)

### 3.6 States Are Configurable

Resource lifecycle must be driven by configurable state machines. Invalid transitions must be blocked at the engine level, not scattered across business logic.

Example — Invoice:

```
Draft -> Submitted -> Verified -> Approved -> Paid -> Archived
```

Example — Vehicle:

```
Available -> Assigned -> In Service -> Maintenance -> Retired
```

### 3.7 AI Is Runtime-Aware

AI must read the current resource, workflow, event history, and available tools before responding. It must not be a disconnected chatbot.

The current `AiService` is a thin OpenAI wrapper. It must be extended into an AI Runtime that understands LCE context.

AI output remains advisory unless explicitly accepted by a human workflow step. This guardrail is already coded into every real node — it must never be relaxed.

### 3.8 Execution Must Become Async

The current synchronous in-process runner is correct for MVP validation but cannot scale. The upgrade path is:

```
Current:  HTTP trigger -> synchronous runner -> response
Target:   HTTP trigger -> job queue -> async worker -> webhook/SSE result
```

This change does not alter the `WorkflowRunner` interface. It changes how the API initiates and monitors runs.

### 3.9 LEOS / JKR Remains Deferred

The existing QS pack (`qs.read_boq`, `qs.classify_trade`, etc.) is LEOS-adjacent scope. It should be maintained but not expanded until Contractor Edition proves the engine. New QS-specific resources, workflows, and nodes belong in a future QS/LEOS pack, not in LCE core.

---

## 4. Engine Modules

### 4.1 Workflow Engine

**Current state:** Foundation built. Stabilization needed before Resource Engine work begins.

**What exists:**
- `@lados/workflow-json` — schema, validation, builder, serialization
- `@lados/execution-engine` — graph planner, sequential runner, log capture
- `apps/api/src/workflow/` — CRUD, versioning, export/import
- `apps/api/src/execution/` — trigger, run history, log retrieval, audit

**What needs work:**
- Human approval must become a real blocking pause/resume (replace auto-approve)
- Execution must move off the synchronous request thread (async queue)
- Scheduled trigger (`core.cron_trigger`) needs a real cron scheduler, not a mock
- Workflow version publishing — currently the definition is mutable; published versions must be immutable

**Acceptance criteria:**
- A workflow can be designed, saved, versioned, published, and executed
- Running executions bind to immutable published versions
- Approval nodes genuinely pause execution until a human acts
- Failed nodes are inspectable and retryable where safe

### 4.2 Node System

**Current state:** SDK contract is solid. Real nodes exist but are misplaced in the API module.

**What exists:**
- `@lados/node-sdk` — `NodeManifest`, `NodeContext`, `NodeExecuteResult`, port types, config schema
- `@lados/node-sdk/base-node.ts` — base class for node implementations
- 14 real node implementations in `api/src/execution/real-nodes/`
- `registered_nodes` table in Supabase
- Node palette and property panel in the canvas

**What needs work:**
- Node implementations must move from `api/src/execution/real-nodes/` into their respective packs (`@lados/core-pack/src/nodes/`, `@lados/qs-pack/src/nodes/`, etc.)
- The node resolver in `ExecutionService` must dynamically load from installed packs, not from a hardcoded import list
- Universal node catalog (Create Resource, Update Resource, Change State, Emit Event, etc.) must be added to core pack

**Node categories and ownership:**

| Category | Pack | Examples |
| --- | --- | --- |
| core | @lados/core-pack | Start, End, Logger, Condition, Loop, Wait, Human Approval, Cron Trigger |
| resource | @lados/foundation-pack | Create Resource, Update Resource, Find Resource, Archive Resource, Change State |
| event | @lados/foundation-pack | Emit Event |
| document | @lados/document-pack | Upload File, Read Excel, Generate PDF |
| ai | @lados/ai-pack | AI Analyze, AI Extract, AI Summarize |
| procurement | @lados/procurement-pack | Generate RFQ, Generate PO |
| qs | @lados/qs-pack | Read BOQ, Clean BOQ, Classify Trade, Split Work Package |
| integration | future packs | Call API, Send Email, Webhook |

**Acceptance criteria:**
- Nodes are reusable across solutions
- Node inputs and outputs are schema-validated at engine level
- Node execution is auditable
- Nodes cannot bypass the Resource Engine, Event Bus, State Engine, or Security Engine

### 4.3 Pack System

**Current state:** Manifest types defined, packs declared, seeded via SQL. No runtime installer.

**What exists:**
- `@lados/pack-sdk` — `PackManifest`, `PackPermission`, `PackNodeRegistration`, validation
- Five pack manifests: core, ai, document, procurement, qs
- `packs` and `registered_nodes` tables in Supabase
- Pack browser UI at `/packs`

**What needs work:**
- Runtime pack installer: accept a pack manifest, validate dependencies, run migrations, register nodes
- Pack enable/disable lifecycle
- Pack version compatibility check against engine version
- Pack dependency resolver (Foundation must be installed before Fleet, etc.)
- Migration runner per pack (each pack owns its schema migrations)

**Pack manifest must declare:**

```json
{
  "packKey": "fleet-pack",
  "name": "Fleet Pack",
  "version": "1.0.0",
  "engineCompatibility": ">=1.0.0 <2.0.0",
  "dependencies": ["foundation-pack"],
  "resources": ["Vehicle", "Driver"],
  "nodes": ["fleet.assign_vehicle", "fleet.record_fuel", "fleet.maintenance_alert"],
  "workflows": ["fleet.daily_dispatch", "fleet.maintenance_review"],
  "permissions": ["read:files", "write:database"],
  "events": ["VehicleAssigned", "FuelReceiptUploaded", "MaintenanceDue"],
  "states": ["vehicle_lifecycle"],
  "migrations": ["0001_create_fleet_resources.sql"]
}
```

**Acceptance criteria:**
- A pack can be installed at runtime from a manifest
- Installed packs appear in the internal registry
- Pack upgrades produce a controlled migration plan
- Broken pack dependencies are blocked

### 4.4 Resource Engine

**Current state:** Does not exist. Business objects are individual Supabase tables owned by NestJS modules.

**Design:**

The Resource Engine is a universal business object layer. Every domain object — Customer, Job, Vehicle, Invoice, Contract — is a typed Resource instance stored in a shared resource table.

Core resource table:

```sql
create table lados_resources (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  resource_type   text not null,           -- 'Vehicle', 'Invoice', 'Job', etc.
  resource_key    text,                    -- human-readable key, e.g. 'INV-2026-001'
  title           text,
  status          text default 'active',
  state           text,                    -- state machine state
  data            jsonb default '{}',      -- typed payload per resource_type
  relationships   jsonb default '[]',      -- links to other resources
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  archived_at     timestamptz
);
```

Resource Engine API (NestJS service):

- `createResource(type, data, organisationId, userId)`
- `updateResource(id, data, userId)`
- `findResource(id, organisationId)`
- `searchResources(type, filters, organisationId)`
- `archiveResource(id, userId)`
- `relateResources(sourceId, targetId, relationshipType)`
- `getResourceHistory(id)`
- `transitionState(id, toState, userId)` — delegates to State Engine

Existing modules (Supplier, Project, Quotation) are not immediately replaced. They are progressively migrated into the Resource layer once the engine is stable.

**Acceptance criteria:**
- Contractor resources (Customer, Job, Trip, Driver, Vehicle, FuelReceipt, Invoice, Payment) can be created and queried through the engine
- Resource changes emit typed events
- Nodes can create and update resources through the Resource Engine
- Future resource types require no engine changes

### 4.5 Event Bus

**Current state:** `audit_log` table exists and is written on key actions. Not a formal event system.

**Design:**

The Event Bus is a Supabase table (`lados_events`) with typed event envelopes, plus a subscriber registry and handler system.

Event table:

```sql
create table lados_events (
  id              uuid primary key default gen_random_uuid(),
  event_type      text not null,
  event_version   text not null default '1.0.0',
  organisation_id uuid not null,
  actor_type      text not null,   -- 'user', 'system', 'workflow', 'node'
  actor_id        uuid,
  resource_type   text,
  resource_id     uuid,
  workflow_id     uuid,
  node_id         text,
  payload         jsonb default '{}',
  correlation_id  uuid,
  causation_id    uuid,
  occurred_at     timestamptz default now()
);
```

Events are immutable. No updates or deletes.

The existing `audit_log` rows are human-readable projections of events — they stay. The Event Bus is the raw fact store that drives dashboards, AI context, and notification triggers.

**Event publisher:** every Resource mutation, State transition, Workflow step, and Approval action calls `EventBus.publish(event)`.

**Event subscribers:** handlers registered per event type. Initial handlers: notification trigger, dashboard projection update, AI context cache invalidation.

**Acceptance criteria:**
- Every workflow execution and resource mutation emits a typed event
- Events are immutable
- Dashboard widgets read from event projections
- AI context builder consumes event history
- `audit_log` continues to receive human-readable summaries as a separate projection

### 4.6 State Engine

**Current state:** Does not exist. State is a free-form column value in individual tables.

**Design:**

State machines are declared per resource type in pack manifests. The State Engine validates transitions and records state history.

State machine definition:

```json
{
  "resourceType": "Invoice",
  "states": ["Draft", "Submitted", "Verified", "Approved", "Paid", "Archived"],
  "transitions": [
    { "from": "Draft",     "to": "Submitted", "permission": "invoice.submit" },
    { "from": "Submitted", "to": "Verified",  "permission": "invoice.verify" },
    { "from": "Verified",  "to": "Approved",  "permission": "invoice.approve", "requiresApproval": true },
    { "from": "Approved",  "to": "Paid",      "permission": "payment.record" },
    { "from": "*",         "to": "Archived",  "permission": "resource.archive" }
  ]
}
```

State history table records every transition with actor, timestamp, and reason.

**Acceptance criteria:**
- Invalid transitions are blocked before they reach the database
- Transition history is auditable per resource instance
- Approval-required transitions create approval tasks and emit events
- State changes emit `ResourceStateChanged` events

### 4.7 Security Engine

**Current state:** Auth and membership present. Fine-grained permission enforcement is partial.

**What exists:**
- Supabase Auth + JWT guard on all routes
- Organisation membership model with roles
- Per-endpoint membership assertions

**What needs work:**
- Declarative permission policies per node, workflow, and resource operation
- State-based permissions (can only submit when in Draft state)
- API key support for programmatic access
- Team-level access scoping (needed for enterprise solutions)

**Minimum roles for Contractor Edition:**

| Role | Can do |
| --- | --- |
| Owner | Everything |
| Admin | All operations except billing and role management |
| Member | Execute assigned tasks, record trips, upload documents |
| Driver | View assigned jobs, record trip events |
| Operator | View assigned equipment jobs, record hours |

**Acceptance criteria:**
- Small contractor can run with Owner, Driver, and Operator roles
- Future enterprise users can be scoped by organisation, department, project, or vendor
- Users cannot execute nodes or trigger transitions without the required permission

### 4.8 AI Runtime

**Current state:** `AiService` is a thin OpenAI wrapper. Nodes call it directly. No context builder.

**What exists:**
- `AiService` — OpenAI Chat Completions with JSON mode, keyword fallback when no API key
- AI nodes: document extraction, BOQ classification, RFQ generation
- Security guardrails coded at every AI call point

**What needs work:**
- AI context builder: assembles current resource, workflow, event history, and permissions into a structured prompt context
- Prompt template registry: named prompt templates per use case (owner assistant, document extractor, BOQ classifier)
- AI tool calling layer: allows AI to call LCE tools (search resources, read events) rather than hallucinating
- AI output ledger: stores every AI response with its source context and confidence markers
- AI audit log: separate from the event bus — records AI calls, prompts, and outputs

**Owner assistant example flow:**

```
Owner asks: "Which jobs are not invoiced yet?"

AI Runtime:
  1. Build context: current organisation, current user, permissions
  2. Search resources: resourceType='Job', state != 'Invoiced'
  3. Read events: JobCompleted events without InvoiceGenerated follow-up
  4. Compose answer: "3 jobs completed this week are not yet invoiced..."
  5. Store in AI output ledger with source resource IDs
```

**Guardrails (non-negotiable):**
- AI cannot approve, certify, or release payment
- AI cannot create final commercial facts without human acceptance
- AI must preserve source references in all operational and commercial answers
- AI output is marked advisory unless explicitly accepted by a human workflow step

### 4.9 Foundation Pack

**Current state:** Does not exist as an installable pack. Capabilities are scattered across modules.

**What Foundation Pack must provide:**

| Capability | Current location | Migration path |
| --- | --- | --- |
| Auth / Users | Supabase Auth + AuthModule | Foundation wraps Supabase Auth |
| Roles / Permissions | Membership model | Foundation formalises into permission policies |
| Files | FileModule + Supabase Storage | Foundation owns file resource type |
| Notifications | NotificationModule | Foundation moves into pack |
| Approvals | approval_tasks table | Foundation owns approval resource type |
| Audit | audit_log table | Foundation keeps as projection layer |
| Comments | not yet built | Foundation adds as a resource feature |
| Tags / Labels | not yet built | Foundation adds |
| Search | not yet built | Foundation adds cross-resource search |
| AI Context | AiService | Foundation provides context builder |

Foundation Pack is the mandatory base. Every other pack declares a dependency on it.

### 4.10 Internal Registry

**Current state:** `packs` and `registered_nodes` tables exist. Pack browser UI at `/packs`. No install/upgrade flow.

**What needs work:**
- Available pack catalog (packs that can be installed but aren't yet)
- Installed pack registry (packs that are active on this engine instance)
- Pack version and compatibility display
- Enable/disable controls in the UI
- Dependency graph viewer

**Acceptance criteria:**
- Operators can browse, install, and disable packs without touching SQL migrations
- Broken dependencies are blocked at install time
- Pack versions are traceable

### 4.11 UI Framework

**Current state:** Canvas, node palette, property panel, run history, and basic navigation exist. All scoped to the QS-OS project model.

**What needs work:**
- Rebrand: "QS-OS" → "Lados" in sidebar, page titles, metadata
- Resource list and resource detail views (engine-level, not solution-specific)
- Approval inbox: actionable list of pending approval tasks
- Event/audit viewer: filterable event stream UI
- AI assistant panel: owner-facing chat grounded in LCE context
- Pack registry UI: install, upgrade, enable/disable
- Dashboard: solution-configurable metric widgets

**Principle:** screens are the last expression. UI surfaces must be driven by resource types and workflow definitions, not hardcoded to one solution. A pack should be able to contribute a nav item and a set of views without forking the app shell.

---

## 5. Contractor Edition MVP

### 5.1 Purpose

Contractor Edition is the first LCE solution. It validates that the engine can support a real small business without ERP complexity.

Minimum viable operation:

- 1 owner
- 3 tipper lorries
- 3 drivers
- 1 backhoe
- 1 optional admin

### 5.2 Navigation

```
Lados — Contractor Edition
  Dashboard
  Jobs
  Fleet
  Drivers
  Equipment
  Customers
  Finance
  Documents
  AI Assistant
```

### 5.3 Required Packs

| Pack | Responsibility |
| --- | --- |
| Foundation Pack | Users, roles, files, approvals, audit, notifications, AI context |
| Job Pack | Customers, jobs, trips, scheduling |
| Fleet Pack | Vehicles, drivers, maintenance, fuel |
| Equipment Pack | Backhoe, operator, hours, maintenance |
| Finance Pack | Quotations, invoices, payments, expenses |
| HR Pack | Attendance, payroll inputs, allowances |
| Document Pack | Upload, OCR, PDF generation, photos |
| Dashboard Pack | Owner metrics and daily summary |
| AI Pack | Owner assistant, document extraction |

### 5.4 Core Resources

| Resource | Description |
| --- | --- |
| Customer | Party requesting transport or equipment service |
| Job | Work order for transport, material, or equipment hire |
| Trip | One completed transport cycle |
| Driver | Driver profile, assignment, attendance |
| Vehicle | Tipper lorry profile and lifecycle |
| Equipment | Backhoe or other plant |
| Operator | Equipment operator assignment |
| FuelReceipt | Fuel expense evidence |
| MaintenanceRecord | Vehicle or equipment service event |
| Invoice | Billing document |
| Payment | Customer payment record |
| Expense | Other operating expense |
| PayrollRun | Salary calculation period |
| Document | Uploaded document or photo |

### 5.5 Core Workflows

**Workflow 1: Job Creation**

Customer requests service. Owner creates Job with customer, location, material, rate, start time, and expected trips. LCE creates Job resource, transport tasks, and driver/vehicle assignment tasks.

**Workflow 2: Driver and Vehicle Assignment**

Owner assigns lorries to drivers. Drivers receive job details, destination, and navigation link via notification.

**Workflow 3: Trip Execution**

Driver flow: Start Shift → Navigate → Arrive → Load → Unload → Trip Complete. Every tap emits an event and increments the trip count visible to the owner.

**Workflow 4: Equipment Work**

Owner assigns backhoe and operator to job. LCE tracks operating hours, fuel, maintenance, and utilization.

**Workflow 5: Maintenance Reminder**

Vehicle and equipment records track mileage, service intervals, insurance, and road tax. When due: Notification → Owner Approval → Service Job Created.

**Workflow 6: Fuel Receipt**

Driver uploads receipt. AI extracts amount, station, date, and vehicle. Human review required before fuel expense is posted to accounts.

**Workflow 7: Invoice Generation**

Owner presses Generate Invoice on a completed job. LCE already knows trips, rates, equipment hours, and extra charges. Invoice draft is generated and issued after review.

**Workflow 8: Payroll**

Payroll Run reads trips, hours, overtime, allowances, and attendance. Calculates gross, EPF, SOCSO, and net pay. Requires Owner approval before finalisation.

**Workflow 9: AI Owner Assistant**

Owner asks natural-language questions. AI reads resources and events, then answers with source-aware operational summaries. Examples:

- How many trips today?
- Which lorry earns the most?
- Which driver is always late?
- What is today's estimated margin?
- Which jobs are not invoiced yet?

### 5.6 Contractor Edition Acceptance Criteria

- Owner can create jobs and assign vehicles and drivers
- Driver can execute trips with minimal taps
- Trip counts update live for the owner
- Backhoe work can be tracked by hours
- Fuel receipt upload creates an extractable resource with human review
- Maintenance reminders can create service jobs
- Invoices are generated from completed trips and equipment hours
- Dashboard shows trips, revenue, fuel, and estimated margin
- AI assistant answers are grounded in resources and events

---

## 6. Implementation Sequence

The phases below replace the original Phase 0 through 12 sequence. They are reordered to match actual codebase state and to make each phase executable without blocking on the next.

### Phase 0: Identity and Namespace Migration

**Status:** Not started. Must be first.

**Goal:** Retire QS-OS and @qsos/. Establish Lados and @lados/ as the working identity.

**Tasks:**

- Rename all `@qsos/` package names to `@lados/` in every `package.json` and import
- Update sidebar branding from "QS-OS" to "Lados"
- Update page titles, metadata, and any remaining QS-OS references in the web app
- Update internal documentation terminology: V3 → LCE V1, QS-OS → Lados
- Create `docs/LCE_V1/` documentation library structure

**Acceptance:**
- `grep -r "@qsos" .` returns zero hits outside of historical migration notes
- The running app shows "Lados" in the sidebar and page titles

### Phase 1: Workflow Engine Stabilization

**Status:** Partially complete. Foundation is real. Gaps are specific.

**Goal:** Make the workflow engine production-grade before adding the Resource and Event layers.

**Tasks:**

- Replace auto-approve in `core.human_approval` with real pause/resume: workflow run pauses at the approval node, resumes when a human clicks Approve in the UI
- Add a job queue (e.g. BullMQ + Redis, or Supabase Edge Function queue) to move execution off the synchronous request thread
- Implement published workflow versions: once published, a version's definition is immutable; new edits create a new draft version
- Wire `core.cron_trigger` to a real cron scheduler instead of a mock
- Stabilize workflow save, load, and canvas auto-save reliability

**Acceptance:**
- A workflow with an approval node genuinely pauses and resumes when the human acts
- Long-running workflows do not block the HTTP response thread
- Published workflow versions cannot be silently edited

### Phase 2: Node Isolation — Move Real Nodes into Packs

**Status:** Not started.

**Goal:** Break the dependency between `api/src/execution/real-nodes/` and the pack system. Each node must live in its pack.

**Tasks:**

- Create `src/nodes/` directories in each pack (`@lados/core-pack`, `@lados/document-pack`, `@lados/qs-pack`, `@lados/procurement-pack`, `@lados/ai-pack`)
- Move each `real-nodes/*.ts` file into the appropriate pack
- Update `buildRealNodeResolver` in `ExecutionService` to import from packs rather than from local files
- Define the executor contract: a pack exports a `resolveNode(type: string): NodeExecutor | null` function
- Verify all 14 existing real nodes pass existing smoke tests after the move

**Acceptance:**
- `api/src/execution/real-nodes/` is empty or removed
- Each pack owns its own node implementations
- The execution engine resolves nodes by querying installed packs

### Phase 3: Resource Engine

**Status:** Not started. Highest architectural priority.

**Goal:** Introduce the universal business object layer.

**Tasks:**

- Create `lados_resources` table with the schema defined in Section 4.4
- Create `ResourceEngine` NestJS service with CRUD, relationship, history, search, and permission hooks
- Create `ResourceModule` and expose via REST API (`/resources`)
- Create the `Change State` node that delegates to the State Engine (which can be a stub at this phase)
- Create Contractor Edition resource types: Customer, Job, Trip, Driver, Vehicle, Equipment, FuelReceipt, MaintenanceRecord, Invoice, Payment, Expense
- Create `Create Resource`, `Update Resource`, `Find Resource`, `Archive Resource` nodes in Foundation Pack
- Emit a `ResourceCreated`, `ResourceUpdated`, `ResourceArchived` event for every mutation (these can write to `audit_log` initially, with the full Event Bus added in Phase 4)

**Acceptance:**
- Contractor Edition resource types can be created, read, updated, and archived
- Resource changes produce auditable records
- Nodes can create and query resources through the engine
- Future resource types (JKR Contract, Variation Order) require no engine changes

### Phase 4: Event Bus

**Status:** Not started. `audit_log` is the seed.

**Goal:** Make every important action observable and replayable.

**Tasks:**

- Create `lados_events` table with the envelope schema in Section 4.5
- Create `EventBus` NestJS service: `publish(event)`, `subscribe(eventType, handler)`, `getHistory(filters)`
- Migrate resource mutation calls in Phase 3 to emit typed events to `lados_events` (in addition to `audit_log`)
- Implement `event-to-notification` handler: selected event types trigger notifications
- Implement `event-to-audit-log` handler: all events produce a human-readable `audit_log` row (replace current direct writes)
- Expose event history API for dashboard and AI context consumption
- Add event/audit viewer UI

**Acceptance:**
- Workflow, resource, state, and approval actions emit typed events
- Events are immutable
- Dashboard widgets and AI context builder can read event history

### Phase 5: State Engine

**Status:** Not started.

**Goal:** Control resource lifecycles through configurable state machines.

**Tasks:**

- Create state machine definition storage (table or pack manifest field)
- Create `StateEngine` NestJS service: `validateTransition`, `executeTransition`, `getHistory`
- Integrate into `ResourceEngine.transitionState()` — all state changes go through the State Engine
- Implement transition guards (permission check, approval requirement)
- Implement transition actions (emit event, create approval task, notify)
- Add state history table per resource instance
- Wire `Change State` node to the real StateEngine (replacing Phase 3 stub)

**Acceptance:**
- Invalid state transitions are blocked
- Transition history is auditable
- Approval-required transitions pause execution
- Contractor resource lifecycles work: Job, Trip, Vehicle, Invoice, Payment

### Phase 6: Security Engine Hardening

**Status:** Auth and membership exist. Permission enforcement is partial.

**Goal:** Provide a declarative, enforceable permission model.

**Tasks:**

- Define permission policies as declarative rules per node type, resource operation, and state transition
- Implement permission policy evaluator in `SecurityEngine` service
- Replace ad-hoc membership assertions with policy evaluator calls
- Add API key support for programmatic access
- Implement Contractor Edition roles: Owner, Admin, Member, Driver, Operator

**Acceptance:**
- Owner can manage users and assign roles
- Drivers see only assigned work
- Restricted workflow, node, and state actions require the declared permission

### Phase 7: Foundation Pack

**Status:** Not started as an installable pack.

**Goal:** Package universal capabilities as the mandatory base pack.

**Tasks:**

- Create `@lados/foundation-pack` with its pack manifest
- Register Foundation resource types: User, Role, Permission, Team, File, Attachment, Comment, Notification, Approval, AuditLog, Tag
- Register Foundation events: UserCreated, FileUploaded, ApprovalRequested, ApprovalGranted, etc.
- Register Foundation nodes: Create Resource, Update Resource, Find Resource, Archive Resource, Change State, Emit Event, Assign User, Upload File, Request Approval, Approve, Reject, Send Notification
- Move NotificationModule capabilities into Foundation Pack
- Move approval task logic into Foundation Pack

**Acceptance:**
- Other packs depend on Foundation instead of reimplementing users, files, approvals, notifications, and AI context
- Foundation permissions are enforced before resource, workflow, node, or state actions execute

### Phase 8: Pack Installer and Registry

**Status:** Pack manifests defined. SQL seeding only. No runtime installer.

**Goal:** Make packs installable at runtime without SQL migration hand-editing.

**Tasks:**

- Implement `PackInstaller` service: accept a manifest, validate dependencies, run migrations, register nodes
- Implement `PackRegistry` service: list installed packs, check compatibility, resolve dependencies
- Implement pack enable/disable lifecycle with state persistence
- Add pack upgrade flow: validate compatibility, run incremental migrations
- Update Pack Registry UI at `/packs` to support install, upgrade, and disable actions

**Acceptance:**
- Foundation, Job, Fleet, Equipment, Finance, HR, Document, Dashboard, and AI packs can be installed and managed without touching SQL directly
- Broken dependencies are blocked

### Phase 9: Contractor Edition Build

**Status:** Not started as an LCE solution (existing QS features are a different scope).

**Goal:** Build the first real LCE-powered solution end-to-end.

**Tasks:**

- Implement Job, Fleet, Equipment, Finance, HR, Dashboard, and AI packs for Contractor Edition
- Implement all Contractor Edition resources through the Resource Engine
- Implement all Contractor Edition workflows through the Workflow Engine
- Implement driver mobile-friendly trip recording flow
- Implement owner assignment and dispatch flow
- Implement fuel receipt upload with AI extraction and human review
- Implement maintenance reminder and service job workflow
- Implement invoice generation from completed trips and equipment hours
- Implement payroll draft calculation with approval flow
- Implement owner dashboard with trips, revenue, fuel, and margin widgets
- Implement AI owner assistant grounded in LCE resource and event context

**Acceptance:**
- Small contractor can run daily operations from one workspace
- All Contractor Edition acceptance criteria in Section 5.6 pass

### Phase 10: AI Runtime Upgrade

**Status:** AiService is a thin wrapper. No context builder, no tool calling, no ledger.

**Goal:** Make AI an engine capability with full LCE context awareness.

**Tasks:**

- Implement AI context builder: assembles resource, workflow, event history, permissions, and available tools into structured context
- Implement prompt template registry
- Implement AI tool calling layer: AI can call `search_resources`, `get_events`, `get_workflow_status`
- Implement AI output ledger: every AI response stored with its source context and resource references
- Implement AI audit log
- Wire owner assistant to the context builder and tool calling layer

**Acceptance:**
- AI answers are grounded in resource and event data, not conversation memory alone
- AI cannot bypass human approvals or permissions
- AI outputs are stored with source references

### Phase 11: Internal Registry Maturity

**Status:** Tables and basic UI exist. No install/upgrade flow.

**Goal:** Make the registry operator-usable.

**Tasks:**

- Implement available pack catalog (packs that can be installed)
- Implement update status indicator (installed version vs. available version)
- Implement dependency graph view
- Implement compatibility warnings for engine version mismatches

**Acceptance:**
- Operators can browse, install, upgrade, and disable packs
- Installed pack versions are traceable

### Phase 12: Async Execution Queue

**Status:** Synchronous in-process runner. Suitable for MVP but not for production.

**Goal:** Move workflow execution to an async queue without changing the runner interface.

**Tasks:**

- Select and integrate a job queue: BullMQ (Redis) or Supabase-native queue
- Wrap `ExecutionService.triggerRun()` to enqueue instead of executing inline
- Add worker process that dequeues and runs workflows
- Add SSE or polling endpoint for the UI to receive execution progress
- Ensure human approval pause/resume works correctly in the async model

**Acceptance:**
- Triggering a workflow returns immediately with a `runId`
- The UI polls or streams progress until completion
- Long-running workflows do not block the API

### Phase 13: LEOS / JKR Layer Preparation

**Status:** Deferred. Kept separate from core delivery.

**Goal:** Document the LEOS/JKR solution without implementing it during LCE V1.

**Tasks:**

- Maintain LEOS/JKR as a separate solution blueprint
- Identify the packs it will need: Project, Tender, BOQ, Contract, Inspection, Payment, Variation, Asset, Archive
- Identify resource types it will introduce
- Confirm that LCE V1 Resource Engine, Event Bus, State Engine, and Security Engine can represent them without change

**Acceptance:**
- LEOS/JKR scope is documented and not mixed into LCE V1 delivery
- The existing QS pack (`qs.read_boq`, etc.) is maintained but not expanded until Contractor Edition proves the engine

---

## 7. Deferred LEOS / JKR Scope

### 7.1 Deferred Resource Types

Reserved for future enterprise and government solution work:

Organisation hierarchy, Portfolio, Programme, Project, Phase, Department, Agency, Consultant, Contractor, Tender, BOQ, Evaluation, Contract, Site instruction, Inspection, Progress claim, Payment certificate, Variation Order, EOT, CPC, DLP, Closing account, Asset, Archive record

### 7.2 Deferred Workflows

Project initiation, Budget approval, Tender preparation, Tender evaluation, Contract award, Construction monitoring, Inspection and NCR, Progress claim assessment, Payment certification, Variation management, EOT management, CPC issuance, DLP defect management, Final account, Asset handover, Records archival

### 7.3 Why Deferred

JKR-scale scope requires 300+ workflows, 800 to 1,500 nodes, complex organisation hierarchy, multi-party approvals, strict audit and archival rules, and government-specific document and payment procedures. This must not be used as the first implementation target.

### 7.4 Non-Negotiable Boundary

LEOS / JKR must be built on top of LCE. It must not fork the engine. The existing QS pack is in scope for LCE V1 maintenance only — no expansion until Contractor Edition is proven.

---

## 8. Implementation Guardrails

### 8.1 Engine Guardrails

- Do not build solution-specific logic into the engine when it belongs in a pack
- Do not duplicate Foundation capabilities inside business packs
- Do not allow nodes to bypass the Resource Engine, Event Bus, State Engine, or Security Engine
- Do not mutate business resources without emitting events
- Do not allow published workflow versions to be silently edited
- Do not allow pack upgrades to break live workflows without a migration plan
- Do not let real node implementations live in the API app — they belong in their packs

### 8.2 AI Guardrails

These are already coded in the current codebase and must never be relaxed:

- AI cannot approve
- AI cannot certify
- AI cannot release payment
- AI cannot create final commercial facts without human acceptance
- AI must preserve source references in operational and commercial answers
- AI output is marked advisory unless accepted by a human workflow step

### 8.3 Contractor Edition Guardrails

- Driver UI must be tap-based and minimal
- Owner UI must prioritise job assignment, trip visibility, maintenance, invoicing, and cash visibility
- Payroll and finance outputs must distinguish Draft, Reviewed, Approved, and Paid states
- Fuel receipt AI extraction must allow human correction before posting
- Dashboard profit estimates must be marked Estimated unless fully reconciled

### 8.4 Async Execution Guardrails

- The `WorkflowRunner` interface must not change when moving to async execution
- Human approval pause/resume must be tested in the async model before production deployment
- Every async run must have a reliable failure and retry path — silent failures are not acceptable

---

## 9. Developer Definition of Done

**For any LCE engine feature:**

- Resource model updated where business objects are involved
- Events emitted for every important action
- State transition rules defined where a lifecycle is involved
- Permission checks implemented at the engine level
- Audit view updated
- Pack or node manifest updated where applicable
- Tests or smoke checks added for runtime behaviour
- AI context impact considered where the feature creates useful knowledge
- Documentation updated in the appropriate LCE section

**For any Contractor Edition feature:**

- Owner flow is complete
- Driver or operator flow is complete where applicable
- Resource, event, state, and security behaviour is wired through LCE — not around it
- Dashboard impact is considered
- Invoice, payroll, and finance outputs are clearly Draft, Reviewed, Approved, or Paid
- AI behaviour is grounded and advisory

**For any node implementation:**

- Node lives in its pack, not in the API module
- Inputs and outputs are schema-validated
- Config schema is declared in the node manifest
- Node emits the events it declares in its manifest
- Node cannot bypass permission or approval guards

---

## 10. Scale Targets

### 10.1 LCE V1

| Area | Target |
| --- | --- |
| Engine modules | 80 to 150 |
| NestJS services | 30 to 60 |
| REST API endpoints | 150 to 300 |
| UI components | 150 to 250 |
| Core nodes (Foundation) | 20 to 30 |
| Total nodes across packs | 80 to 120 |
| System packs | 10 to 20 |

### 10.2 Contractor Edition

| Area | Target |
| --- | --- |
| Workflows | 40 to 70 |
| Nodes (all packs) | 100 to 200 |
| Resource types | 15 to 25 |
| Dashboards | 5 to 10 |

### 10.3 Future LEOS / JKR

| Area | Target |
| --- | --- |
| Workflows | 300+ |
| Nodes | 800 to 1,500 |
| Resource types | 80+ |

The engine must not grow linearly with solution complexity. Solutions grow through reused nodes, packs, states, resources, and workflow templates. The engine stays compact.

---

## 11. Documentation Library Structure

```
docs/
  LCE_V1/
    01_Introduction.md
    02_Architecture.md
    03_Workflow_Engine.md
    04_Node_System.md
    05_Pack_System.md
    06_Resource_Engine.md
    07_Event_Bus.md
    08_State_Engine.md
    09_Security_Engine.md
    10_AI_Runtime.md
    11_Foundation_Pack.md
    12_Internal_Registry.md
    13_UI_Framework.md
    14_Async_Execution.md
    15_API_Reference.md
    16_Testing.md
  Contractor_Edition/
    01_Overview.md
    02_Resources.md
    03_Workflows.md
    04_Packs.md
    05_Driver_Flow.md
    06_Owner_Flow.md
  LEOS/
    01_Deferred_Blueprint.md
```

Existing document mapping:

| Existing document | New home |
| --- | --- |
| Lados_Core_Engine_V1_Implementation_Blueprint.md | docs/LCE_V1/02_Architecture.md |
| Workflow specifications | docs/LCE_V1/03_Workflow_Engine.md |
| Node SDK | docs/LCE_V1/04_Node_System.md |
| @lados/pack-sdk types | docs/LCE_V1/05_Pack_System.md |
| Resource Engine design | docs/LCE_V1/06_Resource_Engine.md |
| Event Bus design | docs/LCE_V1/07_Event_Bus.md |
| State Engine design | docs/LCE_V1/08_State_Engine.md |
| Supabase migrations | docs/LCE_V1/15_API_Reference.md |

---

## 12. Immediate Next Actions

In priority order:

1. Execute Phase 0: rename `@qsos/` → `@lados/`, update UI identity to Lados
2. Execute Phase 1: replace auto-approve with real pause/resume in `core.human_approval`; add job queue for async execution
3. Execute Phase 2: move real node implementations from `api/src/execution/real-nodes/` into their respective packs
4. Begin Phase 3: design and build `lados_resources` table and `ResourceEngine` service
5. Model Contractor Edition resource types against the Resource Engine schema before writing any pack code

---

## 13. Final Position

```
LCE is the engine.
Packs are the domain vocabulary.
Solutions are pack compositions.
Contractor Edition proves the engine.
LEOS / JKR proves it scales.
```

The implementation sequence is:

```
Phase 0  — Identity: @lados/, Lados branding
Phase 1  — Workflow Engine: real approvals, async execution, immutable versions
Phase 2  — Node Isolation: nodes move into packs
Phase 3  — Resource Engine: first-class business objects
Phase 4  — Event Bus: typed, immutable, subscribable
Phase 5  — State Engine: configurable lifecycle enforcement
Phase 6  — Security Engine: declarative permission policies
Phase 7  — Foundation Pack: universal capabilities packaged
Phase 8  — Pack Installer: runtime install, upgrade, enable, disable
Phase 9  — Contractor Edition: first real solution
Phase 10 — AI Runtime: context-aware, tool-calling, auditable
Phase 11 — Registry: operator-grade pack management
Phase 12 — Async Execution Queue: production-grade runner
Phase 13 — LEOS / JKR Blueprint: documented, not built
```

This order means the engine is solid before the solution is built, and the solution validates the engine before enterprise-scale complexity is introduced.
