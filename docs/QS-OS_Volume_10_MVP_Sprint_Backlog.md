# QS-OS Workflow Engine Blueprint
# Volume 10 — MVP Sprint Backlog (V1)
Version: 1.0

> 🚫 **SUPERSEDED** — Updated: 2026-06-18  
> This sprint backlog has been **superseded** by the Master Sprint Plan.  
> Sprints 1–12 documented here are complete. Active sprints from S13 onwards are tracked in:  
> **`QS-OS_Master_Sprint_Plan_and_Checklist.md`** (V3 CURRENT)  
> This document is preserved as historical reference for completed sprint work.  
> **Document index:** `Master_Documentation_Index.md`

---

> This document converts the QS-OS architecture into a practical development backlog.
>
> It is based on:
>
> - Volume 1 – Workflow Engine Blueprint
> - Volume 2 – QS Node SDK Specification
> - Volume 2.1 – QS Node Developer Guide
> - Volume 3 – QS Pack Specification
> - Volume 4 – Workflow JSON Specification
> - Volume 5 – Execution Engine Specification
> - Volume 6 – QS-OS Product Master Blueprint V2
> - Volume 7 – Database Schema Specification
> - Volume 8 – API Specification
> - Volume 9 – UI/UX Product Specification
>
> The goal is to move QS-OS from documentation into MVP implementation.

---

# 1. Purpose

This backlog defines what must be built first.

It translates the product vision into:

- Development phases
- Epics
- Sprints
- User stories
- Engineering tasks
- Acceptance criteria
- Dependencies
- MVP scope
- Demo readiness checklist
- Technical build order

This document is written for:

```text
Founder
Product lead
Technical lead
Frontend developer
Backend developer
AI developer
QS domain expert
QA tester
AI coding agent
Future contributors
```

---

# 2. MVP Product Goal

The QS-OS MVP should prove one powerful workflow:

```text
AI-powered BOQ-to-RFQ workflow builder
```

The MVP should allow a user to:

```text
Create a project
Upload a BOQ
Create or open a BOQ-to-RFQ workflow
View the workflow on a visual canvas
Run the workflow
Read BOQ data
Classify BOQ items by trade
Generate RFQ documents
Pause for human approval
Approve the output
View execution logs
Download generated artifacts
```

---

# 3. MVP Success Statement

The MVP is successful when:

```text
A Quantity Surveyor can upload a BOQ and run a visual workflow that produces RFQ package documents with AI-assisted trade classification, human approval, and execution logs.
```

---

# 4. MVP Scope Summary

## 4.1 Must Have

```text
Authentication
Organization workspace
Project workspace
Document upload
Workflow list
Workflow editor
Node library
Property panel
Workflow JSON save/load
Workflow validation
Pack registry
Node registry
Core Pack
Document Pack basic
QS Pack basic
AI Pack basic
Execution engine basic
Execution logs
Execution viewer
Human approval
Artifact output
BOQ-to-RFQ workflow template
```

## 4.2 Should Have

```text
Dry-run mode
Basic AI usage log
Pack installed page
Workflow templates page
Document preview
Node output viewer
Retry failed node
Admin settings basic
```

## 4.3 Could Have

```text
BOQ structured table page
Supplier database
Quotation comparison
Workflow import/export
Advanced JSON viewer
Execution timeline visualization
```

## 4.4 Not in MVP

```text
Full marketplace
Paid Pack billing
BIM integration
Mobile workflow editor
Supplier portal
Complex contract workflows
Advanced final account
Advanced compensation engine
Multi-region infrastructure
Complex workflow collaboration
```

---

# 5. MVP North Star

```text
Successful BOQ-to-RFQ workflow executions per project
```

Supporting metrics:

```text
BOQ files uploaded
BOQ rows processed
Trade packages generated
RFQ documents generated
Approvals completed
Execution failures resolved
Time saved compared to manual process
```

---

# 6. MVP Demo Flow

```text
1. User logs in.
2. User creates organization or selects existing organization.
3. User creates a project.
4. User uploads a BOQ Excel file.
5. User opens BOQ-to-RFQ workflow template.
6. User sees nodes on workflow canvas.
7. User validates workflow.
8. User runs workflow.
9. System reads BOQ.
10. System classifies BOQ items by trade.
11. System generates RFQ document artifacts.
12. Workflow pauses for manager approval.
13. Manager approves.
14. Workflow completes.
15. User views logs and downloads RFQ documents.
```

---

# 7. MVP Architecture Build Order

Recommended build order:

```text
1. Repository foundation
2. Database foundation
3. Auth and organization
4. Project module
5. Workflow JSON package
6. Workflow APIs
7. Frontend app shell
8. Workflow editor shell
9. Node SDK package
10. Pack registry
11. Node registry
12. Core Pack
13. Execution engine basic
14. Document upload
15. Read BOQ node
16. AI Classify node
17. Generate RFQ node
18. Human Approval node
19. Execution viewer
20. BOQ-to-RFQ demo workflow
```

---

# 8. Development Phases

```text
Phase 0 – Setup and planning
Phase 1 – Platform foundation
Phase 2 – Workflow foundation
Phase 3 – Pack and Node foundation
Phase 4 – Execution engine foundation
Phase 5 – BOQ-to-RFQ MVP workflow
Phase 6 – Approval, logs, artifacts
Phase 7 – QA, demo, hardening
```

---

# 9. Sprint Assumptions

Recommended sprint length:

```text
1 week or 2 weeks
```

For a lean startup team, use 1-week sprints if building fast.

This backlog assumes:

```text
10 focused MVP sprints
```

A sprint may be adjusted depending on team size.

---

# 10. Priority Labels

```text
P0 – Critical for MVP
P1 – Important but can follow MVP
P2 – Useful later
P3 – Future
```

---

# 11. Status Labels

```text
Backlog
Ready
In Progress
Blocked
Review
Testing
Done
Deferred
```

---

# 12. Estimation Labels

Simple estimation:

```text
S – Small
M – Medium
L – Large
XL – Extra Large
```

Alternative story points:

```text
1, 2, 3, 5, 8, 13
```

This document uses both labels where useful.

---

# 13. Epic Overview

MVP epics:

```text
Epic 1 – Repository and Infrastructure Foundation
Epic 2 – Database and Data Access Foundation
Epic 3 – Authentication, Organization, and Project Workspace
Epic 4 – Workflow JSON and Workflow Management
Epic 5 – Frontend Shell and UI Foundation
Epic 6 – Workflow Canvas MVP
Epic 7 – Node SDK and Node Registry
Epic 8 – Pack Registry and MVP Packs
Epic 9 – Execution Engine MVP
Epic 10 – Document Upload and Artifact Storage
Epic 11 – BOQ Processing Nodes
Epic 12 – AI Classification Node
Epic 13 – RFQ Generation Node
Epic 14 – Human Approval
Epic 15 – Execution Viewer and Logs
Epic 16 – BOQ-to-RFQ Workflow Template
Epic 17 – QA, Demo Data, and MVP Hardening
```

---

# 14. Sprint Roadmap Summary

```text
Sprint 0 – Project setup and architecture alignment
Sprint 1 – Monorepo, backend, frontend, database foundation
Sprint 2 – Auth, organizations, projects, app shell
Sprint 3 – Workflow JSON package and workflow CRUD
Sprint 4 – Workflow canvas MVP
Sprint 5 – Node SDK, Pack registry, Node registry
Sprint 6 – Execution engine basic
Sprint 7 – Document upload, Read BOQ node, output storage
Sprint 8 – AI Classify node and Generate RFQ node
Sprint 9 – Human Approval, execution viewer, logs
Sprint 10 – BOQ-to-RFQ demo workflow, QA, polish
```

---

# 15. Sprint 0 – Project Setup and Architecture Alignment

## Goal

Prepare the team, repository strategy, development standards, and MVP implementation plan.

## Deliverable

The team can start building with aligned architecture and agreed technical stack.

---

## Sprint 0 Tasks

### S0-001 – Confirm MVP Scope

Priority: P0  
Size: S

Description:

```text
Confirm that MVP is BOQ-to-RFQ workflow automation.
```

Acceptance criteria:

```text
[ ] MVP goal documented
[ ] Out-of-scope list documented
[ ] First demo flow agreed
[ ] First workflow template agreed
```

---

### S0-002 – Confirm Technical Stack

Priority: P0  
Size: S

Recommended stack:

```text
Frontend: Next.js, React, React Flow, Tailwind CSS
Backend: NestJS, TypeScript
Database: Supabase PostgreSQL
Storage: Supabase Storage
Queue: BullMQ + Redis
AI: OpenAI-compatible abstraction
```

Acceptance criteria:

```text
[ ] Stack confirmed
[ ] Package manager selected
[ ] Deployment target selected
[ ] Environment strategy selected
```

---

### S0-003 – Define Coding Standards

Priority: P0  
Size: S

Acceptance criteria:

```text
[ ] TypeScript strict mode agreed
[ ] Linting rules selected
[ ] Formatting rules selected
[ ] Folder naming convention agreed
[ ] API response envelope agreed
```

---

### S0-004 – Create Development Documentation Index

Priority: P1  
Size: S

Acceptance criteria:

```text
[ ] Volumes 1–10 linked in docs folder
[ ] README created
[ ] MVP build order documented
```

---

# 16. Sprint 1 – Monorepo, Backend, Frontend, Database Foundation

## Goal

Create the technical skeleton of QS-OS.

## Deliverable

A running web app, backend API, and database connection.

---

## Sprint 1 Tasks

### S1-001 – Initialize Monorepo

Priority: P0  
Size: M

Recommended structure:

```text
qs-os/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── shared-types/
│   ├── workflow-json/
│   ├── node-sdk/
│   ├── pack-sdk/
│   └── execution-engine/
├── packs/
│   ├── core-pack/
│   ├── document-pack/
│   ├── qs-pack/
│   ├── ai-pack/
│   └── procurement-pack/
├── docs/
└── tools/
```

Acceptance criteria:

```text
[ ] Monorepo initialized
[ ] apps/web created
[ ] apps/api created
[ ] packages folder created
[ ] packs folder created
[ ] TypeScript config shared
[ ] Root README created
```

---

### S1-002 – Setup Frontend App

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Next.js app runs locally
[ ] Tailwind configured
[ ] Base layout created
[ ] Basic routing works
[ ] Environment variables configured
```

---

### S1-003 – Setup Backend App

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] NestJS app runs locally
[ ] Health endpoint created
[ ] API prefix /api/v1 configured
[ ] Config module created
[ ] Validation pipe configured
[ ] Error filter configured
```

---

### S1-004 – Setup Database Connection

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Supabase project or local PostgreSQL configured
[ ] Database connection works
[ ] Migration folder created
[ ] First migration runs
[ ] Backend can query database
```

---

### S1-005 – Create Shared Types Package

Priority: P0  
Size: S

Acceptance criteria:

```text
[ ] @qsos/shared-types package created
[ ] Common API response types added
[ ] Common ID/status types added
[ ] Package imported by web and api
```

---

### S1-006 – Setup Development Scripts

Priority: P0  
Size: S

Scripts:

```text
dev
build
lint
test
format
db:migrate
db:seed
```

Acceptance criteria:

```text
[ ] Scripts available from root
[ ] Developer can run web and api locally
[ ] Lint and format commands work
```

---

# 17. Sprint 2 – Auth, Organizations, Projects, App Shell

## Goal

Users can enter QS-OS, create an organization, and create a project.

## Deliverable

Basic multi-tenant workspace is functional.

---

## Sprint 2 Tasks

### S2-001 – Implement Auth Context

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] User can sign in
[ ] Backend can identify current user
[ ] /me endpoint works
[ ] Frontend stores auth session
[ ] Protected routes implemented
```

---

### S2-002 – Create users_profile Table and API

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] users_profile table created
[ ] Profile created or synced after login
[ ] GET /me returns user profile
[ ] PATCH /me updates profile
```

---

### S2-003 – Create Organization Tables and API

Priority: P0  
Size: M

Tables:

```text
organizations
organization_members
organization_invitations
```

API:

```text
POST /organizations
GET /organizations
GET /organizations/:id
PATCH /organizations/:id
GET /organizations/:id/members
```

Acceptance criteria:

```text
[ ] User can create organization
[ ] Creator becomes owner/admin
[ ] User can list organizations
[ ] Organization membership enforced
```

---

### S2-004 – Create Project Tables and API

Priority: P0  
Size: M

Tables:

```text
projects
project_members
```

API:

```text
POST /projects
GET /projects
GET /projects/:id
PATCH /projects/:id
```

Acceptance criteria:

```text
[ ] User can create project
[ ] User can list projects
[ ] Project belongs to organization
[ ] Organization scoping enforced
```

---

### S2-005 – Build App Shell UI

Priority: P0  
Size: M

Includes:

```text
Top bar
Sidebar
Organization switcher
User menu
Main layout
```

Acceptance criteria:

```text
[ ] Authenticated layout works
[ ] Sidebar navigation visible
[ ] Organization context visible
[ ] Basic responsive behavior works
```

---

### S2-006 – Build Dashboard Page

Priority: P1  
Size: M

Acceptance criteria:

```text
[ ] Dashboard route created
[ ] Quick actions visible
[ ] Project summary card visible
[ ] Pending approvals placeholder visible
[ ] Recent executions placeholder visible
```

---

### S2-007 – Build Projects List and Create Project UI

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Projects list page works
[ ] Create project modal works
[ ] New project appears in list
[ ] User can open project page
```

---

# 18. Sprint 3 – Workflow JSON Package and Workflow CRUD

## Goal

QS-OS can save, load, validate, and version Workflow JSON.

## Deliverable

Workflow definitions can be created and stored.

---

## Sprint 3 Tasks

### S3-001 – Create Workflow JSON TypeScript Interfaces

Priority: P0  
Size: M

Package:

```text
@qsos/workflow-json
```

Interfaces:

```text
QSWorkflowDefinition
WorkflowInfo
WorkflowDependencies
WorkflowNodeInstance
WorkflowConnection
WorkflowVariable
WorkflowTrigger
WorkflowSettings
WorkflowExecutionPolicy
WorkflowMetadata
```

Acceptance criteria:

```text
[ ] Interfaces created
[ ] Exported from package
[ ] Used by web and api
[ ] Sample workflow object type-checks
```

---

### S3-002 – Create Workflow JSON Schema

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] workflow.schema.json created
[ ] Required root fields validated
[ ] Node structure validated
[ ] Connection structure validated
[ ] Metadata validated
```

---

### S3-003 – Create Workflow Validator Service

Priority: P0  
Size: L

Validation checks:

```text
Schema validity
Unique node IDs
Unique connection IDs
Connection source exists
Connection target exists
Required fields
Basic dependency structure
```

Acceptance criteria:

```text
[ ] Validator returns valid/invalid status
[ ] Validator returns messages
[ ] Invalid workflow gives actionable errors
[ ] Unit tests created
```

---

### S3-004 – Create Workflow Tables

Priority: P0  
Size: M

Tables:

```text
workflows
workflow_versions
workflow_dependencies
workflow_templates
```

Acceptance criteria:

```text
[ ] Migration created
[ ] Tables created
[ ] Indexes added
[ ] Organization/project scoping included
```

---

### S3-005 – Implement Workflow CRUD API

Priority: P0  
Size: L

API:

```text
POST /projects/:projectId/workflows
GET /projects/:projectId/workflows
GET /workflows/:workflowId
PATCH /workflows/:workflowId
DELETE /workflows/:workflowId
```

Acceptance criteria:

```text
[ ] Workflow can be created
[ ] Workflow can be listed
[ ] Workflow metadata can be updated
[ ] Workflow soft delete/archive works
```

---

### S3-006 – Implement Workflow Version API

Priority: P0  
Size: L

API:

```text
POST /workflows/:workflowId/versions
GET /workflows/:workflowId/versions
GET /workflows/:workflowId/versions/:version
```

Acceptance criteria:

```text
[ ] Workflow JSON can be saved
[ ] Workflow version can be loaded
[ ] Workflow definition hash generated
[ ] Duplicate version prevented
```

---

### S3-007 – Implement Validate Workflow API

Priority: P0  
Size: M

API:

```text
POST /workflows/:workflowId/validate
```

Acceptance criteria:

```text
[ ] Frontend can call validation endpoint
[ ] Response includes status and messages
[ ] Validation errors include node/field references where possible
```

---

# 19. Sprint 4 – Workflow Canvas MVP

## Goal

Users can visually build a workflow and save it as Workflow JSON.

## Deliverable

Basic workflow editor works.

---

## Sprint 4 Tasks

### S4-001 – Build Workflow List UI

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Project workflows listed
[ ] Create workflow button works
[ ] Workflow status visible
[ ] Open editor action works
```

---

### S4-002 – Build Workflow Editor Shell

Priority: P0  
Size: M

Layout:

```text
Header
Left node library
Canvas
Right property panel
Bottom validation panel
```

Acceptance criteria:

```text
[ ] Editor route works
[ ] Workflow name visible
[ ] Save button visible
[ ] Validate button visible
[ ] Run button placeholder visible
```

---

### S4-003 – Integrate React Flow Canvas

Priority: P0  
Size: L

Acceptance criteria:

```text
[ ] Nodes can be rendered
[ ] Nodes can be moved
[ ] Connections can be drawn
[ ] Canvas zoom/pan works
[ ] Canvas state can be serialized
```

---

### S4-004 – Build Temporary Static Node Library

Priority: P0  
Size: M

Static nodes:

```text
Manual Trigger
Read BOQ
AI Classify Trade
Generate RFQ
Human Approval
Logger
```

Acceptance criteria:

```text
[ ] Node library panel visible
[ ] User can add node to canvas
[ ] Node appears with title and ports
```

---

### S4-005 – Build Property Panel MVP

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Selecting node opens properties
[ ] User can edit node name
[ ] User can edit configuration JSON or simple fields
[ ] Changes update canvas state
```

---

### S4-006 – Save Canvas as Workflow JSON

Priority: P0  
Size: L

Acceptance criteria:

```text
[ ] Canvas nodes map to Workflow JSON nodes
[ ] Edges map to Workflow JSON connections
[ ] Workflow JSON can be saved through API
[ ] Saved workflow can be reloaded
```

---

### S4-007 – Validation Panel UI

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] User can validate workflow
[ ] Validation messages appear
[ ] Errors and warnings are visually distinct
[ ] Clicking message selects affected node if possible
```

---

# 20. Sprint 5 – Node SDK, Pack Registry, Node Registry

## Goal

Replace static nodes with registered nodes from Packs.

## Deliverable

QS-OS begins to behave as an extensible node/Packs platform.

---

## Sprint 5 Tasks

### S5-001 – Create Node SDK Package

Priority: P0  
Size: L

Package:

```text
@qsos/node-sdk
```

Includes:

```text
QSNode interface
Node metadata type
Input/output port types
Configuration schema type
UI schema type
Validation result type
Execution context type
Node execution result type
```

Acceptance criteria:

```text
[ ] Node SDK types exported
[ ] Sample node can implement interface
[ ] Unit test for sample node passes
```

---

### S5-002 – Create Pack SDK Package

Priority: P0  
Size: M

Package:

```text
@qsos/pack-sdk
```

Includes:

```text
Pack manifest type
Pack validation type
Pack node registration type
Pack permission type
```

Acceptance criteria:

```text
[ ] Pack manifest type created
[ ] Manifest validator basic created
[ ] Sample Pack manifest validates
```

---

### S5-003 – Create Pack Tables and Seed Official Packs

Priority: P0  
Size: M

Tables:

```text
packs
pack_versions
pack_installations
pack_permissions
pack_assets
```

Seed Packs:

```text
qsos.core-pack
qsos.document-pack
qsos.qs-pack
qsos.ai-pack
qsos.procurement-pack
```

Acceptance criteria:

```text
[ ] Official Packs seeded
[ ] Pack installation records created for organization
[ ] Pack list API returns installed Packs
```

---

### S5-004 – Create Registered Nodes Table and API

Priority: P0  
Size: L

API:

```text
GET /nodes
GET /nodes/:nodeType
GET /nodes/:nodeType/ui-schema
POST /nodes/:nodeType/validate-configuration
```

Acceptance criteria:

```text
[ ] Node registry table created
[ ] MVP nodes seeded
[ ] Node list API works
[ ] Node definition API works
```

---

### S5-005 – Seed MVP Nodes

Priority: P0  
Size: M

Nodes:

```text
core.manual_trigger
core.human_approval
core.logger
document.upload_file
document.read_excel
document.save_file
qs.read_boq
qs.clean_boq
qs.classify_trade
qs.split_work_package
procurement.generate_rfq
ai.classifier
```

Acceptance criteria:

```text
[ ] Nodes visible in Node Library
[ ] Each node has metadata
[ ] Each node has port definitions
[ ] Each node has configuration schema
```

---

### S5-006 – Connect Node Library to API

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Node library loads from /nodes
[ ] Nodes grouped by category
[ ] Search works
[ ] Node card shows Pack source
```

---

### S5-007 – Dynamic Property Panel From UI Schema

Priority: P1  
Size: L

Acceptance criteria:

```text
[ ] Property panel reads node config schema
[ ] Fields generated dynamically
[ ] Required fields validated
[ ] Help text displayed
```

---

# 21. Sprint 6 – Execution Engine Basic

## Goal

Run simple workflows end-to-end.

## Deliverable

Execution Engine can execute a workflow graph with registered nodes.

---

## Sprint 6 Tasks

### S6-001 – Create Execution Tables

Priority: P0  
Size: M

Tables:

```text
workflow_executions
node_executions
execution_outputs
execution_logs
execution_artifacts
execution_checkpoints
```

Acceptance criteria:

```text
[ ] Migration created
[ ] Indexes added
[ ] Execution records can be created
```

---

### S6-002 – Create Execution Engine Package

Priority: P0  
Size: L

Package:

```text
@qsos/execution-engine
```

Includes:

```text
Execution request type
Execution status type
Node execution status type
Graph planner
Simple scheduler
Node runtime interface
```

Acceptance criteria:

```text
[ ] Package builds
[ ] Basic graph planner test passes
[ ] Execution status types exported
```

---

### S6-003 – Implement Run Workflow API

Priority: P0  
Size: L

API:

```text
POST /workflows/:workflowId/run
```

Acceptance criteria:

```text
[ ] Run endpoint creates execution record
[ ] Workflow version loaded
[ ] Snapshot stored
[ ] Execution status set to queued/running
```

---

### S6-004 – Implement Workflow Snapshot Service

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Snapshot created before execution
[ ] Snapshot hash created
[ ] Snapshot stored in workflow_executions
[ ] Snapshot is not modified during execution
```

---

### S6-005 – Implement Basic Graph Planner

Priority: P0  
Size: L

Acceptance criteria:

```text
[ ] Planner reads Workflow JSON
[ ] Planner determines start nodes
[ ] Planner determines node dependencies
[ ] Planner detects missing nodes
[ ] Planner returns execution order
```

---

### S6-006 – Implement Node Runtime MVP

Priority: P0  
Size: L

Runtime provides:

```text
inputs
configuration
variables
logger
storage placeholder
database access placeholder
```

Acceptance criteria:

```text
[ ] Runtime can execute mock node
[ ] Runtime logs node start/completion
[ ] Runtime stores node output
[ ] Runtime handles node error
```

---

### S6-007 – Implement Sequential Execution

Priority: P0  
Size: L

Acceptance criteria:

```text
[ ] Engine runs nodes in dependency order
[ ] Outputs pass to next node
[ ] Node statuses update
[ ] Workflow completes when all nodes complete
[ ] Failure marks workflow failed
```

---

### S6-008 – Create Mock Nodes for Testing

Priority: P0  
Size: M

Mock nodes:

```text
Manual Trigger
Logger
Pass Through
Fail Node
```

Acceptance criteria:

```text
[ ] Mock workflow runs end-to-end
[ ] Failure path tested
[ ] Logs visible through API
```

---

# 22. Sprint 7 – Document Upload, Read BOQ Node, Output Storage

## Goal

Allow BOQ file upload and parse it through a node.

## Deliverable

User can upload BOQ and Read BOQ node can produce structured output.

---

## Sprint 7 Tasks

### S7-001 – Create Document Tables and APIs

Priority: P0  
Size: M

Tables:

```text
documents
document_versions
document_links
```

APIs:

```text
POST /documents/upload-url
POST /projects/:projectId/documents
GET /projects/:projectId/documents
GET /documents/:documentId
GET /documents/:documentId/download-url
```

Acceptance criteria:

```text
[ ] Upload URL can be created
[ ] Document metadata registered
[ ] Document list visible
[ ] Download URL works
```

---

### S7-002 – Build Documents Page UI

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Project documents page exists
[ ] Upload document action works
[ ] Documents listed
[ ] BOQ document type selectable
```

---

### S7-003 – Implement File Reference Input for Workflow Run

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Run modal accepts BOQ document/file reference
[ ] Execution inputs store file reference
[ ] Node runtime can resolve file reference
```

---

### S7-004 – Implement Read BOQ Node

Priority: P0  
Size: XL

Node:

```text
qs.read_boq
```

Inputs:

```text
FileRef
```

Configuration:

```text
sheetName
headerRow
itemColumn
descriptionColumn
unitColumn
quantityColumn
rateColumn
amountColumn
currency
```

Outputs:

```text
boqItems
warnings
errors
```

Acceptance criteria:

```text
[ ] Node reads Excel file
[ ] Node extracts BOQ rows
[ ] Node returns structured BOQ items
[ ] Node handles missing columns
[ ] Node logs row count
[ ] Node returns warnings for invalid rows
```

---

### S7-005 – Store Execution Outputs

Priority: P0  
Size: L

Acceptance criteria:

```text
[ ] Node output stored in execution_outputs
[ ] Large output can use storage_ref or compressed JSON
[ ] Downstream nodes can access output
[ ] Output API returns summary
```

---

### S7-006 – Create Sample BOQ Fixture

Priority: P0  
Size: S

Acceptance criteria:

```text
[ ] Sample BOQ Excel prepared
[ ] Sample expected JSON output prepared
[ ] Read BOQ test uses fixture
```

---

### S7-007 – Show Read BOQ Output in Execution Viewer

Priority: P1  
Size: M

Acceptance criteria:

```text
[ ] User can open node output
[ ] BOQ item count visible
[ ] Warnings visible
[ ] Output preview paginated or summarized
```

---

# 23. Sprint 8 – AI Classify Node and Generate RFQ Node

## Goal

Classify BOQ items by trade and generate RFQ documents.

## Deliverable

BOQ-to-RFQ automation becomes visible and valuable.

---

## Sprint 8 Tasks

### S8-001 – Create AI Module MVP

Priority: P0  
Size: L

Includes:

```text
AI provider adapter
Model profile config
Prompt runner
Structured output validator
AI usage logger
```

Acceptance criteria:

```text
[ ] AI service can be called through abstraction
[ ] AI usage logged
[ ] Errors handled
[ ] No raw API key exposed
```

---

### S8-002 – Create AI Prompt Registry MVP

Priority: P0  
Size: M

Table:

```text
ai_prompts
```

Seed prompt:

```text
prompt.boq_classification
```

Acceptance criteria:

```text
[ ] Prompt seeded
[ ] Prompt has input/output schema
[ ] AI node can load prompt
```

---

### S8-003 – Implement AI Classify Trade Node

Priority: P0  
Size: XL

Node:

```text
qs.classify_trade
```

Inputs:

```text
boqItems
```

Configuration:

```text
mode
promptId
confidenceThreshold
humanReviewBelowConfidence
batchSize
```

Outputs:

```text
classifiedItems
tradePackages
lowConfidenceItems
warnings
```

Acceptance criteria:

```text
[ ] Node accepts BOQ items
[ ] Node classifies items by trade
[ ] Node returns confidence score
[ ] Node batches large item lists
[ ] Node logs AI usage
[ ] Low confidence items flagged
```

---

### S8-004 – Implement Split Work Package Node

Priority: P0  
Size: L

Node:

```text
qs.split_work_package
```

Inputs:

```text
classifiedItems
```

Outputs:

```text
tradePackages
packageSummary
```

Acceptance criteria:

```text
[ ] Items grouped by trade
[ ] Package summary generated
[ ] Output usable by RFQ generator
```

---

### S8-005 – Implement Generate RFQ Node

Priority: P0  
Size: XL

Node:

```text
procurement.generate_rfq
```

Inputs:

```text
tradePackages
```

Configuration:

```text
templateId
groupByTrade
includeQuantities
includeTerms
outputFormat
```

Outputs:

```text
documents
summary
warnings
```

Acceptance criteria:

```text
[ ] Node receives trade packages
[ ] Node generates RFQ document per trade or package
[ ] Documents stored as artifacts
[ ] Artifact metadata stored
[ ] Node logs generated document count
```

---

### S8-006 – Create Basic RFQ Template

Priority: P0  
Size: M

Format:

```text
DOCX or HTML-to-PDF template
```

Acceptance criteria:

```text
[ ] Template includes project name
[ ] Template includes trade package
[ ] Template includes BOQ items
[ ] Template includes closing date placeholder
[ ] Generated output readable
```

---

### S8-007 – Show RFQ Artifacts in Execution Viewer

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Generated RFQ files visible
[ ] User can download artifact
[ ] Artifact links to generating node
```

---

# 24. Sprint 9 – Human Approval, Execution Viewer, Logs

## Goal

Users can approve generated RFQs and understand workflow execution.

## Deliverable

Trust layer is functional.

---

## Sprint 9 Tasks

### S9-001 – Create Approval Tables and APIs

Priority: P0  
Size: M

Tables:

```text
approval_tasks
approval_comments
approval_attachments
```

APIs:

```text
GET /approvals
GET /approvals/:id
POST /approvals/:id/decision
POST /approvals/:id/comments
```

Acceptance criteria:

```text
[ ] Approval task can be created
[ ] Approval task listed
[ ] Approval decision recorded
[ ] Decision resumes workflow
```

---

### S9-002 – Implement Human Approval Node

Priority: P0  
Size: XL

Node:

```text
core.human_approval
```

Inputs:

```text
attachments
summary
```

Configuration:

```text
title
description
assigneeRole
assigneeUserId
dueInHours
decisionOptions
onApprove
onReject
```

Outputs:

```text
approvalDecision
comments
```

Acceptance criteria:

```text
[ ] Node creates approval task
[ ] Workflow pauses
[ ] Approver can decide
[ ] Workflow resumes after approval
[ ] Rejection follows error/rejection policy
```

---

### S9-003 – Build Approval Inbox UI

Priority: P0  
Size: L

Acceptance criteria:

```text
[ ] Pending approvals listed
[ ] Filters by status
[ ] User can open approval detail
[ ] Assigned approvals visible
```

---

### S9-004 – Build Approval Detail UI

Priority: P0  
Size: L

Acceptance criteria:

```text
[ ] Approval context visible
[ ] Attachments visible
[ ] Decision buttons visible
[ ] Comment field works
[ ] Approval submission updates status
```

---

### S9-005 – Build Execution Viewer UI

Priority: P0  
Size: XL

Sections:

```text
Overview
Node timeline
Logs
Artifacts
Approvals
Errors
```

Acceptance criteria:

```text
[ ] Execution status visible
[ ] Node statuses visible
[ ] Logs visible
[ ] Artifacts visible
[ ] Approval waiting state visible
```

---

### S9-006 – Implement Execution Logs API and UI

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Logs can be fetched by execution
[ ] Logs can be filtered by level
[ ] Logs show node name if available
[ ] Errors are highlighted
```

---

### S9-007 – Add Realtime Execution Updates

Priority: P1  
Size: L

Options:

```text
WebSocket
SSE
Supabase Realtime
Polling fallback
```

Acceptance criteria:

```text
[ ] Execution viewer updates without manual refresh
[ ] Node status changes visible
[ ] New logs appear during execution
```

MVP fallback:

```text
Polling every few seconds is acceptable.
```

---

# 25. Sprint 10 – BOQ-to-RFQ Demo Workflow, QA, Polish

## Goal

Finalize the MVP demo.

## Deliverable

A working QS-OS demo that can be shown to users, partners, developers, and investors.

---

## Sprint 10 Tasks

### S10-001 – Create BOQ-to-RFQ Workflow Template

Priority: P0  
Size: L

Template nodes:

```text
Manual Trigger
Read BOQ
AI Classify Trade
Split Work Package
Generate RFQ
Human Approval
Save Artifact / Logger
```

Acceptance criteria:

```text
[ ] Template appears in workflow template list
[ ] User can create workflow from template
[ ] Template loads correctly on canvas
[ ] Template validates
```

---

### S10-002 – End-to-End BOQ-to-RFQ Test

Priority: P0  
Size: XL

Acceptance criteria:

```text
[ ] Upload sample BOQ
[ ] Create workflow from template
[ ] Run workflow
[ ] Read BOQ node completes
[ ] AI classification completes
[ ] RFQ artifacts generated
[ ] Approval task created
[ ] Approval resumes workflow
[ ] Execution completes
[ ] Logs visible
[ ] Artifacts downloadable
```

---

### S10-003 – MVP Demo Project Seed

Priority: P0  
Size: M

Seed:

```text
Demo organization
Demo project
Sample BOQ
Installed Packs
Registered nodes
BOQ-to-RFQ template
```

Acceptance criteria:

```text
[ ] Demo environment can be reset
[ ] Demo user can run workflow immediately
[ ] Demo data is safe and non-confidential
```

---

### S10-004 – Improve Error Messages

Priority: P0  
Size: M

Acceptance criteria:

```text
[ ] Common errors have user-friendly messages
[ ] Missing BOQ file message clear
[ ] Missing Pack message clear
[ ] AI failure message clear
[ ] RFQ template missing message clear
```

---

### S10-005 – Basic Audit Logs

Priority: P1  
Size: M

Track:

```text
Project created
Workflow created
Workflow run
Approval decision
Document generated
Pack installed
```

Acceptance criteria:

```text
[ ] Audit logs recorded
[ ] Audit logs list page available or API available
```

---

### S10-006 – UI Polish

Priority: P1  
Size: L

Polish:

```text
Loading states
Empty states
Status badges
Button labels
Page headers
Navigation consistency
Execution state visuals
```

Acceptance criteria:

```text
[ ] MVP user journey feels coherent
[ ] No obvious broken UI states
[ ] Primary actions clear
```

---

### S10-007 – MVP Readiness Review

Priority: P0  
Size: M

Checklist:

```text
[ ] User can log in
[ ] User can create project
[ ] User can upload BOQ
[ ] User can create workflow from template
[ ] User can validate workflow
[ ] User can run workflow
[ ] Execution completes
[ ] Approval works
[ ] RFQ artifacts download
[ ] Logs visible
[ ] Demo script works
```

---

# 26. Backlog by Epic

---

# Epic 1 – Repository and Infrastructure Foundation

## Goal

Create the base development environment.

Tasks:

```text
E1-001 Initialize monorepo
E1-002 Configure TypeScript
E1-003 Configure linting and formatting
E1-004 Create web app
E1-005 Create api app
E1-006 Create shared packages
E1-007 Configure environment variables
E1-008 Setup CI basic
E1-009 Setup deployment placeholder
```

Acceptance criteria:

```text
[ ] Developer can clone repo and run app
[ ] Frontend and backend run locally
[ ] Shared packages can be imported
```

---

# Epic 2 – Database and Data Access Foundation

## Goal

Implement the MVP database foundation.

Tasks:

```text
E2-001 Enable UUID extension
E2-002 Create users_profile table
E2-003 Create organizations table
E2-004 Create organization_members table
E2-005 Create projects table
E2-006 Create workflows table
E2-007 Create workflow_versions table
E2-008 Create pack tables
E2-009 Create node registry table
E2-010 Create execution tables
E2-011 Create document tables
E2-012 Create approval tables
E2-013 Create AI usage table
E2-014 Create audit logs table
E2-015 Add indexes
E2-016 Add basic RLS policies
E2-017 Seed MVP data
```

---

# Epic 3 – Authentication, Organization, and Project Workspace

## Goal

Users can access an organization and work inside projects.

Tasks:

```text
E3-001 Implement auth guard
E3-002 Implement /me endpoint
E3-003 Create organization API
E3-004 Create organization switcher
E3-005 Create project API
E3-006 Create project list UI
E3-007 Create project detail UI
E3-008 Create project member basics
```

---

# Epic 4 – Workflow JSON and Workflow Management

## Goal

Save, load, validate, and version workflows.

Tasks:

```text
E4-001 Define workflow TypeScript types
E4-002 Define workflow JSON schema
E4-003 Create workflow validator
E4-004 Create workflow CRUD API
E4-005 Create workflow versions API
E4-006 Create validation API
E4-007 Create workflow export
E4-008 Create workflow import safe mode
E4-009 Create workflow template API
```

MVP requires E4-001 to E4-006.

---

# Epic 5 – Frontend Shell and UI Foundation

## Goal

Build the main interface structure.

Tasks:

```text
E5-001 App shell
E5-002 Top bar
E5-003 Sidebar
E5-004 Dashboard
E5-005 Project switcher
E5-006 Organization switcher
E5-007 Status badges
E5-008 Data table component
E5-009 Toast notifications
E5-010 Confirm dialog
```

---

# Epic 6 – Workflow Canvas MVP

## Goal

Users can visually build workflows.

Tasks:

```text
E6-001 Workflow editor route
E6-002 React Flow integration
E6-003 Node renderer
E6-004 Connection renderer
E6-005 Node library panel
E6-006 Property panel
E6-007 Validation panel
E6-008 Workflow save/load
E6-009 Canvas to Workflow JSON serializer
E6-010 Workflow JSON to canvas loader
E6-011 Run workflow modal
```

---

# Epic 7 – Node SDK and Node Registry

## Goal

Create standardized node definitions.

Tasks:

```text
E7-001 Node SDK interfaces
E7-002 Node metadata schema
E7-003 Port schema
E7-004 Configuration schema
E7-005 UI schema
E7-006 Node validator
E7-007 Node registry database
E7-008 Node registry API
E7-009 Seed MVP node definitions
```

---

# Epic 8 – Pack Registry and MVP Packs

## Goal

Create the first Pack foundation.

Tasks:

```text
E8-001 Pack SDK types
E8-002 Pack manifest validator
E8-003 Pack registry database
E8-004 Installed Packs API
E8-005 Pack permissions model
E8-006 Seed Core Pack
E8-007 Seed Document Pack
E8-008 Seed QS Pack
E8-009 Seed AI Pack
E8-010 Seed Procurement Pack
E8-011 Packs page UI
```

---

# Epic 9 – Execution Engine MVP

## Goal

Run simple workflows.

Tasks:

```text
E9-001 Execution request model
E9-002 Execution snapshot service
E9-003 Graph planner
E9-004 Node runtime
E9-005 Input resolver
E9-006 Output store
E9-007 Execution logger
E9-008 Sequential execution
E9-009 Retry basic
E9-010 Error handling basic
E9-011 Run workflow API
E9-012 Execution status API
```

---

# Epic 10 – Document Upload and Artifact Storage

## Goal

Handle BOQ input and generated RFQ output.

Tasks:

```text
E10-001 Upload URL API
E10-002 Register document API
E10-003 Document list API
E10-004 Document download URL API
E10-005 Documents UI
E10-006 Artifact storage service
E10-007 Artifact API
E10-008 Artifact UI
```

---

# Epic 11 – BOQ Processing Nodes

## Goal

Parse BOQ into structured data.

Tasks:

```text
E11-001 Read BOQ node
E11-002 Clean BOQ node
E11-003 BOQ parser tests
E11-004 BOQ output preview
E11-005 BOQ warnings
E11-006 BOQ item schema
```

---

# Epic 12 – AI Classification Node

## Goal

Classify BOQ items by trade.

Tasks:

```text
E12-001 AI provider abstraction
E12-002 Prompt registry
E12-003 BOQ classification prompt
E12-004 AI Classify node
E12-005 Batch classification
E12-006 Confidence scoring
E12-007 AI usage logging
E12-008 Low-confidence handling
```

---

# Epic 13 – RFQ Generation Node

## Goal

Generate RFQ documents from trade packages.

Tasks:

```text
E13-001 RFQ template design
E13-002 Split Work Package node
E13-003 Generate RFQ node
E13-004 Document generation service
E13-005 Store RFQ artifacts
E13-006 RFQ artifact preview/download
```

---

# Epic 14 – Human Approval

## Goal

Pause and resume workflows through approval.

Tasks:

```text
E14-001 Approval tables
E14-002 Approval API
E14-003 Human Approval node
E14-004 Pause workflow
E14-005 Resume workflow
E14-006 Approval inbox
E14-007 Approval detail
E14-008 Approval decision audit
```

---

# Epic 15 – Execution Viewer and Logs

## Goal

Users can understand what happened.

Tasks:

```text
E15-001 Execution viewer page
E15-002 Execution overview
E15-003 Node timeline
E15-004 Log viewer
E15-005 Artifact list
E15-006 Approval waiting panel
E15-007 Error explanation panel
E15-008 Polling or realtime updates
```

---

# Epic 16 – BOQ-to-RFQ Workflow Template

## Goal

Provide the first complete workflow.

Tasks:

```text
E16-001 Create workflow template JSON
E16-002 Create template seed
E16-003 Create template selection UI
E16-004 Create workflow from template
E16-005 Validate template
E16-006 Run template end-to-end
```

---

# Epic 17 – QA, Demo Data, MVP Hardening

## Goal

Make the MVP reliable enough for demonstration.

Tasks:

```text
E17-001 Create sample BOQ
E17-002 Create demo project
E17-003 Create demo user
E17-004 Test end-to-end flow
E17-005 Fix critical bugs
E17-006 Improve error messages
E17-007 Add loading states
E17-008 Add empty states
E17-009 Create demo script
E17-010 Create release checklist
```

---

# 27. User Stories

---

# User Story 1 – Create Project

As a user, I want to create a project so that I can organize workflows and documents under a construction job.

Acceptance criteria:

```text
[ ] User can enter project name
[ ] User can select currency
[ ] User can create project
[ ] Project appears in project list
[ ] Project opens into workspace
```

Priority: P0

---

# User Story 2 – Upload BOQ

As a QS, I want to upload a BOQ file so that QS-OS can use it in a workflow.

Acceptance criteria:

```text
[ ] User can select BOQ file
[ ] User can choose document type BOQ
[ ] File uploads successfully
[ ] Document metadata is saved
[ ] BOQ appears in documents list
```

Priority: P0

---

# User Story 3 – Create Workflow From Template

As a QS, I want to create a workflow from the BOQ-to-RFQ template so that I do not need to build it from scratch.

Acceptance criteria:

```text
[ ] Template is visible
[ ] User can select template
[ ] Workflow is created
[ ] Workflow opens in editor
[ ] Nodes and connections appear correctly
```

Priority: P0

---

# User Story 4 – Edit Workflow

As a user, I want to edit workflow nodes and settings so that the workflow matches my project process.

Acceptance criteria:

```text
[ ] User can add node
[ ] User can move node
[ ] User can connect nodes
[ ] User can edit node configuration
[ ] User can save workflow
```

Priority: P0

---

# User Story 5 – Validate Workflow

As a user, I want to validate a workflow before running it so that I can fix problems early.

Acceptance criteria:

```text
[ ] User can click Validate
[ ] System checks workflow
[ ] Errors and warnings displayed
[ ] User can identify affected node
```

Priority: P0

---

# User Story 6 – Run Workflow

As a user, I want to run the workflow so that QS-OS processes the BOQ and generates output.

Acceptance criteria:

```text
[ ] User can click Run
[ ] User can select BOQ input
[ ] Execution is created
[ ] Execution status appears
[ ] Workflow starts processing
```

Priority: P0

---

# User Story 7 – Read BOQ

As a QS, I want QS-OS to read BOQ rows from Excel so that they become structured data.

Acceptance criteria:

```text
[ ] BOQ file is parsed
[ ] BOQ items extracted
[ ] Row count shown
[ ] Invalid rows warned
[ ] Output stored
```

Priority: P0

---

# User Story 8 – AI Classify BOQ Items

As a QS, I want AI to classify BOQ items by trade so that RFQ packages can be prepared faster.

Acceptance criteria:

```text
[ ] Items classified by trade
[ ] Confidence score returned
[ ] Low confidence items flagged
[ ] AI usage logged
[ ] Output stored
```

Priority: P0

---

# User Story 9 – Generate RFQ

As a procurement user, I want RFQ documents generated from trade packages so that I can send them to suppliers.

Acceptance criteria:

```text
[ ] Trade packages accepted
[ ] RFQ documents generated
[ ] Documents stored as artifacts
[ ] User can download artifacts
```

Priority: P0

---

# User Story 10 – Approve RFQ

As an approver, I want to review RFQ documents before they are finalized so that external communication is controlled.

Acceptance criteria:

```text
[ ] Approval task created
[ ] Approver can view attachments
[ ] Approver can approve/reject/request changes
[ ] Workflow resumes after approval
[ ] Decision logged
```

Priority: P0

---

# User Story 11 – View Execution Logs

As a user, I want to view execution logs so that I understand what happened.

Acceptance criteria:

```text
[ ] Execution viewer shows node statuses
[ ] Logs visible
[ ] Errors highlighted
[ ] Artifacts visible
```

Priority: P0

---

# User Story 12 – Download RFQ Artifact

As a user, I want to download generated RFQ files so that I can use them outside QS-OS.

Acceptance criteria:

```text
[ ] Artifact list shows generated files
[ ] User can download file
[ ] File is readable
[ ] Artifact links to execution
```

Priority: P0

---

# 28. Definition of Ready

A task is ready when:

```text
[ ] Goal is clear
[ ] Acceptance criteria defined
[ ] Dependencies identified
[ ] Required API/database changes known
[ ] Design expectation clear
[ ] Test expectation clear
```

---

# 29. Definition of Done

A task is done when:

```text
[ ] Code implemented
[ ] TypeScript builds
[ ] Tests added or updated where practical
[ ] Lint passes
[ ] Feature manually tested
[ ] Acceptance criteria met
[ ] Error states handled
[ ] Documentation updated if needed
```

---

# 30. MVP Release Criteria

MVP can be released for pilot/demo when:

```text
[ ] User can log in
[ ] User can create organization
[ ] User can create project
[ ] User can upload BOQ
[ ] User can create workflow from BOQ-to-RFQ template
[ ] Workflow loads on canvas
[ ] Workflow validates
[ ] Workflow runs
[ ] Read BOQ node works
[ ] AI Classify node works
[ ] Generate RFQ node works
[ ] Human Approval node works
[ ] Execution viewer shows progress
[ ] Logs visible
[ ] RFQ artifacts downloadable
[ ] Demo script works end-to-end
```

---

# 31. Critical Technical Risks

## Risk 1 – BOQ Format Variation

Different BOQ files may have different sheet names, columns, headers, and formatting.

Mitigation:

```text
Start with controlled sample BOQ
Allow configurable header row and columns
Show warnings
Improve parser gradually
```

---

## Risk 2 – AI Classification Quality

AI may classify items incorrectly.

Mitigation:

```text
Return confidence scores
Show low confidence items
Allow human review
Use prompt versioning
Test with real BOQ samples
```

---

## Risk 3 – Execution Engine Complexity

Workflow engine can become complex quickly.

Mitigation:

```text
Start with sequential execution
Defer complex loops
Defer sub-workflows
Defer compensation
Build durable logs early
```

---

## Risk 4 – UI Complexity

Workflow canvas can overwhelm users.

Mitigation:

```text
Start with template workflow
Use simple node cards
Provide property panel help
Hide developer mode by default
Use clear validation messages
```

---

## Risk 5 – Document Generation

Generating professional RFQ documents may be harder than expected.

Mitigation:

```text
Start with simple HTML/PDF template
Then add DOCX template later
Store artifacts clearly
Allow template improvement over time
```

---

# 32. QA Test Plan

MVP test cases:

```text
Login works
Organization creation works
Project creation works
BOQ upload works
Workflow template creation works
Workflow save/load works
Workflow validation catches missing fields
Workflow run creates execution
Read BOQ node parses sample file
AI classify node returns structured data
RFQ node generates artifact
Approval task created
Approval decision resumes workflow
Execution completes
Logs visible
Artifact downloads
```

---

# 33. Manual Test Script

```text
1. Login as admin.
2. Create organization.
3. Create project.
4. Upload sample BOQ.
5. Create workflow from BOQ-to-RFQ template.
6. Open workflow editor.
7. Validate workflow.
8. Run workflow.
9. Select uploaded BOQ.
10. Watch execution viewer.
11. Confirm Read BOQ completes.
12. Confirm AI Classify completes.
13. Confirm RFQ generated.
14. Open approval inbox.
15. Approve RFQ.
16. Confirm workflow completes.
17. Download RFQ artifact.
18. Review execution logs.
```

---

# 34. Demo Script

## Opening

```text
QS-OS is a workflow operating system for Quantity Surveyors.
Today, we will show how a QS can upload a BOQ and generate RFQ packages using a visual workflow.
```

## Step 1 – Project

```text
We start inside a construction project workspace.
```

## Step 2 – Upload BOQ

```text
The QS uploads the tender BOQ file.
```

## Step 3 – Workflow

```text
We open the BOQ-to-RFQ workflow template.
This workflow reads the BOQ, classifies items by trade, creates trade packages, generates RFQs, and pauses for approval.
```

## Step 4 – Run

```text
We run the workflow and select the uploaded BOQ.
```

## Step 5 – Execution

```text
QS-OS now executes each node and logs every step.
```

## Step 6 – AI

```text
The AI classification node assists by grouping BOQ items into trades with confidence scores.
```

## Step 7 – RFQ

```text
The RFQ node generates package documents.
```

## Step 8 – Approval

```text
Before anything is finalized, the workflow pauses for human approval.
```

## Step 9 – Output

```text
After approval, RFQ documents are available for download with full execution history.
```

## Closing

```text
This is the foundation of QS-OS: visual QS workflows, AI assistance, human approval, and auditability.
```

---

# 35. First Demo Data

Create:

```text
Demo organization: QS-OS Demo Contractor
Demo project: Sample Stadium Tender
Sample BOQ: sample-stadium-boq.xlsx
Workflow template: Tender BOQ to RFQ
Approver user: Senior QS
QS user: Estimator
```

Sample trades:

```text
Preliminaries
Earthworks
Concrete
Reinforcement
Masonry
Roofing
Floor Finishes
Wall Finishes
Painting
Mechanical
Electrical
External Works
```

---

# 36. Suggested Task Assignment

For a lean team:

## Frontend Developer

```text
App shell
Dashboard
Project UI
Workflow canvas
Property panel
Execution viewer
Approval inbox
Documents page
```

## Backend Developer

```text
Database migrations
Auth context
Project APIs
Workflow APIs
Pack APIs
Execution APIs
Approval APIs
Document APIs
```

## AI / Automation Developer

```text
Node SDK
Execution engine
Read BOQ node
AI classify node
Generate RFQ node
Prompt registry
```

## QS Domain Expert

```text
Sample BOQ
Trade classification rules
RFQ template
Workflow review
User acceptance testing
```

## QA Tester

```text
Manual tests
End-to-end test script
Bug reports
Regression checklist
```

---

# 37. AI Coding Agent Task Strategy

Break AI coding tasks into small prompts.

Good AI coding task:

```text
Implement Workflow JSON TypeScript interfaces in packages/workflow-json/src/types.ts using Volume 4.
```

Bad AI coding task:

```text
Build the whole QS-OS app.
```

Recommended sequence:

```text
One file
One module
One API group
One UI screen
One node
One test fixture
```

---

# 38. AI Coding Agent Task Examples

```text
Create the workflows table migration based on Volume 7.
Create the WorkflowDefinition TypeScript interface based on Volume 4.
Create the POST /projects endpoint based on Volume 8.
Create a React WorkflowList page based on Volume 9.
Create a ReadBOQ node skeleton based on Volume 2 and Volume 10.
Create unit tests for WorkflowValidator.
```

---

# 39. Backlog Export Format

This backlog can later be converted into:

```text
GitHub Issues
Linear tasks
Jira stories
Notion board
Trello board
CSV backlog
Markdown checklist
```

Recommended first tool:

```text
GitHub Issues or Linear
```

---

# 40. GitHub Labels

Recommended labels:

```text
epic
frontend
backend
database
workflow
execution-engine
node-sdk
pack-sdk
ai
documents
approval
bug
mvp
p0
p1
blocked
good-first-issue
```

---

# 41. Git Branch Strategy

Simple MVP branch strategy:

```text
main
dev
feature/*
fix/*
```

Example:

```text
feature/workflow-json
feature/workflow-canvas
feature/execution-engine
feature/read-boq-node
```

---

# 42. Commit Style

Recommended:

```text
feat: add workflow JSON types
fix: handle missing BOQ header row
docs: update MVP sprint backlog
test: add Read BOQ node fixture
refactor: simplify execution planner
```

---

# 43. Environment Strategy

Environments:

```text
local
dev
staging
production
```

MVP can start with:

```text
local
staging
```

---

# 44. MVP Environment Variables

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STORAGE_BUCKET
REDIS_URL
AI_PROVIDER_API_KEY
AI_PROVIDER_BASE_URL
APP_URL
API_URL
JWT_SECRET if needed
```

Do not commit secret values.

---

# 45. Documentation Updates During Development

Keep updated:

```text
README
.env.example
API docs
Database migration notes
Node documentation
Pack documentation
Demo script
Known limitations
```

---

# 46. Known MVP Limitations

Document clearly:

```text
Only controlled BOQ formats supported initially
AI classification requires review
RFQ template is basic
Workflow execution is sequential first
Marketplace not available
Supplier portal not available
Mobile workflow editing not available
```

---

# 47. Post-MVP Backlog

After MVP:

```text
Quotation comparison
Supplier database
Send RFQ email
Purchase order generation
Workflow import/export
Workflow diff
Pack marketplace
Contract workflows
Progress claim workflows
Payment certificate workflow
Rate library
Cost database
BIM integration
Mobile approval app
```

---

# 48. Volume 10 Relationship to Other Volumes

This backlog implements:

```text
Volume 1:
Core workflow platform concept

Volume 2:
Node SDK and node contract

Volume 2.1:
Developer guide and node lifecycle

Volume 3:
Pack system

Volume 4:
Workflow JSON save/load

Volume 5:
Execution engine

Volume 6:
Product master blueprint

Volume 7:
Database schema

Volume 8:
API endpoints

Volume 9:
UI/UX screens and behavior
```

---

# 49. Recommended Next Document

After this Sprint Backlog, recommended next documents:

```text
Volume 11 – AI Governance and Prompt Specification
Volume 12 – Security and Permission Specification
Volume 13 – Developer Setup and Repository Implementation Guide
```

However, development can begin immediately after Volume 10.

---

# 50. Final MVP Formula

```text
QS-OS MVP =
  Project Workspace
  + Workflow Canvas
  + Workflow JSON
  + Pack Registry
  + Node Registry
  + Execution Engine
  + BOQ Parser
  + AI Trade Classification
  + RFQ Generator
  + Human Approval
  + Logs and Artifacts
```

---

# Conclusion

Volume 10 converts QS-OS from blueprint into an actionable build plan.

The team should now focus on one goal:

```text
Build the smallest complete BOQ-to-RFQ workflow that proves the QS-OS engine.
```

Do not build every module at once.

Build the spine first:

```text
Project
  ↓
Workflow
  ↓
Nodes
  ↓
Execution
  ↓
BOQ
  ↓
AI Classification
  ↓
RFQ
  ↓
Approval
  ↓
Artifact
  ↓
Logs
```

Once this spine works, QS-OS can grow into procurement, contract administration, claims, final accounts, BIM, marketplace, and enterprise workflow governance.

The MVP must prove that QS-OS is not just a concept.

It is a working construction workflow operating system.
