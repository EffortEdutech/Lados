# QS-OS Workflow Engine Blueprint
# Volume 14 — QS-OS MVP Technical Task Pack for Codex/Cowork (V1)
Version: 1.0

> 🚫 **SUPERSEDED** — Updated: 2026-06-18  
> This task pack has been **superseded** by the Master Sprint Plan which covers V3 architecture.  
> Tasks documented here covering Sprints 1–10 are complete and archived.  
> **For active AI coding agent task instructions, use:**  
> **`QS-OS_Master_Sprint_Plan_and_Checklist.md`** (V3 CURRENT)  
> This document is preserved as historical reference for early sprint task definitions.  
> **Document index:** `Master_Documentation_Index.md`

---

> This document breaks the QS-OS MVP implementation into small, copy-paste-ready tasks for Codex, Cowork, AI coding agents, or human developers.
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
> - Volume 10 – MVP Sprint Backlog
> - Volume 13 – Developer Setup and Repository Implementation Guide
>
> Primary objective:
>
> ```text
> Convert QS-OS documentation into small implementation tasks that can be safely assigned to Codex/Cowork one by one.
> ```

---

# 1. Purpose

This task pack is designed to help build the QS-OS MVP systematically.

It provides:

- Task IDs
- Copy-paste prompts
- Target files
- Requirements
- Acceptance criteria
- Test instructions
- Safety boundaries
- Dependencies
- Suggested sequence

This prevents AI coding agents from trying to build the whole product at once.

---

# 2. How to Use This Document

Use one task at a time.

Recommended process:

```text
1. Copy one task prompt.
2. Paste into Codex/Cowork.
3. Let it modify only the target files.
4. Review the diff.
5. Run tests/typecheck.
6. Commit.
7. Move to the next task.
```

Do not ask Codex/Cowork to build the full QS-OS product in one prompt.

---

# 3. Golden Rule for Codex/Cowork

```text
One task.
One module.
One clear output.
One reviewable diff.
```

Bad:

```text
Build the full QS-OS MVP.
```

Good:

```text
Create the Workflow JSON TypeScript interfaces in packages/workflow-json/src/types.ts.
```

---

# 4. Global Context Prompt

Use this at the start of a Codex/Cowork session.

```text
You are helping build QS-OS, a Quantity Surveying Workflow Operating System.

QS-OS is a visual workflow platform inspired by ComfyUI-style node graphs and n8n-style workflow orchestration, but designed specifically for construction commercial workflows.

The MVP goal is an AI-powered BOQ-to-RFQ workflow:
- Create project
- Upload BOQ
- Open workflow canvas
- Save Workflow JSON
- Run execution
- Read BOQ
- Classify BOQ items by trade
- Generate RFQ documents
- Pause for human approval
- Complete workflow
- Show logs and artifacts

Use TypeScript strictly.
Prefer small, modular files.
Do not hardcode secrets.
Do not change architecture unless asked.
Do not remove existing files unless instructed.
Add tests where practical.
```

---

# 5. Global Technical Constraints

All implementation tasks must follow these constraints:

```text
Language: TypeScript
Frontend: Next.js + React + React Flow + Tailwind
Backend: NestJS
Database: PostgreSQL / Supabase
Package manager: pnpm
Monorepo: apps/*, packages/*, packs/*
API prefix: /api/v1
Workflow format: Workflow JSON from Volume 4
Node model: Node SDK from Volume 2
Pack model: Pack Specification from Volume 3
Execution model: Volume 5
Database schema: Volume 7
API contract: Volume 8
UI behavior: Volume 9
```

---

# 6. Global Safety Rules

Codex/Cowork must not:

```text
Hardcode API keys
Expose Supabase service role key to frontend
Store raw secrets in Workflow JSON
Bypass organization checks
Delete migrations
Rewrite unrelated modules
Use canvas position as execution order
Store large files in database JSON
Put execution logs inside workflow definition
Silently approve high-risk AI output
Invent a different architecture
```

---

# 7. Recommended Task Sequence

```text
A. Repository Foundation
B. Shared Types
C. Workflow JSON Package
D. Database Migrations
E. Backend API Foundation
F. Organizations and Projects
G. Workflows and Versions
H. Pack and Node Registry
I. Frontend App Shell
J. Workflow Canvas
K. Execution Engine MVP
L. Documents and Storage
M. Read BOQ Node
N. AI Classification Node
O. RFQ Generation Node
P. Human Approval
Q. Execution Viewer
R. BOQ-to-RFQ Template
S. Demo Seed and QA
```

---

# 8. Task Template

Use this structure for future tasks:

```text
Task ID:
Task title:

Context:
...

Target files:
...

Requirements:
...

Acceptance criteria:
...

Test instructions:
...

Boundaries:
...
```

---

# 9. Phase A – Repository Foundation

---

## Task A001 – Create Monorepo Skeleton

Priority: P0  
Size: M  
Depends on: None

### Prompt

```text
Task A001 – Create the QS-OS monorepo skeleton.

Context:
We are building QS-OS, a TypeScript monorepo for a Quantity Surveying workflow operating system.

Target structure:
qs-os/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── shared-types/
│   ├── workflow-json/
│   ├── node-sdk/
│   ├── pack-sdk/
│   ├── execution-engine/
│   ├── database/
│   ├── ui/
│   └── test-fixtures/
├── packs/
│   ├── core-pack/
│   ├── document-pack/
│   ├── qs-pack/
│   ├── ai-pack/
│   └── procurement-pack/
├── docs/
├── tools/
│   └── qsos-cli/
├── supabase/
│   ├── migrations/
│   └── seed/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
└── README.md

Requirements:
- Create the folder structure.
- Add pnpm-workspace.yaml.
- Add turbo.json.
- Add tsconfig.base.json.
- Add .gitignore.
- Add .env.example.
- Add a root README.md with project overview and getting started placeholders.
- Do not install frameworks yet.
- Keep the diff small and clear.

Acceptance criteria:
- Folder structure exists.
- Workspace includes apps/*, packages/*, packs/*, tools/*.
- Root scripts exist for dev, build, lint, test, typecheck, format.
- No secrets are committed.

Test instructions:
- Run pnpm install.
- Confirm workspace is recognized by pnpm.
```

---

## Task A002 – Add Root Tooling Configuration

Priority: P0  
Size: S  
Depends on: A001

### Prompt

```text
Task A002 – Add root TypeScript, ESLint, and Prettier configuration.

Context:
The QS-OS monorepo needs consistent formatting and strict TypeScript rules.

Target files:
- tsconfig.base.json
- .prettierrc
- .prettierignore
- eslint.config.js or .eslintrc equivalent
- package.json

Requirements:
- Enable strict TypeScript.
- Add Prettier config.
- Add lint/typecheck scripts if missing.
- Do not add application-specific code.
- Keep config compatible with Next.js and NestJS later.

Acceptance criteria:
- pnpm format can run.
- pnpm typecheck script exists.
- TypeScript base paths include @qsos/* packages.
```

---

## Task A003 – Create Environment Example

Priority: P0  
Size: S  
Depends on: A001

### Prompt

```text
Task A003 – Create the QS-OS .env.example file.

Target file:
.env.example

Requirements:
Include these sections:
- App
- Supabase
- Database
- Storage
- Redis / Queue
- AI
- Auth
- Development

Variables:
APP_ENV=local
APP_URL=http://localhost:3000
API_URL=http://localhost:4000/api/v1
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
STORAGE_BUCKET=qsos-artifacts
REDIS_URL=redis://localhost:6379
AI_PROVIDER=openai-compatible
AI_PROVIDER_BASE_URL=
AI_PROVIDER_API_KEY=
AI_DEFAULT_MODEL=
JWT_SECRET=
LOG_LEVEL=debug

Acceptance criteria:
- No real secrets.
- Clear comments explain frontend must not receive service role key.
```

---

# 10. Phase B – Shared Types

---

## Task B001 – Create Shared Types Package

Priority: P0  
Size: M  
Depends on: A001

### Prompt

```text
Task B001 – Create the @qsos/shared-types package.

Context:
QS-OS frontend and backend need shared API response types, pagination types, common status types, and ID aliases.

Target files:
packages/shared-types/package.json
packages/shared-types/tsconfig.json
packages/shared-types/src/index.ts
packages/shared-types/src/api.ts
packages/shared-types/src/common.ts

Requirements:
- Create ApiResponse<T>.
- Create ApiError.
- Create PaginatedMeta.
- Create SortOrder type.
- Create common ID aliases like OrganizationId, ProjectId, WorkflowId, ExecutionId.
- Export all types from index.ts.
- No runtime dependencies.

Acceptance criteria:
- Package builds.
- Types can be imported from @qsos/shared-types.
```

---

## Task B002 – Add Common Status Types

Priority: P0  
Size: S  
Depends on: B001

### Prompt

```text
Task B002 – Add common QS-OS status types.

Target file:
packages/shared-types/src/status.ts

Requirements:
Define and export:
- WorkflowStatus
- WorkflowVersionStatus
- ExecutionStatus
- NodeExecutionStatus
- ApprovalStatus
- PackInstallationStatus
- DocumentStatus

Use string union types.

Acceptance criteria:
- Export status types from index.ts.
- Type names match QS-OS documentation.
```

---

# 11. Phase C – Workflow JSON Package

---

## Task C001 – Create Workflow JSON Package

Priority: P0  
Size: M  
Depends on: B001

### Prompt

```text
Task C001 – Create the @qsos/workflow-json package.

Context:
Workflow JSON is the canonical format for QS-OS workflows.

Target files:
packages/workflow-json/package.json
packages/workflow-json/tsconfig.json
packages/workflow-json/src/index.ts
packages/workflow-json/src/types.ts

Requirements:
Create TypeScript interfaces for:
- QSWorkflowDefinition
- WorkflowInfo
- WorkflowDependencies
- WorkflowPackDependency
- WorkflowNodeDependency
- WorkflowPromptDependency
- WorkflowNodeInstance
- WorkflowConnection
- WorkflowPortRef
- WorkflowMapping
- WorkflowCondition
- WorkflowVariable
- WorkflowSecretRef
- WorkflowTrigger
- WorkflowSettings
- WorkflowExecutionPolicy
- WorkflowValidation
- WorkflowValidationMessage
- WorkflowMetadata
- WorkflowUIState

Acceptance criteria:
- Types compile under strict TypeScript.
- All types exported from index.ts.
- No validator yet.
```

---

## Task C002 – Create Minimal Workflow Example

Priority: P0  
Size: S  
Depends on: C001

### Prompt

```text
Task C002 – Create minimal Workflow JSON example.

Target file:
packages/workflow-json/src/examples/minimal-workflow.ts

Requirements:
- Export minimalWorkflow.
- Use QSWorkflowDefinition type.
- Include schemaVersion, workflow, dependencies, nodes, connections, metadata.
- Use workflow ID workflow.boq_summary.
- No external dependencies.

Acceptance criteria:
- Example type-checks.
- Export example from package index.
```

---

## Task C003 – Create BOQ-to-RFQ Workflow Example

Priority: P0  
Size: M  
Depends on: C001

### Prompt

```text
Task C003 – Create BOQ-to-RFQ Workflow JSON example.

Target file:
packages/workflow-json/src/examples/boq-to-rfq.workflow.ts

Requirements:
Create a QSWorkflowDefinition with these nodes:
- node_manual_trigger: core.manual_trigger
- node_read_boq: qs.read_boq
- node_classify_trade: qs.classify_trade
- node_split_work_package: qs.split_work_package
- node_generate_rfq: procurement.generate_rfq
- node_human_approval: core.human_approval
- node_logger: core.logger

Connections:
manual_trigger -> read_boq
read_boq.boqItems -> classify_trade.items
classify_trade.classifiedItems -> split_work_package.items
split_work_package.tradePackages -> generate_rfq.tradePackages
generate_rfq.documents -> human_approval.attachments
human_approval.approvalDecision -> logger.input

Include pack dependencies:
- qsos.core-pack
- qsos.qs-pack
- qsos.ai-pack
- qsos.procurement-pack
- qsos.document-pack

Acceptance criteria:
- Example type-checks.
- Export from examples index if created.
```

---

## Task C004 – Implement Workflow Validator MVP

Priority: P0  
Size: L  
Depends on: C001, C002

### Prompt

```text
Task C004 – Implement MVP Workflow Validator.

Context:
QS-OS needs to validate Workflow JSON before save/run.

Target files:
packages/workflow-json/src/validator.ts
packages/workflow-json/src/index.ts
packages/workflow-json/src/tests/validator.test.ts

Requirements:
Implement validateWorkflow(definition: unknown): WorkflowValidation.

MVP checks:
- Root object exists.
- schemaVersion exists.
- workflow object exists.
- workflow.id exists.
- workflow.name exists.
- workflow.version exists.
- dependencies object exists.
- nodes is an array.
- connections is an array.
- metadata exists.
- Node IDs are unique.
- Connection IDs are unique.
- Every connection source node exists.
- Every connection target node exists.
- Every node has id, type, name, packId, version, configuration.
- Every connection has source.nodeId, source.portId, target.nodeId, target.portId.

Return status:
- valid
- validWithWarnings
- invalid

Acceptance criteria:
- Minimal workflow validates.
- Duplicate node IDs fail.
- Missing target node fails.
- Test file added.
```

---

## Task C005 – Add Workflow JSON Schema Draft

Priority: P1  
Size: M  
Depends on: C001

### Prompt

```text
Task C005 – Add JSON Schema draft for Workflow JSON.

Target file:
packages/workflow-json/src/workflow.schema.json

Requirements:
- Include draft 2020-12 schema declaration.
- Validate required fields:
  schemaVersion, workflow, dependencies, nodes, connections, metadata.
- Validate workflow.id, workflow.name, workflow.version, workflow.status.
- Validate node required fields.
- Validate connection required fields.
- Export schema from package if practical.

Acceptance criteria:
- Schema file exists.
- Schema is valid JSON.
```

---

# 12. Phase D – Database Migrations

---

## Task D001 – Create Database Package

Priority: P0  
Size: M  
Depends on: A001

### Prompt

```text
Task D001 – Create @qsos/database package and migration structure.

Target files/folders:
packages/database/package.json
packages/database/tsconfig.json
packages/database/src/index.ts
supabase/migrations/
supabase/seed/

Requirements:
- Create package.
- Add placeholder migrate and seed scripts.
- Create README explaining migrations live under supabase/migrations.
- Do not implement database client yet.

Acceptance criteria:
- Package builds.
- Migration folder exists.
```

---

## Task D002 – Create Core Identity Migration

Priority: P0  
Size: M  
Depends on: D001

### Prompt

```text
Task D002 – Create migration for identity and organization tables.

Target file:
supabase/migrations/000001_create_identity_tables.sql

Requirements:
Create:
- pgcrypto extension
- users_profile
- organizations
- organization_members
- organization_invitations

Use the schema from Volume 13.
Use UUID primary keys where applicable.
Add created_at and updated_at.
Add unique constraint for organization_members(organization_id, user_id).

Acceptance criteria:
- SQL is valid PostgreSQL.
- No destructive statements.
```

---

## Task D003 – Create Projects Migration

Priority: P0  
Size: M  
Depends on: D002

### Prompt

```text
Task D003 – Create migration for projects.

Target file:
supabase/migrations/000002_create_projects.sql

Requirements:
Create:
- projects
- project_members

Use organization_id foreign key.
Include name, code, description, client_name, location, currency, status, settings, timestamps.

Acceptance criteria:
- SQL is valid.
- projects references organizations.
- project_members references projects and users_profile.
```

---

## Task D004 – Create Workflow Tables Migration

Priority: P0  
Size: L  
Depends on: D003

### Prompt

```text
Task D004 – Create migration for workflow tables.

Target file:
supabase/migrations/000003_create_workflow_tables.sql

Requirements:
Create:
- workflows
- workflow_versions
- workflow_dependencies
- workflow_templates

Use schema from Volume 7 and Volume 13.
workflow_versions.definition must be JSONB.
workflow_versions must have unique(workflow_id, version).

Acceptance criteria:
- SQL is valid.
- Organization and project scoping included.
- Indexes for workflow_id and organization/project added.
```

---

## Task D005 – Create Pack and Node Tables Migration

Priority: P0  
Size: L  
Depends on: D004

### Prompt

```text
Task D005 – Create migration for Pack and Node registry.

Target file:
supabase/migrations/000004_create_pack_node_tables.sql

Requirements:
Create:
- packs
- pack_versions
- pack_installations
- pack_permissions
- pack_assets
- registered_nodes

registered_nodes must have:
- organization_id
- pack_id
- pack_version
- node_type
- node_version
- display_name
- category
- description
- input_schema JSONB
- output_schema JSONB
- config_schema JSONB
- ui_schema JSONB
- executor_ref
- status

Acceptance criteria:
- SQL is valid.
- Unique organization_id + node_type.
- Pack tables support official seed Packs.
```

---

## Task D006 – Create Execution Tables Migration

Priority: P0  
Size: L  
Depends on: D004

### Prompt

```text
Task D006 – Create migration for execution tables.

Target file:
supabase/migrations/000005_create_execution_tables.sql

Requirements:
Create:
- workflow_executions
- node_executions
- execution_outputs
- execution_logs
- execution_artifacts
- execution_checkpoints
- execution_locks

Use schemas from Volume 7 and Volume 13.

Acceptance criteria:
- SQL is valid.
- Execution tables include organization_id.
- execution_logs indexed by execution_id.
- workflow_executions includes snapshot JSONB and snapshot_hash.
```

---

## Task D007 – Create Documents, Approvals, AI, Audit Migrations

Priority: P0  
Size: L  
Depends on: D006

### Prompt

```text
Task D007 – Create remaining MVP migrations.

Target files:
supabase/migrations/000006_create_documents.sql
supabase/migrations/000007_create_approvals.sql
supabase/migrations/000008_create_ai_tables.sql
supabase/migrations/000009_create_audit_notifications.sql

Requirements:
Create:
- documents
- document_versions
- document_links
- approval_tasks
- approval_comments
- approval_attachments
- ai_prompts
- ai_usage_logs
- audit_logs
- notifications

Acceptance criteria:
- SQL is valid.
- Tables include organization_id where required.
- No plaintext secret storage.
```

---

## Task D008 – Seed Official Packs and MVP Nodes

Priority: P0  
Size: L  
Depends on: D005

### Prompt

```text
Task D008 – Create seed SQL for official Packs and MVP nodes.

Target file:
supabase/seed/001_seed_official_packs_and_nodes.sql

Requirements:
Seed Packs:
- qsos.core-pack
- qsos.document-pack
- qsos.qs-pack
- qsos.ai-pack
- qsos.procurement-pack

Seed MVP node definitions:
- core.manual_trigger
- core.human_approval
- core.logger
- document.upload_file
- document.read_excel
- document.save_file
- qs.read_boq
- qs.clean_boq
- qs.classify_trade
- qs.split_work_package
- procurement.generate_rfq
- ai.classifier

Each node must include:
- node_type
- display_name
- category
- description
- input_schema
- output_schema
- config_schema
- ui_schema
- executor_ref

Acceptance criteria:
- Seed is idempotent using INSERT ... ON CONFLICT.
- Node definitions have useful schemas.
```

---

# 13. Phase E – Backend API Foundation

---

## Task E001 – Create NestJS API App

Priority: P0  
Size: M  
Depends on: A001

### Prompt

```text
Task E001 – Create the NestJS API app skeleton.

Target folder:
apps/api

Requirements:
- Create NestJS TypeScript app.
- Configure API prefix /api/v1.
- Add health endpoint GET /api/v1/health.
- Add ConfigModule or environment config.
- Add global validation pipe.
- Add standard error filter placeholder.
- Add CORS configured from APP_URL.

Acceptance criteria:
- API starts locally.
- GET /api/v1/health returns ok.
- No business modules yet.
```

---

## Task E002 – Add Standard API Response Helpers

Priority: P0  
Size: S  
Depends on: B001, E001

### Prompt

```text
Task E002 – Add standard API response helpers.

Target files:
apps/api/src/common/api-response.ts
apps/api/src/common/errors/api-error.ts

Requirements:
- Add successResponse<T>.
- Add errorResponse.
- Use ApiResponse and ApiError from @qsos/shared-types.
- Keep helpers simple.

Acceptance criteria:
- Health endpoint can use successResponse.
- Types compile.
```

---

## Task E003 – Add Request Context and Organization Header Helper

Priority: P0  
Size: M  
Depends on: E001

### Prompt

```text
Task E003 – Add request context helpers.

Target files:
apps/api/src/common/decorators/current-user.decorator.ts
apps/api/src/common/decorators/organization-id.decorator.ts
apps/api/src/common/guards/auth.guard.ts
apps/api/src/common/guards/organization.guard.ts

Requirements:
- Create placeholder AuthGuard that can later validate Supabase JWT.
- Create CurrentUser decorator.
- Create OrganizationId decorator that reads X-Organization-Id header.
- Create OrganizationGuard placeholder that checks organization ID exists in request.

Acceptance criteria:
- Decorators compile.
- Guards can be attached to controllers.
- No hardcoded user identity except local dev placeholder if necessary.
```

---

## Task E004 – Add Database Client Service

Priority: P0  
Size: M  
Depends on: E001

### Prompt

```text
Task E004 – Add database client service for backend.

Target files:
apps/api/src/database/database.module.ts
apps/api/src/database/database.service.ts

Requirements:
- Use DATABASE_URL from environment.
- Create a simple query method or use a selected PostgreSQL client.
- Keep implementation minimal.
- Do not expose database service to frontend.
- Add health check method.

Acceptance criteria:
- API can test database connection.
- DatabaseModule can be imported by feature modules.
```

---

# 14. Phase F – Organizations and Projects

---

## Task F001 – Implement /me Endpoint

Priority: P0  
Size: M  
Depends on: E001, E002

### Prompt

```text
Task F001 – Implement GET /me endpoint.

Target files:
apps/api/src/modules/auth/me.controller.ts
apps/api/src/modules/auth/auth.module.ts

Requirements:
- Return current user profile.
- For local MVP, allow a dev placeholder user if auth is not fully integrated.
- Use standard ApiResponse.
- Do not store passwords.

Acceptance criteria:
- GET /api/v1/me returns user object.
- Response follows standard envelope.
```

---

## Task F002 – Implement Organizations API

Priority: P0  
Size: L  
Depends on: D002, E004

### Prompt

```text
Task F002 – Implement Organizations module.

Target folder:
apps/api/src/modules/organizations

Endpoints:
POST /organizations
GET /organizations
GET /organizations/:organizationId
PATCH /organizations/:organizationId
GET /organizations/:organizationId/members

Requirements:
- Create DTOs.
- Create service.
- Create repository.
- Use standard response envelope.
- On create organization, add current user as owner/admin.
- Use database tables from migration.

Acceptance criteria:
- User can create organization.
- User can list organizations.
- Created organization has membership record.
```

---

## Task F003 – Implement Projects API

Priority: P0  
Size: L  
Depends on: D003, F002

### Prompt

```text
Task F003 – Implement Projects module.

Target folder:
apps/api/src/modules/projects

Endpoints:
POST /projects
GET /projects
GET /projects/:projectId
PATCH /projects/:projectId
POST /projects/:projectId/archive

Requirements:
- Require X-Organization-Id header.
- Create project under organization.
- List projects for organization.
- Use standard response envelope.
- Add DTO validation.

Acceptance criteria:
- User can create project.
- User can list organization projects.
- Project can be updated.
- Archive endpoint changes status or archived_at.
```

---

# 15. Phase G – Workflows and Versions

---

## Task G001 – Implement Workflows API

Priority: P0  
Size: L  
Depends on: D004, C001, E004, F003

### Prompt

```text
Task G001 – Implement Workflows module.

Target folder:
apps/api/src/modules/workflows

Endpoints:
POST /projects/:projectId/workflows
GET /projects/:projectId/workflows
GET /workflows/:workflowId
PATCH /workflows/:workflowId
DELETE /workflows/:workflowId

Requirements:
- Use workflows table.
- Require organization/project access.
- Generate workflow ID if not provided using workflow.<slug>.
- Soft delete or archive.
- Use standard response envelope.

Acceptance criteria:
- Workflow can be created under project.
- Workflow can be listed.
- Workflow detail can be fetched.
- Workflow metadata can be updated.
```

---

## Task G002 – Implement Workflow Versions API

Priority: P0  
Size: L  
Depends on: G001, C004

### Prompt

```text
Task G002 – Implement Workflow Versions API.

Target files:
apps/api/src/modules/workflows/workflow-versions.controller.ts
apps/api/src/modules/workflows/workflow-versions.service.ts

Endpoints:
POST /workflows/:workflowId/versions
GET /workflows/:workflowId/versions
GET /workflows/:workflowId/versions/:version

Requirements:
- Save Workflow JSON definition into workflow_versions.definition.
- Validate workflow before saving.
- Store schema_version.
- Store definition_hash.
- Prevent duplicate version.
- Use standard response envelope.

Acceptance criteria:
- Workflow JSON can be saved.
- Saved version can be fetched.
- Invalid workflow returns validation error.
```

---

## Task G003 – Implement Workflow Validation API

Priority: P0  
Size: M  
Depends on: C004, G001

### Prompt

```text
Task G003 – Implement POST /workflows/:workflowId/validate.

Requirements:
- Accept Workflow JSON definition in request body.
- Use @qsos/workflow-json validator.
- Return validation status and messages.
- Do not save the workflow.

Acceptance criteria:
- Valid workflow returns valid.
- Invalid workflow returns messages.
- API response follows standard envelope.
```

---

## Task G004 – Implement Workflow Template Seed and API

Priority: P1  
Size: M  
Depends on: C003, D004

### Prompt

```text
Task G004 – Implement workflow templates.

Target:
- Seed BOQ-to-RFQ template into workflow_templates.
- API:
  GET /workflow-templates
  GET /workflow-templates/:templateId
  POST /projects/:projectId/workflows/from-template

Requirements:
- Template should use BOQ-to-RFQ workflow example.
- Creating from template creates workflow and version.
- Parameters can be ignored initially or stored.

Acceptance criteria:
- Template appears in API.
- User can create workflow from template.
```

---

# 16. Phase H – Pack and Node Registry

---

## Task H001 – Implement Packs API

Priority: P0  
Size: M  
Depends on: D005

### Prompt

```text
Task H001 – Implement Packs API.

Target folder:
apps/api/src/modules/packs

Endpoints:
GET /packs/installed
GET /packs/:packId

Requirements:
- Require X-Organization-Id.
- Return installed Packs for organization.
- Return Pack manifest and metadata.
- Use standard response envelope.

Acceptance criteria:
- Installed seeded Packs are returned.
- Pack detail endpoint works.
```

---

## Task H002 – Implement Nodes API

Priority: P0  
Size: L  
Depends on: D005, D008

### Prompt

```text
Task H002 – Implement Nodes API.

Target folder:
apps/api/src/modules/nodes

Endpoints:
GET /nodes
GET /nodes/:nodeType
GET /nodes/:nodeType/ui-schema
POST /nodes/:nodeType/validate-configuration

Requirements:
- Read from registered_nodes.
- Require X-Organization-Id.
- Support filters: category, packId, search.
- Return node metadata, schemas, pack info.
- validate-configuration can be basic for MVP.

Acceptance criteria:
- Frontend can load node library from /nodes.
- Node detail returns schemas.
- Node UI schema endpoint works.
```

---

# 17. Phase I – Frontend App Shell

---

## Task I001 – Create Next.js Web App Shell

Priority: P0  
Size: L  
Depends on: A001

### Prompt

```text
Task I001 – Create QS-OS frontend app shell.

Target folder:
apps/web

Requirements:
- Next.js app router.
- Tailwind configured.
- AppShell with TopBar and Sidebar.
- Routes:
  /dashboard
  /projects
  /workflows
  /executions
  /approvals
  /documents
  /packs
  /admin/settings
- Use placeholder pages.
- Add QS-OS branding text.

Acceptance criteria:
- App runs locally.
- Sidebar navigation works.
- Dashboard placeholder visible.
```

---

## Task I002 – Create API Client

Priority: P0  
Size: M  
Depends on: I001, B001

### Prompt

```text
Task I002 – Create frontend API client.

Target file:
apps/web/lib/api-client.ts

Requirements:
- Use NEXT_PUBLIC_API_URL.
- Support GET, POST, PATCH, DELETE.
- Parse standard ApiResponse.
- Throw helpful error when API returns error.
- Attach Authorization header placeholder.
- Attach X-Organization-Id when available.

Acceptance criteria:
- API client can call /health.
- Types use @qsos/shared-types.
```

---

## Task I003 – Build Projects UI

Priority: P0  
Size: L  
Depends on: I001, I002, F003

### Prompt

```text
Task I003 – Build Projects list and create project UI.

Target files:
apps/web/app/projects/page.tsx
apps/web/components/projects/*

Requirements:
- List projects from API.
- Create project modal/form.
- Show project cards or table.
- Navigate to /projects/:projectId/overview.
- Show empty state.

Acceptance criteria:
- User can create project from UI.
- Created project appears in list.
```

---

# 18. Phase J – Workflow Canvas

---

## Task J001 – Build Workflow List UI

Priority: P0  
Size: M  
Depends on: G001, I002

### Prompt

```text
Task J001 – Build Workflow list UI for a project.

Target route:
apps/web/app/projects/[projectId]/workflows/page.tsx

Requirements:
- Fetch workflows for project.
- Show workflow name, status, current version, updated time.
- Create workflow button.
- Open editor action.
- Empty state with "Create Workflow" and "Use Template".

Acceptance criteria:
- Workflows list loads.
- User can create blank workflow.
- User can open editor.
```

---

## Task J002 – Build Workflow Editor Shell

Priority: P0  
Size: L  
Depends on: I001

### Prompt

```text
Task J002 – Build Workflow Editor shell.

Target route:
apps/web/app/workflows/[workflowId]/editor/page.tsx

Layout:
- Header with workflow name, Save, Validate, Run
- Left Node Library panel
- Center Canvas placeholder
- Right Property Panel
- Bottom Validation panel

Requirements:
- Use placeholder data initially.
- Components should be separated.
- Do not implement React Flow yet.

Acceptance criteria:
- Editor route renders complete layout.
- Buttons visible.
```

---

## Task J003 – Integrate React Flow Canvas

Priority: P0  
Size: XL  
Depends on: J002

### Prompt

```text
Task J003 – Integrate React Flow into Workflow Editor.

Target components:
apps/web/components/workflow/WorkflowCanvas.tsx
apps/web/components/workflow/CanvasNode.tsx

Requirements:
- Render nodes.
- Move nodes.
- Create edges.
- Select node.
- Show basic custom node with title and ports.
- Maintain state in workflow editor store.

Acceptance criteria:
- User can add sample nodes.
- User can connect nodes.
- Canvas zoom/pan works.
```

---

## Task J004 – Build Node Library From API

Priority: P0  
Size: L  
Depends on: H002, J003

### Prompt

```text
Task J004 – Build Node Library panel using /nodes API.

Requirements:
- Fetch nodes from /nodes.
- Group by category.
- Search nodes.
- Drag or click to add node to canvas.
- Node card shows name, category, Pack, description.

Acceptance criteria:
- Seeded MVP nodes appear.
- User can add registered node to canvas.
```

---

## Task J005 – Build Property Panel MVP

Priority: P0  
Size: L  
Depends on: J003

### Prompt

```text
Task J005 – Build Property Panel MVP.

Requirements:
- Show selected node details.
- Allow editing node name.
- Allow editing configuration as simple JSON textarea or basic generated fields.
- Show node type, pack ID, version.
- Update canvas state.

Acceptance criteria:
- Selecting node opens properties.
- Editing name/config updates node state.
```

---

## Task J006 – Save and Load Workflow JSON From Canvas

Priority: P0  
Size: XL  
Depends on: G002, J003, J005

### Prompt

```text
Task J006 – Implement save/load Workflow JSON in editor.

Requirements:
- Convert canvas nodes to Workflow JSON nodes.
- Convert edges to Workflow JSON connections.
- Save using POST /workflows/:workflowId/versions.
- Load version using GET /workflows/:workflowId/versions/:version.
- Display save status.
- Preserve node positions.

Acceptance criteria:
- User can save workflow.
- Refreshing page can reload saved workflow.
- Saved JSON validates with workflow-json package.
```

---

## Task J007 – Add Validation Panel

Priority: P0  
Size: M  
Depends on: G003, J006

### Prompt

```text
Task J007 – Add workflow validation panel.

Requirements:
- Validate button calls POST /workflows/:workflowId/validate.
- Show errors/warnings/info.
- Show validation status in header.
- Clicking message selects node if nodeId exists.

Acceptance criteria:
- Valid workflow shows valid.
- Invalid workflow shows actionable messages.
```

---

# 19. Phase K – Execution Engine MVP

---

## Task K001 – Create Execution Engine Types

Priority: P0  
Size: M  
Depends on: C001

### Prompt

```text
Task K001 – Create execution engine types.

Target package:
packages/execution-engine

Files:
src/types.ts
src/index.ts

Requirements:
Define:
- ExecutionRequest
- WorkflowExecution
- NodeExecution
- ExecutionStatus
- NodeExecutionStatus
- ExecutionError
- ExecutionPlan
- ExecutionStage
- NodeExecutionRequest

Acceptance criteria:
- Package builds.
- Types exported.
```

---

## Task K002 – Implement Graph Builder and Planner

Priority: P0  
Size: L  
Depends on: K001, C001

### Prompt

```text
Task K002 – Implement basic graph builder and execution planner.

Target files:
packages/execution-engine/src/planner/graph-builder.ts
packages/execution-engine/src/planner/execution-planner.ts
packages/execution-engine/src/tests/planner.test.ts

Requirements:
- Accept QSWorkflowDefinition.
- Build node map.
- Build incoming/outgoing connection maps.
- Determine start nodes.
- Determine simple topological order.
- Detect missing source/target nodes.
- Detect simple cycles and return error.

Acceptance criteria:
- BOQ-to-RFQ workflow produces correct order.
- Duplicate/missing nodes fail.
- Tests pass.
```

---

## Task K003 – Create Execution Tables API Integration

Priority: P0  
Size: L  
Depends on: D006, E004, K001

### Prompt

```text
Task K003 – Implement execution persistence services.

Target folder:
apps/api/src/modules/executions

Requirements:
Create services/repositories for:
- create workflow execution
- create node execution
- update execution status
- update node status
- write execution log
- store execution output
- list execution logs
- list node executions

Acceptance criteria:
- Services compile.
- Can create execution record in database.
- Can write and fetch logs.
```

---

## Task K004 – Implement Run Workflow API

Priority: P0  
Size: XL  
Depends on: G002, K002, K003, H002

### Prompt

```text
Task K004 – Implement POST /workflows/:workflowId/run.

Requirements:
- Load requested workflow version or current version.
- Create immutable execution snapshot.
- Store snapshot and hash.
- Validate workflow using workflow-json validator.
- Build execution plan.
- Create workflow_executions record.
- Execute MVP nodes through NodeRuntime placeholder or mock executor.
- Store logs.
- Return executionId and status.

MVP may execute synchronously for now.

Acceptance criteria:
- Running a simple workflow creates execution.
- Execution logs are stored.
- Execution status becomes completed or failed.
```

---

## Task K005 – Implement Node Runtime MVP

Priority: P0  
Size: XL  
Depends on: K004, H002

### Prompt

```text
Task K005 – Implement Node Runtime MVP.

Target:
apps/api/src/modules/executions/node-runtime.service.ts

Requirements:
- Resolve node executor by node type.
- Pass inputs, configuration, variables, logger, storage placeholder, database placeholder.
- Execute registered in-code node handlers.
- Capture outputs.
- Store outputs in execution_outputs.
- Store node status in node_executions.
- Handle errors.

Acceptance criteria:
- Manual Trigger, Logger, and mock Pass Through node execute.
- Output from one node can be passed to next node.
```

---

## Task K006 – Implement Execution Query APIs

Priority: P0  
Size: M  
Depends on: K003

### Prompt

```text
Task K006 – Implement execution query APIs.

Endpoints:
GET /executions/:executionId
GET /executions/:executionId/nodes
GET /executions/:executionId/logs
GET /executions/:executionId/artifacts

Acceptance criteria:
- Execution viewer can fetch status.
- Node execution list returns statuses.
- Logs endpoint supports pagination.
- Artifacts endpoint returns empty list if none.
```

---

# 20. Phase L – Documents and Storage

---

## Task L001 – Implement Storage Adapter

Priority: P0  
Size: M  
Depends on: E001

### Prompt

```text
Task L001 – Implement StorageAdapter interface and local/Supabase placeholder.

Target files:
apps/api/src/modules/storage/storage-adapter.ts
apps/api/src/modules/storage/storage.module.ts
apps/api/src/modules/storage/storage.service.ts

Requirements:
- Define upload, download, createSignedUrl methods.
- Implement local placeholder or Supabase placeholder.
- Do not expose service role key to frontend.

Acceptance criteria:
- Service compiles.
- Other modules can inject StorageService.
```

---

## Task L002 – Implement Document APIs

Priority: P0  
Size: L  
Depends on: D007, L001

### Prompt

```text
Task L002 – Implement Document module.

Endpoints:
POST /documents/upload-url
POST /projects/:projectId/documents
GET /projects/:projectId/documents
GET /documents/:documentId
GET /documents/:documentId/download-url

Requirements:
- Register document metadata.
- Return signed upload/download URLs or local placeholder URLs.
- Support documentType such as boq, rfq, report.
- Require organization/project access.

Acceptance criteria:
- User can register uploaded BOQ document.
- Documents list endpoint works.
```

---

## Task L003 – Build Documents Page UI

Priority: P0  
Size: L  
Depends on: L002, I002

### Prompt

```text
Task L003 – Build project Documents page.

Route:
apps/web/app/projects/[projectId]/documents/page.tsx

Requirements:
- List project documents.
- Upload document form.
- Select document type.
- Register uploaded document.
- Show empty state.

Acceptance criteria:
- User can add BOQ document metadata.
- Document appears in list.
```

---

# 21. Phase M – Read BOQ Node

---

## Task M001 – Create QS Pack Node Folder for ReadBOQ

Priority: P0  
Size: M  
Depends on: S5/H registry foundation

### Prompt

```text
Task M001 – Create Read BOQ node folder and metadata.

Target folder:
packs/qs-pack/nodes/ReadBOQ

Files:
index.ts
metadata.ts
schema.ts
ui.ts
executor.ts
validator.ts
README.md

Requirements:
- Node type: qs.read_boq
- Pack ID: qsos.qs-pack
- Inputs: fileRef
- Outputs: boqItems, warnings, errors
- Config fields:
  sheetName
  headerRow
  itemColumn
  descriptionColumn
  unitColumn
  quantityColumn
  rateColumn
  amountColumn
  currency

Acceptance criteria:
- Node metadata matches registry seed.
- Node exports executor.
- No Excel parsing yet.
```

---

## Task M002 – Implement Read BOQ Excel Parser

Priority: P0  
Size: XL  
Depends on: M001, L001

### Prompt

```text
Task M002 – Implement Excel parsing in Read BOQ node.

Target file:
packs/qs-pack/nodes/ReadBOQ/executor.ts

Requirements:
- Use a spreadsheet library such as xlsx.
- Load file from StorageAdapter through execution context.
- Read configured sheetName.
- Use headerRow to map columns.
- Extract itemNo, description, unit, quantity, rate, amount.
- Normalize numbers.
- Skip empty description rows.
- Return warnings for invalid rows.
- Return boqItems array.

Acceptance criteria:
- Parses sample BOQ fixture.
- Returns row count log.
- Handles missing sheet with clear error.
- Handles missing columns with clear error.
```

---

## Task M003 – Add Read BOQ Node Tests

Priority: P0  
Size: M  
Depends on: M002

### Prompt

```text
Task M003 – Add tests for Read BOQ node.

Target:
packs/qs-pack/nodes/ReadBOQ/tests/read-boq.test.ts
packages/test-fixtures/files/sample-boq.xlsx

Requirements:
- Test valid BOQ parsing.
- Test missing sheet.
- Test missing header row or column.
- Use local storage mock.

Acceptance criteria:
- Tests pass.
- Sample output includes boqItems.
```

---

# 22. Phase N – AI Classification Node

---

## Task N001 – Implement AI Provider Adapter

Priority: P0  
Size: L  
Depends on: E001

### Prompt

```text
Task N001 – Implement AI provider abstraction.

Target folder:
apps/api/src/modules/ai

Files:
ai-provider-adapter.ts
mock-ai-provider.adapter.ts
openai-compatible.adapter.ts
ai.module.ts
ai.service.ts

Requirements:
- Define generateStructured method.
- Implement MockAIProviderAdapter for tests.
- Implement OpenAI-compatible adapter placeholder using AI_PROVIDER_BASE_URL and AI_PROVIDER_API_KEY.
- Do not hardcode API keys.
- Do not expose AI key to frontend.

Acceptance criteria:
- Mock provider returns deterministic classification.
- AI service can be injected into node runtime.
```

---

## Task N002 – Seed BOQ Classification Prompt

Priority: P0  
Size: M  
Depends on: D007

### Prompt

```text
Task N002 – Seed BOQ classification prompt.

Target file:
supabase/seed/002_seed_ai_prompts.sql

Prompt ID:
prompt.boq_classification

Requirements:
- Include name, version, prompt_type, input_schema, output_schema, template.
- Output schema should include trade, confidence, reason.
- Use INSERT ON CONFLICT.

Acceptance criteria:
- Prompt exists after seed.
- Prompt can be loaded by AI service.
```

---

## Task N003 – Create AI Classify Trade Node

Priority: P0  
Size: XL  
Depends on: N001, N002, M002

### Prompt

```text
Task N003 – Implement qs.classify_trade node.

Target folder:
packs/qs-pack/nodes/ClassifyTrade

Requirements:
Inputs:
- boqItems

Configuration:
- promptId
- modelProfile
- confidenceThreshold
- batchSize
- humanReviewBelowConfidence

Outputs:
- classifiedItems
- tradePackages
- lowConfidenceItems
- warnings

Behavior:
- Batch BOQ items.
- Call AI service through execution context.
- Validate structured result.
- Attach trade and confidence to each item.
- Group items by trade.
- Log AI usage.
- Flag low confidence items.

Acceptance criteria:
- Works with MockAIProviderAdapter.
- Produces tradePackages.
- Low confidence items are separated.
- AI usage log created.
```

---

# 23. Phase O – RFQ Generation Node

---

## Task O001 – Create Basic RFQ Template

Priority: P0  
Size: M  
Depends on: L001

### Prompt

```text
Task O001 – Create basic RFQ template.

Target file:
packs/procurement-pack/templates/basic-rfq-template.html

Requirements:
- Include project name placeholder.
- Include trade package name.
- Include table of BOQ items.
- Include closing date placeholder.
- Include terms placeholder.
- Keep HTML simple.

Acceptance criteria:
- Template can be rendered with sample trade package data.
```

---

## Task O002 – Implement Split Work Package Node

Priority: P0  
Size: L  
Depends on: N003

### Prompt

```text
Task O002 – Implement qs.split_work_package node.

Target folder:
packs/qs-pack/nodes/SplitWorkPackage

Inputs:
- classifiedItems

Outputs:
- tradePackages
- packageSummary

Requirements:
- Group items by trade.
- Calculate item count and total amount per trade.
- Return trade package objects.
- Log package count.

Acceptance criteria:
- Classified items grouped correctly.
- Output is usable by Generate RFQ node.
```

---

## Task O003 – Implement Generate RFQ Node

Priority: P0  
Size: XL  
Depends on: O001, O002, L001, K005

### Prompt

```text
Task O003 – Implement procurement.generate_rfq node.

Target folder:
packs/procurement-pack/nodes/GenerateRFQ

Inputs:
- tradePackages

Configuration:
- templateId
- outputFormat
- groupByTrade
- includeQuantities
- includeTerms

Outputs:
- documents
- summary
- warnings

Requirements:
- Render basic RFQ template for each trade package.
- Generate HTML or PDF artifact.
- Store artifact using StorageAdapter.
- Create execution_artifacts record.
- Return document/artifact references.

Acceptance criteria:
- RFQ artifacts generated from tradePackages.
- Artifact metadata stored.
- User can download artifact.
```

---

# 24. Phase P – Human Approval

---

## Task P001 – Implement Approval APIs

Priority: P0  
Size: L  
Depends on: D007

### Prompt

```text
Task P001 – Implement Approval APIs.

Target folder:
apps/api/src/modules/approvals

Endpoints:
GET /approvals
GET /approvals/:approvalId
POST /approvals/:approvalId/decision
POST /approvals/:approvalId/comments

Requirements:
- List pending approvals.
- Get approval detail.
- Submit decision: approve, reject, request_changes.
- Store decided_by and decided_at.
- Use standard response envelope.

Acceptance criteria:
- Approval task can be viewed.
- Decision can be submitted.
```

---

## Task P002 – Implement Human Approval Node

Priority: P0  
Size: XL  
Depends on: P001, K005

### Prompt

```text
Task P002 – Implement core.human_approval node.

Target folder:
packs/core-pack/nodes/HumanApproval

Inputs:
- attachments
- summary

Configuration:
- title
- description
- assigneeRole
- assigneeUserId
- dueInHours
- decisionOptions

Outputs:
- approvalDecision
- comments

Behavior:
- Create approval_task.
- Pause workflow execution.
- Return waiting status to engine.
- Workflow resumes after approval decision.

Acceptance criteria:
- Approval node creates task.
- Workflow status becomes waiting/paused.
- Approval decision resumes workflow.
```

---

## Task P003 – Build Approval Inbox UI

Priority: P0  
Size: L  
Depends on: P001

### Prompt

```text
Task P003 – Build Approval Inbox UI.

Route:
apps/web/app/approvals/page.tsx

Requirements:
- List pending approvals.
- Show title, project, workflow/execution, due date, status.
- Filter by status.
- Open approval detail.

Acceptance criteria:
- Pending approval appears.
- User can open detail page.
```

---

## Task P004 – Build Approval Detail UI

Priority: P0  
Size: L  
Depends on: P003

### Prompt

```text
Task P004 – Build Approval Detail UI.

Route:
apps/web/app/approvals/[approvalId]/page.tsx

Requirements:
- Show approval title, description, context, attachments, comments.
- Show decision buttons.
- Require comment for reject/request_changes if practical.
- Submit decision through API.
- Show success status.

Acceptance criteria:
- User can approve.
- User can reject.
- Decision updates backend.
```

---

# 25. Phase Q – Execution Viewer

---

## Task Q001 – Build Execution Viewer Page

Priority: P0  
Size: XL  
Depends on: K006

### Prompt

```text
Task Q001 – Build Execution Viewer page.

Route:
apps/web/app/executions/[executionId]/page.tsx

Sections:
- Execution header
- Status summary
- Node timeline
- Logs
- Artifacts
- Approval waiting panel
- Error panel

Requirements:
- Fetch execution detail.
- Fetch node executions.
- Fetch logs.
- Fetch artifacts.
- Show statuses clearly.

Acceptance criteria:
- User can see execution status.
- User can see completed/failed/waiting nodes.
- Logs are visible.
- Artifacts are visible.
```

---

## Task Q002 – Add Execution Polling

Priority: P1  
Size: M  
Depends on: Q001

### Prompt

```text
Task Q002 – Add polling to Execution Viewer.

Requirements:
- Poll execution detail every 3 seconds while status is running/waiting/queued.
- Stop polling when completed/failed/cancelled.
- Refresh logs and node statuses.
- Avoid excessive requests.

Acceptance criteria:
- Execution viewer updates without manual refresh.
```

---

# 26. Phase R – BOQ-to-RFQ Template and Run Flow

---

## Task R001 – Seed BOQ-to-RFQ Workflow Template

Priority: P0  
Size: L  
Depends on: C003, G004

### Prompt

```text
Task R001 – Seed BOQ-to-RFQ workflow template.

Target:
supabase/seed/003_seed_workflow_templates.sql

Requirements:
- Insert template.boq_to_rfq into workflow_templates.
- Use Workflow JSON example from @qsos/workflow-json.
- Include required Packs.
- Include category Tendering.
- Include difficulty beginner.
- Include estimated setup time.

Acceptance criteria:
- Template appears in GET /workflow-templates.
- Template can create a workflow.
```

---

## Task R002 – Build Run Workflow Modal

Priority: P0  
Size: L  
Depends on: J006, K004, L003

### Prompt

```text
Task R002 – Build Run Workflow Modal.

Requirements:
- Opens when user clicks Run in workflow editor.
- Shows workflow name/version.
- Allows user to select BOQ document input.
- Shows validation warnings if any.
- Calls POST /workflows/:workflowId/run.
- Redirects to /executions/:executionId.

Acceptance criteria:
- User can run workflow from editor.
- Execution viewer opens.
```

---

## Task R003 – End-to-End BOQ-to-RFQ Wiring

Priority: P0  
Size: XL  
Depends on: M002, N003, O003, P002, Q001, R002

### Prompt

```text
Task R003 – Wire the full BOQ-to-RFQ workflow end-to-end.

Requirements:
- Workflow template nodes map to real executors.
- Run modal passes BOQ file/document reference.
- Read BOQ node receives fileRef.
- AI Classify node receives boqItems.
- Split Work Package node receives classifiedItems.
- Generate RFQ node receives tradePackages.
- Human Approval receives generated artifacts.
- Approval resumes workflow.
- Workflow completes.
- Logs and artifacts visible.

Acceptance criteria:
- End-to-end demo works with sample BOQ.
- Execution completes after approval.
- RFQ artifact can be downloaded.
```

---

# 27. Phase S – Demo Seed and QA

---

## Task S001 – Create Demo Seed Script

Priority: P0  
Size: M  
Depends on: R001

### Prompt

```text
Task S001 – Create demo seed script.

Target:
supabase/seed/004_seed_demo_data.sql

Requirements:
Seed:
- Demo organization: QS-OS Demo Contractor
- Demo project: Sample Stadium Tender
- Installed Packs
- BOQ-to-RFQ workflow from template
- Demo users if local auth allows

Acceptance criteria:
- Demo environment can be reset.
- Demo project appears after seed.
```

---

## Task S002 – Create Sample BOQ Fixture

Priority: P0  
Size: M  
Depends on: M002

### Prompt

```text
Task S002 – Create sample BOQ fixture.

Target:
packages/test-fixtures/files/sample-stadium-boq.xlsx

Requirements:
- Include realistic BOQ rows.
- Include item no, description, unit, quantity, rate, amount.
- Include multiple trades:
  Preliminaries, Earthworks, Concrete, Reinforcement, Masonry, Roofing, Floor Finishes, Painting, MEP, External Works.
- Keep file safe and non-confidential.

Acceptance criteria:
- Read BOQ node can parse it.
- Demo workflow can use it.
```

---

## Task S003 – Create MVP Manual QA Script

Priority: P0  
Size: S  
Depends on: R003

### Prompt

```text
Task S003 – Create MVP manual QA script.

Target file:
docs/testing/mvp-manual-qa-script.md

Requirements:
Include steps:
1. Login
2. Create organization
3. Create project
4. Upload BOQ
5. Create workflow from template
6. Validate workflow
7. Run workflow
8. Check execution viewer
9. Approve RFQ
10. Download artifact
11. Review logs

Acceptance criteria:
- QA script is clear.
- Each step has expected result.
```

---

## Task S004 – Create MVP Demo Script

Priority: P0  
Size: S  
Depends on: R003

### Prompt

```text
Task S004 – Create MVP demo script.

Target file:
docs/demo/mvp-boq-to-rfq-demo-script.md

Requirements:
- Explain QS-OS in simple language.
- Walk through BOQ-to-RFQ demo.
- Highlight visual workflow, AI classification, human approval, execution logs, artifacts.
- Include opening and closing script.

Acceptance criteria:
- Demo script can be used by founder/presenter.
```

---

## Task S005 – MVP Hardening Pass

Priority: P0  
Size: L  
Depends on: R003

### Prompt

```text
Task S005 – MVP hardening pass.

Requirements:
Review and improve:
- Loading states
- Empty states
- Error messages
- Validation messages
- Execution failure display
- Missing BOQ file handling
- Missing node type handling
- Missing Pack handling
- AI provider failure handling
- RFQ artifact failure handling

Acceptance criteria:
- Common demo failures show user-friendly messages.
- App does not crash during normal MVP demo.
```

---

# 28. Cowork Execution Boards

Recommended boards:

```text
Backlog
Ready for Codex/Cowork
In Progress
Needs Review
Testing
Done
Blocked
```

Each task should be moved one at a time.

---

# 29. Suggested GitHub Issue Format

```markdown
## Task
Task ID and title.

## Context
Short explanation.

## Target Files
- ...

## Requirements
- ...

## Acceptance Criteria
- [ ] ...

## Test Instructions
- ...

## Boundaries
Do not modify unrelated files.
Do not hardcode secrets.
```

---

# 30. Suggested Pull Request Template

```markdown
## Summary

## Task ID

## Changes Made

## Screenshots if UI

## Tests Run

## Checklist
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] No secrets
- [ ] Acceptance criteria met
```

---

# 31. Task Dependency Map

```text
A001
  ↓
B001
  ↓
C001 → C004
  ↓
G001/G002/G003

D001 → D002 → D003 → D004 → D005/D006/D007
  ↓
F002/F003/G001/H001/H002/K003/L002/P001

I001 → I002 → I003
J001 → J002 → J003 → J004/J005 → J006 → J007/R002

K001 → K002 → K003 → K004 → K005 → K006
M001 → M002 → M003
N001 → N002 → N003
O001/O002 → O003
P001 → P002/P003/P004
Q001 → Q002
R001/R002 → R003
S001-S005
```

---

# 32. MVP Completion Checklist

The MVP Technical Task Pack is complete when:

```text
[ ] Repository runs locally
[ ] Database migrations complete
[ ] Seed Packs and Nodes loaded
[ ] Auth/context works
[ ] Projects work
[ ] Workflows save/load
[ ] Workflow canvas works
[ ] Node library loads from API
[ ] Execution engine runs simple graph
[ ] BOQ upload works
[ ] Read BOQ node works
[ ] AI Classify node works with mock/live provider
[ ] RFQ generation works
[ ] Approval pauses/resumes workflow
[ ] Execution viewer shows logs and artifacts
[ ] BOQ-to-RFQ demo works end-to-end
```

---

# 33. What Not to Build Yet

Do not assign these tasks before MVP spine works:

```text
Full marketplace
Paid Pack billing
Full supplier portal
Full BIM viewer
Full contract administration suite
Advanced final account workflow
Workflow collaboration
Advanced workflow diff
Complex compensation engine
Multi-region execution
Mobile workflow editor
```

---

# 34. Recommended Immediate Task for Codex/Cowork

Start with:

```text
Task A001 – Create Monorepo Skeleton
```

Then:

```text
Task B001 – Create Shared Types Package
Task C001 – Create Workflow JSON Package
Task C004 – Implement Workflow Validator MVP
Task D002 – Create Core Identity Migration
```

This creates the foundation before app complexity.

---

# 35. Final Formula

```text
Volume 14 =
  QS-OS Architecture
  + MVP Backlog
  + Developer Setup
  + Codex/Cowork Task Prompts
```

```text
Small tasks build the system.
Large vague prompts create chaos.
```

---

# Conclusion

Volume 14 is the execution bridge for AI-assisted development.

It allows QS-OS to be built in controlled steps:

```text
Set up repo
Create types
Create database
Create APIs
Create UI
Create canvas
Create registry
Create engine
Create nodes
Run BOQ-to-RFQ
Approve
Download artifact
```

The recommended approach is simple:

```text
Copy one task.
Run it in Codex/Cowork.
Review the diff.
Test it.
Commit it.
Move to the next task.
```

This is how QS-OS should move from documentation into working software.
