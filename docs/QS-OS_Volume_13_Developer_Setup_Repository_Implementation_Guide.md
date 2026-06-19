# QS-OS Workflow Engine Blueprint
# Volume 13 — Developer Setup and Repository Implementation Guide (V1)
Version: 1.0

> ⚠️ **V3 COMPATIBILITY NOTICE** — Updated: 2026-06-18  
> This guide remains valid. Monorepo structure, pnpm workspace setup, Supabase configuration, and environment variables are unchanged in V3.  
> **V3 stack additions not covered here:** `packages/execution-engine` (added Sprint 6), `packages/workflow-json` (added Sprint 5). See sprint plan for current package list.  
> **V3 terminology note:** References to "Node Library", "Pack" seed data now use "Skill Library", "Capability Pack" naming in the UI layer.  
> **Active sprint tracking:** `QS-OS_Master_Sprint_Plan_and_Checklist.md`  
> **Document index:** `Master_Documentation_Index.md`

---

> This guide converts the QS-OS documentation and sprint backlog into a practical developer implementation manual.
>
> It explains how to set up the repository, install dependencies, configure environments, create the monorepo, implement packages, structure apps, connect database/storage/queue/AI services, write migrations, seed MVP data, run tests, and start building the QS-OS MVP.
>
> This document is designed for:
>
> - Human developers
> - Technical founders
> - AI coding agents
> - Codex-style implementation sessions
> - Future contributors
> - DevOps / deployment setup
>
> Primary objective:
>
> ```text
> Help a developer start implementing QS-OS without guessing the project structure.
> ```

---

# 1. Purpose

Volumes 1–10 define the QS-OS product, architecture, database, API, UI/UX, and sprint backlog.

This Volume 13 defines:

```text
How to actually create the repository
How to organize code
How to install tools
How to configure local development
How to connect frontend and backend
How to create database migrations
How to seed Packs and Nodes
How to build Workflow JSON package
How to build Node SDK package
How to build Pack SDK package
How to build Execution Engine package
How to implement MVP modules
How to test the system
How to work with AI coding agents
```

---

# 2. Development Goal

The first implementation goal is not to build the full future product.

The first implementation goal is:

```text
QS-OS MVP Skeleton
```

MVP Skeleton means:

```text
Monorepo
Frontend app
Backend app
Shared packages
Database migrations
Workflow JSON package
Node SDK package
Pack SDK package
Pack registry
Node registry
Workflow canvas
Basic execution engine
BOQ-to-RFQ demo workflow
```

---

# 3. MVP Implementation Philosophy

Build the spine first.

```text
Project
  ↓
Workflow
  ↓
Workflow JSON
  ↓
Node Registry
  ↓
Execution Engine
  ↓
Read BOQ Node
  ↓
AI Classify Node
  ↓
Generate RFQ Node
  ↓
Human Approval Node
  ↓
Logs and Artifacts
```

Avoid building the whole ecosystem before the spine works.

---

# 4. Recommended Technology Stack

## 4.1 Frontend

```text
Next.js
React
TypeScript
React Flow
Tailwind CSS
Shadcn UI or similar
TanStack Query
Zustand
Lucide Icons or similar
```

## 4.2 Backend

```text
NestJS
TypeScript
REST API
WebSocket or Server-Sent Events later
Class Validator or Zod
OpenAPI / Swagger
```

## 4.3 Database

```text
Supabase PostgreSQL
PostgreSQL JSONB
Row-Level Security later
Supabase Auth
```

## 4.4 Storage

```text
Supabase Storage
Object storage abstraction
```

## 4.5 Queue

```text
BullMQ
Redis
Queue adapter abstraction
```

## 4.6 AI

```text
OpenAI-compatible AI provider abstraction
Prompt registry
AI usage logging
Structured output validation
```

## 4.7 Tooling

```text
pnpm
Turborepo
ESLint
Prettier
Vitest or Jest
Playwright later
Docker optional
```

---

# 5. Prerequisites

Install:

```text
Node.js LTS
pnpm
Git
PostgreSQL or Supabase account
Redis or Docker Redis
VS Code or equivalent editor
```

Recommended versions:

```text
Node.js: 20+
pnpm: 9+
PostgreSQL: 15+
Redis: 7+
TypeScript: 5+
```

Check:

```bash
node -v
pnpm -v
git --version
```

---

# 6. Recommended Repository Name

```text
qs-os
```

Alternative names:

```text
qsos
qs-workflow-os
qsos-platform
```

Recommended:

```text
qs-os
```

---

# 7. Repository Initialization

```bash
mkdir qs-os
cd qs-os
git init
pnpm init
```

Create base files:

```text
README.md
.gitignore
.env.example
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.base.json
```

---

# 8. Recommended Monorepo Structure

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
│   ├── volume-1-workflow-engine-blueprint.md
│   ├── volume-2-node-sdk-specification.md
│   ├── volume-2-1-node-developer-guide.md
│   ├── volume-3-pack-specification.md
│   ├── volume-4-workflow-json-specification.md
│   ├── volume-5-execution-engine-specification.md
│   ├── volume-6-product-master-blueprint-v2.md
│   ├── volume-7-database-schema-specification.md
│   ├── volume-8-api-specification.md
│   ├── volume-9-ui-ux-product-specification.md
│   ├── volume-10-mvp-sprint-backlog.md
│   └── volume-13-developer-setup-guide.md
├── tools/
│   └── qsos-cli/
├── supabase/
│   ├── migrations/
│   └── seed/
└── README.md
```

---

# 9. pnpm Workspace

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "packs/*"
  - "tools/*"
```

---

# 10. Root package.json

Recommended root `package.json`:

```json
{
  "name": "qs-os",
  "version": "0.1.0",
  "private": true,
  "description": "QS-OS – Workflow operating system for Quantity Surveyors",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write .",
    "typecheck": "turbo typecheck",
    "db:migrate": "pnpm --filter @qsos/database migrate",
    "db:seed": "pnpm --filter @qsos/database seed"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "latest",
    "prettier": "latest",
    "eslint": "latest"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

# 11. Turbo Configuration

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

# 12. Base TypeScript Config

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@qsos/shared-types": ["packages/shared-types/src"],
      "@qsos/workflow-json": ["packages/workflow-json/src"],
      "@qsos/node-sdk": ["packages/node-sdk/src"],
      "@qsos/pack-sdk": ["packages/pack-sdk/src"],
      "@qsos/execution-engine": ["packages/execution-engine/src"]
    }
  }
}
```

---

# 13. Git Ignore

Create `.gitignore`:

```text
node_modules
.pnpm-store
.next
dist
.env
.env.local
.env.production
coverage
.DS_Store
*.log
supabase/.branches
tmp
.cache
```

---

# 14. Environment Files

Create `.env.example`:

```env
# App
APP_ENV=local
APP_URL=http://localhost:3000
API_URL=http://localhost:4000/api/v1

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# Storage
STORAGE_BUCKET=qsos-artifacts

# Redis / Queue
REDIS_URL=redis://localhost:6379

# AI
AI_PROVIDER=openai-compatible
AI_PROVIDER_BASE_URL=
AI_PROVIDER_API_KEY=
AI_DEFAULT_MODEL=

# Auth
JWT_SECRET=

# Development
LOG_LEVEL=debug
```

Rules:

```text
Never commit .env
Only commit .env.example
Never expose service role key in frontend
```

---

# 15. Apps Overview

```text
apps/web
Frontend application

apps/api
Backend API application
```

---

# 16. Create Frontend App

Recommended command:

```bash
pnpm create next-app apps/web --ts --tailwind --eslint --app
```

Recommended app structure:

```text
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/
│   ├── projects/
│   ├── workflows/
│   ├── executions/
│   ├── approvals/
│   ├── documents/
│   ├── packs/
│   └── admin/
├── components/
│   ├── layout/
│   ├── workflow/
│   ├── execution/
│   ├── approval/
│   ├── documents/
│   └── ui/
├── lib/
│   ├── api-client.ts
│   ├── auth.ts
│   └── utils.ts
├── stores/
├── hooks/
└── package.json
```

---

# 17. Create Backend App

Recommended command:

```bash
pnpm dlx @nestjs/cli new apps/api
```

Recommended backend structure:

```text
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   ├── common/
│   │   ├── guards/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── dto/
│   ├── modules/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── projects/
│   │   ├── workflows/
│   │   ├── packs/
│   │   ├── nodes/
│   │   ├── executions/
│   │   ├── approvals/
│   │   ├── documents/
│   │   ├── ai/
│   │   ├── audit/
│   │   └── admin/
│   └── database/
├── test/
└── package.json
```

---

# 18. Backend main.ts

Recommended features:

```text
Global API prefix
Validation pipe
CORS
Error filter
Request ID middleware
Swagger in development
```

Example:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin: process.env.APP_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
```

---

# 19. Shared API Response Type

In `packages/shared-types/src/api.ts`:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta?: Record<string, unknown>;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp?: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

# 20. Standard API Response Helper

Backend should return:

```typescript
export function successResponse<T>(
  data: T,
  meta: Record<string, unknown> = {},
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
    error: null,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    meta: {},
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}
```

---

# 21. Database Package

Create:

```text
packages/database/
```

Purpose:

```text
Database types
Migration helpers
Seed scripts
SQL files
Repository helpers if needed
```

Structure:

```text
packages/database/
├── src/
│   ├── index.ts
│   ├── migrations.ts
│   └── seed.ts
├── migrations/
├── seed/
└── package.json
```

---

# 22. Supabase Folder

Create:

```text
supabase/
├── migrations/
└── seed/
```

First migrations:

```text
000001_enable_extensions.sql
000002_create_identity_tables.sql
000003_create_project_tables.sql
000004_create_workflow_tables.sql
000005_create_pack_tables.sql
000006_create_execution_tables.sql
000007_create_document_tables.sql
000008_create_approval_tables.sql
000009_create_ai_tables.sql
000010_create_audit_tables.sql
```

---

# 23. Migration 000001 – Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

# 24. Migration 000002 – Identity Tables

Should include:

```text
users_profile
organizations
organization_members
organization_invitations
```

Minimum MVP:

```sql
CREATE TABLE users_profile (
  id UUID PRIMARY KEY,
  full_name TEXT,
  display_name TEXT,
  email TEXT,
  locale TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kuala_Lumpur',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  type TEXT,
  country TEXT,
  default_currency TEXT DEFAULT 'MYR',
  default_timezone TEXT DEFAULT 'Asia/Kuala_Lumpur',
  settings JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);
```

---

# 25. Migration 000003 – Project Tables

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  client_name TEXT,
  location TEXT,
  country TEXT,
  currency TEXT DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'active',
  project_type TEXT,
  contract_type TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users_profile(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

---

# 26. Migration 000004 – Workflow Tables

```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'project',
  current_version TEXT,
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users_profile(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  definition JSONB NOT NULL,
  definition_hash TEXT,
  change_summary TEXT,
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID REFERENCES users_profile(id),
  published_at TIMESTAMPTZ,
  UNIQUE (workflow_id, version)
);
```

---

# 27. Migration 000005 – Pack and Node Tables

```sql
CREATE TABLE packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  publisher_id TEXT,
  latest_version TEXT,
  visibility TEXT DEFAULT 'private',
  status TEXT DEFAULT 'draft',
  manifest JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pack_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL REFERENCES packs(id),
  version TEXT NOT NULL,
  manifest JSONB NOT NULL,
  checksum TEXT,
  signature_ref TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pack_id, version)
);

CREATE TABLE pack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  pack_id TEXT NOT NULL REFERENCES packs(id),
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  installed_by UUID REFERENCES users_profile(id),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users_profile(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  permissions JSONB DEFAULT '[]',
  configuration JSONB DEFAULT '{}',
  UNIQUE (organization_id, pack_id)
);

CREATE TABLE registered_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  pack_id TEXT NOT NULL REFERENCES packs(id),
  pack_version TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  config_schema JSONB DEFAULT '{}',
  ui_schema JSONB DEFAULT '{}',
  executor_ref TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, node_type)
);
```

---

# 28. Migration 000006 – Execution Tables

```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  workflow_version TEXT NOT NULL,
  workflow_version_id UUID REFERENCES workflow_versions(id),
  status TEXT NOT NULL DEFAULT 'created',
  mode TEXT NOT NULL DEFAULT 'standard',
  trigger_type TEXT,
  trigger_payload JSONB DEFAULT '{}',
  inputs JSONB DEFAULT '{}',
  snapshot JSONB NOT NULL,
  snapshot_hash TEXT,
  started_by UUID REFERENCES users_profile(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_name TEXT,
  pack_id TEXT,
  node_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input_refs JSONB DEFAULT '{}',
  output_refs JSONB DEFAULT '{}',
  progress JSONB DEFAULT '{}',
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  node_execution_id UUID REFERENCES node_executions(id),
  node_id TEXT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  code TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE execution_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  node_execution_id UUID REFERENCES node_executions(id),
  node_id TEXT NOT NULL,
  port_id TEXT NOT NULL,
  output_type TEXT NOT NULL,
  value JSONB,
  storage_ref TEXT,
  size_bytes BIGINT,
  lineage JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# 29. Migration 000007 – Documents and Artifacts

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_version INTEGER DEFAULT 1,
  storage_ref TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users_profile(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  version_number INTEGER NOT NULL,
  storage_ref TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  checksum TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE execution_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  node_execution_id UUID REFERENCES node_executions(id),
  node_id TEXT,
  artifact_type TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  storage_ref TEXT NOT NULL,
  size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# 30. Migration 000008 – Approvals

```sql
CREATE TABLE approval_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id),
  node_execution_id UUID REFERENCES node_executions(id),
  node_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_user_id UUID REFERENCES users_profile(id),
  assignee_role TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decision TEXT,
  decision_options JSONB DEFAULT '[]',
  comments TEXT,
  due_at TIMESTAMPTZ,
  decided_by UUID REFERENCES users_profile(id),
  decided_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# 31. Migration 000009 – AI

```sql
CREATE TABLE ai_prompts (
  id TEXT PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  pack_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  prompt_type TEXT,
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  template TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  execution_id UUID REFERENCES workflow_executions(id),
  node_execution_id UUID REFERENCES node_executions(id),
  provider TEXT,
  model_profile TEXT,
  model_name TEXT,
  prompt_id TEXT,
  prompt_version TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  confidence NUMERIC(5, 4),
  cost_estimate NUMERIC(18, 6),
  status TEXT DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# 32. Migration 000010 – Audit and Notifications

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  actor_user_id UUID REFERENCES users_profile(id),
  actor_type TEXT DEFAULT 'user',
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users_profile(id),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  message TEXT,
  notification_type TEXT,
  status TEXT DEFAULT 'unread',
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
```

---

# 33. Index Migration

Create indexes:

```sql
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_workflows_org_project ON workflows(organization_id, project_id);
CREATE INDEX idx_workflow_versions_workflow ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_executions_org_status ON workflow_executions(organization_id, status);
CREATE INDEX idx_node_executions_execution ON node_executions(execution_id);
CREATE INDEX idx_execution_logs_execution ON execution_logs(execution_id);
CREATE INDEX idx_execution_outputs_execution_node ON execution_outputs(execution_id, node_id);
CREATE INDEX idx_approval_tasks_org_status ON approval_tasks(organization_id, status);
CREATE INDEX idx_documents_org_project ON documents(organization_id, project_id);
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
```

---

# 34. Seed Data Strategy

Seed MVP data:

```text
Official Packs
MVP Nodes
BOQ-to-RFQ workflow template
Sample project
Sample BOQ metadata later
Sample prompts
```

Seed script should be repeatable.

---

# 35. Seed Official Packs

Packs:

```text
qsos.core-pack
qsos.document-pack
qsos.qs-pack
qsos.ai-pack
qsos.procurement-pack
```

Each Pack should include:

```text
id
name
display_name
description
category
latest_version
status
manifest
```

---

# 36. Seed MVP Nodes

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

Each node needs:

```text
node_type
display_name
category
description
input_schema
output_schema
config_schema
ui_schema
executor_ref
```

---

# 37. Workflow JSON Package

Create:

```text
packages/workflow-json/
```

Structure:

```text
packages/workflow-json/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── schema.ts
│   ├── validator.ts
│   ├── examples/
│   │   └── boq-to-rfq.workflow.ts
│   └── tests/
└── package.json
```

---

# 38. Workflow JSON Types

Core interfaces:

```typescript
export interface QSWorkflowDefinition {
  schemaVersion: string;
  workflow: WorkflowInfo;
  dependencies: WorkflowDependencies;
  nodes: WorkflowNodeInstance[];
  connections: WorkflowConnection[];
  variables?: Record<string, WorkflowVariable>;
  secrets?: Record<string, WorkflowSecretRef>;
  triggers?: WorkflowTrigger[];
  settings?: WorkflowSettings;
  execution?: WorkflowExecutionPolicy;
  permissions?: string[];
  validation?: WorkflowValidation;
  ui?: WorkflowUIState;
  metadata: WorkflowMetadata;
}
```

---

# 39. Workflow Validator MVP

MVP validation checks:

```text
schemaVersion exists
workflow exists
workflow.id exists
workflow.name exists
nodes array exists
connections array exists
node IDs unique
connection IDs unique
source node exists
target node exists
required node fields exist
metadata exists
```

Return:

```typescript
export interface WorkflowValidationResult {
  status: "valid" | "validWithWarnings" | "invalid";
  messages: WorkflowValidationMessage[];
}
```

---

# 40. Node SDK Package

Create:

```text
packages/node-sdk/
```

Structure:

```text
packages/node-sdk/
├── src/
│   ├── index.ts
│   ├── node.ts
│   ├── ports.ts
│   ├── configuration.ts
│   ├── execution-context.ts
│   ├── validation.ts
│   └── tests/
└── package.json
```

---

# 41. Node SDK Interface

```typescript
export interface QSNode<TConfig = unknown, TInputs = unknown, TOutputs = unknown> {
  metadata: QSNodeMetadata;
  inputs: QSNodePort[];
  outputs: QSNodePort[];
  configurationSchema: QSNodeConfigurationSchema;

  validate?(context: QSNodeValidationContext<TConfig, TInputs>): Promise<QSNodeValidationResult>;

  execute(context: QSNodeExecutionContext<TConfig, TInputs>): Promise<QSNodeExecutionResult<TOutputs>>;
}
```

---

# 42. Node Metadata Type

```typescript
export interface QSNodeMetadata {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  icon?: string;
  author?: string;
  tags?: string[];
  packId?: string;
}
```

---

# 43. Execution Context Type

```typescript
export interface QSNodeExecutionContext<TConfig = unknown, TInputs = unknown> {
  executionId: string;
  workflowId: string;
  workflowVersion: string;
  nodeId: string;
  nodeType: string;
  organizationId: string;
  projectId?: string;
  inputs: TInputs;
  configuration: TConfig;
  variables: Record<string, unknown>;
  logger: QSNodeLogger;
  storage: QSStorageClient;
  database: QSDatabaseClient;
  ai?: QSAIClient;
  approvals?: QSApprovalClient;
  cancellationToken?: QSCancellationToken;
}
```

---

# 44. Pack SDK Package

Create:

```text
packages/pack-sdk/
```

Structure:

```text
packages/pack-sdk/
├── src/
│   ├── index.ts
│   ├── manifest.ts
│   ├── validator.ts
│   ├── permissions.ts
│   └── tests/
└── package.json
```

---

# 45. Pack Manifest Type

```typescript
export interface QSPackManifest {
  id: string;
  name: string;
  version: string;
  displayName: string;
  description: string;
  category: string;
  author?: {
    name: string;
    email?: string;
    website?: string;
  };
  license: {
    type: string;
    url?: string;
  };
  sdk: {
    minVersion: string;
    maxVersion?: string;
  };
  engine: {
    minVersion: string;
  };
  dependencies?: QSPackDependency[];
  permissions?: string[];
  nodes: QSPackNodeRegistration[];
  workflows?: QSPackWorkflowTemplate[];
  templates?: QSPackAsset[];
  prompts?: QSPackAsset[];
}
```

---

# 46. Execution Engine Package

Create:

```text
packages/execution-engine/
```

Structure:

```text
packages/execution-engine/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── planner/
│   ├── runtime/
│   ├── state/
│   ├── logger/
│   ├── outputs/
│   └── tests/
└── package.json
```

---

# 47. Execution Engine MVP Components

Implement first:

```text
ExecutionRequest type
ExecutionStatus type
NodeExecutionStatus type
GraphBuilder
ExecutionPlanner
NodeRuntime
InputResolver
OutputStore interface
ExecutionLogger interface
```

Defer:

```text
Parallel execution
Sub-workflows
Advanced loops
Compensation
Replay
Distributed workers
```

---

# 48. Backend Modules Implementation Order

Recommended NestJS module order:

```text
1. ConfigModule
2. DatabaseModule
3. AuthModule
4. OrganizationsModule
5. ProjectsModule
6. WorkflowsModule
7. PacksModule
8. NodesModule
9. DocumentsModule
10. ExecutionsModule
11. ApprovalsModule
12. AIModule
13. AuditModule
14. AdminModule
```

---

# 49. Auth Module

Responsibilities:

```text
Validate JWT
Load current user
Provide AuthGuard
Provide CurrentUser decorator
Provide organization context guard
```

Files:

```text
modules/auth/
├── auth.module.ts
├── auth.guard.ts
├── current-user.decorator.ts
├── organization.guard.ts
└── auth.service.ts
```

---

# 50. Organizations Module

Files:

```text
modules/organizations/
├── organizations.module.ts
├── organizations.controller.ts
├── organizations.service.ts
├── dto/
│   ├── create-organization.dto.ts
│   └── update-organization.dto.ts
└── repositories/
    └── organizations.repository.ts
```

Endpoints:

```text
POST /organizations
GET /organizations
GET /organizations/:id
PATCH /organizations/:id
GET /organizations/:id/members
```

---

# 51. Projects Module

Endpoints:

```text
POST /projects
GET /projects
GET /projects/:id
PATCH /projects/:id
POST /projects/:id/archive
```

Rules:

```text
Require X-Organization-Id
Check organization membership
Create project under organization
```

---

# 52. Workflows Module

Endpoints:

```text
POST /projects/:projectId/workflows
GET /projects/:projectId/workflows
GET /workflows/:workflowId
PATCH /workflows/:workflowId
POST /workflows/:workflowId/versions
GET /workflows/:workflowId/versions
GET /workflows/:workflowId/versions/:version
POST /workflows/:workflowId/validate
POST /workflows/:workflowId/activate
POST /workflows/:workflowId/run
```

---

# 53. Packs Module

Endpoints:

```text
GET /packs/installed
GET /packs/:packId
POST /packs/install-local
POST /packs/:packId/uninstall
POST /packs/:packId/permissions/grant
POST /packs/:packId/permissions/revoke
```

MVP:

```text
GET /packs/installed
GET /packs/:packId
```

---

# 54. Nodes Module

Endpoints:

```text
GET /nodes
GET /nodes/:nodeType
GET /nodes/:nodeType/ui-schema
POST /nodes/:nodeType/validate-configuration
```

---

# 55. Executions Module

Endpoints:

```text
POST /workflows/:workflowId/run
GET /executions/:executionId
GET /executions/:executionId/nodes
GET /executions/:executionId/logs
GET /executions/:executionId/artifacts
POST /executions/:executionId/cancel
POST /executions/:executionId/retry
```

MVP:

```text
run
get execution
get nodes
get logs
get artifacts
```

---

# 56. Documents Module

Endpoints:

```text
POST /documents/upload-url
POST /projects/:projectId/documents
GET /projects/:projectId/documents
GET /documents/:documentId
GET /documents/:documentId/download-url
```

---

# 57. Approvals Module

Endpoints:

```text
GET /approvals
GET /approvals/:approvalId
POST /approvals/:approvalId/decision
POST /approvals/:approvalId/comments
```

---

# 58. AI Module

Endpoints:

```text
GET /ai/prompts
GET /ai/prompts/:promptId
POST /ai/prompts/:promptId/test
GET /ai/usage
```

MVP:

```text
AI usage logs only
Prompt seed only
```

---

# 59. Frontend Pages Implementation Order

Recommended order:

```text
1. /login
2. /dashboard
3. /projects
4. /projects/new or create modal
5. /projects/:id/overview
6. /projects/:id/documents
7. /projects/:id/workflows
8. /workflows/:id/editor
9. /executions/:id
10. /approvals
11. /approvals/:id
12. /packs
13. /admin/settings
```

---

# 60. Frontend App Shell

Components:

```text
AppShell
TopBar
Sidebar
OrganizationSwitcher
ProjectSwitcher
UserMenu
NotificationBell
PageHeader
```

---

# 61. Workflow Editor Components

```text
WorkflowEditor
WorkflowHeader
NodeLibraryPanel
WorkflowCanvas
CanvasNode
CanvasPort
PropertyPanel
ValidationPanel
RunWorkflowModal
WorkflowJsonViewer
```

---

# 62. Execution Viewer Components

```text
ExecutionViewer
ExecutionHeader
ExecutionStatusBadge
NodeTimeline
NodeExecutionDetail
ExecutionLogViewer
ArtifactList
ApprovalWaitingPanel
ErrorPanel
```

---

# 63. Approval Components

```text
ApprovalInbox
ApprovalCard
ApprovalDetail
ApprovalDecisionPanel
ApprovalCommentBox
ApprovalAttachmentList
ApprovalHistory
```

---

# 64. API Client

Create:

```text
apps/web/lib/api-client.ts
```

Responsibilities:

```text
Attach auth token
Attach organization ID
Handle standard response envelope
Handle errors
Support pagination
```

Example:

```typescript
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "X-Organization-Id": getActiveOrganizationId(),
    },
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message || "API request failed");
  }

  return json.data as T;
}
```

---

# 65. State Management

Use:

```text
TanStack Query for server state
Zustand for workflow editor state
React state for local UI state
```

Stores:

```text
authStore
organizationStore
projectStore
workflowEditorStore
executionLiveStore
```

---

# 66. Workflow Editor Store

State:

```typescript
interface WorkflowEditorState {
  workflowId: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  selectedNodeId?: string;
  selectedConnectionId?: string;
  isDirty: boolean;
  validationStatus?: string;
  validationMessages: ValidationMessage[];
}
```

Actions:

```text
addNode
updateNode
deleteNode
connectNodes
updateConnection
saveWorkflow
loadWorkflow
validateWorkflow
serializeToWorkflowJson
loadFromWorkflowJson
```

---

# 67. Packs Folder Structure

```text
packs/
├── core-pack/
│   ├── manifest.yaml
│   ├── nodes/
│   │   ├── ManualTrigger/
│   │   ├── HumanApproval/
│   │   └── Logger/
│   └── README.md
├── qs-pack/
│   ├── manifest.yaml
│   ├── nodes/
│   │   ├── ReadBOQ/
│   │   ├── CleanBOQ/
│   │   ├── ClassifyTrade/
│   │   └── SplitWorkPackage/
│   └── README.md
└── procurement-pack/
    ├── manifest.yaml
    ├── nodes/
    │   └── GenerateRFQ/
    └── README.md
```

---

# 68. Node Folder Structure

Example:

```text
packs/qs-pack/nodes/ReadBOQ/
├── index.ts
├── metadata.ts
├── schema.ts
├── ui.ts
├── executor.ts
├── validator.ts
├── tests/
│   └── read-boq.test.ts
└── README.md
```

---

# 69. Read BOQ Node Implementation Plan

Inputs:

```text
fileRef
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

Implementation steps:

```text
Load file from storage
Read Excel workbook
Find sheet
Parse header row
Map configured columns
Extract rows
Normalize quantity/rate/amount
Return structured BOQ items
Log row count and warnings
```

Recommended library:

```text
xlsx
```

---

# 70. AI Classify Trade Node Implementation Plan

Inputs:

```text
boqItems
```

Configuration:

```text
promptId
modelProfile
confidenceThreshold
batchSize
humanReviewBelowConfidence
```

Outputs:

```text
classifiedItems
tradePackages
lowConfidenceItems
warnings
```

Implementation steps:

```text
Load prompt
Batch BOQ items
Call AI provider
Validate structured output
Attach confidence score
Group by trade
Log AI usage
Return classified items
```

---

# 71. Generate RFQ Node Implementation Plan

Inputs:

```text
tradePackages
projectInfo
```

Configuration:

```text
templateId
outputFormat
groupByTrade
includeTerms
```

Outputs:

```text
documents
summary
warnings
```

Implementation steps:

```text
Load RFQ template
Render package data into template
Generate PDF or DOCX
Store generated file
Create artifact record
Return document references
```

MVP may generate simple HTML/PDF or Markdown-to-PDF.

---

# 72. Human Approval Node Implementation Plan

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
```

Outputs:

```text
approvalDecision
comments
```

Implementation steps:

```text
Create approval task
Pause workflow execution
Wait for approval decision
Resume workflow after decision
Route result to next node
```

---

# 73. Execution Engine MVP Algorithm

Simplified algorithm:

```text
Load workflow snapshot
Validate graph
Find start nodes
Mark all nodes pending
For each ready node:
  Resolve inputs
  Create node execution record
  Execute node
  Store outputs
  Store logs
  Mark node completed
  Find next ready nodes
If approval node:
  Create approval task
  Pause execution
Resume when approval decision arrives
Complete workflow when all required nodes complete
```

---

# 74. Execution Engine MVP Restrictions

MVP restrictions:

```text
Sequential execution only
No complex loops
No sub-workflows
No advanced compensation
No distributed execution
No workflow replay
No full queue required initially if direct execution is simpler
```

Queue can be introduced when node execution becomes long-running.

---

# 75. Queue Strategy

MVP option A:

```text
Run execution synchronously in backend process for demo.
```

MVP option B:

```text
Use BullMQ from the start.
```

Recommendation:

```text
Use a simple queue adapter interface.
Start with direct execution if needed.
Switch to BullMQ without changing business logic.
```

---

# 76. Queue Adapter Interface

```typescript
export interface QueueAdapter {
  enqueueWorkflow(request: ExecutionRequest): Promise<void>;
  enqueueNode(request: NodeExecutionRequest): Promise<void>;
}
```

Implement:

```text
DirectQueueAdapter for local MVP
BullMQQueueAdapter later
```

---

# 77. Storage Adapter Interface

```typescript
export interface StorageAdapter {
  upload(path: string, data: Buffer, contentType: string): Promise<StorageRef>;
  download(ref: StorageRef): Promise<Buffer>;
  createSignedUrl(ref: StorageRef): Promise<string>;
}
```

Implement:

```text
SupabaseStorageAdapter
LocalFileStorageAdapter for tests
```

---

# 78. AI Provider Adapter Interface

```typescript
export interface AIProviderAdapter {
  generateStructured<TInput, TOutput>(request: {
    prompt: string;
    input: TInput;
    outputSchema: unknown;
    modelProfile: string;
  }): Promise<{
    output: TOutput;
    usage: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    confidence?: number;
  }>;
}
```

---

# 79. Database Repository Pattern

Use repositories for database access.

Example:

```text
WorkflowsRepository
WorkflowVersionsRepository
ExecutionsRepository
NodeExecutionsRepository
DocumentsRepository
ApprovalsRepository
PacksRepository
NodesRepository
```

Controllers should not directly contain SQL.

---

# 80. API Implementation Order

```text
1. GET /me
2. POST /organizations
3. GET /organizations
4. POST /projects
5. GET /projects
6. POST /projects/:projectId/workflows
7. POST /workflows/:workflowId/versions
8. GET /workflows/:workflowId/versions/:version
9. GET /nodes
10. POST /workflows/:workflowId/validate
11. POST /workflows/:workflowId/run
12. GET /executions/:id
13. GET /executions/:id/logs
14. POST /documents/upload-url
15. POST /projects/:projectId/documents
16. GET /approvals
17. POST /approvals/:id/decision
```

---

# 81. Frontend Implementation Order

```text
1. App shell
2. Login
3. Organization selection
4. Projects list
5. Create project
6. Project overview
7. Documents page
8. Workflow list
9. Workflow editor shell
10. Node library
11. Canvas
12. Property panel
13. Save workflow
14. Validate workflow
15. Run modal
16. Execution viewer
17. Approval inbox
18. Approval detail
19. Packs installed page
```

---

# 82. Testing Strategy

Testing layers:

```text
Unit tests
Package tests
API tests
Node tests
Execution engine tests
UI component tests
End-to-end tests later
```

MVP minimum:

```text
Workflow validator tests
Graph planner tests
Read BOQ node tests
AI classify mock tests
Generate RFQ node tests
Execution engine end-to-end test
```

---

# 83. Test Fixtures Package

Create:

```text
packages/test-fixtures/
```

Structure:

```text
packages/test-fixtures/
├── files/
│   ├── sample-boq.xlsx
│   └── sample-rfq-template.html
├── workflows/
│   └── boq-to-rfq.workflow.json
├── outputs/
│   └── read-boq-output.json
└── src/
    └── index.ts
```

---

# 84. Unit Test Example

Workflow validator test:

```typescript
describe("WorkflowValidator", () => {
  it("should validate a minimal workflow", () => {
    const result = validateWorkflow(minimalWorkflow);
    expect(result.status).toBe("valid");
  });

  it("should reject duplicate node ids", () => {
    const result = validateWorkflow(workflowWithDuplicateNodes);
    expect(result.status).toBe("invalid");
  });
});
```

---

# 85. Node Test Example

Read BOQ node test:

```typescript
describe("ReadBOQNode", () => {
  it("should parse sample BOQ", async () => {
    const result = await node.execute(mockContext);
    expect(result.outputs.boqItems.length).toBeGreaterThan(0);
  });
});
```

---

# 86. End-to-End MVP Test

Test:

```text
Create project
Upload BOQ
Create workflow from template
Run workflow
Read BOQ node completes
AI classify node completes using mock provider
Generate RFQ node completes
Approval node pauses
Submit approval
Workflow completes
Artifact exists
```

---

# 87. AI Mock Provider

For tests, use a mock AI provider.

```typescript
export class MockAIProviderAdapter implements AIProviderAdapter {
  async generateStructured() {
    return {
      output: {
        items: [],
        confidence: 0.95,
      },
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
      confidence: 0.95,
    };
  }
}
```

Do not rely on live AI provider for automated tests.

---

# 88. Local Development Flow

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:4000/api/v1
```

---

# 89. Developer Daily Workflow

```text
Pull latest main/dev
Create feature branch
Run pnpm install if dependencies changed
Run pnpm dev
Implement task
Run tests
Run lint
Commit
Open PR
Review
Merge
```

---

# 90. Git Branch Strategy

```text
main
dev
feature/*
fix/*
docs/*
```

Examples:

```text
feature/workflow-json
feature/node-sdk
feature/execution-engine
feature/read-boq-node
fix/workflow-validation-error
```

---

# 91. Commit Convention

Use conventional commits:

```text
feat: add workflow JSON types
feat: implement projects API
fix: handle missing BOQ sheet
docs: add developer setup guide
test: add workflow validator tests
refactor: simplify graph planner
```

---

# 92. Pull Request Checklist

```text
[ ] Task reference included
[ ] Code builds
[ ] Tests pass
[ ] Lint passes
[ ] No secrets committed
[ ] Acceptance criteria met
[ ] Screenshots added for UI changes
[ ] Migration tested if database changed
[ ] Documentation updated if needed
```

---

# 93. AI Coding Agent Workflow

Use AI coding agents carefully.

Recommended pattern:

```text
Give one task
Provide relevant volume reference
Provide target files
Define acceptance criteria
Ask for tests
Review output manually
Run tests
Commit small changes
```

---

# 94. Good AI Coding Prompt Format

```text
Task:
Implement the Workflow JSON TypeScript interfaces.

Context:
Use Volume 4 – Workflow JSON Specification.

Target files:
packages/workflow-json/src/types.ts
packages/workflow-json/src/index.ts

Requirements:
- Define QSWorkflowDefinition
- Define WorkflowInfo
- Define WorkflowNodeInstance
- Define WorkflowConnection
- Export all types
- Use strict TypeScript
- No runtime logic yet

Acceptance criteria:
- pnpm typecheck passes
- Example workflow object type-checks
```

---

# 95. Bad AI Coding Prompt

Avoid:

```text
Build QS-OS.
```

Too broad.

Better:

```text
Implement GET /nodes endpoint using registered_nodes table and return node metadata grouped by category.
```

---

# 96. AI Coding Agent Safety Rules

Rules:

```text
Do not allow AI agent to rewrite whole repo without reason
Do not let agent remove migrations
Do not let agent hardcode secrets
Do not let agent bypass auth
Do not let agent invent different architecture
Do not mix too many features in one task
Review database changes manually
Review security-related changes carefully
```

---

# 97. Codex Task Sequence

Recommended first 20 Codex tasks:

```text
1. Create monorepo package structure
2. Add shared TypeScript config
3. Create shared API response types
4. Create workflow-json package interfaces
5. Create workflow validator MVP
6. Create database migrations for core tables
7. Create NestJS project module skeleton
8. Create organizations API
9. Create projects API
10. Create workflows API
11. Create workflow versions API
12. Seed official Packs
13. Seed MVP nodes
14. Create nodes API
15. Create React app shell
16. Create projects page
17. Create workflow editor shell
18. Integrate React Flow
19. Save/load workflow JSON
20. Create execution engine MVP types
```

---

# 98. Environment Security

Rules:

```text
Never expose SUPABASE_SERVICE_ROLE_KEY to frontend
Never commit AI_PROVIDER_API_KEY
Never log secret values
Use separate environment keys for local/staging/production
Rotate leaked keys immediately
```

---

# 99. Supabase Storage Buckets

Recommended buckets:

```text
documents
artifacts
pack-assets
temp
```

MVP:

```text
documents
artifacts
```

Storage path pattern:

```text
organizations/{organizationId}/projects/{projectId}/documents/{documentId}/{filename}
organizations/{organizationId}/executions/{executionId}/artifacts/{artifactId}/{filename}
```

---

# 100. Supabase RLS MVP Strategy

For initial local development, RLS can be simple.

Before staging:

```text
Enable RLS on tenant tables
Add organization membership policies
Use backend service role for controlled writes
Do not expose unsafe tables directly to frontend
```

MVP RLS must protect:

```text
projects
workflows
workflow_versions
documents
workflow_executions
approval_tasks
audit_logs
```

---

# 101. Logging Strategy

Backend logs:

```text
request ID
user ID
organization ID
project ID where available
endpoint
duration
error code
```

Execution logs:

```text
execution ID
node ID
level
message
metadata
timestamp
```

Do not log:

```text
secrets
full AI prompt if sensitive
large BOQ payloads
passwords
raw tokens
```

---

# 102. Error Handling Strategy

Use consistent error codes.

Examples:

```text
ORG_NOT_FOUND
PROJECT_NOT_FOUND
WORKFLOW_NOT_FOUND
WORKFLOW_INVALID
NODE_TYPE_NOT_FOUND
PACK_NOT_INSTALLED
EXECUTION_FAILED
APPROVAL_NOT_FOUND
DOCUMENT_UPLOAD_FAILED
AI_PROVIDER_ERROR
```

Frontend should show user-friendly messages.

---

# 103. MVP Feature Flags

Optional feature flags:

```text
ENABLE_AI=true
ENABLE_QUEUE=false
ENABLE_MARKETPLACE=false
ENABLE_DEVELOPER_MODE=true
ENABLE_WORKFLOW_JSON_VIEWER=true
ENABLE_DEBUG_LOGS=true
```

Use feature flags to hide unfinished modules.

---

# 104. Developer Mode

Developer mode exposes:

```text
Workflow JSON viewer
Node IDs
Port IDs
Pack versions
Execution snapshot
Raw validation messages
Raw logs
```

Developer mode should be useful for debugging MVP.

---

# 105. Build the First Workflow Template

Create:

```text
packs/qs-pack/workflows/boq-to-rfq.template.qsworkflow.json
```

Nodes:

```text
node_manual_trigger
node_read_boq
node_classify_trade
node_split_work_package
node_generate_rfq
node_human_approval
node_logger
```

Connections:

```text
manual_trigger → read_boq
read_boq.boqItems → classify_trade.items
classify_trade.classifiedItems → split_work_package.items
split_work_package.tradePackages → generate_rfq.tradePackages
generate_rfq.documents → human_approval.attachments
human_approval.approvalDecision → logger.input
```

---

# 106. Template Seed

Seed workflow template into:

```text
workflow_templates
```

Template metadata:

```text
id: template.boq_to_rfq
name: BOQ to RFQ
category: Tendering
difficulty: beginner
required_packs: Core, QS, AI, Procurement, Document
```

---

# 107. MVP Local Demo Checklist

Before demo:

```text
[ ] Local frontend starts
[ ] Local backend starts
[ ] Database migrated
[ ] Seed data loaded
[ ] Demo user exists
[ ] Demo organization exists
[ ] Demo project exists
[ ] Packs installed
[ ] Nodes registered
[ ] Workflow template available
[ ] Sample BOQ available
[ ] AI provider or mock configured
[ ] Document storage works
[ ] Execution logs visible
```

---

# 108. MVP Build Milestone 1

Milestone:

```text
Platform Skeleton
```

Done when:

```text
[ ] Monorepo works
[ ] Web app runs
[ ] API app runs
[ ] Database connected
[ ] Auth context works
[ ] Organization and project created
```

---

# 109. MVP Build Milestone 2

Milestone:

```text
Workflow Foundation
```

Done when:

```text
[ ] Workflow JSON package complete
[ ] Workflow CRUD API works
[ ] Workflow version save/load works
[ ] Workflow editor saves canvas
[ ] Workflow validation works
```

---

# 110. MVP Build Milestone 3

Milestone:

```text
Node and Pack Foundation
```

Done when:

```text
[ ] Official Packs seeded
[ ] MVP nodes seeded
[ ] Node library loads from API
[ ] Node UI schemas visible
[ ] Nodes can be added to canvas
```

---

# 111. MVP Build Milestone 4

Milestone:

```text
Execution Foundation
```

Done when:

```text
[ ] Workflow run creates execution
[ ] Snapshot stored
[ ] Simple graph planned
[ ] Mock nodes execute
[ ] Logs stored
[ ] Execution viewer shows status
```

---

# 112. MVP Build Milestone 5

Milestone:

```text
BOQ-to-RFQ Demo
```

Done when:

```text
[ ] BOQ uploaded
[ ] Read BOQ node parses file
[ ] AI classify node groups items
[ ] Generate RFQ node creates artifact
[ ] Human approval pauses/resumes
[ ] Workflow completes
[ ] RFQ artifact downloads
```

---

# 113. Deployment Strategy

MVP deployment options:

```text
Frontend: Vercel
Backend: Render / Railway / Fly.io / VPS / container platform
Database: Supabase
Storage: Supabase Storage
Redis: Upstash / Redis Cloud / self-hosted
```

Keep deployment simple at first.

---

# 114. Staging Environment

Staging should have:

```text
Separate database
Separate storage bucket
Separate AI key
Seed demo data
Debug logging enabled
No real supplier emails
```

---

# 115. Production Environment

Production should have:

```text
Restricted logs
Secure secrets
Backups
RLS policies
Monitoring
Error tracking
Rate limits
Audit logs enabled
```

Do not move to production until MVP is stable.

---

# 116. CI/CD MVP

Minimum CI:

```text
Install dependencies
Typecheck
Lint
Run tests
Build web
Build api
```

Later:

```text
Run migrations on deploy
Preview deployment
End-to-end tests
Security checks
```

---

# 117. GitHub Actions Example

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main
      - dev

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

---

# 118. Documentation Folder

Place all prepared volumes in:

```text
docs/
```

Recommended names:

```text
01-workflow-engine-blueprint.md
02-node-sdk-specification.md
02-1-node-developer-guide.md
03-pack-specification.md
04-workflow-json-specification.md
05-execution-engine-specification.md
06-product-master-blueprint-v2.md
07-database-schema-specification.md
08-api-specification.md
09-ui-ux-product-specification.md
10-mvp-sprint-backlog.md
13-developer-setup-repository-implementation-guide.md
```

---

# 119. README Structure

Root README should include:

```text
QS-OS overview
MVP goal
Tech stack
Repository structure
Getting started
Environment variables
Development commands
Documentation links
Contributing rules
```

---

# 120. CONTRIBUTING.md

Create later:

```text
Branching rules
Commit style
PR checklist
Coding standards
Testing expectations
Security rules
AI coding agent rules
```

---

# 121. Security Checklist for Developers

```text
[ ] No secrets committed
[ ] No service role key in frontend
[ ] No raw secrets in logs
[ ] Organization ID checked
[ ] Project access checked
[ ] Dangerous actions require confirmation
[ ] AI outputs logged safely
[ ] File access uses signed URLs
[ ] Approval decisions audited
```

---

# 122. Performance Checklist

```text
[ ] Large BOQ files not stored directly in workflow JSON
[ ] Execution outputs can use storage refs
[ ] Logs paginated
[ ] Documents uploaded directly to storage
[ ] BOQ parsing tested with sample file
[ ] AI calls batched
```

---

# 123. Developer Troubleshooting

## Frontend cannot call API

Check:

```text
NEXT_PUBLIC_API_URL
CORS settings
Backend running
Auth token available
```

## Backend cannot connect database

Check:

```text
DATABASE_URL
Supabase credentials
Network access
Migration status
```

## Workflow does not save

Check:

```text
Workflow JSON validity
API request body
Organization header
Project ID
Database constraints
```

## Node library is empty

Check:

```text
Packs seeded
Registered nodes seeded
Organization ID
GET /nodes response
```

## Execution does not run

Check:

```text
Workflow version exists
Workflow validation passes
Node types registered
Execution engine logs
Node executor references
```

## BOQ parser fails

Check:

```text
Sheet name
Header row
Column names
File format
Storage download
Parser logs
```

---

# 124. Known MVP Technical Debt

Acceptable MVP debt:

```text
Direct execution before full queue
Basic Pack installation by seed only
Basic RFQ template
Basic UI schema renderer
Basic validation
Limited BOQ format support
Mock AI provider for testing
Manual deployment
```

Do not accept:

```text
No workflow snapshot
No execution logs
No organization scoping
Secrets in frontend
No tests for core validator
No artifact storage
```

---

# 125. First Working Demo Definition

The first working demo is complete when:

```text
A user can log in, create a project, upload a BOQ, open the BOQ-to-RFQ workflow, run it, see execution progress, approve generated RFQ output, and download the artifact.
```

This is the minimum proof of QS-OS.

---

# 126. Development Sequence Summary

```text
1. Build the skeleton.
2. Build the database.
3. Build auth and projects.
4. Build Workflow JSON.
5. Build workflow editor.
6. Build Pack and Node registry.
7. Build execution engine.
8. Build BOQ parser.
9. Build AI classifier.
10. Build RFQ generator.
11. Build approval.
12. Build execution viewer.
13. Test the demo.
```

---

# 127. Relationship to Other Volumes

This guide implements:

```text
Volume 1 – Workflow Engine Blueprint
The core vision and high-level architecture.

Volume 2 – QS Node SDK Specification
The node contract.

Volume 2.1 – QS Node Developer Guide
The practical node development method.

Volume 3 – QS Pack Specification
The Pack system.

Volume 4 – Workflow JSON Specification
The workflow file format.

Volume 5 – Execution Engine Specification
The runtime engine.

Volume 6 – Product Master Blueprint V2
The full product architecture.

Volume 7 – Database Schema Specification
The database tables and relationships.

Volume 8 – API Specification
The backend endpoints.

Volume 9 – UI/UX Product Specification
The frontend experience.

Volume 10 – MVP Sprint Backlog
The development tasks and roadmap.
```

---

# 128. Recommended Next Documents

After Volume 13, prepare:

```text
Volume 11 – AI Governance and Prompt Specification
Volume 12 – Security and Permission Specification
Volume 14 – QS-OS MVP Technical Task Pack for Codex
```

Recommended immediate practical next step:

```text
Volume 14 – QS-OS MVP Technical Task Pack for Codex
```

Purpose:

```text
Break the repository implementation into small Codex-ready prompts.
```

---

# 129. Final Developer Formula

```text
Developer Setup =
  Monorepo
  + Apps
  + Packages
  + Packs
  + Database
  + API
  + Canvas
  + Execution Engine
  + Nodes
  + Tests
```

```text
QS-OS implementation should begin with the smallest complete spine, not the whole future platform.
```

---

# Conclusion

This guide gives developers a clear starting point for building QS-OS.

The priority is to create a working MVP spine:

```text
Organization
  ↓
Project
  ↓
Workflow Editor
  ↓
Workflow JSON
  ↓
Node Registry
  ↓
Execution Engine
  ↓
BOQ Parser
  ↓
AI Classification
  ↓
RFQ Generation
  ↓
Human Approval
  ↓
Execution Logs and Artifacts
```

Once this works, QS-OS becomes more than documentation.

It becomes a real construction workflow operating system that can grow into procurement, contract administration, claims, final accounts, BIM, finance, and marketplace ecosystems.

Build the spine first.

Then grow the Packs.
