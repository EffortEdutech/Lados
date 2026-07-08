# Video Production — Templates

## `script-to-scene-plan.template.json`

The standard official-pack template descriptor (same skeleton shape every
other pack's `workflowTemplates` entry uses — `templateId`, `displayName`,
`ownerPack`, `status`, `maturity`, `summary`, `requiredPacks`,
`recommendedKnowledgePacks`). Validated by `validate-official-packs.cjs`.

## `script-to-scene-plan.workflow.json`

A real, importable `QSWorkflowDefinition` graph body chaining all 8
`lados.video-production` nodes plus `lados.workflow.trigger_manual` and
`lados.workflow.write_log` from Workflow Foundation. This is the **first
real graph body** among any official pack's templates in this repo —
every other pack's `workflowTemplates` entry so far is descriptor-only
(no `nodes`/`connections`), so this hasn't been validated by the same
tooling path as a normal template import. Sanity-check it once (import +
manual trigger) before relying on it.

### Why only 5 of 8 nodes are wired automatically

The connection model here wires whole output ports to whole input ports —
there's no sub-field extraction. That means:

- `read_script.script` → `draft_scenes.script` → `draft_scenes.scenes` fans
  out to both `generate_scene_batch.scenes` and `render_scenes.scenes` →
  `render_scenes.render` → `write_log.data`. All five ports match shape
  (`object`/`array` in, matching type out), so this chains for real.
- `revise_scene_layout`, `remove_background`, and `insert_images` each take
  a **single** scene object (or an explicit `sceneNumbers`/`images` list),
  not the bulk `scenes` array `draft_scenes` produces. Wiring a single-scene
  port from an array-producing port would silently hand the node the wrong
  shape rather than fail loudly, so this template does **not** force that
  connection. Instead they're included as standalone nodes with realistic
  pre-filled `config`, demonstrating their contract — in practice an
  operator (or a `lados.workflow.condition`-gated branch) invokes them
  on-demand for a specific scene, not automatically for every scene in
  the batch.

### `render_scenes` will fail when run

This template imports and runs `lados.video.render_scenes` as designed —
which means running it end-to-end will hit the honest
`RENDER_BACKEND_NOT_CONFIGURED` failure documented in
`../src/nodes/render-scenes.ts`. That's expected until a real render
backend is wired in a follow-up pass.
