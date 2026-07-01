# QS-OS Workflow Engine Blueprint
# Volume 8 – API Specification
Version: 1.0

> This specification defines the backend API architecture for QS-OS.
>
> It covers REST endpoints, request and response formats, authentication, authorization, organization scoping, project scoping, workflow APIs, Pack APIs, Node APIs, Execution APIs, Approval APIs, Document APIs, QS domain APIs, Procurement APIs, Contract APIs, AI APIs, Audit APIs, notification APIs, real-time updates, webhook APIs, API errors, pagination, filtering, idempotency, versioning, and OpenAPI readiness.
>
> This document is designed for a **NestJS + Supabase + PostgreSQL + Workflow Execution Engine** implementation.

---

# 1. Purpose

The QS-OS API is the communication layer between:

```text
Frontend
  ↓
Backend API
  ↓
Database / Storage / Execution Engine / AI / Integrations
```

The API enables:

- User and organization management
- Project workspaces
- Workflow creation and editing
- Workflow JSON save/load
- Workflow validation
- Pack installation and management
- Node registry access
- Workflow execution
- Execution log viewing
- Human approval decisions
- Document upload and generation
- BOQ and QS data operations
- Procurement workflows
- Contract workflows
- AI usage and prompt management
- Audit logs
- Notifications
- Admin settings

---

# 2. API Philosophy

QS-OS APIs should be:

- Consistent
- Secure
- Organization-scoped
- Project-aware
- Auditable
- Versioned
- Typed
- Easy for frontend developers
- Easy for AI coding agents
- Compatible with future OpenAPI generation

The API should not expose internal implementation details unnecessarily.

---

# 3. API Architecture

```text
Client
  ↓
API Gateway / NestJS Controllers
  ↓
Guards / Auth / Permissions
  ↓
DTO Validation
  ↓
Application Services
  ↓
Domain Services
  ↓
Repositories
  ↓
Database / Storage / Queue / AI / Integrations
```

---

# 4. Recommended Backend Stack

```text
NestJS
TypeScript
Supabase Auth
Supabase PostgreSQL
Supabase Storage
BullMQ / Redis
OpenAPI / Swagger
Zod or class-validator
WebSocket or Server-Sent Events
```

---

# 5. API Base URL

Recommended base path:

```text
/api/v1
```

Example:

```text
GET /api/v1/projects
POST /api/v1/workflows
POST /api/v1/workflows/:id/run
```

Future versions:

```text
/api/v2
```

---

# 6. API Versioning

QS-OS should use URL-based API versioning for clarity.

```text
/api/v1
/api/v2
```

Versioning rules:

```text
Minor non-breaking changes can remain in same version.
Breaking response or request changes require new API version.
Deprecated endpoints should remain for a migration window.
```

---

# 7. Authentication

Authentication is handled by Supabase Auth or compatible JWT-based authentication.

Client sends:

```http
Authorization: Bearer <access_token>
```

Backend must verify:

```text
JWT validity
User identity
Organization membership
Project membership where applicable
Role permissions
Pack permissions where applicable
```

---

# 8. Authorization Model

Authorization is layered:

```text
User authentication
  ↓
Organization membership
  ↓
Organization role
  ↓
Project role
  ↓
Workflow permission
  ↓
Pack permission
  ↓
Node/action permission
```

Example:

```text
User may view project
but may not install Pack
but may run workflow
but may not approve payment certificate
```

---

# 9. Organization Scoping

Most APIs must be scoped by organization.

Recommended header:

```http
X-Organization-Id: <organization_id>
```

Alternative:

```text
organizationId in path
```

Recommended approach:

```text
Use header for active organization context.
Use path for organization management endpoints.
```

Example:

```http
GET /api/v1/projects
X-Organization-Id: org-placeholder
```

---

# 10. Project Scoping

Project-specific APIs should include project ID in path.

Example:

```http
GET /api/v1/projects/:projectId/workflows
POST /api/v1/projects/:projectId/documents
GET /api/v1/projects/:projectId/boqs
```

---

# 11. Standard Response Envelope

All successful API responses should use a consistent shape.

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "error": null
}
```

For errors:

```json
{
  "success": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow was not found.",
    "details": {}
  }
}
```

---

# 12. Error Object

Standard error object:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "details": {
    "field": "name",
    "reason": "Name is required."
  },
  "requestId": "request-placeholder",
  "timestamp": "2026-06-15T00:00:00.000Z"
}
```

---

# 13. Common HTTP Status Codes

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
503 Service Unavailable
```

---

# 14. Common Error Codes

```text
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
RESOURCE_NOT_FOUND
ORGANIZATION_REQUIRED
PROJECT_REQUIRED
PERMISSION_DENIED
WORKFLOW_NOT_FOUND
WORKFLOW_INVALID
WORKFLOW_VERSION_NOT_FOUND
PACK_NOT_INSTALLED
NODE_TYPE_NOT_FOUND
EXECUTION_NOT_FOUND
APPROVAL_NOT_FOUND
DOCUMENT_NOT_FOUND
AI_PROVIDER_UNAVAILABLE
RATE_LIMITED
CONFLICT
INTERNAL_ERROR
```

---

# 15. Pagination

List endpoints should support pagination.

Query parameters:

```text
page
limit
sort
order
```

Example:

```http
GET /api/v1/projects?page=1&limit=20&sort=created_at&order=desc
```

Response meta:

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

---

# 16. Filtering

Common filters:

```text
status
category
projectId
workflowId
executionId
createdBy
createdFrom
createdTo
search
```

Example:

```http
GET /api/v1/workflows?projectId=project-placeholder&status=active&search=rfq
```

---

# 17. Sorting

Common sort fields:

```text
created_at
updated_at
name
status
started_at
completed_at
```

Example:

```http
GET /api/v1/executions?sort=started_at&order=desc
```

---

# 18. Idempotency

Side-effect endpoints should support idempotency.

Header:

```http
Idempotency-Key: unique-client-generated-key
```

Use for:

```text
Run workflow
Send RFQ
Generate Purchase Order
Approve payment certificate
Create external integration action
Webhook processing
```

---

# 19. Request ID

Every request should have a request ID.

Header:

```http
X-Request-Id: request-placeholder
```

If client does not provide one, server generates one.

Request ID should appear in logs.

---

# 20. API Domain Groups

```text
Auth / Me
Organizations
Projects
Workflows
Workflow Versions
Workflow Templates
Packs
Nodes
Executions
Approvals
Documents
QS / BOQ
Procurement
Contract
AI
Notifications
Audit
Admin
Webhooks
Realtime
```

---

# 21. Auth and Me APIs

Supabase handles most auth actions.

QS-OS backend should expose profile and context APIs.

---

# 22. Get Current User

```http
GET /api/v1/me
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "user-placeholder",
    "email": "user@example.com",
    "fullName": "User Name",
    "locale": "en",
    "timezone": "Asia/Kuala_Lumpur"
  },
  "meta": {},
  "error": null
}
```

---

# 23. Update Current User Profile

```http
PATCH /api/v1/me
```

Request:

```json
{
  "fullName": "User Name",
  "displayName": "User",
  "locale": "en",
  "timezone": "Asia/Kuala_Lumpur"
}
```

---

# 24. Get Current User Organizations

```http
GET /api/v1/me/organizations
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "org-placeholder",
      "name": "Example Contractor",
      "role": "admin",
      "status": "active"
    }
  ],
  "meta": {},
  "error": null
}
```

---

# 25. Organization APIs

Organizations represent companies or workspaces.

---

# 26. Create Organization

```http
POST /api/v1/organizations
```

Request:

```json
{
  "name": "Example Contractor",
  "type": "contractor",
  "country": "MY",
  "defaultCurrency": "MYR",
  "defaultTimezone": "Asia/Kuala_Lumpur"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "org-placeholder",
    "name": "Example Contractor",
    "type": "contractor",
    "status": "active"
  },
  "meta": {},
  "error": null
}
```

---

# 27. List Organizations

```http
GET /api/v1/organizations
```

Returns organizations where the current user is a member.

---

# 28. Get Organization

```http
GET /api/v1/organizations/:organizationId
```

---

# 29. Update Organization

```http
PATCH /api/v1/organizations/:organizationId
```

Admin only.

---

# 30. List Organization Members

```http
GET /api/v1/organizations/:organizationId/members
```

---

# 31. Invite Organization Member

```http
POST /api/v1/organizations/:organizationId/invitations
```

Request:

```json
{
  "email": "qs@example.com",
  "role": "qs"
}
```

---

# 32. Update Member Role

```http
PATCH /api/v1/organizations/:organizationId/members/:memberId
```

Request:

```json
{
  "role": "senior_qs"
}
```

---

# 33. Remove Member

```http
DELETE /api/v1/organizations/:organizationId/members/:memberId
```

Soft remove recommended.

---

# 34. Project APIs

Projects are workspaces for QS and construction workflows.

---

# 35. Create Project

```http
POST /api/v1/projects
```

Headers:

```http
X-Organization-Id: org-placeholder
```

Request:

```json
{
  "name": "Mini Stadium Project",
  "code": "MS-001",
  "clientName": "Client Name",
  "location": "Malaysia",
  "currency": "MYR",
  "projectType": "sports_facility",
  "contractType": "design_and_build"
}
```

---

# 36. List Projects

```http
GET /api/v1/projects
```

Filters:

```text
status
search
projectType
createdFrom
createdTo
```

---

# 37. Get Project

```http
GET /api/v1/projects/:projectId
```

---

# 38. Update Project

```http
PATCH /api/v1/projects/:projectId
```

---

# 39. Archive Project

```http
POST /api/v1/projects/:projectId/archive
```

---

# 40. Project Members

```http
GET    /api/v1/projects/:projectId/members
POST   /api/v1/projects/:projectId/members
PATCH  /api/v1/projects/:projectId/members/:memberId
DELETE /api/v1/projects/:projectId/members/:memberId
```

---

# 41. Workflow APIs

Workflow APIs manage Workflow JSON definitions.

---

# 42. Create Workflow

```http
POST /api/v1/projects/:projectId/workflows
```

Request:

```json
{
  "id": "workflow.tender_boq_to_rfq",
  "name": "Tender BOQ to RFQ",
  "description": "Reads BOQ, classifies trades, and generates RFQs.",
  "category": "Tendering",
  "tags": ["boq", "rfq"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "workflow.tender_boq_to_rfq",
    "name": "Tender BOQ to RFQ",
    "status": "draft",
    "currentVersion": null
  },
  "meta": {},
  "error": null
}
```

---

# 43. List Workflows

```http
GET /api/v1/projects/:projectId/workflows
```

Filters:

```text
status
category
search
tag
```

---

# 44. Get Workflow

```http
GET /api/v1/workflows/:workflowId
```

Response includes workflow metadata, not necessarily full definition.

---

# 45. Update Workflow Metadata

```http
PATCH /api/v1/workflows/:workflowId
```

Request:

```json
{
  "name": "Tender BOQ to RFQ",
  "description": "Updated description.",
  "category": "Tendering",
  "tags": ["boq", "rfq", "tender"]
}
```

---

# 46. Delete Workflow

```http
DELETE /api/v1/workflows/:workflowId
```

Recommended behavior:

```text
Soft delete if never executed.
Archive if execution history exists.
```

---

# 47. Save Workflow Definition

```http
POST /api/v1/workflows/:workflowId/versions
```

Request:

```json
{
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "definition": {
    "schemaVersion": "1.0.0",
    "workflow": {},
    "dependencies": {},
    "nodes": [],
    "connections": [],
    "metadata": {}
  },
  "changeSummary": "Initial workflow definition."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "workflowVersionId": "version-placeholder",
    "workflowId": "workflow.tender_boq_to_rfq",
    "version": "1.0.0",
    "status": "draft",
    "validationStatus": "valid"
  },
  "meta": {},
  "error": null
}
```

---

# 48. List Workflow Versions

```http
GET /api/v1/workflows/:workflowId/versions
```

---

# 49. Get Workflow Version

```http
GET /api/v1/workflows/:workflowId/versions/:version
```

Returns full Workflow JSON definition.

---

# 50. Validate Workflow

```http
POST /api/v1/workflows/:workflowId/validate
```

Request:

```json
{
  "version": "1.0.0",
  "definition": {}
}
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "validWithWarnings",
    "messages": [
      {
        "level": "warning",
        "code": "OPTIONAL_AI_PACK_MISSING",
        "message": "AI Pack is optional but not installed."
      }
    ]
  },
  "meta": {},
  "error": null
}
```

---

# 51. Activate Workflow

```http
POST /api/v1/workflows/:workflowId/activate
```

Request:

```json
{
  "version": "1.0.0"
}
```

Rules:

- Validate workflow.
- Check permissions.
- Check dependencies.
- Publish version.
- Mark workflow active.
- Enable triggers if configured.

---

# 52. Deactivate Workflow

```http
POST /api/v1/workflows/:workflowId/deactivate
```

---

# 53. Archive Workflow

```http
POST /api/v1/workflows/:workflowId/archive
```

---

# 54. Duplicate Workflow

```http
POST /api/v1/workflows/:workflowId/duplicate
```

Request:

```json
{
  "name": "Tender BOQ to RFQ Copy",
  "projectId": "project-placeholder"
}
```

---

# 55. Export Workflow

```http
GET /api/v1/workflows/:workflowId/export?version=1.0.0
```

Returns:

```text
.qsworkflow.json
```

Export must remove secrets and runtime-only data.

---

# 56. Import Workflow

```http
POST /api/v1/projects/:projectId/workflows/import
```

Request:

```json
{
  "definition": {},
  "importMode": "draft",
  "remapSecrets": true
}
```

Imported workflows should default to safe mode:

```text
Triggers disabled
External sending disabled
Secrets unmapped
Permissions require approval
```

---

# 57. Workflow Template APIs

Templates help users start from known processes.

---

# 58. List Workflow Templates

```http
GET /api/v1/workflow-templates
```

Filters:

```text
category
packId
difficulty
visibility
search
```

---

# 59. Get Workflow Template

```http
GET /api/v1/workflow-templates/:templateId
```

---

# 60. Create Workflow From Template

```http
POST /api/v1/projects/:projectId/workflows/from-template
```

Request:

```json
{
  "templateId": "template.tender_boq_to_rfq",
  "name": "Tender BOQ to RFQ",
  "parameters": {
    "defaultCurrency": "MYR",
    "approvalRole": "Procurement Manager"
  }
}
```

---

# 61. Pack APIs

Pack APIs manage installable capability modules.

---

# 62. List Installed Packs

```http
GET /api/v1/packs/installed
```

Headers:

```http
X-Organization-Id: org-placeholder
```

---

# 63. Get Pack Details

```http
GET /api/v1/packs/:packId
```

---

# 64. Install Local Pack

```http
POST /api/v1/packs/install-local
```

Request:

```json
{
  "packArchiveRef": "storage.pack-archive-ref",
  "grantPermissions": [
    "storage.read",
    "storage.write",
    "database.write"
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "packInstallationId": "installation-placeholder",
    "packId": "qsos.qs-pack",
    "version": "1.0.0",
    "status": "active"
  },
  "meta": {},
  "error": null
}
```

---

# 65. Validate Pack

```http
POST /api/v1/packs/validate
```

Request:

```json
{
  "manifest": {}
}
```

---

# 66. Uninstall Pack

```http
POST /api/v1/packs/:packId/uninstall
```

Request:

```json
{
  "force": false
}
```

Rules:

- Check workflows using Pack.
- Warn if dependencies exist.
- Preserve historical executions.
- Mark affected workflows invalid if forced.

---

# 67. Update Pack

```http
POST /api/v1/packs/:packId/update
```

Request:

```json
{
  "version": "1.1.0"
}
```

---

# 68. Grant Pack Permission

```http
POST /api/v1/packs/:packId/permissions/grant
```

Request:

```json
{
  "permissions": [
    "ai.invoke",
    "document.generate"
  ]
}
```

Admin only.

---

# 69. Revoke Pack Permission

```http
POST /api/v1/packs/:packId/permissions/revoke
```

Request:

```json
{
  "permissions": [
    "email.send"
  ]
}
```

---

# 70. Node Registry APIs

Nodes are capabilities registered by installed Packs.

---

# 71. List Registered Nodes

```http
GET /api/v1/nodes
```

Filters:

```text
packId
category
search
status
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "nodeType": "qs.read_boq",
      "displayName": "Read BOQ",
      "category": "QS",
      "packId": "qsos.qs-pack",
      "nodeVersion": "1.0.0",
      "description": "Reads and normalizes BOQ spreadsheet data."
    }
  ],
  "meta": {},
  "error": null
}
```

---

# 72. Get Node Definition

```http
GET /api/v1/nodes/:nodeType
```

Response includes:

```text
metadata
input schema
output schema
configuration schema
UI schema
documentation reference
Pack source
version
```

---

# 73. Get Node UI Schema

```http
GET /api/v1/nodes/:nodeType/ui-schema
```

Used by workflow canvas property panel.

---

# 74. Validate Node Configuration

```http
POST /api/v1/nodes/:nodeType/validate-configuration
```

Request:

```json
{
  "configuration": {
    "sheetName": "BQ",
    "headerRow": 7
  }
}
```

---

# 75. Execution APIs

Execution APIs run and monitor workflows.

---

# 76. Run Workflow

```http
POST /api/v1/workflows/:workflowId/run
```

Headers:

```http
Idempotency-Key: run-workflow-unique-key
```

Request:

```json
{
  "workflowVersion": "1.0.0",
  "mode": "standard",
  "inputs": {
    "boqFile": "file-placeholder"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "executionId": "execution-placeholder",
    "status": "queued"
  },
  "meta": {},
  "error": null
}
```

---

# 77. Get Execution

```http
GET /api/v1/executions/:executionId
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "execution-placeholder",
    "workflowId": "workflow.tender_boq_to_rfq",
    "workflowVersion": "1.0.0",
    "status": "running",
    "mode": "standard",
    "startedAt": "2026-06-15T00:00:00.000Z",
    "completedAt": null
  },
  "meta": {},
  "error": null
}
```

---

# 78. List Executions

```http
GET /api/v1/executions
```

Filters:

```text
workflowId
projectId
status
mode
startedFrom
startedTo
```

---

# 79. Get Execution Nodes

```http
GET /api/v1/executions/:executionId/nodes
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "nodeId": "node_read_boq",
      "nodeType": "qs.read_boq",
      "status": "completed",
      "attempt": 1,
      "durationMs": 1200
    }
  ],
  "meta": {},
  "error": null
}
```

---

# 80. Get Execution Logs

```http
GET /api/v1/executions/:executionId/logs
```

Filters:

```text
level
nodeId
from
to
page
limit
```

---

# 81. Get Execution Outputs

```http
GET /api/v1/executions/:executionId/outputs
```

---

# 82. Get Node Output

```http
GET /api/v1/executions/:executionId/nodes/:nodeId/outputs
```

---

# 83. Get Execution Artifacts

```http
GET /api/v1/executions/:executionId/artifacts
```

---

# 84. Cancel Execution

```http
POST /api/v1/executions/:executionId/cancel
```

Request:

```json
{
  "reason": "User cancelled execution."
}
```

---

# 85. Pause Execution

```http
POST /api/v1/executions/:executionId/pause
```

---

# 86. Resume Execution

```http
POST /api/v1/executions/:executionId/resume
```

---

# 87. Retry Execution

```http
POST /api/v1/executions/:executionId/retry
```

Request:

```json
{
  "fromNodeId": "node_generate_rfq",
  "mode": "from_failed_node"
}
```

---

# 88. Retry Node Execution

```http
POST /api/v1/executions/:executionId/nodes/:nodeId/retry
```

---

# 89. Get Execution Checkpoints

```http
GET /api/v1/executions/:executionId/checkpoints
```

---

# 90. Replay Execution

```http
POST /api/v1/executions/:executionId/replay
```

Request:

```json
{
  "mode": "dryRun",
  "allowSideEffects": false
}
```

---

# 91. Approval APIs

Approval APIs manage human decisions.

---

# 92. List Approval Tasks

```http
GET /api/v1/approvals
```

Filters:

```text
status
projectId
executionId
assignee
dueBefore
```

---

# 93. Get Approval Task

```http
GET /api/v1/approvals/:approvalId
```

---

# 94. Submit Approval Decision

```http
POST /api/v1/approvals/:approvalId/decision
```

Request:

```json
{
  "decision": "approve",
  "comments": "Reviewed and approved."
}
```

Supported decisions:

```text
approve
reject
request_changes
delegate
cancel
```

---

# 95. Delegate Approval

```http
POST /api/v1/approvals/:approvalId/delegate
```

Request:

```json
{
  "assigneeUserId": "user-placeholder",
  "comments": "Delegated to Senior QS."
}
```

---

# 96. Add Approval Comment

```http
POST /api/v1/approvals/:approvalId/comments
```

Request:

```json
{
  "comment": "Please check the RFQ scope for MEP items."
}
```

---

# 97. List Approval Comments

```http
GET /api/v1/approvals/:approvalId/comments
```

---

# 98. Document APIs

Document APIs manage file metadata and file operations.

---

# 99. Create Upload URL

```http
POST /api/v1/documents/upload-url
```

Request:

```json
{
  "projectId": "project-placeholder",
  "fileName": "tender-boq.xlsx",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "documentType": "boq"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "uploadUrl": "signed-upload-url",
    "storageRef": "storage-ref-placeholder"
  },
  "meta": {},
  "error": null
}
```

---

# 100. Register Uploaded Document

```http
POST /api/v1/projects/:projectId/documents
```

Request:

```json
{
  "name": "Tender BOQ",
  "documentType": "boq",
  "storageRef": "storage-ref-placeholder",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "sizeBytes": 123456
}
```

---

# 101. List Documents

```http
GET /api/v1/projects/:projectId/documents
```

Filters:

```text
documentType
status
search
```

---

# 102. Get Document

```http
GET /api/v1/documents/:documentId
```

---

# 103. Get Document Download URL

```http
GET /api/v1/documents/:documentId/download-url
```

---

# 104. Create Document Version

```http
POST /api/v1/documents/:documentId/versions
```

---

# 105. Link Document

```http
POST /api/v1/documents/:documentId/links
```

Request:

```json
{
  "linkedType": "execution",
  "linkedId": "execution-placeholder",
  "relationship": "output"
}
```

---

# 106. QS / BOQ APIs

QS APIs expose structured QS data.

For MVP, BOQ data may initially be stored as workflow outputs and artifacts. Structured BOQ tables can be added when stable.

---

# 107. Create BOQ From Document

```http
POST /api/v1/projects/:projectId/boqs/from-document
```

Request:

```json
{
  "documentId": "document-placeholder",
  "name": "Tender BOQ",
  "options": {
    "sheetName": "BQ",
    "headerRow": 7
  }
}
```

---

# 108. List BOQs

```http
GET /api/v1/projects/:projectId/boqs
```

---

# 109. Get BOQ

```http
GET /api/v1/boqs/:boqId
```

---

# 110. List BOQ Items

```http
GET /api/v1/boqs/:boqId/items
```

Filters:

```text
trade
section
search
page
limit
```

---

# 111. Update BOQ Item

```http
PATCH /api/v1/boq-items/:boqItemId
```

Request:

```json
{
  "description": "Updated description",
  "unit": "m2",
  "quantity": 100,
  "rate": 25.5,
  "trade": "Floor Finishes"
}
```

---

# 112. Generate Trade Packages

```http
POST /api/v1/boqs/:boqId/generate-trade-packages
```

Request:

```json
{
  "mode": "ai-assisted",
  "confidenceThreshold": 0.9,
  "humanReviewBelowConfidence": true
}
```

---

# 113. List Trade Packages

```http
GET /api/v1/projects/:projectId/trade-packages
```

---

# 114. Get Trade Package

```http
GET /api/v1/trade-packages/:tradePackageId
```

---

# 115. Procurement APIs

Procurement APIs manage suppliers, RFQs, quotations, comparisons, and purchase orders.

---

# 116. Supplier APIs

```http
GET    /api/v1/suppliers
POST   /api/v1/suppliers
GET    /api/v1/suppliers/:supplierId
PATCH  /api/v1/suppliers/:supplierId
DELETE /api/v1/suppliers/:supplierId
```

Create supplier request:

```json
{
  "name": "ABC Supplier Sdn Bhd",
  "contactName": "Supplier Contact",
  "email": "supplier@example.com",
  "phone": "+60123456789",
  "tradeCategories": ["Concrete", "Finishes"]
}
```

---

# 117. RFQ APIs

```http
GET    /api/v1/projects/:projectId/rfqs
POST   /api/v1/projects/:projectId/rfqs
GET    /api/v1/rfqs/:rfqId
PATCH  /api/v1/rfqs/:rfqId
POST   /api/v1/rfqs/:rfqId/send
POST   /api/v1/rfqs/:rfqId/close
```

Create RFQ request:

```json
{
  "title": "RFQ for Floor Finishes",
  "tradePackageId": "trade-package-placeholder",
  "closingDate": "2026-07-01",
  "supplierIds": ["supplier-placeholder"]
}
```

---

# 118. Send RFQ

```http
POST /api/v1/rfqs/:rfqId/send
```

Headers:

```http
Idempotency-Key: rfq-send-placeholder
```

Request:

```json
{
  "channel": "email",
  "message": "Please submit your quotation before the closing date.",
  "requireApproval": true
}
```

---

# 119. Quotation APIs

```http
GET    /api/v1/rfqs/:rfqId/quotations
POST   /api/v1/rfqs/:rfqId/quotations
GET    /api/v1/quotations/:quotationId
PATCH  /api/v1/quotations/:quotationId
```

---

# 120. Create Quotation

```http
POST /api/v1/rfqs/:rfqId/quotations
```

Request:

```json
{
  "supplierId": "supplier-placeholder",
  "quotationNo": "Q-001",
  "documentId": "document-placeholder",
  "totalAmount": 120000,
  "currency": "MYR"
}
```

---

# 121. Compare Quotations

```http
POST /api/v1/rfqs/:rfqId/compare-quotations
```

Request:

```json
{
  "quotationIds": [
    "quotation-1",
    "quotation-2"
  ],
  "mode": "ai-assisted",
  "weighting": {
    "price": 0.7,
    "compliance": 0.2,
    "delivery": 0.1
  }
}
```

---

# 122. Purchase Order APIs

```http
GET    /api/v1/projects/:projectId/purchase-orders
POST   /api/v1/projects/:projectId/purchase-orders
GET    /api/v1/purchase-orders/:purchaseOrderId
PATCH  /api/v1/purchase-orders/:purchaseOrderId
POST   /api/v1/purchase-orders/:purchaseOrderId/approve
POST   /api/v1/purchase-orders/:purchaseOrderId/issue
```

---

# 123. Contract APIs

Contract APIs support contract administration.

---

# 124. Contract Resource APIs

```http
GET    /api/v1/projects/:projectId/contracts
POST   /api/v1/projects/:projectId/contracts
GET    /api/v1/contracts/:contractId
PATCH  /api/v1/contracts/:contractId
```

---

# 125. Variation Order APIs

```http
GET    /api/v1/projects/:projectId/variation-orders
POST   /api/v1/projects/:projectId/variation-orders
GET    /api/v1/variation-orders/:variationOrderId
PATCH  /api/v1/variation-orders/:variationOrderId
POST   /api/v1/variation-orders/:variationOrderId/submit
POST   /api/v1/variation-orders/:variationOrderId/approve
```

---

# 126. Progress Claim APIs

```http
GET    /api/v1/projects/:projectId/progress-claims
POST   /api/v1/projects/:projectId/progress-claims
GET    /api/v1/progress-claims/:progressClaimId
PATCH  /api/v1/progress-claims/:progressClaimId
POST   /api/v1/progress-claims/:progressClaimId/submit
```

---

# 127. Payment Certificate APIs

```http
GET    /api/v1/projects/:projectId/payment-certificates
POST   /api/v1/projects/:projectId/payment-certificates
GET    /api/v1/payment-certificates/:certificateId
PATCH  /api/v1/payment-certificates/:certificateId
POST   /api/v1/payment-certificates/:certificateId/approve
POST   /api/v1/payment-certificates/:certificateId/issue
```

---

# 128. Final Account APIs

```http
GET    /api/v1/projects/:projectId/final-accounts
POST   /api/v1/projects/:projectId/final-accounts
GET    /api/v1/final-accounts/:finalAccountId
PATCH  /api/v1/final-accounts/:finalAccountId
POST   /api/v1/final-accounts/:finalAccountId/approve
```

---

# 129. AI APIs

AI APIs manage prompts, usage logs, and AI review records.

---

# 130. List AI Prompts

```http
GET /api/v1/ai/prompts
```

Filters:

```text
packId
promptType
status
search
```

---

# 131. Get AI Prompt

```http
GET /api/v1/ai/prompts/:promptId
```

---

# 132. Create AI Prompt

```http
POST /api/v1/ai/prompts
```

Admin or developer only.

Request:

```json
{
  "id": "prompt.boq_classification",
  "name": "BOQ Classification Prompt",
  "version": "1.0.0",
  "promptType": "classification",
  "inputSchema": {},
  "outputSchema": {},
  "template": "Classify this BOQ item..."
}
```

---

# 133. Test AI Prompt

```http
POST /api/v1/ai/prompts/:promptId/test
```

Request:

```json
{
  "input": {
    "boqItemDescription": "Supply and lay ceramic floor tiles."
  },
  "modelProfile": "standard-classifier"
}
```

---

# 134. List AI Usage Logs

```http
GET /api/v1/ai/usage
```

Filters:

```text
projectId
workflowId
executionId
nodeId
provider
modelProfile
from
to
```

---

# 135. List AI Reviews

```http
GET /api/v1/ai/reviews
```

---

# 136. Get AI Review

```http
GET /api/v1/ai/reviews/:reviewId
```

---

# 137. Notification APIs

---

# 138. List Notifications

```http
GET /api/v1/notifications
```

Filters:

```text
status
notificationType
projectId
```

---

# 139. Mark Notification Read

```http
POST /api/v1/notifications/:notificationId/read
```

---

# 140. Mark All Notifications Read

```http
POST /api/v1/notifications/read-all
```

---

# 141. Audit APIs

Audit APIs expose audit records for admins and authorized users.

---

# 142. List Audit Logs

```http
GET /api/v1/audit-logs
```

Filters:

```text
projectId
actorUserId
action
targetType
targetId
from
to
```

---

# 143. Get Audit Log

```http
GET /api/v1/audit-logs/:auditLogId
```

---

# 144. Export Audit Logs

```http
GET /api/v1/audit-logs/export
```

Query:

```text
from
to
format=csv|json
```

---

# 145. Admin APIs

Admin APIs manage organization-level settings.

---

# 146. Get Organization Settings

```http
GET /api/v1/admin/settings
```

---

# 147. Update Organization Settings

```http
PATCH /api/v1/admin/settings
```

Request:

```json
{
  "defaultCurrency": "MYR",
  "defaultTimezone": "Asia/Kuala_Lumpur",
  "aiPolicy": {
    "allowExternalAI": true,
    "requireHumanReviewForHighRisk": true
  }
}
```

---

# 148. Get Permission Matrix

```http
GET /api/v1/admin/permissions
```

---

# 149. Update Role Permissions

```http
PATCH /api/v1/admin/roles/:role/permissions
```

---

# 150. Webhook APIs

Webhook APIs allow external systems to trigger workflows or receive events.

---

# 151. Create Webhook Endpoint

```http
POST /api/v1/webhooks
```

Request:

```json
{
  "name": "Tender Upload Webhook",
  "eventTypes": ["file.uploaded", "workflow.completed"],
  "targetUrl": "https://example.com/webhook",
  "secretRef": "secret.webhook_signing_key"
}
```

---

# 152. List Webhooks

```http
GET /api/v1/webhooks
```

---

# 153. Update Webhook

```http
PATCH /api/v1/webhooks/:webhookId
```

---

# 154. Delete Webhook

```http
DELETE /api/v1/webhooks/:webhookId
```

---

# 155. Incoming Workflow Webhook

```http
POST /api/v1/webhook-triggers/:triggerId
```

This endpoint can start a workflow.

Security requirements:

```text
Signature verification
Rate limiting
Payload validation
Replay protection
Idempotency
```

---

# 156. Realtime APIs

QS-OS needs real-time updates for execution viewer and approvals.

Recommended options:

```text
WebSocket
Server-Sent Events
Supabase Realtime
```

---

# 157. Realtime Channels

Recommended channels:

```text
organization:{organizationId}
project:{projectId}
workflow:{workflowId}
execution:{executionId}
approval:{approvalId}
```

---

# 158. Execution Realtime Events

Events:

```text
execution.created
execution.queued
execution.started
execution.completed
execution.failed
execution.cancelled
node.started
node.completed
node.failed
node.retrying
approval.created
approval.completed
artifact.created
log.created
```

---

# 159. WebSocket Event Example

```json
{
  "event": "node.completed",
  "executionId": "execution-placeholder",
  "nodeId": "node_read_boq",
  "status": "completed",
  "timestamp": "2026-06-15T00:00:00.000Z"
}
```

---

# 160. File Upload API Pattern

Recommended flow:

```text
Client requests upload URL
  ↓
Backend creates signed URL
  ↓
Client uploads directly to storage
  ↓
Client registers document metadata
  ↓
Workflow uses document/file reference
```

This avoids sending large files through backend.

---

# 161. File Download API Pattern

```text
Client requests download URL
  ↓
Backend checks permission
  ↓
Backend creates signed URL
  ↓
Client downloads from storage
```

---

# 162. API Security Rules

1. All APIs require authentication unless explicitly public.
2. Tenant APIs require organization membership.
3. Project APIs require project access.
4. Admin APIs require admin role.
5. Pack permission APIs require admin role.
6. Approval decision APIs require assigned user or authorized role.
7. Document APIs require project access.
8. Execution APIs require workflow/project access.
9. Secret values must never be returned.
10. Audit logs should not be editable.

---

# 163. Rate Limiting

Apply rate limits to:

```text
Authentication-sensitive endpoints
Webhook triggers
Workflow run endpoint
AI prompt test endpoint
File upload URL generation
Marketplace publish endpoints
```

Example:

```text
100 requests per minute per user
10 workflow runs per minute per organization
```

---

# 164. Request Validation

Use DTO validation.

Validate:

```text
Required fields
String length
Enum values
UUID format
Workflow ID format
Pack ID format
Node type format
JSON schema
File type
File size
Permission list
```

---

# 165. API DTO Naming

Recommended DTO naming:

```text
CreateProjectDto
UpdateProjectDto
CreateWorkflowDto
SaveWorkflowVersionDto
ValidateWorkflowDto
RunWorkflowDto
InstallPackDto
SubmitApprovalDecisionDto
CreateDocumentDto
CreateBoqDto
CreateRfqDto
CreateQuotationDto
```

---

# 166. API Response Type Naming

Recommended response types:

```text
ProjectResponse
WorkflowResponse
WorkflowVersionResponse
PackResponse
NodeDefinitionResponse
ExecutionResponse
ApprovalTaskResponse
DocumentResponse
BoqResponse
RfqResponse
QuotationResponse
```

---

# 167. OpenAPI / Swagger

QS-OS should generate OpenAPI documentation.

Recommended endpoint:

```http
GET /api/docs
```

OpenAPI should include:

```text
Authentication scheme
DTO schemas
Response schemas
Error schemas
Tags by domain
Examples
```

---

# 168. API Tags

OpenAPI tags:

```text
Auth
Organizations
Projects
Workflows
Workflow Versions
Workflow Templates
Packs
Nodes
Executions
Approvals
Documents
QS
Procurement
Contract
AI
Notifications
Audit
Admin
Webhooks
Realtime
```

---

# 169. API Testing Strategy

Tests:

```text
Unit tests for services
Controller tests
DTO validation tests
Permission tests
Integration tests
End-to-end API tests
Webhook tests
Execution run tests
Approval decision tests
Document upload tests
```

---

# 170. API Test Fixtures

Fixtures:

```text
Test organization
Test users with roles
Test project
Test workflow JSON
Test Pack manifest
Test registered nodes
Test execution
Test approval task
Test document
Test BOQ
```

---

# 171. MVP API Scope

For QS-OS MVP 0.1, implement only:

```text
/me
/organizations
/projects
/workflows
/workflows/:id/versions
/workflows/:id/validate
/workflows/:id/run
/packs/installed
/nodes
/executions
/executions/:id/logs
/executions/:id/nodes
/executions/:id/artifacts
/approvals
/approvals/:id/decision
/documents/upload-url
/projects/:id/documents
/ai/usage
/audit-logs
```

---

# 172. MVP API Build Order

Recommended order:

```text
1. Auth context and /me
2. Organizations
3. Projects
4. Workflow CRUD
5. Workflow version save/load
6. Node registry
7. Pack registry
8. Execution run
9. Execution logs
10. Approval decision
11. Document upload/register
12. AI usage logs
13. Audit logs
```

---

# 173. MVP API Dependency Map

```text
Organization API
  ↓
Project API
  ↓
Workflow API
  ↓
Workflow Version API
  ↓
Node / Pack API
  ↓
Execution API
  ↓
Approval / Document / AI / Audit API
```

---

# 174. Example MVP Flow

```text
GET /me
  ↓
POST /organizations
  ↓
POST /projects
  ↓
GET /nodes
  ↓
POST /projects/:projectId/workflows
  ↓
POST /workflows/:workflowId/versions
  ↓
POST /workflows/:workflowId/validate
  ↓
POST /workflows/:workflowId/run
  ↓
GET /executions/:executionId
  ↓
GET /executions/:executionId/logs
```

---

# 175. Example BOQ to RFQ API Flow

```text
POST /documents/upload-url
  ↓
Upload BOQ file to storage
  ↓
POST /projects/:projectId/documents
  ↓
POST /projects/:projectId/workflows/from-template
  ↓
POST /workflows/:workflowId/run
  ↓
GET /executions/:executionId
  ↓
GET /executions/:executionId/logs
  ↓
GET /executions/:executionId/artifacts
  ↓
POST /approvals/:approvalId/decision
```

---

# 176. API Anti-Patterns

Avoid:

```text
Returning raw secrets
Executing workflows without snapshots
Letting frontend directly modify execution state
Skipping organization permission checks
Using different response shapes everywhere
Putting business logic in controllers
Returning huge outputs without pagination
Sending large files through backend unnecessarily
Allowing workflow import to auto-run
Allowing high-risk AI output without approval
```

---

# 177. Future API Extensions

Future APIs:

```text
Marketplace publishing
Pack billing
Supplier portal
BIM model upload
Drawing review
Workflow diff
Workflow comments
Workflow collaboration
AI agent API
Enterprise policy API
Advanced reporting API
External integration API
Public API keys
```

---

# 178. Relationship to Other Volumes

This volume connects to:

```text
Volume 1 – Workflow Engine Blueprint
API exposes the core platform functions.

Volume 2 – QS Node SDK Specification
API exposes node definitions, validation, and configuration schema.

Volume 2.1 – QS Node Developer Guide
API supports developer and Pack testing workflows.

Volume 3 – QS Pack Specification
API manages Pack installation, permissions, and node registration.

Volume 4 – Workflow JSON Specification
API saves, validates, imports, exports, and versions Workflow JSON.

Volume 5 – Execution Engine Specification
API starts, monitors, pauses, resumes, cancels, and retries executions.

Volume 6 – Product Master Blueprint V2
API implements the product modules and MVP roadmap.

Volume 7 – Database Schema Specification
API reads and writes the database schema defined there.
```

---

# 179. Recommended Next Specification

After API Specification, prepare:

```text
Volume 9 – UI/UX Product Specification
```

Because:

```text
Database defines storage.
API defines communication.
UI/UX defines how users experience the system.
```

Then prepare:

```text
Volume 10 – MVP Sprint Backlog
```

---

# 180. Final Formula

```text
QS-OS API =
  Auth
  + Organizations
  + Projects
  + Workflows
  + Packs
  + Nodes
  + Executions
  + Approvals
  + Documents
  + QS Data
  + AI
  + Audit
```

```text
The API is the contract between the QS-OS user interface and the QS-OS operating engine.
```

---

# Conclusion

The API Specification defines how the QS-OS frontend, workflow canvas, Pack system, Node registry, Execution Engine, Approval Manager, Document Service, AI Orchestrator, and database communicate.

For MVP, the API should remain focused:

```text
Projects
Workflows
Workflow JSON
Packs
Nodes
Executions
Approvals
Documents
AI usage
Audit logs
```

Once these APIs are stable, QS-OS can expand into structured procurement, contract administration, supplier portal, marketplace, BIM, billing, and enterprise integrations.

The API should be treated as a product contract.

A clean API will make QS-OS easier to build, easier to test, easier to document, and easier to extend.

---

# V3 Addendum — API Specification Updates

**Addendum version:** V3 | **Added:** 2026-06-18  
**NestJS modules to add:** `DataPackModule`, `CoreServiceModule`, skill search on `NodeModule`

This addendum documents new API endpoints required for V3 architecture that are not present in the original specification above.

## A1. New Resource: Data Packs

### GET /data-packs
List all available Data Packs in the registry.

**Auth:** Bearer JWT (any authenticated user)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "supplier-my",
      "name": "Malaysian Supplier Registry",
      "category": "supplier",
      "version": "1.0.0",
      "status": "available",
      "installed": false
    }
  ]
}
```

**Query params:** `?category=supplier` | `?installed=true` (filter to org installations)

---

### GET /data-packs/:slug
Get details of a specific Data Pack including its config schema.

**Response:**
```json
{
  "id": "uuid",
  "slug": "supplier-my",
  "name": "Malaysian Supplier Registry",
  "description": "...",
  "category": "supplier",
  "config_schema": {
    "type": "object",
    "properties": {
      "api_key": { "type": "string", "title": "API Key" }
    }
  }
}
```

---

### POST /data-packs/:slug/install
Install a Data Pack for the authenticated user's organization.

**Auth:** Bearer JWT (org admin only)  
**Body:** `{ "config": { ...provider-specific config... } }`

**Response:** `201 Created` with installation record

---

### DELETE /data-packs/:slug/install
Uninstall (pause) a Data Pack installation for the org.

**Auth:** Bearer JWT (org admin only)  
**Response:** `200 OK`

---

## A2. New Resource: Core Services

### GET /services
List all Core Services and their current status.

**Auth:** Bearer JWT (any authenticated user)

**Response:**
```json
{
  "data": [
    {
      "name": "ai",
      "display_name": "AI Service",
      "provider": "openai",
      "status": "active"
    },
    {
      "name": "ocr",
      "display_name": "OCR Service",
      "provider": "azure",
      "status": "active"
    }
  ]
}
```

---

### GET /services/:name
Get details and health status of a specific Core Service.

**Response:**
```json
{
  "name": "ai",
  "display_name": "AI Service",
  "provider": "openai",
  "status": "active",
  "last_health_check": "2026-06-18T10:00:00Z"
}
```

---

## A3. Extended: Skill / Node Discovery

### GET /nodes/search
Search registered skills (nodes) with V3 filter support.

**Auth:** Bearer JWT  
**Query params:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Keyword search on name + description |
| `pack_id` | uuid | Filter by Capability Pack |
| `uses_service` | string | Filter by required service, e.g. `ai` |
| `data_pack` | string | Filter by required Data Pack slug |
| `category` | string | Filter by node category |

**Response:** Array of registered skill records with `uses_services[]` and `data_pack_deps[]` included.

---

### GET /nodes/:type
Get a specific skill by its node type string.

**V3 addition to existing response:** include `uses_services`, `data_pack_deps` fields.

```json
{
  "type": "qs.classify_trade",
  "name": "Classify Trade",
  "pack_id": "uuid",
  "uses_services": ["ai"],
  "data_pack_deps": [],
  "ui_schema": { ... },
  "config_schema": { ... }
}
```

---

## A4. V3 API Module Summary

| Module | New in V3 | Endpoints |
|---|---|---|
| `DataPackModule` | ✅ NEW | `GET /data-packs`, `GET /data-packs/:slug`, `POST /data-packs/:slug/install`, `DELETE /data-packs/:slug/install` |
| `CoreServiceModule` | ✅ NEW | `GET /services`, `GET /services/:name` |
| `NodeModule` | Extended | `GET /nodes/search` (new), `GET /nodes/:type` (extended response) |

All existing endpoints in the original specification remain unchanged.
