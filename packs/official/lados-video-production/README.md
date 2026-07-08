# Video Production

Official pack ID: `lados.video-production`

Layer L2 — orchestrates and validates the Claude + Remotion AI motion-graphics
production workflow described in Chronixel's **Claude + Remotion Blueprint**
(see the project's `CLAUDE REMOTION BLUEPRINT` folder: the 14-page guide plus
its `Resources/` docs — Text Style, Scene Composition, Scene Revision &
Versioning, Creative Unlock Rule).

## What this pack does

Eight nodes map to the blueprint's per-project / per-video runtime steps
(pure one-time machine setup — installing Claude Desktop, Git, Node.js, the
Antigravity skill — is out of scope; that happens once, outside any
workflow run):

| Node | Blueprint part | Executor status |
| --- | --- | --- |
| `read_script` | Part 6 step 1 | implemented |
| `scaffold_project` | Part 5 | implemented |
| `draft_scenes` | Part 6 step 2 | implemented |
| `generate_scene_batch` | Part 6 steps 3–4 | implemented |
| `render_scenes` | Part 7 | **stub** |
| `revise_scene_layout` | Part 9 | implemented |
| `remove_background` | Part 10 | implemented |
| `insert_images` | Part 11 | implemented |

## What this pack deliberately does NOT do

- **Generate motion graphics.** Claude + Remotion do that in the connected
  Claude session. This pack's nodes plan, batch, and validate — they never
  call an LLM (`aiBoundary` is `none` or `requires_human_review`/`advisory`
  everywhere, never a real model call).
- **Run the Remotion CLI.** `render_scenes` is an honest stub — no NestJS
  service in this repo shells out to `npx remotion render` yet. Wiring that
  up means spawning arbitrary child processes from the API server, which
  deserves its own security-reviewed pass, not a bundled add-on here. Wired
  end-to-end to a locally declared `IRenderService` so a future pass can
  implement it without changing this node's contract — mirrors
  `lados.communication.send_sms`'s stub pattern.
- **Persist resources.** Unlike most other official packs, this pack is
  deliberately stateless — no new `lados_resources` type, no migration.
  Scenes and renders live as files in the user's local Remotion project,
  not as Lados business records. `revise_scene_layout`'s versioning math
  (Scene X V2, V3, ...) takes the current version as an input and returns
  the next one; the caller/workflow variables track state across calls.
- **Edit video.** Marking transitions, chroma-keying, and assembling the
  final cut happen in DaVinci Resolve / Premiere / Final Cut (Part 8),
  entirely outside this pack.

## Services

- `fileService` — reuses the platform's existing upload infrastructure
  (same `IFileService` shape as `lados.document-intelligence`), used by
  `read_script` (resolve an uploaded script) and `insert_images` (resolve
  uploaded image references). Both work standalone via inline
  text/best-effort mapping when no service is injected.
- `renderService` — optional, unwired anywhere yet (see `render_scenes.ts`).

This is a Phase 21-style official pack, built outside the Phase 21 Wave
program (QS/construction/procurement domain) as a new Content Production
line of business. Not yet reviewed by eff — see `manifest.json`'s
`verification` block.
