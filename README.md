# QS-WFUI — Quantity Surveying Workflow UI

> **Version 2** of QS-OS. A visual workflow operating system for Quantity Surveyors.
>
> Build construction commercial workflows visually — BOQ to RFQ, claims, variations, and beyond.

---

## What is this?

QS-WFUI is a **Construction Workflow Operating System** that combines:

- **ComfyUI-style visual node builder** — drag and drop QS nodes onto a canvas
- **n8n-inspired execution engine** — durable, logged, auditable workflow runs
- **QS domain Packs** — nodes for BOQ, RFQ, procurement, claims, variations
- **AI assistance with human approval** — AI classifies, humans decide

**MVP goal:** Upload a BOQ → run a visual workflow → generate RFQ packages with AI classification → approve → download.

---

## Monorepo Structure

```
qs-wfui/
├── apps/
│   ├── web/              → Next.js frontend (port 3000)
│   └── api/              → NestJS backend (port 4000)
├── packages/
│   ├── shared-types/     → @qsos/shared-types
│   ├── workflow-json/    → @qsos/workflow-json
│   ├── node-sdk/         → @qsos/node-sdk
│   ├── pack-sdk/         → @qsos/pack-sdk
│   └── execution-engine/ → @qsos/execution-engine
├── packs/
│   ├── core-pack/        → triggers, approval, logger, condition
│   ├── document-pack/    → upload, read excel, generate PDF/Word
│   ├── qs-pack/          → read BOQ, classify trade, cost summary
│   ├── ai-pack/          → classifier, extractor, reviewer
│   └── procurement-pack/ → generate RFQ, compare quotations
├── supabase/
│   └── migrations/       → SQL migration files
└── docs/                 → Technical specification volumes (Vol 1–14)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, React Flow, Tailwind CSS |
| Backend | NestJS, TypeScript, REST API |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Queue | BullMQ + Redis (Sprint 4+) |
| AI | OpenAI-compatible abstraction (Sprint 6+) |
| Package manager | pnpm workspaces |

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- A Supabase project (create at supabase.com)

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Supabase URL and keys
```

### 3. Run database migrations

In your Supabase dashboard SQL editor, run:
```
supabase/migrations/001_foundation.sql  (Sprint 2)
```

### 4. Start development servers

```bash
# Both web and API in parallel
pnpm dev

# Or individually
pnpm dev:web    # http://localhost:3000
pnpm dev:api    # http://localhost:4000
```

### 5. Verify API health

```bash
curl http://localhost:4000/api/v1/health
# → { "success": true, "data": { "status": "ok", "version": "0.1.0" } }
```

---

## Development Commands

```bash
pnpm dev              # Start web + api in parallel
pnpm build            # Build all packages and apps
pnpm typecheck        # TypeScript check across all packages
pnpm lint             # ESLint across all packages
pnpm format           # Prettier format
pnpm test             # Run all tests
pnpm db:migrate       # Apply pending migrations
pnpm db:seed          # Seed demo data
```

---

## Sprint Progress

| Sprint | Goal | Status |
|---|---|---|
| Sprint 1 | Monorepo skeleton | 🚧 In Progress |
| Sprint 2 | Auth + App Shell + Canvas + Workflow JSON | ⬜ Pending |
| Sprint 3 | Node SDK, Pack Registry, Node Registry | ⬜ Pending |
| Sprint 4 | Execution Engine MVP | ⬜ Pending |
| Sprint 5 | Read BOQ Node + Document Upload | ⬜ Pending |
| Sprint 6 | AI Classify + RFQ Generation | ⬜ Pending |
| Sprint 7 | Human Approval + Execution Viewer | ⬜ Pending |
| Sprint 8 | Demo Workflow, QA, Polish | ⬜ Pending |

See `QS-WFUI_Sprint_Plan_S1_S2.md` for full task breakdown.

---

## Documentation

All technical specifications are in `docs/`:

- `QS-OS_Workflow_Engine_Blueprint_V1.md` — Platform vision
- `QS-OS_Volume_2_QS_Node_SDK_Specification.md` — Node SDK
- `QS-OS_Volume_3_QS_Pack_Specification.md` — Pack system
- `QS-OS_Volume_4_Workflow_JSON_Specification.md` — Workflow JSON format
- `QS-OS_Volume_5_Execution_Engine_Specification.md` — Execution engine
- `QS-OS_Volume_6_Product_Master_Blueprint_V2.md` — Master blueprint
- `QS-OS_Volume_9_UI_UX_Product_Specification.md` — UI/UX spec
- `QS-OS_Volume_10_MVP_Sprint_Backlog.md` — Sprint backlog
- `QS-OS_Volume_13_Developer_Setup_Repository_Implementation_Guide.md` — Dev setup
- `QS-OS_Volume_14_MVP_Technical_Task_Pack_for_Codex_Cowork.md` — AI coding tasks

---

## MVP Demo Flow

```
1. Login
2. Create organization
3. Create project
4. Upload BOQ Excel
5. Open BOQ-to-RFQ workflow template
6. Run workflow
7. AI classifies BOQ items by trade
8. RFQ documents generated
9. Manager approves
10. Download RFQ artifacts
```

---

## Related Repository

- **QS-OS (V1):** `C:\Users\user\Documents\00 CIPAA contract work dairy\QS-OS`
  - V1 is the working reference implementation (Vite + React + Supabase)
  - V2 (this repo) is the formal monorepo architecture
