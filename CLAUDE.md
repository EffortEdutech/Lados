# CLAUDE.md â€” AI Assistant Rules for QS-WFUI

## âš ï¸ CRITICAL SECURITY RULE â€” READ FIRST

**NEVER read, display, or include the contents of any `.env` file in any response or tool call.**

The `.env` files contain production API keys (OpenAI, Supabase service role, Upstash Redis).
When their contents are sent to an AI API server, automated credential scanners detect and
disable the keys. This has happened TWICE in this project.

Files that must NEVER be read by AI tools:
- `apps/api/.env`
- `apps/web/.env.local`
- Any file matching `.env*` (except `.env.example` files)

If you need to know a config value, ask the user to tell you just that one value in a
temporary message â€” never paste the whole `.env` file into chat.

---

## Project Overview

**QS-WFUI** â€” Lados Workflow Platform (monorepo), renamed **Lados** (universal business workflow engine, V4) as of Phase 20A.

```
apps/api/   â€” NestJS API, port 4000 (/api/v1)
apps/web/   â€” Next.js frontend, port 3000
packages/
  shared-types/       â€” ApiResponse<T> and shared DTOs
  execution-engine/   â€” Workflow runner (NodeContext, port-aware input resolution)
  node-sdk/           â€” NodeManifest, NodeHandler interfaces
  pack-sdk/           â€” Official pack loader/resolve contract
packs/official/       â€” 21 real workspace packages (lados-workflow-foundation,
                         lados-human-work, lados-document-intelligence,
                         lados-communication, lados-task-case,
                         lados-resource-operations, lados-commercial-finance,
                         lados-procurement, lados-qs-commercial,
                         lados-construction-operations, lados-contract-admin,
                         lados-asset-fleet, lados-people-payroll,
                         lados-video-production, + Solution/Template bundle packs)
archived/packs/        â€” 10 prototype packs (core/foundation/qs/document/
                         procurement/contractor/construction/finance/
                         notifications-pack) removed from the live platform
                         (Phase 21 S9) â€” reference-only, NOT part of any
                         pnpm workspace glob. Never import from here.
```

## Tech Stack

- **API**: NestJS + Supabase (service role for server ops)
- **Web**: Next.js App Router + Supabase SSR (cookie-based auth)
- **Queue**: BullMQ + Upstash Redis (in-process fallback runs everything
  correctly today â€” BullMQ itself has not processed a job since a prior
  Redis credential rotation; see Phase 21 S3/D2, still open)
- **AI**: OpenAI GPT-4o (tool-calling, vision)
- **Package manager**: pnpm workspaces

## Current Phase

Phase 24 (Program Restructure) complete — all 7 sprints delivered and
confirmed green, including a passing live end-to-end smoke test. What
Phase 23 built as "Pipeline" (an orchestration layer chaining Workflow
Stages and Committee Gates across Projects) was renamed throughout to
**Program**/**Stage Gate** to match standard corporate-operations
vocabulary, and `projects.program_id` was added as a real parent FK
(Programs now genuinely contain Projects, mirroring `projects.department_id`
from Phase 22 S22.1). Full rename: DB tables/columns (migration `0079`),
NestJS modules/services/routes (`programs/`, `program-execution/`,
`program-artifact/`), the two pack-layer data-handoff nodes in
`lados-workflow-foundation` (`lados.workflow.program_save_artifact`/
`program_read_artifact`), and the entire frontend
(`components/programs/*`, `/programs` pages, `/approvals`'s Stage Gate
card). S24.6 also surfaced the Program↔Project relationship in the UI
(Project pages show their parent Program; a new "assign program" screen on
the Programs page; the Program canvas's Workflow Picker prioritizes
workflows from the Program's own member projects) and reorganized the
sidebar nav into grouped sections. A workflow-canvas "Node" → "Task"
business-facing rename (display text only, no code identifiers touched)
was folded in alongside the phase. `pnpm typecheck` (25/25 workspaces),
`pnpm --filter api test` (31 suites/385 passed/2 skipped), and
`pnpm --filter web typecheck` are all green; the live smoke test (build a
Program via the real canvas → publish → trigger → approve → vote → submit
input → confirm resolution) passed end-to-end for the first time in the
platform's history, 2026-07-11. Full history:
`docs/Lados/V4/Sprint/Lados_V4_Phase24_Program_Restructure_Master_Plan.md`.

Phase 23 (Pipeline Orchestration Governance — now superseded by Phase 24's
rename, see above) built the orchestration layer itself: schema
(`programs`/`program_runs`/`program_artifacts`/`stage_gate_votes`),
`ProgramExecutionService`/`ProgramWatchdogService`, N-of-M quorum voting,
the two artifact-handoff pack nodes, and the org-level canvas UI. Full
history: `docs/Lados/V4/Sprint/Lados_V4_Phase23_Pipeline_Orchestration_Governance_Master_Plan.md`
(read Phase 24's doc first for the current names — Phase 23's own doc still
uses "Pipeline"/"Committee Gate" throughout, an accurate historical record
of what was built and under what name at the time, deliberately left
unrewritten).

Phase 22 (Enterprise Workflow Foundation) complete — all 5 sprints delivered
and confirmed: S22.1 departments/idempotency/retention-schema, S22.2
human-in-the-loop (named assignment, delegation, escalation, request_input),
S22.3 cross-run analytics rollups + Operations Dashboard, S22.4 richer
Condition/Switch branching, S22.5 retention/archival execution job. Full
history: `docs/Lados/V4/Sprint/Lados_V4_Phase22_Enterprise_Workflow_Foundation_Master_Plan.md`.
Phase 21 (Production Build) is done and superseded by Phase 22 for anything
touching the shared foundation layer — see
`docs/Lados/V4/Sprint/Lados_V4_Phase21_Production_Build_and_Deployment_Master_Plan.md`
for the earlier build/pack-wave history.

## Key Conventions

- All API responses use `ApiResponse<T>` envelope: `{ success, data, error }`
- `apiClient` does NOT throw on non-2xx â€” always check `res.success`
- `ValidationPipe` uses `forbidNonWhitelisted: true` â€” only send DTO-declared fields
- History sent to `/ai/assist` must use `{ role, content }` only â€” no extra fields

<!-- AI-DEVELOPMENT-WORKSPACE-GRAPHIFY-OBSIDIAN -->

## AI Development Workspace: Graphify + Obsidian

This repository is part of the Effort Studio AI development workspace.

Central Obsidian vault:

~~~text
C:\Users\user\Documents\00 AI agent\AI-Knowledge
~~~

Use Graphify for code navigation:

~~~powershell
.\scripts\graphify.ps1 query "question" --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 explain "symbol-or-file" --graph "graphify-out\graph.json"
.\scripts\graphify.ps1 path "A" "B" --graph "graphify-out\graph.json"
~~~

Use Obsidian only for architecture rationale, ADRs, roadmap context, research, meetings, and cross-project decisions. Project-specific implementation docs remain in this repository.

Before editing, read AGENTS.md, read docs/ if it exists, query Graphify if graphify-out/graph.json exists, then inspect source files directly.


## Graphify Refresh (any OS)

The engine is the PyPI package `graphifyy`; the `.ps1` wrapper is only the Windows launcher.

- Windows: `.\scripts\graphify.ps1 update .`
- Linux/macOS/Claude sandbox: `./scripts/graphify.sh update .`

Claude can refresh Graphify directly from Linux/macOS by using `./scripts/graphify.sh update .` after meaningful code structure changes. If a broad rebuild is needed, ask Codex/Windows to run the central multi-project build command.


<!-- AI-WORKSPACE-CONTEXT-FALLBACK -->

## Obsidian Fallback Context

The central Obsidian vault lives at:

~~~text
C:\Users\user\Documents\00 AI agent\AI-Knowledge
~~~

Some Codex or Claude sessions mount only this project folder. If the live vault is outside the current sandbox, read this local bridge instead:

~~~text
docs\AI_WORKSPACE_CONTEXT.md
~~~

Use the bridge only for architecture rationale, ADRs, roadmap context, cross-project standards, and workspace operating context. Do not use it as a replacement for project docs, Graphify, or source inspection.
