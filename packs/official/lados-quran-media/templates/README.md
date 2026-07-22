# Quran Media Creator — Templates

Two importable templates. Both verified structurally (zero cycles, zero
unknown node types, zero port-id mismatches, every node reachable in the
topological plan) via the real compiled `graph-planner.ts` against the real
cross-pack port registry (workflow-foundation + human-work + video-production
+ quran-media) — not just visual inspection.

## `issue-to-dakwah-video.template.json` / `.workflow.json`

The main chain from Blueprint §14, including all three mandatory human gates:

- **Gate 1 — Issue selection** (`lados.human.request_input`): the ranked
  candidates arrive on `context`; the human's `submittedData` — the single
  selected issue object — feeds `analyze_human_impact.issue`. The human
  submission *is* the selected issue, so the port shape is semantically right.
- **Gate 2 — Religious evidence review** (`lados.human.request_input`): the
  assembled bundle arrives on `context`; the reviewer submits the confirmed
  bundle, which feeds `compose_reflection.bundle`. If a future
  request_input variant supports pass-through of the incoming context, this
  wiring can switch to it without changing the graph shape.
- **Gate 3 — Editorial publication approval**
  (`lados.human.request_approval`): its `context` input is wired directly
  from `validate_dakwah_content.validation` (Phase F fix — see next section),
  so the reviewer always sees the real, full validation result — issues,
  riskLevel, requiredHumanActions — and can make an informed call even when
  the automated check blocked publication. `approvalTask` output gates
  `prepare_media_brief` (wired to the optional `validation` port purely as an
  execution dependency so the brief cannot run before approval).

### `cond-publication` — a real bug found and fixed in Phase F

`validate_dakwah_content` has a single object-shaped output port
(`validation`). The original Phase E wiring connected that whole object
straight into `cond-publication`'s single `value` input port and wrote the
expression as `"publicationBlocked == false"`, expecting the condition node
to reach into the object for that field. It never could:
`lados-workflow-foundation/src/lib/expression.ts`'s `resolveFieldValue()`
does a flat `field in ctx.inputs` check with no dot-path/sub-field syntax —
`ctx.inputs` only ever had a key called `value` (holding the whole object),
never a key called `publicationBlocked`. Every real run would have thrown
`EXPRESSION_ERROR` at this node, 100% of the time, regardless of the actual
validation result — verified by extracting and running the real compiled
expression grammar against the exact input shape the shipped connections
produced (see Phase F test-writing notes; this file's earlier revision
described the old, broken wiring as if it worked).

Fixed with the same additive-port pattern used for the Video Production
handoff: `validate_dakwah_content` now also outputs a flat
`publicationBlocked` boolean port alongside `validation`, and only that flat
boolean feeds `cond-publication.value` (expression updated to `"value ==
false"`, which now resolves correctly). The full `validation` object no
longer routes through `cond-publication` at all — it's wired directly to
both `gate3-editorial-approval.context` and `gateR-revision.context` (see
below), which is simpler than laundering it through the condition node's
pass-through `context` output and avoids inventing an undeclared second
input port on a shared foundation node. `cond-publication` still runs and
still logs its routing decision (`Condition "value == false" → TRUE/FALSE`,
visible in workflow run logs) for audit purposes, but as of this fix nothing
downstream consumes its `true`/`false`/`context` outputs — see "Both DAG
branches always execute" below for why that was already true in substance,
just not in wiring, since Phase E.

### Video Production handoff (Phase E — now real, not an example)

`prepare_media_brief` gained two new output ports alongside `brief`:
`scriptText` (the approved script's hook + scene voiceovers + call-to-action,
concatenated in reading order, copied through unmodified) and `title`. These
feed `lados.video.read_script`'s `scriptText`/`title` input ports — new,
optional ports added to `lados-video-production/nodes.json` in this pass;
`read-script.ts`'s executor already read `ctx.inputs.scriptText`/`.title`
before this change, so this was a manifest catch-up, not new runtime
behavior (same class of fix as the S4/S6 "nodes.json didn't match real
capability" bugs elsewhere in the program). `read_script.script` then feeds
`draft_scenes.script` directly (dataType `object`, already compatible) —
the full handoff now runs for real when the workflow is triggered, ending in
a `write_log` confirming the production package is ready.

### Standalone example node (not auto-wired)

- `verify_hadith_reference` — hadith is **optional** in v1 and its MVP flow is
  human-assisted (a person supplies the exact SemakHadis.com record URL in
  config, which no upstream node produces), so it is not forced into the
  main chain. Its `hadithEvidence` output can be wired to
  `build_evidence_bundle.hadithEvidence` when used.

### `discover_current_issues` still stops the chain by default — governance, not engineering

13/13 QMCP executors are implemented (Phase B deterministic evidence nodes +
Phase C AI editorial nodes + Phase D current-issue research, wired to
`ReligiousSourceService`/`AiService`/`CurrentIssueResearchService`). Running
this template today still stops at `discover_current_issues` with
`RESEARCH_SERVICE_NOT_CONFIGURED` by default — the same honest-stub pattern
as `lados.video.render_scenes`'s `RENDER_BACKEND_NOT_CONFIGURED` — because no
`CURRENT_ISSUE_RESEARCH_SOURCES` entry has been approved yet (a content-
governance decision, same class as the QUL dataset pick, not an engineering
gap). Registering at least one approved RSS/Atom feed unblocks it
immediately, no code change needed. Feeding a hand-built `issues[]` fixture
directly into `rank_issue_candidates` (skipping `discover_current_issues`)
still works too and exercises the rest of the chain end to end.

## Revision path — why it's a second template, not a loop-back edge

Blueprint §14's diagram shows a "Revision path...loop" back into the
validation stage. This pack cannot build that as a literal same-graph
back-edge: `packages/execution-engine/src/graph-planner.ts` runs Kahn's
algorithm and *any* cycle sets `plan.cycles` non-empty, which
`runner.ts` turns into a hard `CYCLE_DETECTED` failure for the **entire**
run before a single node executes. Adding a loop-back edge would make the
whole template unusable, not just the revision branch — verified by reading
the planner/runner source, not assumed.

Two real, DAG-legal pieces stand in for it instead:

1. **Gate R, in the main template.** `validate_dakwah_content.validation`
   (the full object, same source as Gate 3's context — see "`cond-publication`
   — a real bug found and fixed in Phase F" above) feeds
   `lados.human.request_input` ("Gate R — Revision Required") instead of a
   passive `write_log`. The reviewer sees the validation warnings and
   acknowledges them; a `write_log` records the acknowledgement. This turns
   what used to be a silent dead-end into a real human checkpoint, consistent
   with the pack's "no automatic publishing, mandatory human review"
   principle.
2. **`issue-to-dakwah-video-revision.template.json` / `.workflow.json`,** a
   companion template. A human resubmits the *same already Gate-2-approved*
   evidence bundle (no need to repeat issue discovery, Gate 1, or Gate 2 —
   only the AI-authored content stage is at fault), and
   `compose_reflection → write_short_video_script → validate_dakwah_content`
   re-runs against it. If still blocked, its own Gate R fires and the
   operator can re-trigger this same template again — an operator-driven
   loop across separate runs, which is exactly what a DAG engine can support,
   instead of a same-graph cycle it cannot.

### Both DAG branches always execute — a verified platform characteristic, not a QMCP bug

Reading `condition.ts`'s real executor (not just the manifest) confirmed
something worth documenting explicitly: this engine has **no conditional
skip**. Every node in the topological plan runs regardless of which
condition branch was "true" — `lados.workflow.condition` doesn't prevent the
`false`-side subgraph from executing when the result is `true`, or vice
versa. Concretely for this template: `gate3-editorial-approval` and
`gateR-revision` both run on *every* execution, regardless of what
`cond-publication` decides — `publicationBlocked` never actually gated which
gate the run reaches, only (in the Phase E design) which one *received
meaningful content*.

That's the real reason the Phase F fix wires both gates' `context` directly
from `validate_dakwah_content.validation` instead of routing content through
`cond-publication`'s `true`/`false`/`context` outputs: since neither gate's
*execution* was ever conditional on the other's outcome, there is no
control-flow reason to launder the payload through the condition node at
all — both gates always run, so both should always see the same real
validation result, and a human reviewer at either gate can see
`validation.publicationBlocked` themselves to know which situation they're
in. `cond-publication` still runs, still evaluates the expression, and still
logs the routing decision for the audit trail, but as of Phase F it has no
downstream consumers — that's an accepted, intentional simplification, not
an oversight (a workflow node with no outgoing connections is a normal
pattern in this codebase; every `write_log` node here is exactly that).
