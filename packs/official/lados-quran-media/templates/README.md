# Quran Media Creator — Templates

## `issue-to-dakwah-video.template.json`

The standard official-pack template descriptor (`templateId`, `displayName`,
`ownerPack`, `status`, `maturity`, `summary`, `requiredPacks`,
`recommendedKnowledgePacks`). Validated by `validate-official-packs.cjs`.
`templateId` uses the underscore namespace `lados.quran_media.` as the
validator requires.

## `issue-to-dakwah-video.workflow.json`

An importable graph body wiring the QMCP main chain from Blueprint §14,
including all three mandatory human gates:

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
  (`lados.human.request_approval`): reached only via the condition's `true`
  branch (`publicationBlocked == false`); its `approvalTask` output gates
  `prepare_media_brief` (wired to the optional `validation` port purely as an
  execution dependency so the brief cannot run before approval).

### Standalone example nodes (not auto-wired)

- `verify_hadith_reference` — hadith is **optional** in v1 and its MVP flow is
  human-assisted (a person supplies the exact SemakHadis.com record URL in
  config), so it is not forced into the main chain. Its `hadithEvidence`
  output can be wired to `build_evidence_bundle.hadithEvidence` when used.
- `lados.video.read_script` / `lados.video.draft_scenes` — the Video
  Production handoff consumes the *approved media brief*, but `read_script`
  takes a file/`scriptText` config rather than a brief object, so whole-port
  wiring from `brief` would hand it the wrong shape. They are included
  standalone with realistic config to show the handoff contract; an operator
  (or a Phase E revision of the video pack's ports) completes the connection.

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

### Revision loop

The condition's `false` branch routes to a `write_log` warning rather than a
real loop-back edge; the Phase E pass implements the revision path once the
platform's loop-back semantics for this graph are decided (Blueprint §14
"Revision path — loop").
