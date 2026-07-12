# Lados V4 Phase 23 — Pipeline Orchestration & Governance Master Plan

> **⚠ Superseded naming, 2026-07-11 (Phase 24 S24.7):** everything this
> document calls "Pipeline" was renamed to **Program**, and "Committee
> Gate" to **Stage Gate**, throughout the entire stack (DB, backend, pack
> nodes, frontend) — see
> `docs/Lados/V4/Sprint/Lados_V4_Phase24_Program_Restructure_Master_Plan.md`
> for the rename map and current names. This document is left unrewritten
> deliberately — it's an accurate historical record of what was designed
> and built, and under what name, at the time (2026-07-08). Do not use
> "Pipeline"/"Committee Gate" in any new code or docs; they only survive
> here as history.

| | |
|---|---|
| **Document ID** | LADOS-V4-P23-MASTER-PLAN |
| **Status** | Approved (2026-07-08) — all 4 open decisions confirmed by eff, see §9. Committee Gate is **N-of-M quorum voting**, not single-decider — this changed the §3.5/§4 schema and service design from the first draft. Ready to begin S23.1 |
| **Date** | 2026-07-08 |
| **Depends on** | Phase 22 (Enterprise Workflow Foundation, complete — departments, human-in-the-loop approval/delegation/escalation, analytics rollups, branching, retention) |
| **Origin** | Chat discussion 2026-07-08: "we have nodes/workflows/packs — what we have forgotten is the Pipeline, a group of workflows that form a pipeline... Pipeline is something at a department level of an organization or the Head & committee decision" |

---

## 0. Framing

Lados already has three sizes of building block: **nodes** (single actions, shipped in Capability Packs), **workflows** (a DAG of nodes, the unit built on the canvas), and now, from Phase 22, **departments** (an organizational scope above projects). What's missing is the layer *above* a single workflow: a **Pipeline** — a chain of whole workflows, potentially spanning multiple projects and departments, gated by named human sign-off at the points that matter (a department Head, a committee), representing an actual end-to-end business process rather than one task.

This is not a new feature from scratch. A "Pipeline" concept already exists (Sprint 11–12) — but it was built early, at project scope, as a client-side-only browser loop, and one of its two supporting node types no longer exists (see §1.4). Phase 23 is a **redesign**, not an extension: keep the parts that still make sense (the canvas-first UX of wiring workflows together), replace the parts that can't support governance (client-only execution), and relocate the scope (project → optional department / org-wide) to match how eff actually wants to use it.

Nothing in this document has been applied. All schema changes below are additive (new tables / nullable columns) — zero risk to existing Phase 21/22 data or running workflows unless explicitly noted.

---

## 1. Concerns Being Addressed

1. **Pipeline is project-scoped only.** `project_pipelines` is one row per project. A pipeline that should represent a department- or org-level business process (e.g. "Procurement-to-Payment," spanning RFQ, quotation comparison, and PO approval workflows that may live in different projects) has nowhere to live today.
2. **Pipeline execution has no durability.** `PipelineRunner.ts` is a browser-side DAG walker — it calls `POST /workflows/:id/run` for each stage and awaits the response in a JS loop. If the tab closes, the network drops, or the laptop sleeps, the run simply stops with **zero server-side record**. This is fatal for governance: a committee sign-off can reasonably take hours or days, and nothing can be "paused, waiting for a human" if its only state lives in one browser tab.
3. **No pipeline-level governance/gate concept.** Today, approval only exists *inside* a single workflow (`lados.human.request_approval`/`request_input`, Phase 22 S22.2). There is no way to pause *between* two workflow stages for a named Head or committee to decide whether the pipeline proceeds — which is the literal ask in this session's origin conversation.
4. **Cross-workflow data handoff is dead code.** `project.save_artifact`/`project.read_artifact` were registered under `pack_id: lados.core-pack` — one of the 10 prototype packs archived out of the platform in Phase 21 S9. Confirmed via live DB (2026-07-08): 0 rows in `registered_nodes` for either node type, `lados.core-pack` no longer exists. These two nodes cannot be added to a workflow today.
5. **No pipeline-level monitoring.** `execution_runs` and Phase 22 S22.3's rollups know nothing about pipelines — there's no equivalent of "how many pipeline runs failed this week" or "where are pipelines currently stuck."
6. **No pipeline-level retention hook.** S22.5's `RetentionService` only knows about `execution_runs`/`approval_tasks`/`audit_log`. A pipeline run and its artifacts have no archival path.

**Existing data to account for:** live DB check (2026-07-08) found **3 rows** already saved in `project_pipelines` (real project pipeline layouts exist, not a clean slate) and **0 rows** in `project_artifacts` (that half is genuinely unused). See §9.2.

---

## 2. Sprint Overview

| Sprint | Title | Addresses | Type |
|---|---|---|---|
| S23.1 | Schema Foundations | #1 (department/org scope), #3 (gate task type), #4 (artifact table) | Additive migrations |
| S23.2 | Pipeline Execution Service | #2 (server-side durable execution), #3 (gate pause/resume) | New backend service |
| S23.3 | Data Handoff Nodes | #4 (rebuild artifact read/write as real official nodes) | Pack-level |
| S23.4 | Canvas Rework + Governance UI | #1, #2, #3 (org/department-scoped canvas, Committee Gate node, unified approvals inbox) | Frontend |
| S23.5 | Analytics + Retention Extension | #5, #6 | Deferred by default (see rationale) |

**Sequencing rationale:** S23.1 is foundational and mirrors S22.1's own shape (additive tables, one new `approval_tasks` column, one widened CHECK constraint) — cheap and unlocks everything else. S23.2 is the core of this phase: without a durable backend-tracked pipeline run, a Committee Gate cannot actually pause for a multi-day decision, which is the entire point of this redesign. S23.3 is a small, mechanical rebuild (two new nodes in an existing official pack) but is blocked on S23.1's `pipeline_artifacts` table and S23.2's `pipeline_run_id` threading through `execution_runs`. S23.4 is the user-facing payoff and depends on S23.2 having real endpoints to call. S23.5 follows the exact precedent set by S22.5: build the schema hook now if cheap, defer the actual job until there's enough pipeline run volume to justify it — not built in this pass unless eff wants to pull it forward.

---

## 3. S23.1 — Schema Foundations

### 3.1 `pipelines` — the pipeline definition (successor to `project_pipelines`)

```sql
CREATE TABLE pipelines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id     uuid REFERENCES departments(id) ON DELETE SET NULL,
  name              text NOT NULL,
  description       text,
  layout            jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

- A pipeline is now a **top-level entity under the organization**, not nested inside one project — matching eff's "department level... or Head & committee decision" framing. A stage node inside `layout` can reference a workflow living in *any* project the org can see; a pipeline is not bound to a single project the way `project_pipelines` was.
- `department_id` nullable, exactly mirroring `projects.department_id`'s existing pattern (S22.1 §3.1): NULL = org-wide/cross-department, set = owned by one department. No new infrastructure — this is the same pattern already proven.
- `layout jsonb` keeps the existing React Flow node/edge shape from `project_pipelines.layout` — the canvas-editing UX doesn't need to change, only what a "Workflow Stage" node can reference and what other node types exist (Committee Gate, see §3.2).

### 3.2 `pipeline_runs` — one row per pipeline execution (mirrors `execution_runs`)

```sql
CREATE TABLE pipeline_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id         uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES organizations(id),
  department_id       uuid REFERENCES departments(id),
  pipeline_snapshot   jsonb NOT NULL,          -- immutable layout at trigger time, same convention as execution_runs.workflow_snapshot
  status              text NOT NULL DEFAULT 'created'
                       CHECK (status IN ('created','running','paused','completed','failed','cancelled','timed_out')),
  current_stage_ids   jsonb NOT NULL DEFAULT '[]',   -- node id(s) currently active/paused-at (array — a DAG can have parallel branches)
  stage_history       jsonb NOT NULL DEFAULT '[]',   -- append-only log: {stageNodeId, type: 'workflow'|'gate', executionRunId | approvalTaskId, status, startedAt, completedAt}
  started_by          uuid REFERENCES auth.users(id),
  started_at          timestamptz,
  completed_at        timestamptz,
  error               jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

- Deliberately mirrors `execution_runs`' shape (snapshot, status enum, timing columns) — same review-ability, same watchdog pattern applies cleanly (§4.2).
- `stage_history` is the pipeline-level equivalent of `execution_logs` — kept as one jsonb array rather than a child table for v1 (a pipeline has orders-of-magnitude fewer stages than a workflow has nodes; a full child table is more machinery than the row count justifies right now — revisit if that assumption breaks).

### 3.3 `pipeline_artifacts` — successor to `project_artifacts`, scoped to one run

```sql
CREATE TABLE pipeline_artifacts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id    uuid NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  source_stage_id    text NOT NULL,           -- which stage node wrote it
  source_run_id      uuid REFERENCES execution_runs(id) ON DELETE SET NULL,
  artifact_key       text NOT NULL,
  value              jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_run_id, artifact_key)
);
```

- Scoped to a `pipeline_run_id`, not a project — the old `project_artifacts` model had one slot per `(project_id, artifact_key)` shared across *every* pipeline run in that project, which is a real data-integrity risk (two concurrent pipeline runs would clobber each other's artifacts under the same key). Scoping to the run fixes this for free.

### 3.4 `execution_runs.pipeline_run_id` — thread pipeline context into a workflow run

```sql
ALTER TABLE execution_runs ADD COLUMN pipeline_run_id uuid REFERENCES pipeline_runs(id) ON DELETE SET NULL;
ALTER TABLE execution_runs ADD COLUMN pipeline_stage_id text;
```

- Nullable, additive — every existing/ordinary workflow run is unaffected (`pipeline_run_id IS NULL`). When `ExecutionService.triggerRun()` is called *by* `PipelineExecutionService` for a stage, these two columns are populated, giving the data-handoff nodes (§5) and future analytics (§8) a join key back to the parent pipeline run.

### 3.5 `approval_tasks` — add the `pipeline_gate` task type (N-of-M quorum, confirmed §9.3)

A single `approval_tasks` row still represents *one decision* everywhere else in this codebase (`approval`/`input`: one assignee, one terminal decision). A Committee Gate is different by definition — eff confirmed it needs **N-of-M voting** (e.g. "3 of 5 committee members must approve"), which no single-decision row can hold. So `pipeline_gate` reuses `approval_tasks` as the *gate instance* (one row per gate, carrying the roster and threshold) but delegates individual decisions to a new child table, `pipeline_gate_votes`, one row per voter.

```sql
ALTER TABLE approval_tasks ADD COLUMN pipeline_run_id  uuid REFERENCES pipeline_runs(id) ON DELETE CASCADE;
ALTER TABLE approval_tasks ADD COLUMN voter_user_ids    jsonb;   -- the "M" roster: array of eligible committee member user_ids
ALTER TABLE approval_tasks ADD COLUMN vote_threshold    integer; -- the "N": number of "approved" votes needed to pass

ALTER TABLE approval_tasks ALTER COLUMN execution_id DROP NOT NULL;
ALTER TABLE approval_tasks ADD CONSTRAINT approval_tasks_execution_xor_pipeline
  CHECK (
    (task_type IN ('approval','input') AND execution_id IS NOT NULL AND pipeline_run_id IS NULL) OR
    (task_type = 'pipeline_gate' AND pipeline_run_id IS NOT NULL AND execution_id IS NULL
       AND voter_user_ids IS NOT NULL AND vote_threshold IS NOT NULL)
  );

ALTER TABLE approval_tasks DROP CONSTRAINT approval_tasks_task_type_check;
ALTER TABLE approval_tasks ADD CONSTRAINT approval_tasks_task_type_check
  CHECK (task_type IN ('approval','input','pipeline_gate'));

CREATE TABLE pipeline_gate_votes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_task_id  uuid NOT NULL REFERENCES approval_tasks(id) ON DELETE CASCADE,
  voter_user_id     uuid NOT NULL REFERENCES auth.users(id),
  decision          text NOT NULL CHECK (decision IN ('approved','rejected')),
  comments          text,
  decided_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (approval_task_id, voter_user_id)   -- one vote per person per gate, enforced at the DB level
);
```

- `execution_id`'s `NOT NULL` still relaxes exactly as originally planned — the XOR check constraint keeps the invariant just as strict as before, now widened to also require a gate's roster/threshold to be non-null.
- **Resolution rule**: the gate resolves as soon as either outcome becomes certain — `approved` once `count(votes WHERE decision='approved') >= vote_threshold`, or `rejected` once `count(votes WHERE decision='rejected') > (array_length(voter_user_ids) - vote_threshold)` (i.e. the moment reaching the threshold becomes mathematically impossible, so a gate doesn't sit open waiting for votes that can no longer matter). This tally logic lives in `PipelineWatchdogService` (§4.2), not in the vote-casting endpoint itself, so it's checked consistently regardless of vote order.
- **Delegation does not apply to `pipeline_gate` tasks** — the existing `delegate()` endpoint reassigns an entire task to one person, which is meaningless for a quorum (you can't hand your one vote among five to someone else without changing who's on the committee). Task-level delegation is disabled for this `task_type`; a per-voter proxy mechanism is explicitly out of scope for v1 (flagged, not built ahead of real usage — same discipline as S22.4's Switch-node case cap).
- **Escalation needs a small, real extension**: `ApprovalWatchdogService`'s existing logic reassigns a single `assignee_user_id` to `escalated_to_user_id` — that doesn't map to "half the committee hasn't voted yet." For `pipeline_gate` tasks, escalation instead notifies whichever `voter_user_ids` have not yet cast a vote (a `LEFT JOIN` against `pipeline_gate_votes`), with no reassignment. This is a genuine code branch to add in S23.2, not something that falls out for free the way it did in the single-decider draft.

---

## 4. S23.2 — Pipeline Execution Service

### 4.1 `PipelineExecutionService` (mirrors `ExecutionService`)

- `triggerPipeline(pipelineId, orgId, userId)`: loads the pipeline's `layout`, creates a `pipeline_runs` row (`pipeline_snapshot` = the layout at this instant), finds entry stage nodes (no incoming edges — same logic already in client-side `PipelineRunner.findEntryNodes()`, ported server-side), and starts each entry stage.
- **Starting a Workflow Stage**: calls the *existing* `ExecutionService.triggerRun()` unchanged, passing `pipelineRunId`/`pipelineStageId` through so the resulting `execution_runs` row is tagged (§3.4). Does **not** block waiting for it — a pipeline stage's completion is detected asynchronously by the watchdog (§4.2), not by an in-process await. This is the core architectural fix over the old client-side runner: nothing is held open waiting.
- **Starting a Committee Gate**: creates an `approval_tasks` row (`task_type: 'pipeline_gate'`, `pipeline_run_id` set, `voter_user_ids`/`vote_threshold` populated from the gate node's config, `escalate_after_minutes` optional), sets `pipeline_runs.status = 'paused'`, appends to `stage_history`, and stops. No `pipeline_gate_votes` rows exist yet — the gate opens empty and fills as committee members vote. This is a real, server-side pause that survives indefinitely — exactly what a multi-day committee decision needs.

### 4.2 `PipelineWatchdogService` (poll pattern — 5th service in this program's now-established family)

Same architecture as `RunWatchdogService`/`ApprovalWatchdogService`/`AnalyticsRollupService`/`RetentionService`: a single `setInterval`, no cron library. Each tick:

- For `pipeline_runs` with `status = 'running'`: check whether the `execution_runs` row(s) tagged with the current stage(s) have reached a terminal status. If completed → advance to the next stage(s) along the DAG (same edge-following logic as the old `PipelineRunner.traverse()`, ported server-side). If failed → mark the pipeline run failed (configurable later whether a failed stage should halt the whole pipeline or just that branch — default: halt, matches the old runner's behavior).
- For `approval_tasks` with `task_type = 'pipeline_gate'` and `status = 'pending'`: tally `pipeline_gate_votes` against `vote_threshold`/`voter_user_ids` (§3.5's resolution rule). Once resolved (`approved`/`rejected`), stamp the task's terminal status and resume the parent `pipeline_runs` row — approved advances to the gate's next stage(s), rejected marks the pipeline run `failed`.
- **Gate-specific escalation** (does not reuse `ApprovalWatchdogService`'s single-reassignment logic — see §3.5): for a still-`pending` gate past its `escalate_after_minutes` window, notify every `voter_user_ids` entry that has no matching `pipeline_gate_votes` row yet, and stamp `escalated_at` so it only fires once, same race-guard convention as every other watchdog in this program.

### 4.3 `ApprovalService` — new `castVote()`, `decide()` unchanged for gates

- `decide()` (the existing single-shot terminal endpoint) is **not** used for `pipeline_gate` tasks — a gate isn't decided by one call, it accumulates votes. New `castVote(taskId, userId, decision, comments)`: validates `userId` is in the task's `voter_user_ids`, inserts into `pipeline_gate_votes` (the `UNIQUE (approval_task_id, voter_user_id)` constraint rejects a second vote from the same person with a clean 409, not a silent overwrite), and returns the current tally (`X of N voted, Y needed to pass`) so the frontend can show live progress. Resolution/tally-checking itself stays in `PipelineWatchdogService` (§4.2) so it's evaluated consistently regardless of which vote arrives last, not duplicated into the endpoint too.

### 4.4 New endpoints

- `POST /pipelines/:id/run` — trigger, mirrors `POST /workflows/:id/run`.
- `GET /pipelines/:id/runs` — list, mirrors `GET /workflows/:id/runs`.
- `GET /pipeline-runs/:runId` — status + `stage_history`, mirrors `GET /runs/:runId`.
- `POST /approvals/:taskId/vote` — cast one committee member's vote on a `pipeline_gate` task (§4.3). Distinct from the existing `POST /approvals/:taskId/decide`, which stays exactly as-is for `approval`/`input` tasks.

---

## 5. S23.3 — Data Handoff Nodes

- Two new nodes in `lados-workflow-foundation` (natural home — already owns `publish_event`, the pack's other cross-cutting control-flow nodes): `lados.workflow.pipeline_save_artifact` / `lados.workflow.pipeline_read_artifact`.
- Both read `ctx`'s injected `pipelineRunId` (populated by `ExecutionService` whenever `execution_runs.pipeline_run_id` is set, §3.4) — if a workflow runs standalone (not as a pipeline stage), these nodes fail cleanly with a clear error (`NOT_IN_PIPELINE_CONTEXT`), not a silent no-op, matching this pack's existing fail-loud convention (`MISSING_HUMAN_DECISION`, etc.).
- Writes/reads go straight to `pipeline_artifacts` (§3.3), scoped by `pipeline_run_id` + `artifact_key`.

---

## 6. S23.4 — Canvas Rework + Governance UI

- New top-level `/pipelines` area (not nested under a project) — list/create, with an org/department selector mirroring the Departments settings page pattern from S22.1's UI delivery.
- `PipelineCanvas.tsx` reworked: "Workflow Stage" nodes can now reference any workflow across any project the org can see (today's auto-populate-from-this-project behavior goes away — a pipeline is no longer 1:1 with a project). New **Committee Gate** node type: config is a voter picker (multi-select org/department members → `voter_user_ids`) + a threshold number input (`vote_threshold`, validated `1 <= N <= M` client-side, enforced server-side too) + optional `escalateAfterMinutes`. This is a real new inspector control, not a copy of `request_approval`'s single-assignee field — quorum configuration genuinely needs its own UI. The existing client-only "Switch" node is replaced by real server-side branching (still a node on the canvas, but the routing decision is made by `PipelineExecutionService`, not a JS `if`).
- `PipelineRunner.ts` (the client-side engine) is retired — triggering calls `POST /pipelines/:id/run`, live status uses the same SSE pattern `useExecutionRunStream` already established in Phase 21 S7.4, generalized to pipeline runs.
- `/approvals` gains a third `task_type` branch (`pipeline_gate`) — **not** a copy of `ApprovalCard`'s single approve/reject/delegate control, since a gate is voted, not decided. New `GateVoteCard`: shows which pipeline + stage, the current tally ("2 of 5 voted, 3 needed to pass"), each voter's name with a voted/pending badge, and — only if the signed-in user is in `voter_user_ids` and hasn't voted yet — an approve/reject control that calls `POST /approvals/:taskId/vote`. No delegate control (§3.5 — delegation doesn't apply to gates).

---

## 7. S23.5 — Analytics + Retention Extension (deferred by default)

Following the exact precedent S22.5 set: build nothing here unless eff explicitly picks it up once there's real pipeline run volume to justify it.

- `pipeline_run_stats_daily` — mirrors `workflow_run_stats_daily`, rolled up by the existing `AnalyticsRollupService`.
- `RetentionService` extended with a fourth table (`pipeline_runs`, plus cascade-aware handling of `pipeline_artifacts`) — the service's export-before-archive/delete pattern is already generic enough that this is a small, mechanical addition when picked up, not a redesign.

---

## 8. Product Safety Rules

Carried forward unchanged from Phase 22 §8, restated for this phase's specific surface:

- AI/automation must never cast a vote or resolve a `pipeline_gate` task — only named humans in `voter_user_ids`, enforced server-side in `castVote()` (reject any `userId` not on the roster), not just hidden client-side. Escalation only ever notifies non-voters, never casts a vote or auto-resolves a gate on their behalf.
- One person, one vote: `pipeline_gate_votes`' `UNIQUE (approval_task_id, voter_user_id)` constraint is enforced at the database level, not just application logic — a retried/duplicate vote request cannot double-count.
- Every new table/column is additive — zero behavior change to any existing project, workflow, or approval task unless a pipeline is explicitly built and run against it.
- New data-handoff nodes must be built fresh in `lados-workflow-foundation` — never resurrect or import from `archived/packs/core-pack`.
- A pipeline run's `pipeline_snapshot` is immutable at trigger time (same convention as `execution_runs.workflow_snapshot`) — editing a pipeline's `layout` after a run has started must never retroactively change what that run is executing. Likewise, a gate's `voter_user_ids`/`vote_threshold` are fixed at gate-creation time — changing a pipeline's Committee Gate config must never retroactively alter the rules of an already-open vote.

---

## 9. Decisions Confirmed (2026-07-08)

1. **Execution engine — AGREED, backend-engine direction.** Pipeline execution moves fully onto a server-tracked model (`pipeline_runs`, §3.2/§4) — no client-side-only runner in the final design.
2. **Existing `project_pipelines` data (3 rows) — DISPOSABLE/TEST DATA.** No migration needed; `project_pipelines`/`project_artifacts` are retired outright in S23.1, nothing carried forward. (Retiring, not necessarily dropping the table immediately — see S23.1 implementation note: drop only after confirming no other code path still reads it.)
3. **Committee Gate — N-of-M VOTE**, not single-decider. This changed the schema from the first draft: §3.5 now includes `pipeline_gate_votes`, `voter_user_ids`/`vote_threshold` on `approval_tasks`, a dedicated `castVote()` service method + `POST /approvals/:taskId/vote` endpoint (§4.3/§4.4), quorum-aware tally/escalation logic in `PipelineWatchdogService` (§4.2), and a real new `GateVoteCard` UI component (§6) rather than reusing `ApprovalCard`.
4. **Nested pipelines — DEFINITELY WORKFLOWS ONLY.** A pipeline stage may only reference a workflow, never another pipeline, for the entire scope of this phase. Not revisited unless eff explicitly asks later.

All four decisions are locked — S23.1 is cleared to start.

---

## 10. Handover Log

### 2026-07-08 (1) — Plan drafted, discussed, and confirmed; nothing implemented yet

Investigated the existing Sprint 11/12 Pipeline feature (project-scoped, client-side-only `PipelineRunner.ts`, dead artifact-handoff nodes referencing the archived `core-pack`) before drafting anything. Walked eff through three design forks via `AskUserQuestion` (scope, content, execution model), then walked through the client-vs-backend execution trade-off in chat when eff asked to see it before deciding. Drafted the full 5-sprint plan, then eff confirmed all 4 open decisions in one message — the N-of-M quorum answer required reworking §3.5's schema and §4's service design from a single-decider `approval_tasks` reuse into a proper roster+threshold+votes model (`pipeline_gate_votes`), which is now reflected throughout the document. No migration, service, or UI code written yet.

➡️ **Next:** Begin S23.1 (Schema Foundations) — draft the migration covering `pipelines`, `pipeline_runs`, `pipeline_artifacts`, `pipeline_gate_votes`, and the `approval_tasks` additions (`pipeline_run_id`, `voter_user_ids`, `vote_threshold`, widened `task_type` check, relaxed `execution_id` NOT NULL + new XOR constraint), per §3.

### 2026-07-08 (2) — S23.1 delivered: migration + CRUD module drafted, not yet applied/verified

Drafted `supabase/migrations/0075_pipeline_orchestration.sql`, matching migration 0072's conventions (`ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` before `ADD CONSTRAINT`). Implements every item in §3: `pipelines` (org+optional department scope, `layout` jsonb, draft/published/archived status), `pipeline_runs` (durable run state mirroring `execution_runs`), `pipeline_artifacts` (run-scoped cross-workflow handoff, successor to the dead `project_artifacts`), `pipeline_gate_votes` (N-of-M quorum: one row per voter, `UNIQUE (approval_task_id, voter_user_id)` enforces one-person-one-vote at the DB level, no update/delete policy so votes are immutable once cast), `execution_runs.pipeline_run_id`/`pipeline_stage_id`, and `approval_tasks.pipeline_run_id`/`voter_user_ids`/`vote_threshold` with the new `approval_tasks_execution_xor_pipeline` CHECK (exactly one of `execution_id` or `pipeline_run_id` set) and widened `task_type` check to include `'pipeline_gate'`. Full RLS on all 4 new tables, service-role bypass policies throughout. Top-of-file comment explicitly notes the old `project_pipelines`/`project_artifacts` tables are deliberately untouched — still live for the old canvas until S23.4.

Also built the minimal operable layer, mirroring how S22.1 paired its migration with a working `DepartmentModule` rather than landing schema alone: a new `PipelinesModule` (`apps/api/src/pipelines/` — service, controller, DTOs) giving CRUD over the `pipelines` table only (list/get/create/update — name, description, department scope, layout, status). Deliberately NOT touching or importing from the old `apps/api/src/pipeline/` (singular) module, which still serves the project-scoped canvas untouched. Routes: `GET/POST /organizations/:orgId/pipelines`, `GET/PATCH /organizations/:orgId/pipelines/:id`, org owner/admin required for writes, mirroring `DepartmentController`'s shape exactly. No execution logic — triggering/running a pipeline, the watchdog, and vote-casting are S23.2. Wired `PipelinesModule` into `app.module.ts` alongside the existing (untouched) `PipelineModule`.

Not yet applied to Supabase (only eff applies migrations) and not yet typechecked/tested (only eff runs `pnpm typecheck`/`pnpm --filter api test` locally).

➡️ **Next:** eff applies migration 0075, runs `pnpm typecheck` + `pnpm --filter api test`, confirms schema is live via a quick read-only check. Once confirmed, begin S23.2 (`PipelineExecutionService`, `PipelineWatchdogService` with vote-tally resolution + non-voter escalation, `ApprovalService.castVote()`, new vote endpoint).

### 2026-07-08 (3) — S23.1 confirmed green: migration applied, full build clean, routes live

Migration `0075` applied by eff. `pnpm typecheck` clean (25/25 workspace projects — no `build:packs`/`build:packages` was needed since S23.1 touched no `@lados/*`/`packs/official/*` package). `pnpm --filter api test` clean (31 suites, 376/378 passed, 2 skipped by design — no regressions). Fresh boot log confirms `PipelinesModule`/`PipelinesController` initialized alongside every other module with zero errors, and all 4 new routes mapped correctly: `GET/POST /api/v1/organizations/:orgId/pipelines`, `GET/PATCH /api/v1/organizations/:orgId/pipelines/:id` — sitting right after the pre-existing (untouched) `PipelineController {/api/v1/projects/:projectId/pipeline}`, confirming no route collision between the old project-scoped feature and the new org-level one. `RetentionService`/`ApprovalWatchdogService`/`RunWatchdogService`/`AnalyticsRollupService`/`SchedulerService` all started clean, BullMQ Redis healthcheck OK — no side effects from this sprint on the rest of the app. **S23.1 is now fully confirmed live.**

➡️ **Next:** Begin S23.2 (Pipeline Execution Service) — `PipelineExecutionService.triggerPipeline()`, the program's 5th poll-based watchdog (`PipelineWatchdogService`) with vote-tally resolution (`approved once count(approved) >= vote_threshold`, `rejected once count(rejected) > voter_count - vote_threshold`) + non-voter escalation, `ApprovalService.castVote()`, and `POST /approvals/:taskId/vote`, per §4.

### 2026-07-08 (4) — S23.2 delivered: PipelineExecutionService + PipelineWatchdogService + castVote(), not yet built/tested

eff confirmed the earlier git commit (Phase 22 work) is already pushed, then said "Lets Begin S23.2, Bismillah."

**Bug found and fixed before writing any S23.2 code:** re-reading `approval_tasks`' original schema (migration 0010) while designing the `pipeline_gate` insert path found that `workflow_id` and `project_id` are ALSO `NOT NULL` — migration 0075 only relaxed `execution_id`'s `NOT NULL`, so `createPipelineGate()` would have failed every insert with a NOT NULL violation. Since 0075 is already applied, drafted a new `supabase/migrations/0076_approval_tasks_pipeline_gate_fk_nullable.sql` (relaxes both columns; `node_id`/`node_name` deliberately left NOT NULL — `createPipelineGate()` always populates them meaningfully with the stage id / gate label). **Not yet applied.**

Built (all in new `apps/api/src/pipeline-execution/`):
- `pipeline-layout.types.ts` — the `PipelineLayout`/`WorkflowStageData`/`GateStageData` contract the backend targets ahead of S23.4's canvas existing, plus `findEntryStages()`/`findNextStages()` ported directly from the old client-side `PipelineRunner.ts`'s `findEntryNodes()`/`traverse()` edge-following logic.
- `PipelineExecutionService.triggerPipeline()` — loads the pipeline (must be `published`), validates every Committee Gate's `voteThreshold` is `1..M` at trigger time (fail fast, not at a DB constraint), creates the `pipeline_runs` row with an immutable `pipeline_snapshot` (§8 safety rule), and starts each entry stage. `startStage()` is public and reused by the watchdog on every subsequent advance. A Workflow Stage calls the now-extended `ExecutionService.triggerRun()` (see below); a Committee Gate calls the new `ApprovalTaskCreator.createPipelineGate()` — no blocking await either way, matching §4.1's "nothing held open in-process."
- `ExecutionService.triggerRun()` extended with an optional 4th param, `pipelineContext: {pipelineRunId, pipelineStageId}` — internal-caller-only, not part of the public `TriggerRunDto`, threaded into the `execution_runs` insert. Both existing call sites (`ExecutionController`, `ai.controller.ts`'s AI-triggered workflow path) pass 3 args and are unaffected.
- `ApprovalTaskCreator.createPipelineGate()` — inserts a `pipeline_gate` approval_tasks row (roster + threshold, no execution_id/workflow_id/project_id — hence migration 0076).
- `PipelineWatchdogService` — the 5th watchdog in the family. Three jobs per tick: (1) advance `pipeline_runs` whose current workflow-stage `execution_runs` have reached a terminal status, following `layout.edges` to the next stage(s), halting the whole run on any stage failure (matches the old runner's default); (2) tally `pipeline_gate_votes` against `vote_threshold`/`voter_user_ids` per §3.5's resolution rule, resolve+advance/fail the parent run; (3) escalate gates past `escalate_after_minutes` by notifying non-voters only (no reassignment — a quorum vote can't be handed to one delegate, a genuinely different code path from `ApprovalWatchdogService`). **One deliberate implementation judgment call, flagged rather than silently assumed**: scans BOTH `running` AND `paused` pipeline_runs for workflow-stage advancement (not just `running`), because a DAG can have one branch still executing while another branch waits at a gate — run status is recomputed after every advance (`paused` only when every current stage is a still-pending gate, `running` otherwise, `completed` when no stages remain). Multi-branch DAGs with a gate open in parallel with an active workflow branch are structurally supported but less exercised than the straightforward linear case — worth a deliberate smoke-test once the canvas (S23.4) can actually build one.
- `ApprovalService.castVote()` + `POST /approvals/:taskId/vote` — validates the caller is on `voter_user_ids` (§8: AI/automation can never vote, enforced server-side, not just hidden client-side), inserts into `pipeline_gate_votes` (translates the `pipeline_gate_votes_one_per_voter` unique-violation into a clean 400, not a 500), returns the live tally. Deliberately does NOT resolve the gate itself — that stays in `PipelineWatchdogService` per §4.3, so resolution is evaluated consistently regardless of vote order.
- New endpoints: `POST /pipelines/:id/run`, `GET /pipelines/:id/runs`, `GET /pipeline-runs/:runId` (new `PipelineExecutionController`, top-level routes mirroring `ExecutionController`'s own convention, not nested under `/organizations/:orgId/`).
- Wired `PipelineExecutionModule` into `app.module.ts` alongside the untouched S23.1 `PipelinesModule`.

**Nothing built/tested/applied yet** — eff needs `pnpm typecheck` + `pnpm --filter api test` (api-only again, no `build:packs`/`build:packages` needed — nothing in a workspace package changed), then apply migration `0076`, then a smoke-test of a real pipeline run once a test pipeline with a workflow stage + gate stage exists (can be inserted directly via SQL ahead of S23.4's canvas, same pattern used for the S22.4 branching smoke-test).

➡️ **Next:** eff runs the build/test loop, applies migration `0076`, confirms clean boot (watch for `PipelineExecutionModule`/`PipelineWatchdogService: starting` in the log). Once confirmed, either smoke-test a real pipeline run via direct SQL pipeline insert, or move to S23.3 (Data Handoff Nodes — `lados.workflow.pipeline_save_artifact`/`pipeline_read_artifact` in `lados-workflow-foundation`).

### 2026-07-08 (5) — S23.2 typecheck fix + confirmed green

First `pnpm typecheck` run surfaced 5 errors, all in the new S23.2 code — `EventBusService.publish()`'s `sourceType` and `NotificationService.notify()`'s `type` are both closed string-literal unions with no catch-all (unlike `LadosEventType`, which does have a catch-all branch), so the new `sourceType: 'pipeline'` (4 call sites) and `type: 'pipeline_gate_escalated'` (1 call site) were rejected. Fixed with two small, additive union widenings — `EventSourceType` gained `'pipeline'`, `NotificationType` gained `'pipeline_gate_escalated'`. Both underlying DB columns are plain `text` with no CHECK constraint (confirmed via migration 0028/0016 — just a documentation comment), so no migration was needed, only the TS types.

Migration `0076` applied. Re-run confirmed clean: `pnpm typecheck` (25/25), `pnpm --filter api test` (31 suites, 376/378 passed, 2 skipped by design — no regressions, same count as S23.1's baseline since S23.2 deliberately has no Jest suite of its own yet, matching every other thin watchdog/service's no-test precedent in this codebase), `pnpm --filter web typecheck` clean (no web files touched this sprint, ran anyway for extra confidence). **S23.2 is now fully confirmed green.**

➡️ **Next:** smoke-test a real pipeline run — eff (or Claude drafting the SQL for eff to run, standard pattern) inserts one test `pipelines` row with a small layout (one workflow stage + one Committee Gate stage, published status), triggers it via `POST /pipelines/:id/run`, and confirms via read-only SQL that: the workflow stage's `execution_runs` row gets `pipeline_run_id`/`pipeline_stage_id` set, the gate opens as a `pipeline_gate` approval_tasks row, `POST /approvals/:taskId/vote` accumulates votes correctly, and the watchdog resolves + advances/fails within ~60s. Once smoke-tested, move to S23.3 (Data Handoff Nodes).

### 2026-07-08 (6) — S23.3 delivered: pipeline_save_artifact/pipeline_read_artifact nodes, not yet built/tested

eff explicitly deferred the S23.2 smoke test until S23.4 ships a real canvas ("we do smoke test later after we have UI in S23.4. Proceed with next sprint first") — standing decision, not to be revisited until S23.4 or eff asks. Proceeded straight to S23.3 per that instruction.

**Context threading (the prerequisite for both new nodes):** `NodeContext` (`packages/@lados/node-sdk/src/types.ts`) gained optional `pipelineRunId`/`pipelineStageId` fields — set only when a workflow run is executing as a pipeline stage. Threaded the whole way through: `RunnerOptions` (`packages/execution-engine/src/types.ts`) → `WorkflowRunner.run()`'s destructuring → `_executeStep()`'s `ctx` param → `nodeCtx` construction (`packages/execution-engine/src/runner.ts`, 4 edit sites). On the NestJS side, two independent paths feed it in: `ExecutionService.triggerRun()` takes a 4th optional `pipelineContext` param (already added in S23.2) now actually threaded into `enqueueOrRunInline()`'s in-process fallback path, and `_continueRun()` (the resume-after-pause path) reads `pipeline_run_id`/`pipeline_stage_id` off the already-loaded `execution_runs` row. The BullMQ queue path (`ExecutionWorker.process()`) deliberately does NOT get these threaded through the job payload — it independently re-reads the same two columns off the `execution_runs` row it already fetches for `workflow_snapshot`/`inputs`. Chosen over widening `ExecutionJobPayload` to keep the queue schema untouched and behave identically whether Redis is configured or not.

**New service:** `PipelineArtifactService` (`apps/api/src/pipeline-artifact/`, its own standalone module — same "core module" circular-dependency-avoidance pattern as Phase 7's `ApprovalCoreModule`, since `ExecutionModule` needs to inject it and living inside `PipelineExecutionModule` would create a cycle). `saveArtifact()` upserts into `pipeline_artifacts` on `(pipeline_run_id, artifact_key)`; `readArtifact()` reads by the same key, returning `{value, found}` — a miss is `found:false`, not an error. Wired into both `ExecutionService` and `ExecutionWorker`'s `buildRealNodeResolver(...)` calls (13th positional arg in both).

**Two new nodes** in `packs/official/lados-workflow-foundation/src/nodes/`: `pipeline-save-artifact.ts` / `pipeline-read-artifact.ts`. Both check `ctx.pipelineRunId` first — fail with `NOT_IN_PIPELINE_CONTEXT` for a standalone run (matches this pack's fail-loud convention, e.g. `MISSING_HUMAN_DECISION`), then `NO_SERVICE` if not injected, then `MISSING_INPUT` if no `artifactKey`. Save returns `{saved, artifactKey}`; read returns `{value, found}` with `found:false` treated as a normal success (an upstream sibling in a parallel branch may simply not have written yet — not a failure condition). Wired into the pack's `index.ts` (`WorkflowFoundationServices.pipelineArtifactService?`, two new `resolveNode()` map entries) and `real-nodes/index.ts`. `manifest.json` version bumped 0.3.0 → 0.4.0, 2 new capabilities/nodes; `nodes.json` got 2 full node entries (ports, configGroups, `executorStatus:"implemented"`).

**No compatibility-aliases.ts entry added** — checked the existing map first: it already has `project.save_artifact` → `lados.artifact.write` (a *different*, pre-existing project-scoped/versioned artifact mechanism backing `lados_artifacts`, confirmed non-conflicting via reading `apps/api/src/artifact/artifact.service.ts` in full). The two new pipeline-scoped nodes are new capability, not a migration target for any legacy prototype node — nothing to alias.

**Tests:** added to `apps/api/test/official-workflow-foundation.spec.ts` — a `fakePipelineArtifactService()` helper (mirrors the existing `fakeEventBusService()`), two new describe blocks covering `NOT_IN_PIPELINE_CONTEXT` / `NO_SERVICE` / `MISSING_INPUT` / success for `pipeline_save_artifact`, and `NOT_IN_PIPELINE_CONTEXT` / `NO_SERVICE` / `MISSING_INPUT` / `found:false` / successful-read for `pipeline_read_artifact`. Fixed the now-stale manifest-contract assertions (10 nodes/capabilities → 12).

**Not yet built/tested/typechecked** — unlike S23.1/S23.2 (api-only, no rebuild needed), this sprint touched two workspace packages (`@lados/node-sdk`, `@lados/execution-engine`) plus the `lados-workflow-foundation` pack itself, so eff needs `pnpm build:packages` **and** `pnpm build:packs` before `pnpm typecheck`/`pnpm --filter api test` this time — skipping either causes the stale-dist false-failure gotcha this project has hit before.

➡️ **Next:** eff runs `pnpm build:packages` → `pnpm build:packs` → `pnpm typecheck` → `pnpm --filter api test` → `pnpm --filter web typecheck`. Once confirmed green, begin S23.4 (Canvas Rework + Governance UI, §6) — the real `/pipelines` area, reworked `PipelineCanvas.tsx` with cross-project Workflow Stage references and a real Committee Gate inspector, retirement of client-side `PipelineRunner.ts`, and the `/approvals` `GateVoteCard`. The S23.2 pipeline-run smoke test (deferred since window (5)) happens once this UI exists — build a small test pipeline through the real canvas rather than direct SQL insert.

**Ad-hoc tasks outstanding:** none opened this window.

### 2026-07-08 (7) — S23.3 confirmed green

First `pnpm typecheck` surfaced one error unrelated to the pack/type-wiring above: `execution.service.recovery.spec.ts` constructs `ExecutionService` with positional constructor args and hadn't been updated for the new 20th param (`pipelineArtifactService`) added this sprint — fixed by appending one stubbed arg. Re-run: `pnpm typecheck` clean (25/25). First `pnpm --filter api test` run then showed one unrelated suite failure (`webhook.service.spec.ts` — a corrupted `@nestjs/common` install, its compiled `exceptions/index.js` pointed at a missing `precondition-failed.exception` file, nothing to do with this sprint's code); eff ran `pnpm install` to repair the package and re-ran — all 31 suites now pass (385/387, 2 skipped by design, `official-workflow-foundation.spec.ts`'s new S23.3 coverage included). **S23.3 is now fully confirmed green — build:packages/build:packs/typecheck/test all clean.**

➡️ **Next:** begin S23.4 (Canvas Rework + Governance UI, §6). The S23.2 pipeline-run smoke test happens once that UI exists.

### 2026-07-08 (8) — S23.4 delivered: Canvas Rework + Governance UI, not yet built/tested

eff said "Lets begin S23.4 (Canvas Rework + Governance UI). Bismillah..." Investigated the old Sprint 11/12 pipeline UI first: `PipelineCanvas.tsx`/`PipelineRunner.ts`/`WorkflowNode.tsx`/`SwitchNode.tsx`/`SwitchPathModal.tsx`/`PipelineRunLog.tsx` (all project-scoped, used only by `projects/[projectId]/page.tsx`'s Pipeline tab) and the old `apps/api/src/pipeline/` module (`project_pipelines`/`project_artifacts`). Confirmed via S23.2's `pipeline-layout.types.ts` that the backend contract (`PipelineLayout`/`WorkflowStageData`/`GateStageData`) was already fully specified, ahead of any canvas existing.

**Three real gaps found during design, before writing UI code — each would have made the plan's own §6 spec unbuildable as literally written:**
1. `ApprovalService.listPending()`'s query is `.in('execution_id', runIds)` — `pipeline_gate` tasks have `execution_id` NULL by design (XOR constraint, migration 0075/0076), so they were **structurally invisible** to `/approvals` no matter how a `GateVoteCard` was built. Worse, the method `return []`s early when `runIds.length === 0`, which would also skip gate tasks for any org that only runs pipelines. Fixed both: gate tasks are now fetched via a new private `listPendingGateTasksForVoter()` (roster-membership visibility via `.contains('voter_user_ids', [userId])`, joined to `pipeline_runs`/`pipelines` for display context, tally attached inline) and merged in regardless of whether the execution-scoped branch ran.
2. No endpoint existed for "every published workflow across every project an org can see" — `WorkflowController` is entirely project-scoped (`projects/:projectId/workflows`). Added `WorkflowService.findAllInOrg()` + new `OrgWorkflowsController` (`GET /organizations/:orgId/workflows`), filtered to `status:'published'` only (an unpublished workflow can't be triggered anyway).
3. No endpoint existed for "list this org's members" (needed for the Committee Gate voter picker) — added `OrganizationService.listMembers()` + `GET /organizations/:orgId/members`. Deliberately returns raw `user_id`/`role` only, no name/email resolution — matches the existing convention everywhere else in this app (`DelegateControl`'s free-text "User ID" field, Departments page) rather than inventing a new user-lookup capability.

**Built:**
- New org-scoped canvas — `apps/web/src/components/pipelines/` (plural, distinct from the old singular `pipeline/`): `WorkflowStageNode.tsx`/`GateStageNode.tsx` (React Flow node types), `WorkflowPickerModal.tsx` (browse/search org-wide published workflows to add a stage), `GateInspectorModal.tsx` (voter multi-select + threshold + optional escalation — the "real new inspector control" §6 calls for, not a copy of `request_approval`'s single-assignee field), `PipelineRunStatusPanel.tsx`, and `PipelineCanvas.tsx` itself (autosaves `layout` via `PATCH /organizations/:orgId/pipelines/:id`, Publish button, "▶ Run Pipeline" calling `POST /pipelines/:id/run`).
- New pages: `apps/web/src/app/(app)/pipelines/page.tsx` (org/department selector mirroring the Departments page, list + create) and `.../pipelines/[pipelineId]/page.tsx` (canvas host; `orgId` travels via query string since `pipelines` is org-nested, not path-derivable from `pipelineId` alone — falls back to fetching the user's first org if a bare URL is opened without it).
- Sidebar nav gained a "Pipelines" entry (new git-branch icon) between Projects and Approvals.
- `/approvals`: new `GateVoteCard` (deliberately NOT `ApprovalCard` reused — a gate is voted, not decided, and delegation doesn't apply to a roster vote per §3.5). Shows pipeline+stage, live tally, every voter's id with a voted/pending badge, and a vote control only when the signed-in user is on the roster and hasn't voted yet. Casting a vote re-fetches the list (doesn't remove the card) since one vote never resolves a quorum gate — resolution stays exclusively in `PipelineWatchdogService`.
- Old project-scoped pipeline UI/API **unwired, not deleted**: `PipelineModule` removed from `app.module.ts`'s imports (commented, with rationale); the project page's Pipeline tab and its `PipelineCanvas` import removed. Source files for both are left on disk untouched — same "preserve, don't destroy" instinct as Phase 21 S9's `archived/packs/`, just without the physical move since these are a handful of small Sprint 11/12 files, not a whole capability-pack line. New migration `supabase/migrations/0077_drop_project_pipeline_tables.sql` drops `project_pipelines`/`project_artifacts` (eff already confirmed their 3 rows are disposable test data, §9.2) — **not yet applied**.
- **One scope cut, made deliberately and flagged rather than silently skipped:** live pipeline-run status uses polling (`PipelineRunStatusPanel`, 3s interval against `GET /pipeline-runs/:runId`), not a new SSE stream, even though §6's prose says "the same SSE pattern `useExecutionRunStream` already established... generalized to pipeline runs." A real pipeline SSE endpoint needs `PipelineWatchdogService` to emit progress events (mirroring S3 D4's `onNodeEvent` wiring) — a genuine, separable follow-up, not required to ship a working status view. This matches the program's own precedent: workflow run monitoring itself was poll-only from Phase 12 until SSE was layered on top much later (S3 D4). Not silently dropped — noted here and in the code comment for whoever picks it up.

**Not yet built/tested** — this sprint touched only `apps/api` and `apps/web` (no workspace package or pack changed), so eff's loop is the lighter S23.1/S23.2-style one: `pnpm typecheck` → `pnpm --filter api test` → `pnpm --filter web typecheck` (no `build:packages`/`build:packs` needed). Then apply migration `0077`.

➡️ **Next:** eff runs the build/test loop. Once confirmed green, the deferred S23.2/S23.3 smoke test finally happens for real: build a small pipeline through the new `/pipelines` canvas (one Workflow Stage + one Committee Gate), publish it, trigger it, vote on the gate from `/approvals`, and confirm the run completes. After that, S23.5 (Analytics + Retention Extension) remains deferred by default per its own section — pick it up only if eff explicitly asks once there's real pipeline run volume. Optionally, the deferred pipeline SSE stream (item above) can be picked up as a small standalone follow-up whenever eff wants live (not polled) canvas status.

**Ad-hoc tasks outstanding:** none opened this window beyond the flagged SSE follow-up.

### 2026-07-11 (9) — S23.5 delivered out of order, ahead of S23.4 verification: Analytics + Retention Extension, not yet built/tested

eff asked "Can we do S23.5 first?" — pulling §7's Analytics + Retention Extension forward ahead of both the S23.4 build/test verification and the still-deferred pipeline smoke test. Evaluated the dependency graph before proceeding: S23.5's scope (a `pipeline_run_stats_daily` rollup + a fourth `RetentionService` table) depends only on S23.1's schema (`pipelines`/`pipeline_runs`, confirmed green in window (3)) and the pre-existing Phase 22 `AnalyticsRollupService`/`RetentionService` (both confirmed green), not on anything S23.4 built — so reordering is architecturally sound even though §7's original "defer until real run volume exists" framing doesn't strictly hold yet. Proceeded on that basis; S23.4's build/test verification and the smoke test remain exactly where window (8) left them, untouched.

**Read in full before writing anything:** `analytics-rollup.service.ts` (S22.3 precedent — recompute-not-accumulate per tick, "today AND yesterday" guard, department resolved via a small lookup map, p95/avg computed in TS not SQL), `retention.service.ts` (S22.5 precedent — export-to-Storage-before-dispose, `archive` vs `delete` mode per org, terminal-status + cutoff-window gate, child rows folded into the export payload before disposal), migration `0073` (exact `workflow_run_stats_daily` column/index/RLS shape to mirror), and migration `0075` (confirmed `pipeline_runs` has no `duration_ms` column of its own, unlike `execution_runs` — duration has to be derived from `started_at`/`completed_at` in application code for the new rollup).

**Migration `supabase/migrations/0078_pipeline_analytics_retention.sql`** (not yet applied): `pipeline_run_stats_daily` mirrors `workflow_run_stats_daily` column-for-column (`organization_id`, nullable `department_id` derived from `pipelines.department_id`, `pipeline_id`, `date`, `total_runs`/`succeeded`/`failed`/`timed_out`, `avg_duration_ms`/`p95_duration_ms`, `UNIQUE(pipeline_id, date)`), same indexes, same updated_at trigger, same single "members can read" RLS policy with no explicit service-role policy (matches 0073's precedent exactly — service-role bypasses RLS anyway). Also adds `pipeline_runs.archived_at` (same nullable schema-hook pattern as 0071 for `execution_runs`/`approval_tasks`/`audit_log`) plus a partial retention-poll index.

**`AnalyticsRollupService` extended:** new `rollupPipelineRunStats()`, called from `rollupDate()` alongside the two existing rollups, gated behind its own `pipelines` → `department_id` lookup map (mirrors the existing `departmentByProject` pattern). Duration is computed per run from `completed_at - started_at` (filtered to non-null, non-negative) since `pipeline_runs` has no stored `duration_ms`. Upserts on `pipeline_id,date`, same as the precedent tables.

**`RetentionService` extended:** new `archivePipelineRuns()`, called from `processOrg()` as a fourth disposal path alongside `execution_runs`/`approval_tasks`/`audit_log`, using the same operational (non-audit) cutoff window as `execution_runs`. Unlike `approval_tasks`, `pipeline_runs` has `organization_id` directly — no project lookup needed. Folds child `pipeline_artifacts` into the export payload before disposal (`ON DELETE CASCADE` from `pipeline_runs`, migration 0075), mirroring `archiveExecutionRuns()`'s `execution_logs` fold-in exactly. **One judgment call flagged in the code comment, same spirit as the existing audit_log note:** in `delete` mode, hard-deleting a `pipeline_runs` row also cascades to any `approval_tasks` row referencing it (`pipeline_gate` tasks, `ON DELETE CASCADE`, migration 0075) — only reached for already-terminal runs, so any gate on that run should already be decided, but an unreachable-in-practice edge case (a gate somehow left pending on a terminal run) would lose that task's own record without its own export.

**Deliberately NOT built, matching §7's literal scope + this sprint's own precedent of flagging scope cuts rather than silently expanding them:** no new `GET /analytics/pipeline-runs` endpoint and no Operations Dashboard UI surfacing for the new table — §7 names only the rollup table and the retention extension, nothing about exposing it. Follow-up item, not a gap.

**Not yet applied/built/tested** — this sprint touched only `apps/api` and a new migration (no workspace package or pack changed), so eff's loop is the lighter S23.1/S23.2/S23.4-style one: `pnpm typecheck` → `pnpm --filter api test` (no `build:packages`/`build:packs` needed). Then apply migration `0078` (independently of, and in addition to, the still-pending `0077`).

➡️ **Next:** eff applies migration `0078` and runs `pnpm typecheck` + `pnpm --filter api test`. Once confirmed green, return to window (8)'s original next step — S23.4's own build/test verification (`pnpm typecheck` → `pnpm --filter api test` → `pnpm --filter web typecheck`, apply migration `0077`), then the long-deferred pipeline-run smoke test through the real `/pipelines` canvas.

**Ad-hoc tasks outstanding:** none opened this window.
