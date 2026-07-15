# Lados V4 Phase 25 — Multi-Run Canvas Tracking Master Plan

| | |
|---|---|
| **Document ID** | LADOS-V4-P25-MASTER-PLAN |
| **Status** | S25.1 delivered 2026-07-14, not yet built/typechecked/tested — S25.2 deferred by default (stretch), S25.3 (verification) awaiting eff |
| **Date** | 2026-07-14 |
| **Depends on** | Phase 21 (async execution queue), Phase 21 S3 D4 (SSE node progress) |
| **Build order** | Confirmed by eff 2026-07-14: build this phase **before** Phase 26 (org structure) — smaller, contained fix |
| **Origin** | Chat discussion 2026-07-14: "Are our lados canvas currently able to run multiple workflows?" |

---

## 0. Framing

The backend already supports running multiple workflows concurrently with no changes needed:

- `ExecutionService.enqueueOrRunInline()` never blocks the triggering HTTP request — it either hands the run to BullMQ (`ExecutionWorker` concurrency 5) or fires `_executeAndPersist()` as an un-awaited async call (in-process fallback when Redis is unavailable).
- Every run gets its own `execution_runs` row, keyed by its own `runId`. Nothing about triggering run B waits on or interferes with run A.

The gap is entirely on the frontend. `apps/web/src/stores/executionStore.ts` exports a single module-level Zustand store (`useExecutionStore`) holding one `runId` / `runStatus` / `runSummary` / `nodeLogList` / `runError` for the whole browser tab. `useExecutionRunMonitor(activeRunId)` and `useExecutionRunStream(activeRunId)` (in `apps/web/src/app/(app)/projects/[projectId]/workflows/[workflowId]/page.tsx`) both key off this single global `activeRunId`.

Concretely: if a user starts Run A on workflow X, then — in the *same browser tab*, without a full page reload — navigates to workflow Y and starts Run B, the store's `runId` is overwritten. Both A and B keep executing correctly on the server, but the tab's live progress UI (log panel, node status colouring, paused-for-approval banner) can only ever reflect whichever run's `startRun()` fired last. Run A's live view is silently orphaned mid-run — not lost data, just lost visibility, and confusing if the user later navigates back to workflow X expecting to see A's progress.

This does **not** affect two different browser tabs, or two different users — each gets its own JS module instance / store, fully independent already.

---

## 1. Concerns Being Addressed

1. **Single global run-tracking state.** One `runId` for the whole tab means only one run's live progress can be watched at a time, regardless of how many workflows are actually executing.
2. **No visibility into "what else is running."** There is no UI surface today listing every run currently in flight for a project/org — a user has no way to know Run A is still going after navigating away from it, short of reopening that workflow page and checking `RunHistoryPanel`.
3. **Silent state collision, not a crash.** Because nothing throws or errors, this is a correctness/UX gap that's easy to miss until someone is actively juggling more than one workflow run in one sitting — worth fixing before it causes a "why did my run's log panel disappear" support question.

---

## 2. Sprint Overview

| Sprint | Title | Addresses | Type |
|---|---|---|---|
| S25.1 | Scope execution state per workflow | #1 | Frontend store refactor |
| S25.2 | Active Runs visibility (optional/stretch) | #2 | Frontend — new UI surface |
| S25.3 | Tests + verification + docs/memory close-out | all | Verification |

**Sequencing rationale:** S25.1 is the actual bug fix and stands alone — it makes the canvas correct for the case that prompted this phase (multiple runs across open workflow tabs in one session). S25.2 is a genuine UX improvement but not required for correctness; flagged as optional/stretch the same way Phase 22 S22.5 and Phase 23 S23.5 were deferred-by-default when they were valuable-but-not-blocking. S25.3 always ships regardless of whether S25.2 is pulled in.

---

## 3. S25.1 — Scope execution state per workflow

### 3.1 The core decision: keyed-map vs. store-per-instance

Two ways to fix the singleton problem:

**Option A — Keyed map inside one store (recommended).** Keep a single `useExecutionStore`, but change its shape from flat fields (`runId`, `runStatus`, ...) to a `Record<workflowId, RunState>` map, with all actions (`startRun`, `setRunStatus`, `setRunSummary`, etc.) taking a `workflowId` as their first argument. `useExecutionRunMonitor`/`useExecutionRunStream` read/write only their own workflow's slice. Smaller diff — every existing call site adds one argument rather than changing how the store is obtained.

**Option B — Store-per-mount via factory + React Context.** Turn `useExecutionStore` into a factory (`createExecutionStore()`) instantiated once per `WorkflowEditorPage` mount and provided via context, so each open workflow page gets a fully independent store instance. Cleaner separation, but touches every consumer's import pattern (`useContext` instead of a plain module import) and is a bigger refactor for marginal benefit here, since workflow pages aren't deeply nested / don't need store composition.

**Recommendation:** Option A. Same correctness guarantee, materially smaller and lower-risk diff.

### 3.2 Call sites to update (found via this session's investigation)

- `apps/web/src/stores/executionStore.ts` — reshape state + actions to be keyed by `workflowId`.
- `apps/web/src/hooks/useExecutionRunMonitor.ts` — read/write the correct slice.
- `apps/web/src/hooks/useExecutionRunStream.ts` — same.
- `apps/web/src/app/(app)/projects/[projectId]/workflows/[workflowId]/page.tsx` — every `useExecutionStore((state) => state.X)` selector call updated to select `state.byWorkflow[workflowId]?.X`.
- `apps/web/src/components/canvas/ExecutionLogPanel.tsx`, `RunHistoryPanel.tsx` — confirm these already receive `run`/`logs` as props rather than reading the store directly (checked during S25.1 — if they read the store directly, they need the same `workflowId`-scoping).
- Any other consumer found via `grep -r "useExecutionStore" apps/web/src` at S25.1 kickoff — the search above is based on this conversation's investigation, not a repo-wide grep; re-verify before coding.

### 3.3 What does NOT change

- Backend: zero changes. This is purely a frontend state-shape fix.
- `useUIStore` (explorer tab, mobile nav state, etc.) — unaffected, already scoped correctly.
- SSE/polling mechanics themselves (`useExecutionRunStream`'s EventSource, `useExecutionRunMonitor`'s poll loop) — unchanged, just keyed differently.

---

## 4. S25.2 — Active Runs visibility (optional / stretch)

Only build this if eff confirms it's wanted — not required for S25.1's correctness fix.

**Concept:** a small "Active Runs" list (candidate locations: Explorer's "Runs" tab, or a new top-bar indicator) showing every run currently `running`/`paused` that the user has visibility into (project-scoped, same permission model as everything else), each entry linking to `/projects/:id/workflows/:id` with that run pre-selected.

**Backend check needed before scoping this further:** verify whether an endpoint already returns "currently running executions for a project/org" (RunHistoryPanel may already fetch recent runs including in-progress ones — check `GET /projects/:projectId/workflows/:workflowId/runs` and whether it's easily generalized to an org-wide "runs in flight" query, or whether a new endpoint is needed). This investigation is deferred to S25.2 kickoff, not done as part of this planning pass.

---

## 5. S25.3 — Tests + Verification + Close-out

- Unit tests for the reshaped `executionStore` (map-keyed get/set behavior, no cross-workflow leakage).
- Manual smoke test (documented in the companion checklist): open two workflow tabs in one browser session (or two workflows in sequence within one tab via client-side nav), start a run on each, confirm both progress independently and correctly in their respective views.
- Full verification loop: `pnpm build:packages && pnpm build:packs && pnpm typecheck && pnpm --filter api test && pnpm --filter web typecheck && pnpm validate:official-packs`.
- Update this document's Status to Complete, update `project_lados_phase21` memory (or a new phase25 memory entry) with outcome, standard "what's next / ad-hoc outstanding" handoff.

---

## 6. Open Decisions

1. **S25.2 (Active Runs panel) — build now or defer?** Recommend deferring until after S25.1 ships and eff has used it a bit — same precedent as Phase 22/23's deferred-by-default optional sprints.
2. **Keyed-map vs. store-per-instance (§3.1)** — recommendation given above (keyed map); flagging in case eff has a reason to prefer the heavier refactor (e.g. an unrelated plan to compose multiple independent canvases on one page later).
