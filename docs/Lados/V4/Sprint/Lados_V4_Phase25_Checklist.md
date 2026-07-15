# Lados V4 Phase 25 Checklist

**Document ID:** LADOS-V4-P25-CHECKLIST
**Status:** Draft — not started
**Date:** 2026-07-14
**Primary sprint plan:** `Sprint/Lados_V4_Phase25_MultiRun_Canvas_Tracking_Master_Plan.md`

---

## Status Summary

| Sprint | Title | Status |
|---|---|---|
| S25.1 | Scope execution state per workflow | Not started |
| S25.2 | Active Runs visibility (optional/stretch) | Not started — pending eff go/no-go |
| S25.3 | Tests + verification + close-out | Not started |

---

## S25.1 — Scope execution state per workflow

- [x] Re-grep `apps/web/src` for every `useExecutionStore` consumer (do not rely solely on the call sites listed in the master plan — re-verify at kickoff). *(found: executionStore.ts, useExecutionRunMonitor.ts, useExecutionRunStream.ts, ExecutionLogPanel.tsx, WorkflowCanvas.tsx, workflows/[workflowId]/page.tsx — matches master plan §3.2 exactly)*
- [x] Decide final shape: `Record<workflowId, RunState>` map (recommended) vs. store-per-instance factory. *(went with keyed map, per recommendation)*
- [x] Reshape `executionStore.ts` state + actions to be workflow-keyed. *(`byWorkflow: Record<string, RunState>`, all actions take `workflowId` as first arg, `DEFAULT_RUN_STATE` stable-reference fallback exported)*
- [x] Update `useExecutionRunMonitor.ts` to read/write only its own workflow's slice.
- [x] Update `useExecutionRunStream.ts` to read/write only its own workflow's slice.
- [x] Update `workflows/[workflowId]/page.tsx` selectors to the new shape. *(all selectors + action call sites updated, incl. the two inline getState() calls and onClick handlers)*
- [x] Confirm `ExecutionLogPanel.tsx` / `RunHistoryPanel.tsx` prop-drilling still correct (no direct store reads leaking cross-workflow state). *(ExecutionLogPanel's store-fallback reads now take an optional `workflowId` prop, scoped via DEFAULT_RUN_STATE default; RunHistoryPanel doesn't read the store directly — confirmed via grep, no changes needed)*
- [x] Confirm no other page/component reads `useExecutionStore` un-scoped. *(WorkflowCanvas.tsx's `nodeLogs` selector updated too — found via grep, was missing from the master plan's initial call-site list)*

## S25.2 — Active Runs visibility (optional)

- [ ] Confirm with eff: build this sprint now, or defer?
- [ ] If building: check whether an existing endpoint can return "runs currently in flight" scoped to org/project, or a new one is needed.
- [ ] Build UI surface (Explorer Runs tab entry or top-bar indicator — decide placement).
- [ ] Wire click-through to the correct workflow page with that run pre-selected.

## S25.3 — Tests + Verification + Close-out

- [x] Unit tests: workflow-keyed store get/set, no cross-workflow leakage. *(N/A — confirmed via Phase 24 S24.5 precedent that `apps/web` has zero Jest test files by design in this codebase; frontend pages/stores aren't unit-tested here. Re-verify via `pnpm --filter web typecheck` instead.)*
- [ ] Manual smoke test (eff, browser): two workflows running concurrently (two tabs, or sequential-nav in one tab) — both track correctly.
- [ ] `pnpm build:packages`
- [ ] `pnpm build:packs`
- [ ] `pnpm typecheck`
- [ ] `pnpm --filter api test`
- [ ] `pnpm --filter web typecheck`
- [ ] `pnpm validate:official-packs`
- [ ] Update master plan doc Status to Complete.
- [ ] Update memory (phase25 outcome, or fold into existing Lados Phase21 memory entry).
- [ ] SOP close-out: "What's next" + "Ad-hoc tasks outstanding" handoff message to eff.
