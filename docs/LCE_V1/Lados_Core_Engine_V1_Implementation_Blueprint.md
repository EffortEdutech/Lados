# Lados Core Engine V1 - Implementation Blueprint

Date: 2026-06-20

Source note: This blueprint restructures the raw Lados V3/LCE discussion captured in `QS-WFUI/docs/raw/Lados_Core_Engine.md` into an implementation document.

## 1. Purpose

Lados Core Engine V1, or LCE V1, is the frozen architecture direction for what was previously called Lados Version 3.

Frozen does not mean development stops. It means the product identity, scope, and architectural target are now locked:

- LCE is the reusable engine.
- Solutions are built on top of LCE.
- Contractor Edition is the first real validation solution.
- LEOS, JKR, and full enterprise government workflows are deferred solution layers, not part of the first engine build.

The purpose of this document is to tell developers what to build from the current V3 direction:

```text
Lados Core Engine V1
  = Workflow Engine
  + Pack System
  + Node System
  + Resource Engine
  + Event Bus
  + State Engine
  + Security Engine
  + Foundation Pack
  + AI-ready runtime context
  + Internal pack/node registry
```

The minimum successful product is not a full ERP and not a JKR-scale platform. The minimum successful product is a reusable workflow engine with one working Contractor Edition solution.

## 2. Executive Summary

Lados should be treated as a software platform rather than a single business application.

Traditional ERP thinking:

```text
ERP
  -> Modules
  -> Screens
```

Lados thinking:

```text
Engine
  -> Packs
  -> Resources
  -> Workflows
  -> Nodes
  -> Screens
```

The screen is the last expression of the system. The workflow is the product, and the engine provides the reusable capabilities that every solution depends on.

The first proof case is intentionally small:

- 1 owner
- 3 tipper lorries
- 3 drivers
- 1 backhoe
- optional admin later

This is the correct validation case because it proves whether LCE can support a real small enterprise without forcing them into ERP complexity.

## 3. Architecture Decisions

### 3.1 Locked Product Direction

| Decision | Locked Direction |
| --- | --- |
| Product name | Lados Core Engine |
| Short name | LCE |
| First architecture version | LCE V1 |
| Former name | Lados Version 3 |
| First validation solution | Contractor Edition |
| Deferred enterprise layer | LEOS / JKR / V4 |

The name "V3" should be retired from product-facing documentation after the transition. It may remain only in historical migration notes.

### 3.2 Engine Before Solution

LCE must be implemented as a reusable engine. Fleet, finance, payroll, procurement, and project workflows must not be built as one-off application modules where reusable engine capabilities would be more appropriate.

The design question changes from:

```text
How do we build fleet management?
```

to:

```text
What reusable engine capability does fleet management need?
```

### 3.3 Solutions Are Pack Compositions

A solution is a configured composition of packs, resources, workflows, states, nodes, UI surfaces, permissions, and AI tools.

Examples:

| Solution | Likely Packs |
| --- | --- |
| Contractor Edition | Foundation, Job, Fleet, Equipment, Finance, HR, Document, Dashboard, AI |
| Logistics Edition | Foundation, Job, Fleet, Dispatch, Finance, Maintenance, Dashboard, AI |
| Procurement Edition | Foundation, Procurement, Approval, Finance, Document, Dashboard, AI |
| LEOS / JKR | Foundation, Project, Tender, BOQ, Contract, Inspection, Payment, Variation, Asset, Archive |

### 3.4 Resources Are First-Class Objects

LCE must not treat workflow payloads as loose JSON only. Business objects must be modeled as Resources.

Examples:

- Customer
- Job
- Trip
- Driver
- Vehicle
- Backhoe
- Invoice
- Payment
- Document
- Project
- Contract
- Claim
- Variation Order
- Payment Certificate
- Asset

Nodes should create, update, read, search, lock, archive, relate, and transition Resources.

### 3.5 Events Are Mandatory

Every important action must emit an event. Events are the basis for audit, dashboards, notifications, automation, AI context, and future replay.

Examples:

- WorkflowStarted
- WorkflowCompleted
- NodeExecuted
- ResourceCreated
- ResourceUpdated
- ApprovalRequested
- ApprovalGranted
- ApprovalRejected
- DocumentUploaded
- TripCompleted
- InvoiceGenerated
- PaymentReceived
- ProjectArchived

### 3.6 States Are Configurable

Enterprise software is not only about storing data. It is about controlling valid movement from one state to another.

State machines must be configurable per resource type.

Example invoice lifecycle:

```text
Draft -> Submitted -> Verified -> Approved -> Paid -> Archived
```

Example vehicle lifecycle:

```text
Available -> Assigned -> In Service -> Maintenance -> Retired
```

Example future JKR project lifecycle:

```text
Initiated -> Approved -> Tendering -> Awarded -> Construction -> Completed -> DLP -> Closed -> Archived
```

### 3.7 AI Is Runtime-Aware, Not a Side Chatbot

AI must understand the current runtime context:

- current user
- current organisation
- current workflow
- current resource
- current resource state
- current event history
- permissions
- available tools
- available nodes
- available documents

AI output remains advisory unless a human-approved workflow step accepts it.

### 3.8 LEOS / JKR Is Deferred

JKR-scale scope proves that the architecture can scale, but it should not be the first implementation.

The correct layering is:

```text
LCE
  -> Contractor Edition
  -> Mature Project / Procurement / Finance packs
  -> LEOS / JKR blueprint
```

## 4. Engine Modules

### 4.1 Workflow Engine

Purpose:

Orchestrate workflow templates, workflow instances, node execution, manual steps, approval steps, event triggers, scheduled triggers, retries, errors, and execution history.

Minimum capabilities:

- Workflow template
- Workflow instance
- Workflow version
- Execution context
- Node execution
- Pause
- Resume
- Cancel
- Retry
- Error handling
- Execution log
- Manual step
- Approval step
- Scheduled trigger
- Event trigger

Acceptance criteria:

- A workflow can be designed, saved, versioned, published, instantiated, and executed.
- Running executions bind to immutable workflow versions.
- Failed nodes produce inspectable failure state and can be retried where safe.
- Manual and approval steps pause execution until an authorized human acts.

### 4.2 Node System

Purpose:

Provide reusable action units that can be installed, configured, tested, versioned, and executed by workflows.

Minimum node contract:

- Node ID
- Node name
- Node category
- Inputs
- Outputs
- Config schema
- Validation rules
- Execution function
- Error handling
- Required permissions
- Events emitted
- UI config form
- Test cases
- Version

Initial universal node catalog:

| Node | Purpose |
| --- | --- |
| Create Resource | Create a typed resource instance |
| Update Resource | Update allowed fields on a resource |
| Find Resource | Search or load resources |
| Delete Resource | Delete where policy allows |
| Archive Resource | Archive without hard deletion |
| Upload File | Attach a document or photo |
| Generate PDF | Produce a document output |
| Send Notification | Notify a user or role |
| Request Approval | Create an approval task |
| Approve | Record an approval decision |
| Reject | Record a rejection decision |
| Assign User | Assign owner/operator/reviewer |
| Create Task | Create a human task |
| Change State | Transition a resource state |
| Emit Event | Emit a typed event |
| Wait | Pause until time/event condition |
| Condition | Branch based on rule |
| Loop | Iterate through a list safely |
| Call API | Call an allowlisted integration |
| AI Analyze | Analyze records/documents |
| AI Extract | Extract structured data |
| AI Summarize | Summarize resource/event/document context |

Acceptance criteria:

- Nodes are reusable across solutions.
- Node inputs and outputs are schema-validated.
- Node execution is auditable.
- Nodes cannot bypass permissions or human approval guards.

### 4.3 Pack System

Purpose:

Allow LCE capabilities to be packaged as installable, versioned, dependency-aware packs.

Minimum pack manifest:

```json
{
  "packKey": "foundation-pack",
  "name": "Foundation Pack",
  "version": "1.0.0",
  "engineCompatibility": ">=1.0.0 <2.0.0",
  "resources": [],
  "nodes": [],
  "workflows": [],
  "permissions": [],
  "events": [],
  "states": [],
  "uiComponents": [],
  "dependencies": [],
  "migrations": []
}
```

Minimum capabilities:

- Pack manifest validation
- Pack installer
- Pack registry
- Pack dependency resolver
- Pack versioning
- Pack enable / disable
- Pack migration runner
- Pack compatibility checks

Acceptance criteria:

- A pack can declare resources, nodes, workflows, permissions, events, states, UI components, dependencies, and migrations.
- Installed packs are visible in an internal registry.
- Pack upgrades create controlled migration plans, not silent breaking changes.

### 4.4 Resource Engine

Purpose:

Provide a universal business object layer for all solutions.

Minimum capabilities:

- Resource type registry
- Resource schema
- Resource instance
- Resource CRUD API
- Resource relationship graph
- Resource history
- Resource search
- Resource attachment
- Resource permission hook
- Resource state hook
- Resource event emission

Core resource fields:

| Field | Purpose |
| --- | --- |
| id | Stable resource identifier |
| tenantId / organisationId | Access boundary |
| resourceType | Type such as Vehicle, Driver, Invoice |
| resourceKey | Human-readable or generated key |
| title | Display title |
| status | Current high-level status |
| state | State-machine state |
| data | Typed payload |
| relationships | Links to other resources |
| createdBy | User who created it |
| createdAt | Creation timestamp |
| updatedAt | Last update timestamp |
| archivedAt | Archive timestamp if any |

Acceptance criteria:

- Contractor resources such as Customer, Job, Trip, Driver, Vehicle, Backhoe, Fuel Receipt, Invoice, and Payment can be represented.
- Future JKR resources such as Project, Contract, Claim, VO, CPC, DLP, and Closing Account can be represented without changing the engine.
- Resource changes produce events.

### 4.5 Event Bus

Purpose:

Record and distribute important facts from workflows, resources, states, approvals, AI, and integrations.

Minimum capabilities:

- Event table
- Event publisher
- Event subscriber
- Event handler registry
- Event filtering
- Event replay support
- Event audit view
- Event-to-notification bridge
- Event-to-dashboard projection
- Event-to-AI-context feed

Event envelope:

```json
{
  "eventId": "uuid",
  "eventType": "TripCompleted",
  "eventVersion": "1.0.0",
  "tenantId": "uuid",
  "actorType": "user",
  "actorId": "uuid",
  "resourceType": "Trip",
  "resourceId": "uuid",
  "workflowId": "uuid",
  "nodeId": "uuid",
  "payload": {},
  "correlationId": "uuid",
  "causationId": "uuid",
  "occurredAt": "timestamp"
}
```

Acceptance criteria:

- Every workflow execution and meaningful resource mutation emits an event.
- Events are immutable.
- Dashboards and AI can read event history.
- Notifications can subscribe to selected event types.

### 4.6 State Engine

Purpose:

Control valid state transitions for resources and workflow objects.

Minimum capabilities:

- State machine definition
- Allowed transitions
- Transition guards
- Transition actions
- Approval-based transitions
- State history
- State-based permissions
- Event emission on transition

State machine definition example:

```json
{
  "resourceType": "Invoice",
  "states": ["Draft", "Submitted", "Verified", "Approved", "Paid", "Archived"],
  "transitions": [
    { "from": "Draft", "to": "Submitted", "permission": "invoice.submit" },
    { "from": "Submitted", "to": "Verified", "permission": "invoice.verify" },
    { "from": "Verified", "to": "Approved", "permission": "invoice.approve" },
    { "from": "Approved", "to": "Paid", "permission": "payment.record" },
    { "from": "*", "to": "Archived", "permission": "resource.archive" }
  ]
}
```

Acceptance criteria:

- Invalid transitions are blocked.
- Transition history is auditable.
- Approval-required transitions create approval tasks.
- State changes emit events.

### 4.7 Security Engine

Purpose:

Provide authentication, authorization, auditability, and future tenant readiness without overbuilding full enterprise multi-tenancy on day one.

Minimum capabilities:

- Authentication
- Users
- Roles
- Permissions
- Teams
- Organisation / tenant awareness
- Resource-level access
- Workflow-level access
- Node-level access
- Audit log
- API keys
- Permission policy evaluation

Minimum identity fields:

- organisationId / tenantId
- userId
- roleId
- teamId
- permission policy
- audit trail

Acceptance criteria:

- A small contractor can run with Owner, Driver, Operator, and Admin roles.
- Future enterprise users can be scoped by organisation, department, project, package, or vendor.
- Users cannot execute nodes or transitions without required permission.

### 4.8 AI Runtime

Purpose:

Make AI an engine capability that reads resources, events, workflows, documents, permissions, and available tools.

Minimum capabilities:

- AI provider interface
- Prompt template registry
- Context builder
- Tool calling layer
- Resource search tool
- Workflow execution tool
- Document understanding tool
- AI node type
- AI output ledger
- AI audit log
- Human review boundary for commercial decisions

Owner assistant example:

User asks:

```text
How many trips today?
```

AI reads:

- Trip resources
- Driver resources
- Vehicle resources
- Job resources
- TripCompleted events
- Fuel receipt resources

AI can answer:

```text
Today: 9 trips, estimated revenue RM5,200, fuel RM630, estimated gross margin RM2,700.
```

Acceptance criteria:

- AI responses are grounded in resources/events where possible.
- AI cannot approve, certify, pay, or execute restricted commercial actions.
- AI outputs are stored with context and source references.

### 4.9 Marketplace / Internal Registry

Purpose:

Start with an internal registry that later evolves into a full marketplace.

Minimum capabilities:

- Installed packs
- Available packs
- Installed nodes
- Workflow templates
- Pack versions
- Dependencies
- Update status
- Enable / disable
- Compatibility checks

Acceptance criteria:

- Internal packs and nodes are discoverable.
- Installed versions are traceable.
- Broken dependencies are blocked.
- The registry can later become a public marketplace without redesigning the engine.

### 4.10 UI Framework

Purpose:

Provide the shared UI surfaces needed by engine and solution packs.

Minimum surfaces:

- Dashboard
- Workflow designer
- Workflow execution view
- Resource list
- Resource detail
- Node configuration panel
- Pack registry
- Event/audit viewer
- Approval inbox
- Notification center
- AI assistant panel

Acceptance criteria:

- A pack can contribute UI components without forking the shell.
- Screens remain workflow/resource-driven rather than hardcoded to one solution.

## 5. Foundation Pack

### 5.1 Purpose

The Foundation Pack is mandatory for every solution. It prevents every business pack from rebuilding common functionality.

Every other pack depends on Foundation.

```text
Foundation Pack
  -> Fleet Pack
  -> Job Pack
  -> Equipment Pack
  -> Finance Pack
  -> HR Pack
  -> Procurement Pack
  -> Project Pack
```

### 5.2 Foundation Capabilities

| Capability | Purpose |
| --- | --- |
| Authentication | Sign in, session, identity |
| Users | User records and profiles |
| Roles | Role definitions |
| Permissions | Permission policies |
| Teams | Grouping of users |
| Resources | Shared resource engine access |
| Events | Shared event bus access |
| Files | File and document storage |
| Attachments | Link files to resources/events |
| Comments | Discussion on resources/workflows |
| Notifications | User and role notifications |
| Approvals | Approval task model |
| Audit Logs | Human-readable event projection |
| Search | Cross-resource search |
| Settings | Organisation and pack settings |
| Localization | Language and region settings |
| Tags / Labels | Classification and filtering |
| Dashboards | Shared dashboard widgets |
| Reports | Shared report/export shell |
| AI Context | Standard AI context builder inputs |

### 5.3 Foundation Resource Types

Initial resource types:

- User
- Role
- Permission
- Team
- File
- Attachment
- Comment
- Notification
- Approval
- AuditLog
- Tag
- Report
- SavedSearch
- AIContextSnapshot

### 5.4 Foundation Events

Initial event types:

- UserCreated
- UserInvited
- RoleAssigned
- PermissionGranted
- PermissionRevoked
- FileUploaded
- AttachmentLinked
- CommentAdded
- NotificationSent
- ApprovalRequested
- ApprovalGranted
- ApprovalRejected
- ResourceArchived
- ReportGenerated
- AIContextBuilt

### 5.5 Acceptance Criteria

- Every pack can use Foundation users, files, approvals, notifications, audit logs, and AI context.
- Foundation permissions are enforced before resource, workflow, node, or state actions run.
- Foundation events are visible in the event/audit viewer.

## 6. Contractor Edition MVP

### 6.1 Purpose

Contractor Edition is the first validation solution for LCE V1.

It should support a small contractor/logistics operation:

- 1 owner
- 3 tipper lorries
- 3 drivers
- 1 backhoe
- optional admin later

The owner should open one application and run daily operations without ERP complexity.

### 6.2 Workspace Navigation

Initial navigation:

```text
Lados Contractor Edition
  -> Dashboard
  -> Jobs
  -> Fleet
  -> Drivers
  -> Equipment
  -> Customers
  -> Finance
  -> Documents
  -> AI Assistant
```

### 6.3 Required Packs

| Pack | Scope |
| --- | --- |
| Foundation Pack | Users, roles, files, approvals, audit, notifications, AI context |
| Job Pack | Customers, jobs, trips, scheduling |
| Fleet Pack | Vehicles, drivers, maintenance, fuel |
| Equipment Pack | Backhoe, operator, hours, maintenance |
| Finance Pack | Quotations, invoices, payments, expenses |
| HR Pack | Attendance, payroll inputs, leave, allowances |
| Document Pack | Upload, OCR, PDF, photos |
| Dashboard Pack | Owner dashboard and operational metrics |
| AI Pack | Owner assistant and document extraction |

### 6.4 Core Resources

| Resource | Description |
| --- | --- |
| Customer | Party requesting transport/equipment service |
| Job | Work order for transport, material, or equipment |
| Trip | One completed transport cycle |
| Driver | Driver profile, assignment, attendance |
| Vehicle | Tipper lorry profile and lifecycle |
| Equipment | Backhoe or other plant |
| Operator | Equipment operator assignment |
| FuelReceipt | Fuel expense evidence |
| MaintenanceRecord | Vehicle/equipment service event |
| Invoice | Billing document |
| Payment | Customer payment record |
| Expense | Other operating expense |
| PayrollRun | Salary calculation period |
| Document | Uploaded document/photo |

### 6.5 Core Workflows

#### Workflow 1: Customer Calls

Customer requests service, for example:

```text
Need two lorries tomorrow at 8 AM.
```

Owner creates a Job with:

- Customer
- Location
- Material
- Rate
- Start time
- Expected trips

LCE creates:

- Job resource
- Transport tasks
- Driver assignment tasks
- Vehicle assignment tasks
- JobCreated event

#### Workflow 2: Assign Lorries

Owner assigns:

- Lorry 1 to Driver Ali
- Lorry 2 to Driver Ahmad

Drivers receive:

- Today's job
- Destination
- Navigation link
- Customer contact

Events:

- VehicleAssigned
- DriverAssigned
- DriverNotified

#### Workflow 3: Driver Trip Execution

Driver flow:

```text
Start Shift -> Navigate -> Arrive -> Load -> Unload -> Trip Complete
```

Every tap creates an event.

Events:

- ShiftStarted
- DriverArrived
- LoadConfirmed
- UnloadConfirmed
- TripCompleted

#### Workflow 4: Backhoe Work

Owner adds equipment to a job:

- Backhoe
- Operator
- Working hours

LCE tracks:

- Operating hours
- Fuel
- Maintenance
- Utilization

Events:

- EquipmentAssigned
- EquipmentWorkStarted
- EquipmentHoursRecorded
- EquipmentWorkCompleted

#### Workflow 5: Trip Counting

Driver records trips:

```text
Trip 1
Trip 2
Trip 3
Trip 4
```

Owner sees live trip count:

```text
Ali: 7 trips completed
```

Events:

- TripCountIncremented
- TripCompleted

#### Workflow 6: Maintenance

Vehicle and equipment records track:

- Mileage
- Oil change
- Tyres
- Insurance
- Road tax
- Service due date

When due:

```text
Notification -> Approve -> Create Service Job
```

Events:

- MaintenanceDueDetected
- MaintenanceApproved
- ServiceJobCreated
- MaintenanceCompleted

#### Workflow 7: Fuel

Driver uploads receipt.

AI extracts:

- Amount
- Station
- Date
- Vehicle

Events:

- FuelReceiptUploaded
- AIFuelReceiptExtracted
- FuelExpenseRecorded

Human review remains required where the extraction affects accounts.

#### Workflow 8: Salary

Salary Pack reads:

- Trips
- Hours
- Overtime
- Allowances
- Attendance

Calculates:

- Gross salary
- EPF
- SOCSO
- Net pay

Events:

- PayrollDraftGenerated
- PayrollReviewed
- PayrollApproved

#### Workflow 9: Invoice

When a customer job is complete, owner presses Generate Invoice.

LCE already knows:

- Trips
- Rate
- Equipment hours
- Extra charges

Events:

- InvoiceDraftGenerated
- InvoiceIssued
- PaymentReceived

#### Workflow 10: AI Owner Assistant

Owner asks:

- How many trips today?
- Which lorry earns the most?
- Which driver is always late?
- What is today's fuel cost?
- Which jobs are not invoiced yet?

AI reads resources and events, then answers with source-aware operational summaries.

### 6.6 Contractor Edition MVP Acceptance Criteria

- Owner can create jobs and assign vehicles/drivers.
- Driver can execute trips with minimal taps.
- Trip counts update live for the owner.
- Backhoe work can be tracked by hours.
- Fuel receipt upload creates an extractable resource.
- Maintenance reminders can create service jobs.
- Invoices can be generated from completed trips and equipment hours.
- Dashboard can show trips, revenue, fuel, and estimated margin.
- AI assistant answers from Resources and Events, not from loose conversation memory.

## 7. Implementation Sequence

### Phase 0: Documentation And Naming Freeze

Goal:

Rename the architecture direction and establish LCE V1 as the target.

Tasks:

- Update documentation terminology from Lados V3 to Lados Core Engine / LCE V1.
- Create the LCE documentation library structure.
- Map existing V3 documents into LCE sections.
- Keep legacy names only in historical notes.

Acceptance:

- Developers know that LCE V1 is the engine target.
- V4/LEOS/JKR is not confused with the current implementation scope.

### Phase 1: Stabilize Existing V3 Runtime

Goal:

Complete the existing workflow, node, pack, and runtime foundation before adding larger platform concepts.

Tasks:

- Stabilize workflow designer.
- Stabilize workflow runtime.
- Stabilize node system.
- Stabilize pack system.
- Stabilize execution engine.
- Stabilize canvas UI.
- Stabilize node configuration panel.
- Stabilize workflow save/load.
- Stabilize workflow execution history.

Acceptance:

- A workflow can be designed and executed end to end.
- Runtime logs are visible.
- Existing node/pack concepts are not theoretical.

### Phase 2: Resource Engine

Goal:

Introduce first-class business objects.

Tasks:

- Implement resource type registry.
- Implement resource schema storage.
- Implement resource CRUD API.
- Implement resource relationship model.
- Implement resource history.
- Implement resource search.
- Implement attachments.
- Implement permission hooks.
- Emit resource events.

Acceptance:

- Contractor resources can be created and queried.
- Resource changes are auditable.
- Nodes can create/update resources through the engine.

### Phase 3: Event Bus

Goal:

Make every important action observable and auditable.

Tasks:

- Implement event table.
- Implement event publisher.
- Implement subscriber/handler registry.
- Implement event filtering.
- Implement event audit view.
- Implement event-to-notification bridge.
- Implement event-to-dashboard projection.

Acceptance:

- Workflow, resource, state, approval, document, and AI actions emit typed events.
- Events are immutable.
- Dashboard and AI context can consume events.

### Phase 4: State Engine

Goal:

Control resource lifecycles through configurable state machines.

Tasks:

- Implement state machine definitions.
- Implement transition rules.
- Implement transition guards.
- Implement transition actions.
- Implement approval-based transitions.
- Implement state history.
- Implement state-based permissions.

Acceptance:

- Invalid state transitions are blocked.
- State transitions create events and audit entries.
- Contractor resource lifecycles work for Job, Trip, Vehicle, Invoice, and Payment.

### Phase 5: Security Engine

Goal:

Provide the minimum secure operating model for small businesses and future enterprise expansion.

Tasks:

- Implement users, roles, permissions, teams.
- Implement organisation/tenant awareness.
- Implement resource-level access.
- Implement workflow-level access.
- Implement node-level access.
- Implement audit log.
- Implement API key foundations.

Acceptance:

- Owner can manage users.
- Drivers only see assigned work.
- Restricted workflow/node/state actions require permission.

### Phase 6: Foundation Pack

Goal:

Package universal capabilities as the mandatory base pack.

Tasks:

- Create Foundation Pack manifest.
- Register Foundation resources.
- Register Foundation events.
- Register Foundation nodes.
- Register Foundation permissions.
- Register Foundation UI surfaces.

Acceptance:

- Other packs depend on Foundation instead of reimplementing users, files, approvals, audit, notifications, and AI context.

### Phase 7: Node SDK And Core Node Catalog

Goal:

Standardize reusable node development.

Tasks:

- Define node manifest.
- Define input/output schema rules.
- Define config schema rules.
- Define executor contract.
- Define UI config form contract.
- Define event emission contract.
- Define node test contract.
- Register universal node catalog.

Acceptance:

- A developer can build a reusable node against a stable SDK.
- Universal nodes work across Contractor Edition and future solutions.

### Phase 8: Pack SDK And Registry

Goal:

Standardize pack development, installation, versioning, and dependencies.

Tasks:

- Define pack manifest.
- Implement pack installer.
- Implement pack registry.
- Implement dependency resolver.
- Implement version compatibility checks.
- Implement migration runner.
- Implement enable/disable lifecycle.

Acceptance:

- Foundation, Job, Fleet, Equipment, Finance, HR, Document, Dashboard, and AI packs can be registered and installed.

### Phase 9: Contractor Edition MVP

Goal:

Build the first real LCE-powered solution.

Tasks:

- Implement Contractor resource types.
- Implement Contractor workflows.
- Implement Contractor dashboard.
- Implement driver mobile-simple flow or responsive driver screen.
- Implement owner assignment flow.
- Implement fuel receipt upload and AI extraction.
- Implement maintenance reminder flow.
- Implement invoice generation flow.
- Implement AI owner assistant.

Acceptance:

- A small contractor can run daily jobs, trips, fuel, maintenance, invoices, and dashboard from one workspace.

### Phase 10: AI Runtime

Goal:

Make AI context-aware and tool-aware inside the engine.

Tasks:

- Implement provider interface.
- Implement prompt registry.
- Implement context builder.
- Implement resource search tool.
- Implement workflow execution tool.
- Implement document understanding tool.
- Implement AI node type.
- Implement AI output ledger.
- Implement AI audit log.

Acceptance:

- AI answers are grounded in resource/event/workflow/document context.
- AI cannot bypass human approvals or permissions.

### Phase 11: Marketplace / Internal Registry

Goal:

Prepare pack and node distribution without launching a public marketplace yet.

Tasks:

- Implement available pack catalog.
- Implement installed pack registry.
- Implement installed node registry.
- Implement workflow template registry.
- Implement update status.
- Implement enable/disable controls.

Acceptance:

- Internal packs can be installed, upgraded, inspected, and disabled safely.

### Phase 12: Prepare LEOS / JKR Layer Later

Goal:

Capture enterprise/government architecture without polluting LCE V1 implementation.

Tasks:

- Keep LEOS/JKR as a separate blueprint.
- Identify required packs and resource types.
- Reuse LCE Resource, Event, State, Security, Workflow, Node, Pack, and AI engines.
- Do not implement JKR workflows until Contractor Edition proves the engine.

Acceptance:

- LEOS/JKR scope is documented but not mixed into core engine delivery.

## 8. Deferred LEOS / JKR Scope

### 8.1 Deferred Resource Types

The following should be reserved for future enterprise/government solution work:

- Organisation hierarchy
- Portfolio
- Programme
- Project
- Phase
- Department
- Agency
- Consultant
- Contractor
- Tender
- BOQ
- Evaluation
- Contract
- Site instruction
- Inspection
- Progress claim
- Payment certificate
- Variation Order
- EOT
- CPC
- DLP
- Closing account
- Asset
- Archive record

### 8.2 Deferred Workflows

Deferred workflows include:

- Project initiation
- Budget approval
- Tender preparation
- Tender evaluation
- Contract award
- Construction monitoring
- Inspection and NCR
- Progress claim assessment
- Payment certification
- Variation management
- EOT management
- CPC issuance
- DLP defect management
- Final account
- Asset handover
- Records archival

### 8.3 Why Deferred

JKR-scale scope may require:

- 300+ workflows
- 800 to 1,500 nodes
- complex organisation hierarchy
- multi-party approvals
- strict audit and archival rules
- government-specific document and payment procedures

This should not be used as the first implementation target. It should validate engine scalability after LCE and Contractor Edition are working.

### 8.4 Non-Negotiable Boundary

LEOS / JKR must be built on top of LCE. It must not fork the engine.

## 9. Documentation Library Structure

Recommended Lados documentation library:

```text
Lados Documentation
  01 LCE Architecture
  02 LCE Runtime
  03 LCE SDK
  04 LCE Platform
  05 LCE Intelligence
  06 LCE Ecosystem
  07 LCE Reference
  20 Contractor Edition
  30 RAFIQ
  40 Procurement
  50 LEOS
```

Detailed documentation sections:

```text
01 Introduction
02 Architecture
03 Runtime
04 Workflow Engine
05 Resource Engine
06 Event System
07 State Engine
08 Security
09 AI Runtime
10 SDK
11 Marketplace
12 API
13 UI Framework
14 Storage
15 Deployment
16 Testing
17 Reference
```

Existing V3 document mapping:

| Existing Document | New Home |
| --- | --- |
| Core Blueprint | LCE Architecture |
| Workflow Specification | Workflow Engine |
| Node SDK | LCE SDK / Node SDK |
| Node Developer Guide | LCE Reference |
| Runtime Specification | LCE Runtime |
| UI Specification | UI Framework |
| Figma Build Pack | UI Framework Reference |
| Resource Engine draft | Resource Engine |
| Event Bus draft | Event System |
| State Engine draft | State Engine |
| Security Engine draft | Security / Platform |
| AI Runtime draft | Intelligence |
| Marketplace draft | Ecosystem |

## 10. Scale Targets

These are planning numbers, not hard limits.

### 10.1 LCE V1

| Area | Target Range |
| --- | --- |
| Engine modules | 80 to 150 |
| Classes/services | 500 to 800 |
| APIs | 200 to 400 |
| UI components | 150 to 250 |
| Reusable core nodes | 80 to 120 |
| System packs | 20 to 40 |

### 10.2 Contractor Edition

| Area | Target Range |
| --- | --- |
| Workflows | 40 to 70 |
| Nodes | 100 to 200 |
| Core resources | 15 to 30 |
| Operational dashboards | 5 to 10 |

### 10.3 Future JKR / LEOS

| Area | Target Range |
| --- | --- |
| Workflows | 300+ |
| Nodes | 800 to 1,500 |
| Resource types | 80+ |
| Approval/state models | Many, solution-specific |

The engine should not grow linearly with solution complexity. Solutions grow through reused nodes, packs, states, resources, and workflow templates.

## 11. Implementation Guardrails

### 11.1 Engine Guardrails

- Do not build solution-specific logic into the engine when it belongs in a pack.
- Do not duplicate Foundation capabilities inside business packs.
- Do not allow nodes to bypass Resource Engine, Event Bus, State Engine, or Security Engine.
- Do not mutate important business resources without events.
- Do not allow published workflow versions to be silently changed.
- Do not allow pack upgrades to rewrite live workflows silently.

### 11.2 AI Guardrails

- AI cannot approve.
- AI cannot certify.
- AI cannot release payment.
- AI cannot create final commercial facts without human acceptance where required.
- AI must preserve source references where it gives operational or commercial conclusions.
- AI output must be marked advisory unless accepted by a human workflow step.

### 11.3 Contractor Edition Guardrails

- Driver UI must be simple and tap-based.
- Owner UI must prioritize job assignment, trip visibility, maintenance, invoicing, and cash visibility.
- Payroll and finance outputs must distinguish draft, reviewed, approved, and paid states.
- Fuel receipt AI extraction must allow human correction.
- Dashboard profit estimates must be marked estimated unless fully reconciled.

## 12. Developer Definition Of Done

For any LCE feature:

- Resource model updated where business objects are involved.
- Events emitted for important actions.
- State transition rules defined where lifecycle is involved.
- Permission checks implemented.
- Audit view/projection updated.
- Pack or node manifest updated where applicable.
- Tests or smoke checks added for runtime behavior.
- AI context impact considered where the feature creates useful knowledge.
- Documentation updated in the appropriate LCE section.

For any Contractor Edition feature:

- Owner flow is complete.
- Driver/operator flow is complete where applicable.
- Resource/event/state/security behavior is wired through LCE.
- Dashboard impact is considered.
- Invoice/payroll/finance outputs are clearly draft/reviewed/approved/paid.
- AI behavior is grounded and advisory.

## 13. Immediate Next Actions

1. Accept this blueprint as the working LCE V1 implementation target.
2. Create the LCE documentation library structure.
3. Rename product-facing V3 references to LCE V1.
4. Audit the current workflow/node/pack runtime against the Phase 1 checklist.
5. Start Resource Engine implementation.
6. Start Contractor Edition resource and workflow modeling in parallel, but do not hardcode it outside pack boundaries.

## 14. Final Position

Lados Core Engine V1 is the compact reusable platform.

Contractor Edition is the first proof that the engine works in the real world.

LEOS / JKR is the later proof that the same engine can scale.

The implementation priority is therefore:

```text
LCE V1 first.
Contractor Edition second.
AI and registry maturity third.
LEOS / JKR later.
```

This keeps the engine elegant, reusable, and buildable while preserving the larger long-term vision.
