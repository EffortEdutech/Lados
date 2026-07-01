> **⚠️ HISTORICAL DOCUMENT — Phase 1 & 2 are complete.**
> These sprints established the monorepo foundation. At the time of writing, the platform was called **QS-WFUI** and targeted Quantity Surveying workflows. It has since been renamed to **Lados** and expanded to a universal business workflow platform.
> - Packages originally created as `@qsos/*` were renamed to `@lados/*` in Phase 1A.
> - All sprint numbering has been superseded by Phase numbering (P01, P02, ...) in the master checklist.
> - Preserved here for architectural reference and onboarding context.

---

# Lados — Sprint Plan: Sprint 1 + Sprint 2
**Version:** 1.0  
**Date:** 2026-06-15  
**Covers:** Sprint 1 (Monorepo Skeleton) + Sprint 2 (Auth + Canvas + Workflow JSON)  
**Based on:** Vol 6 (Product Master Blueprint), Vol 9 (UI/UX Spec), Vol 10 (Sprint Backlog), Vol 13 (Dev Setup), Vol 4 (Workflow JSON)

---

## Overview

Lados (formerly QS-WFUI) evolved from the QS-OS platform into a universal business workflow engine. The V4 architecture formalises this into a proper monorepo with a NestJS backend, Next.js frontend, and a true Pack/Node/Execution engine package system.

**MVP Goal:**  
The initial validation use case: a contractor uploads a BOQ, opens the BOQ-to-RFQ visual workflow, runs it, approves the output, and downloads the generated RFQ documents — with every step logged and auditable. Lados now targets universal business workflows across all industries.

**These two sprints establish the foundation.** Nothing executable runs yet at the end of Sprint 1. By the end of Sprint 2, a user can log in, create an org + project, and build + save a workflow on the canvas.

---

## Sprint Map

```
Sprint 1 — Monorepo Skeleton          ← YOU ARE HERE
Sprint 2 — Auth + Canvas + Workflow JSON
Sprint 3 — Node SDK, Pack Registry, Node Registry
Sprint 4 — Execution Engine MVP
Sprint 5 — Read BOQ Node + Document Upload
Sprint 6 — AI Classify + RFQ Generation
Sprint 7 — Human Approval + Execution Viewer
Sprint 8 — Demo Workflow, QA, Polish
```

---

## Tech Stack (Confirmed)

| Layer | Technology |
|---|---|
| Frontend | Next.js, React 18, TypeScript, React Flow, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, REST API, class-validator |
| Database | Supabase PostgreSQL (JSONB + relational) |
| Storage | Supabase Storage |
| Queue | BullMQ + Redis (deferred to Sprint 4) |
| AI | OpenAI-compatible abstraction (deferred to Sprint 6) |
| Package manager | pnpm with workspaces |
| Monorepo | pnpm workspaces |

---

## Coding Standards

- TypeScript strict mode everywhere
- ESLint + Prettier configured at root
- `snake_case` for database columns
- `camelCase` for TypeScript variables
- `kebab-case` for file names
- API response envelope: `{ success, data, error, meta? }`
- All commits use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Branch strategy: `main` → `dev` → `feature/*`

---

---

# ═══════════════════════════════
# SPRINT 1 — Monorepo Skeleton
# ═══════════════════════════════

**Goal:** A developer can clone the repo and run the frontend and backend locally.  
**Duration:** 1 week  
**Deliverable:** Empty but running — web app renders a placeholder, API returns health check, shared packages import cleanly.

---

## Sprint 1 Progress Tracker

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| S1-001 | Initialize pnpm monorepo | | ⬜ Pending | Root package.json + pnpm-workspace.yaml |
| S1-002 | Create apps/web (Next.js) | | ⬜ Pending | |
| S1-003 | Create apps/api (NestJS) | | ⬜ Pending | |
| S1-004 | Create @lados/shared-types package (originally @qsos/shared-types, renamed in Phase 1A) | | ⬜ Pending | |
| S1-005 | Create @lados/workflow-json package stub | | ⬜ Pending | |
| S1-006 | Create @lados/node-sdk package stub | | ⬜ Pending | |
| S1-007 | Create @lados/pack-sdk package stub | | ⬜ Pending | |
| S1-008 | Create @lados/execution-engine package stub | | ⬜ Pending | |
| S1-009 | Create packs/ folder stubs | | ⬜ Pending | |
| S1-010 | Configure root TypeScript | | ⬜ Pending | Shared tsconfig.base.json |
| S1-011 | Configure ESLint + Prettier | | ⬜ Pending | |
| S1-012 | Configure root dev scripts | | ⬜ Pending | pnpm dev, build, lint, format |
| S1-013 | Create .env.example | | ⬜ Pending | |
| S1-014 | Create root README | | ⬜ Pending | |
| S1-015 | Verify monorepo runs (smoke test) | | ⬜ Pending | Both apps start + health check passes |

**Sprint 1 Status:** ⬜ Not started

---

## S1-001 — Initialize pnpm Monorepo

**Priority:** P0 · **Size:** S

### What to build

```
lados/                          ← root (this folder)
├── apps/
│   ├── web/                      ← Next.js frontend
│   └── api/                      ← NestJS backend
├── packages/
│   ├── shared-types/             ← @lados/shared-types
│   ├── workflow-json/            ← @lados/workflow-json
│   ├── node-sdk/                 ← @lados/node-sdk
│   ├── pack-sdk/                 ← @lados/pack-sdk
│   └── execution-engine/         ← @lados/execution-engine
├── packs/
│   ├── core-pack/
│   ├── document-pack/
│   ├── qs-pack/
│   ├── ai-pack/
│   └── procurement-pack/
├── docs/                         ← existing docs folder
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── .env.example
└── README.md
```

### Files to create

**`pnpm-workspace.yaml`**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packs/*'
```

**`package.json` (root)**
```json
{
  "name": "lados",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:seed": "pnpm --filter api db:seed"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0"
  }
}
```

**`tsconfig.base.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Acceptance criteria
- [ ] `pnpm install` at root resolves all workspaces
- [ ] Folder structure matches spec above
- [ ] `tsconfig.base.json` present and valid

---

## S1-002 — Create apps/web (Next.js)

**Priority:** P0 · **Size:** M

### What to build

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← placeholder: "Lados Platform is loading..."
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx      ← empty placeholder
│   │   └── (app)/
│   │       └── dashboard/
│   │           └── page.tsx      ← empty placeholder
│   ├── components/               ← empty
│   ├── lib/
│   │   └── supabase/
│   │       └── client.ts         ← Supabase browser client
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.local.example
```

### Key dependencies
```
next@14
react@18
react-dom@18
typescript
tailwindcss
@supabase/supabase-js
@supabase/ssr
@lados/shared-types (workspace)
```

### Acceptance criteria
- [ ] `pnpm dev:web` starts on port 3000
- [ ] Root page renders without error
- [ ] Tailwind styles apply
- [ ] `@lados/shared-types` imports without error

---

## S1-003 — Create apps/api (NestJS)

**Priority:** P0 · **Size:** M

### What to build

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   └── common/
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── pipes/
│       │   └── validation.pipe.ts
│       └── types/
│           └── api-response.ts
├── package.json
├── tsconfig.json
└── nest-cli.json
```

**`GET /api/v1/health`** must return:
```json
{ "success": true, "data": { "status": "ok", "version": "0.1.0" }, "error": null }
```

### Key dependencies
```
@nestjs/core
@nestjs/common
@nestjs/platform-fastify (or express)
@nestjs/config
class-validator
class-transformer
@supabase/supabase-js
@lados/shared-types (workspace)
```

### Acceptance criteria
- [ ] `pnpm dev:api` starts on port 4000
- [ ] `GET /api/v1/health` returns 200 with JSON body
- [ ] API prefix `/api/v1` configured globally
- [ ] Global validation pipe active
- [ ] Global HTTP exception filter active

---

## S1-004 — Create @lados/shared-types

**Priority:** P0 · **Size:** S

### What to build

```
packages/shared-types/
├── src/
│   ├── index.ts
│   ├── api.ts          ← API response envelope types
│   ├── ids.ts          ← ID/UUID type aliases
│   ├── status.ts       ← shared status enums
│   └── pagination.ts   ← pagination types
├── package.json
└── tsconfig.json
```

**`src/api.ts`**
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  pageSize?: number;
}
```

**`src/status.ts`**
```typescript
export type WorkflowStatus = 'draft' | 'active' | 'archived' | 'paused';
export type ExecutionStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'cancelled';
export type PackType = 'official' | 'verified' | 'community' | 'private';
```

### Acceptance criteria
- [ ] Package builds with `pnpm build`
- [ ] `ApiResponse` type usable from both web and api
- [ ] All status enums exported

---

## S1-005 to S1-008 — Package Stubs

Create stub packages for `@lados/workflow-json`, `@lados/node-sdk`, `@lados/pack-sdk`, `@lados/execution-engine`.

Each stub needs:
```
packages/<name>/
├── src/
│   └── index.ts    ← export const VERSION = '0.1.0';
├── package.json
└── tsconfig.json
```

These will be filled in Sprint 2 (workflow-json) and Sprint 3 (node-sdk, pack-sdk, execution-engine).

### Acceptance criteria
- [ ] All four packages have a valid `package.json` with correct name
- [ ] All four packages build without error
- [ ] All four can be imported by apps/web and apps/api

---

## S1-009 — Create packs/ Stubs

```
packs/
├── core-pack/
│   ├── src/index.ts
│   └── package.json
├── document-pack/
│   └── ...
├── qs-pack/
│   └── ...
├── ai-pack/
│   └── ...
└── procurement-pack/
    └── ...
```

Each pack stub exports:
```typescript
export const PACK_ID = 'qsos.core-pack'; // or relevant pack id
export const PACK_VERSION = '0.1.0';
```

### Acceptance criteria
- [ ] All five packs have valid package.json
- [ ] All five packs build

---

## S1-010 — TypeScript Configuration

**`tsconfig.base.json`** at root (shared strict config — see S1-001).

Each `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

Each `apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

---

## S1-013 — .env.example

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API (backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Storage
STORAGE_BUCKET=qsos-documents

# Queue (Sprint 4)
REDIS_URL=redis://localhost:6379

# AI (Sprint 6)
AI_PROVIDER_API_KEY=your-key
AI_PROVIDER_BASE_URL=https://api.openai.com/v1

# App
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
PORT=4000
```

---

## S1-015 — Sprint 1 Smoke Test

Run this checklist after completing all S1 tasks:

```
[ ] cd lados && pnpm install            → no errors
[ ] pnpm typecheck                         → no errors
[ ] pnpm lint                              → no errors
[ ] pnpm dev:web                           → localhost:3000 shows placeholder
[ ] pnpm dev:api                           → localhost:4000 starts
[ ] curl localhost:4000/api/v1/health      → { "success": true, "data": { "status": "ok" } }
[ ] import from @lados/shared-types         → compiles without error
[ ] All 9 packages build individually      → pnpm -r build passes
```

---

---

# ═══════════════════════════════
# SPRINT 2 — Auth + App Shell + Canvas + Workflow JSON
# ═══════════════════════════════

**Goal:** A user can log in, create an organization and project, and build + save a simple workflow on the canvas.  
**Duration:** 2 weeks (Sprint 2 is larger — covers Vol 10 Sprints 2, 3, and 4)  
**Deliverable:** Working multi-tenant workspace with a live React Flow canvas that saves Workflow JSON to the database.

---

## Sprint 2 Progress Tracker

### Phase A — Auth + Organization + Project

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| S2-A01 | Database foundation migration | | ⬜ Pending | Core tables + RLS |
| S2-A02 | NestJS Auth module (Supabase JWT guard) | | ⬜ Pending | |
| S2-A03 | GET /api/v1/me endpoint | | ⬜ Pending | |
| S2-A04 | Organizations table + API | | ⬜ Pending | |
| S2-A05 | Projects table + API | | ⬜ Pending | |
| S2-A06 | Login page UI | | ⬜ Pending | |
| S2-A07 | App shell layout + sidebar | | ⬜ Pending | |
| S2-A08 | Dashboard page (placeholder) | | ⬜ Pending | |
| S2-A09 | Projects list + create project UI | | ⬜ Pending | |

### Phase B — Workflow JSON Package

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| S2-B01 | Workflow JSON TypeScript interfaces | | ⬜ Pending | @lados/workflow-json |
| S2-B02 | Workflow JSON schema (JSON Schema) | | ⬜ Pending | |
| S2-B03 | Workflow validator service | | ⬜ Pending | |
| S2-B04 | Workflows + workflow_versions DB tables | | ⬜ Pending | |
| S2-B05 | Workflow CRUD API | | ⬜ Pending | |
| S2-B06 | Workflow versions API | | ⬜ Pending | |
| S2-B07 | Workflow validate API | | ⬜ Pending | |

### Phase C — Workflow Canvas

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| S2-C01 | Workflow list page | | ⬜ Pending | |
| S2-C02 | Workflow editor shell (layout) | | ⬜ Pending | |
| S2-C03 | React Flow canvas integration | | ⬜ Pending | |
| S2-C04 | Static node library panel (6 nodes) | | ⬜ Pending | |
| S2-C05 | Property panel (node config) | | ⬜ Pending | |
| S2-C06 | Canvas → Workflow JSON serializer | | ⬜ Pending | |
| S2-C07 | Workflow JSON → canvas loader | | ⬜ Pending | |
| S2-C08 | Save workflow action | | ⬜ Pending | |
| S2-C09 | Validation panel UI | | ⬜ Pending | |

### Sprint 2 Verification

| ID | Task | Owner | Status |
|---|---|---|---|
| S2-V01 | End-to-end: login → create project → build + save workflow | | ⬜ Pending |
| S2-V02 | Workflow JSON roundtrip (save → reload → canvas) | | ⬜ Pending |

**Sprint 2 Status:** ⬜ Not started

---

## S2-A01 — Database Foundation Migration

**Priority:** P0 · **Size:** L

Create `supabase/migrations/001_foundation.sql` with:

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- user_profiles (synced from auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- organization_members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',   -- owner | admin | member | viewer
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | active | archived
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workflow_versions (stores Workflow JSON)
CREATE TABLE IF NOT EXISTS public.workflow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  definition JSONB NOT NULL,
  definition_hash TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, version)
);

-- Indexes
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_workflows_project ON public.workflows(project_id);
CREATE INDEX idx_workflow_versions_workflow ON public.workflow_versions(workflow_id);

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
```

**RLS policies** (add after tables):
- `user_profiles`: user can read/update own profile
- `organizations`: members can read; owners/admins can update
- `projects`: organization members can read; admins can write
- `workflows`: project organization members can read; editors can write
- `workflow_versions`: same as workflows

### Acceptance criteria
- [ ] Migration runs in Supabase without errors
- [ ] All tables exist
- [ ] RLS enabled on all tables
- [ ] Indexes created

---

## S2-A02 — NestJS Auth Module (Supabase JWT Guard)

**Priority:** P0 · **Size:** M

### Files to create

```
apps/api/src/auth/
├── auth.module.ts
├── supabase.guard.ts       ← validates Supabase JWT
├── current-user.decorator.ts
└── types/
    └── authenticated-user.ts
```

**`supabase.guard.ts`**
```typescript
// Validates the Authorization: Bearer <token> header
// Calls supabase.auth.getUser(token)
// Attaches user to request as req.user
// Returns 401 if invalid
```

**`current-user.decorator.ts`**
```typescript
// @CurrentUser() decorator to inject req.user into controllers
```

### Acceptance criteria
- [ ] Requests without valid JWT return 401
- [ ] Valid Supabase token allows request through
- [ ] `@CurrentUser()` injects user object
- [ ] Auth guard can be applied per-route or globally

---

## S2-A03 — GET /me Endpoint

**Priority:** P0 · **Size:** S

```
GET /api/v1/me
Authorization: Bearer <token>
Response: { success: true, data: { id, email, displayName, avatarUrl, organizations: [...] } }
```

### Acceptance criteria
- [ ] Returns current user profile
- [ ] Returns organizations user belongs to
- [ ] Returns 401 if not authenticated

---

## S2-A04 — Organizations API

**Priority:** P0 · **Size:** M

```
POST   /api/v1/organizations        → create org (creator becomes owner)
GET    /api/v1/organizations        → list orgs for current user
GET    /api/v1/organizations/:id    → get org detail
PATCH  /api/v1/organizations/:id    → update org name (admin only)
GET    /api/v1/organizations/:id/members
```

### Acceptance criteria
- [ ] User can create organization
- [ ] Creator is auto-added as owner
- [ ] User only sees orgs they belong to
- [ ] Unauthorized access returns 403

---

## S2-A05 — Projects API

**Priority:** P0 · **Size:** M

```
POST   /api/v1/organizations/:orgId/projects
GET    /api/v1/organizations/:orgId/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
```

### Acceptance criteria
- [ ] User can create project under org
- [ ] Project scoped to organization
- [ ] Non-member cannot access org's projects

---

## S2-A06 — Login Page UI

**Priority:** P0 · **Size:** M

```
apps/web/src/app/(auth)/login/page.tsx
```

Uses Supabase Auth UI or custom form:
- Email + password sign in
- Sign up option
- Redirect to `/dashboard` on success
- Error message on failure

### Acceptance criteria
- [ ] User can sign in with email + password
- [ ] Redirects to dashboard after login
- [ ] Error shown for wrong credentials
- [ ] Protected routes redirect to login if unauthenticated

---

## S2-A07 — App Shell Layout + Sidebar

**Priority:** P0 · **Size:** M

```
apps/web/src/app/(app)/layout.tsx
apps/web/src/components/layout/
├── AppShell.tsx
├── Sidebar.tsx
├── TopBar.tsx
└── OrgSwitcher.tsx
```

Sidebar navigation links:
```
Dashboard
Projects
Workflows       ← Sprint 2
Executions      ← Sprint 4
Approvals       ← Sprint 7
Packs           ← Sprint 3
Settings
```

### Acceptance criteria
- [ ] Sidebar visible when authenticated
- [ ] Active link highlighted
- [ ] Organization name shown in sidebar header
- [ ] User avatar/name shown in top bar with logout

---

## S2-A08 — Dashboard Page

**Priority:** P1 · **Size:** S

```
/dashboard
```

Shows:
- Welcome message
- Quick actions: Create Project, Browse Templates
- Projects summary (count)
- Pending Approvals (placeholder, `0`)
- Recent Executions (placeholder, empty)

### Acceptance criteria
- [ ] Dashboard route works
- [ ] Renders without error
- [ ] Quick action buttons navigate correctly

---

## S2-A09 — Projects List + Create Project UI

**Priority:** P0 · **Size:** M

```
/projects              → list all projects
/projects/new          → create project form (or modal)
/projects/:id          → project workspace (placeholder for now)
```

### Acceptance criteria
- [ ] Projects list shows all org projects
- [ ] Create project form with name, description, currency
- [ ] New project appears in list immediately
- [ ] Clicking project navigates to project page

---

## S2-B01 — Workflow JSON TypeScript Interfaces

**Priority:** P0 · **Size:** M · **Package:** `@lados/workflow-json`

```
packages/workflow-json/src/
├── index.ts
├── types/
│   ├── workflow.ts         ← root types
│   ├── node.ts             ← node instance types
│   ├── connection.ts       ← connection/edge types
│   ├── variable.ts         ← variable types
│   ├── trigger.ts          ← trigger types
│   └── execution-policy.ts ← retry, timeout, etc.
├── schema/
│   └── workflow.schema.json ← JSON Schema for validation
└── validator/
    └── WorkflowValidator.ts
```

**Core types (from Vol 4):**

```typescript
// types/workflow.ts
export interface QSWorkflowDefinition {
  schemaVersion: string;            // "1.0.0"
  workflow: WorkflowInfo;
  dependencies: WorkflowDependencies;
  nodes: WorkflowNodeInstance[];
  connections: WorkflowConnection[];
  variables?: Record<string, WorkflowVariable>;
  secrets?: WorkflowSecretRef[];
  triggers?: WorkflowTrigger[];
  settings?: WorkflowSettings;
  execution?: WorkflowExecutionPolicy;
  ui?: WorkflowUIState;
  metadata: WorkflowMetadata;
}

export interface WorkflowInfo {
  id: string;          // e.g. "workflow.tender_boq_to_rfq"
  name: string;
  version: string;     // semver "1.0.0"
  description?: string;
  status: 'draft' | 'active' | 'archived';
  tags?: string[];
}

export interface WorkflowDependencies {
  packs: PackDependency[];
  nodes?: string[];    // optional explicit node list
}

export interface PackDependency {
  id: string;          // e.g. "qsos.qs-pack"
  version: string;     // semver range "^1.0.0"
}
```

```typescript
// types/node.ts
export interface WorkflowNodeInstance {
  id: string;             // unique in this workflow, e.g. "node_1"
  type: string;           // registered node type, e.g. "qs.read_boq"
  packId: string;         // e.g. "qsos.qs-pack"
  name?: string;          // display name override
  configuration: Record<string, unknown>;
  position: { x: number; y: number };
  ui?: NodeUIState;
}
```

```typescript
// types/connection.ts
export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  condition?: string;    // optional conditional expression
}
```

### Acceptance criteria
- [ ] All types exported from `@lados/workflow-json`
- [ ] Minimal workflow JSON object type-checks against interface
- [ ] Package builds

---

## S2-B02 — Workflow JSON Schema

**Priority:** P0 · **Size:** M

Create `packages/workflow-json/src/schema/workflow.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "QSWorkflowDefinition",
  "type": "object",
  "required": ["schemaVersion", "workflow", "dependencies", "nodes", "connections", "metadata"],
  "properties": {
    "schemaVersion": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "workflow": {
      "type": "object",
      "required": ["id", "name", "version", "status"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string", "minLength": 1 },
        "version": { "type": "string" },
        "status": { "type": "string", "enum": ["draft", "active", "archived"] }
      }
    },
    "nodes": { "type": "array" },
    "connections": { "type": "array" },
    "dependencies": {
      "type": "object",
      "required": ["packs"],
      "properties": {
        "packs": { "type": "array" }
      }
    },
    "metadata": { "type": "object" }
  }
}
```

### Acceptance criteria
- [ ] Schema validates a minimal valid workflow
- [ ] Schema rejects a workflow missing required fields

---

## S2-B03 — Workflow Validator Service

**Priority:** P0 · **Size:** M

```
packages/workflow-json/src/validator/WorkflowValidator.ts
```

Validation checks:
1. Schema validity (against JSON Schema)
2. Unique node IDs
3. Unique connection IDs
4. Connection source node exists
5. Connection target node exists
6. At least one trigger or manual trigger node

Returns:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

interface ValidationMessage {
  code: string;
  message: string;
  nodeId?: string;
  field?: string;
}
```

### Acceptance criteria
- [ ] Valid minimal workflow returns `{ valid: true, errors: [], warnings: [] }`
- [ ] Workflow with orphan connection returns error with connection reference
- [ ] Duplicate node IDs return error
- [ ] Unit tests for each check pass

---

## S2-B04 to S2-B07 — Workflow APIs

**Priority:** P0 · **Size:** L

**NestJS modules:**
```
apps/api/src/workflow/
├── workflow.module.ts
├── workflow.controller.ts
├── workflow.service.ts
├── workflow-versions.controller.ts
├── workflow-versions.service.ts
└── dto/
    ├── create-workflow.dto.ts
    ├── update-workflow.dto.ts
    └── save-version.dto.ts
```

**Endpoints:**
```
POST   /api/v1/projects/:projectId/workflows       → create
GET    /api/v1/projects/:projectId/workflows       → list
GET    /api/v1/workflows/:id                       → get
PATCH  /api/v1/workflows/:id                       → update name/description/status
DELETE /api/v1/workflows/:id                       → soft delete (archive)
POST   /api/v1/workflows/:id/versions              → save new version (body: WorkflowJSON)
GET    /api/v1/workflows/:id/versions              → list versions
GET    /api/v1/workflows/:id/versions/:v           → get specific version
POST   /api/v1/workflows/:id/validate              → validate current draft
```

**Save version response:**
```json
{
  "success": true,
  "data": {
    "versionId": "uuid",
    "version": 1,
    "definitionHash": "sha256-...",
    "createdAt": "2026-06-15T00:00:00.000Z"
  },
  "error": null
}
```

### Acceptance criteria
- [ ] All endpoints return correct status codes
- [ ] Organization + project scoping enforced
- [ ] Workflow JSON stored as JSONB in `definition` column
- [ ] Version number auto-increments

---

## S2-C01 — Workflow List Page

**Priority:** P0 · **Size:** M

```
/projects/:id/workflows
```

Shows:
- List of workflows for the project
- Status badge (draft / active / archived)
- "Create Workflow" button → name modal
- Click → opens `/workflows/:id/editor`

---

## S2-C02 — Workflow Editor Shell

**Priority:** P0 · **Size:** M

```
/workflows/:id/editor
apps/web/src/app/(app)/workflows/[id]/editor/page.tsx
apps/web/src/components/editor/
├── WorkflowEditorLayout.tsx
├── EditorHeader.tsx           ← name, save, validate, run buttons
├── NodeLibraryPanel.tsx       ← left panel
├── PropertyPanel.tsx          ← right panel
├── ValidationPanel.tsx        ← bottom panel
└── WorkflowCanvas.tsx         ← center (React Flow)
```

Layout:
```
┌──────────────────────────────────────────┐
│ [WorkflowName]  [Validate] [Save] [Run▸] │  EditorHeader
├──────────┬───────────────────┬───────────┤
│ Node     │                   │ Property  │
│ Library  │   React Flow      │ Panel     │
│          │   Canvas          │           │
│          │                   │           │
├──────────┴───────────────────┴───────────┤
│ Validation Panel (collapsible)           │
└──────────────────────────────────────────┘
```

### Acceptance criteria
- [ ] Editor route loads correctly
- [ ] All four panels visible
- [ ] Workflow name displayed in header
- [ ] Save and Validate buttons call correct handlers

---

## S2-C03 — React Flow Canvas Integration

**Priority:** P0 · **Size:** L

**Dependencies:**
```
reactflow (or @xyflow/react)
```

**`WorkflowCanvas.tsx`** features:
- Renders `ReactFlow` with custom node types
- `QSNodeCard` — custom node renderer with Pack badge, input/output handles
- Connection line with animated edge
- MiniMap enabled
- Controls (zoom, fit) enabled
- Canvas state managed with Zustand store

**Zustand store:**
```typescript
interface WorkflowEditorStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (nodeType: string) => void;
  selectNode: (id: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
}
```

### Acceptance criteria
- [ ] Canvas renders with empty state message
- [ ] Nodes can be dragged onto canvas
- [ ] Nodes can be connected
- [ ] Zoom and pan work
- [ ] Selected node highlights

---

## S2-C04 — Static Node Library Panel

**Priority:** P0 · **Size:** M

Six static nodes in two categories:

```
Core Pack
  ○ Manual Trigger
  ○ Human Approval
  ○ Logger

QS Pack
  ○ Read BOQ
  ○ AI Classify Trade
  ○ Generate RFQ
```

Each node card shows:
- Icon (emoji placeholder is fine for MVP)
- Node name
- Pack badge
- Short description

Drag-and-drop adds node to canvas.

### Acceptance criteria
- [ ] Six nodes visible
- [ ] Grouped by pack
- [ ] Dragging onto canvas adds node
- [ ] Node appears with correct label

---

## S2-C05 — Property Panel

**Priority:** P0 · **Size:** M

When a node is selected:
- Shows node type and pack
- Editable display name
- JSON config editor (CodeMirror or textarea)
- Shows port definitions (read-only list)

When no node is selected:
- Shows "Select a node to configure it"

### Acceptance criteria
- [ ] Panel updates when different node is selected
- [ ] Name field edits update canvas node label
- [ ] Config JSON is editable and saved to node state

---

## S2-C06 — Canvas → Workflow JSON Serializer

**Priority:** P0 · **Size:** L

```
apps/web/src/lib/workflow/
├── serializer.ts     ← canvas state → QSWorkflowDefinition
└── deserializer.ts   ← QSWorkflowDefinition → canvas state
```

**`serializer.ts`:**
```typescript
export function serializeCanvasToWorkflowJSON(
  workflowInfo: WorkflowInfo,
  nodes: Node[],
  edges: Edge[]
): QSWorkflowDefinition
```

Maps:
- React Flow `Node` → `WorkflowNodeInstance`
- React Flow `Edge` → `WorkflowConnection`
- Infers `dependencies.packs` from node `packId` fields

**`deserializer.ts`:**
```typescript
export function deserializeWorkflowJSONToCanvas(
  definition: QSWorkflowDefinition
): { nodes: Node[], edges: Edge[] }
```

### Acceptance criteria
- [ ] Round-trip: canvas → JSON → canvas preserves all nodes and connections
- [ ] Position is preserved
- [ ] Configuration is preserved
- [ ] Unit tests for serializer pass

---

## S2-C07 — Workflow JSON → Canvas Loader

When opening `/workflows/:id/editor`:
1. Fetch workflow versions from API → get latest version
2. If version exists → deserialize definition → populate canvas
3. If no version → start with empty canvas

### Acceptance criteria
- [ ] Previously saved workflow loads correctly on editor open
- [ ] Empty workflow shows empty canvas
- [ ] Loading state shown while fetching

---

## S2-C08 — Save Workflow Action

When user clicks "Save" in EditorHeader:
1. Serialize canvas → Workflow JSON
2. Call validator → show warning if invalid but still allow save
3. POST to `/api/v1/workflows/:id/versions`
4. Mark store as clean
5. Show success toast

### Acceptance criteria
- [ ] Workflow JSON saved to database
- [ ] Success toast shown
- [ ] Dirty indicator cleared after save
- [ ] Save button disabled while saving (loading state)

---

## S2-C09 — Validation Panel

When user clicks "Validate":
1. Call POST `/api/v1/workflows/:id/validate`
2. Display results in bottom panel

Panel shows:
- ✅ "Workflow is valid" or ❌ "X errors, Y warnings"
- List of messages with error code + message
- Error messages in red, warnings in yellow
- If message has `nodeId`, clicking it selects that node

### Acceptance criteria
- [ ] Validation results appear in panel
- [ ] Errors are visually distinct from warnings
- [ ] Clicking error selects affected node (where nodeId available)
- [ ] Panel collapses when there are no messages

---

## S2-V01 — End-to-End Verification

Walk through this full flow after Sprint 2 completion:

```
[ ] 1. Open http://localhost:3000 → redirected to login
[ ] 2. Sign in with email + password → redirected to dashboard
[ ] 3. Create organization "Bina Teguh"
[ ] 4. Create project "Rawang Stadium Tender"
[ ] 5. Navigate to project → click "Workflows"
[ ] 6. Click "Create Workflow" → enter name "Tender BOQ to RFQ"
[ ] 7. Open workflow editor
[ ] 8. Drag "Manual Trigger" node to canvas
[ ] 9. Drag "Read BOQ" node to canvas
[ ] 10. Drag "AI Classify Trade" node to canvas
[ ] 11. Connect: Manual Trigger → Read BOQ → AI Classify Trade
[ ] 12. Click "Validate" → shows warnings (nodes have no config yet)
[ ] 13. Click "Save" → success toast
[ ] 14. Refresh page → workflow reloads with all nodes + connections intact
[ ] 15. GET /api/v1/workflows/:id/versions/:v → returns valid Workflow JSON
```

---

## S2-V02 — Workflow JSON Roundtrip Test

```
[ ] Serialize 3-node canvas → valid QSWorkflowDefinition
[ ] Definition passes WorkflowValidator
[ ] POST to API → 201 response with versionId
[ ] GET version → returns identical definition
[ ] Deserialize definition → reconstructs same 3 nodes + 2 edges
```

---

---

# Definition of Done

A task is **Done** when:

- [ ] TypeScript builds without errors (`pnpm typecheck`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] Feature is manually testable
- [ ] Acceptance criteria in this doc are checked off
- [ ] No hardcoded secrets in source
- [ ] .env.example updated if new env var added

---

# Known Limitations (Sprint 1 + 2)

These are intentional deferrals — not bugs:

| Item | Deferred to |
|---|---|
| Node library loaded from live API (dynamic) | Sprint 3 |
| Property panel generated from node UI schema | Sprint 3 |
| Workflow execution | Sprint 4 |
| Execution viewer | Sprint 7 |
| Pack install/uninstall UI | Sprint 3 |
| Queue (BullMQ/Redis) | Sprint 4 |
| Real AI calls | Sprint 6 |
| Human Approval node runtime | Sprint 7 |
| RFQ document generation | Sprint 6 |
| Realtime execution updates | Sprint 7 |

---

# Dependencies Between Tasks

```
S1-001 ──► S1-002 (web needs monorepo)
S1-001 ──► S1-003 (api needs monorepo)
S1-001 ──► S1-004 (shared-types needs workspace)
S1-004 ──► S1-002 (web imports shared-types)
S1-004 ──► S1-003 (api imports shared-types)
S1-001 to S1-015 must all pass before Sprint 2 begins

S2-A01 ──► S2-A04 (orgs need tables)
S2-A01 ──► S2-A05 (projects need tables)
S2-A02 ──► S2-A04 (org API needs auth guard)
S2-A06 ──► S2-A07 (shell needs auth to work)
S2-A07 ──► S2-A08, S2-A09 (pages need shell)
S2-B01 ──► S2-B02 (schema references types)
S2-B01 ──► S2-B03 (validator uses types)
S2-B04 ──► S2-B05, S2-B06, S2-B07 (APIs need table)
S2-C02 ──► S2-C03 (canvas inside editor shell)
S2-C03 ──► S2-C04, S2-C05 (panels need canvas)
S2-C06 ──► S2-C08 (save needs serializer)
S2-B05 ──► S2-C08 (save calls API)
S2-A09 ──► S2-C01 (workflow list inside project)
```

---

# Supabase Project Reference

Existing Supabase project (from Lados Platform V1 — same database, new schema group):
- URL: `https://lqldimovuxdfhmcaxcdg.supabase.co`
- New V2 tables should use a clean migration set (prefix `v2_` or use a separate Supabase project for V2 if preferred)

**Recommendation:** Create a new Supabase project for Lados V2 to avoid schema conflicts with the live V1 Lados Platform.

---

# Next Steps After Sprint 2

Sprint 3 tasks:
1. Create `@lados/node-sdk` full interfaces
2. Create `@lados/pack-sdk` full interfaces
3. Seed pack registry table (5 official packs)
4. Seed node registry table (12 MVP nodes)
5. Connect node library panel to live API
6. Generate property panel from node UI schema

---

*Document end — Lados Sprint 1 + 2 Plan v1.0*
