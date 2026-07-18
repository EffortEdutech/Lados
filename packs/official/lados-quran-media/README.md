# @lados/official-quran-media — Quran Media Creator Pack (QMCP)

Official Lados Capability Pack (L2) implementing
`test-data/LADOS_Quran_Media_Creator_Pack_QMCP_Blueprint_V1.0.md`.

Transforms a current issue into a Quran-centred short-form dakwah content
package under the core operating principle:

> **Evidence first, reflection second, publication only after human review.**

QMCP is **not** an autonomous religious authority. It does not issue fatwa,
certify interpretations, determine divine intent behind an event, or publish
content without human approval.

## Status — Phase A/B/C/D implemented, Phase E/F pending

| Area | Status |
|---|---|
| Manifest + nodes.json (13 nodes) | ✅ validated by `validate:official-packs` |
| Executors | ✅ 13/13 **implemented** (Phase B deterministic evidence nodes + Phase C AI editorial nodes + Phase D current-issue research) per QMCP Volume 2's node contracts. `discover_current_issues` degrades to the honest `RESEARCH_SERVICE_NOT_CONFIGURED` stub whenever no approved RSS source is registered — see Current Issue Research module row below. |
| Workflow template | ✅ descriptor + importable graph body (`templates/`) — now runs through the full 13-node chain against real/fixture datasets and at least one configured RSS source |
| API resolver wiring | ✅ `apps/api/src/execution/real-nodes/index.ts` (`officialQuranMediaResolve`) |
| Religious source module (QUL adapters) | ✅ `apps/api/src/religious-source/` — JSON-dataset adapters (SQLite is an approved future format, same interface) |
| Neutral AI service wiring | ✅ the existing `AiService` is passed directly — it already structurally satisfies `ITextGenerationService` (`isConfigured` + `runCompletion`), no wrapper class needed |
| Current Issue Research module | ✅ Phase D (`apps/api/src/current-issue-research/`) — allowlisted RSS/Atom fetch (dependency-free parser, timeout + retry), date normalization, duplicate detection (by link and normalized headline), provenance. Source allowlist (`CURRENT_ISSUE_RESEARCH_SOURCES`) is a content-governance decision for eff — ships empty by default (same posture as the QUL dataset pick), `isConfigured` false until at least one source is registered. |
| Tests (`official-quran-media.spec.ts` / e2e) | ❌ not yet written — Volume 2 §7/§8 specify the full matrix; two tests are flagged critical (Gate 2 enforcement in `compose_reflection`, deterministic checks in `validate_dakwah_content` must never no-op if AI is down) |
| Test fixtures | ✅ `apps/api/test/fixtures/qul/` — small, obviously-placeholder dataset (Blueprint §21.3), safe for exercising the pipeline without real QUL content |
| Real QUL dataset selection | 🟡 production pick still open (Blueprint §7.3 `TO_BE_SELECTED`) — but a **local dev/test dataset** is now staged from `00 RAFIQ`'s already-downloaded, checksummed QUL/Tanzil data via `scripts/stage-qmcp-local-religious-source.mjs` + `scripts/export-qul-topics-sqlite.mjs` (run once, output gitignored under `local-data/`, never committed). Verified end-to-end against real Quran/translation/tafsir/topic text through the actual `QulQuranAdapter`/`QulTafsirAdapter` code. The Malay translation entry is explicitly flagged DEV/TEST ONLY — RAFIQ's own audit found its rights/attribution unresolved. This is an interim source; eff's plan is to migrate to RAFIQ's own "Dakwah PKA" content pipeline once that stabilizes — see `scripts/stage-qmcp-local-religious-source.mjs`'s header for full notes. |
| Approved news source allowlist | ❌ open — same class of content-governance decision as the QUL dataset pick; `CURRENT_ISSUE_RESEARCH_SOURCES` needs at least one real, eff-approved RSS/Atom feed before `discover_current_issues` runs against live data. |

Delivery phases A–F are defined in Blueprint §23. Node-level implementation
detail lives in **QMCP Volume 2**
(`test-data/LADOS_Quran_Media_Creator_Pack_QMCP_Volume2_Node_Contracts_V1.0.md`).

## Nodes (namespace `lados.quran_media.*`)

Thirteen nodes: discover_current_issues, rank_issue_candidates,
analyze_human_impact, map_islamic_themes, find_quran_candidates,
retrieve_quran_evidence, retrieve_tafsir_context, verify_hadith_reference,
build_evidence_bundle, compose_reflection, write_short_video_script,
validate_dakwah_content, prepare_media_brief. See `nodes.json` for full
contracts (ports, config groups, AI boundaries, human decision boundaries).

Dependencies (never duplicated here): `lados.workflow-foundation` (triggers,
condition, log), `lados.human-work` (the three mandatory gates),
`lados.video-production` (production orchestration handoff).

## Source governance

- **Quran / tafsir** — QUL (Quranic Universal Library,
  https://qul.tarteel.ai/resources) via **downloaded, locally governed
  datasets** (SQLite/JSON). No runtime assumes a public QUL API. Datasets are
  deployed outside the repo (`LADOS_RELIGIOUS_DATA_PATH`) and must never be
  committed. Exact dataset selection (Malay translation, tafsir) requires a
  separate source-approval decision — nothing is preselected here.
- **Hadith** — SemakHadis.com via a **human-assisted** verification flow in
  v1: a person supplies the exact record URL; the adapter records provider,
  exact status label, and references with `humanReviewStatus: "pending"`. No
  scraper. Hadith is optional and blocked from final scripts until verified
  and approved.
- **AI** — a pack-local neutral `ITextGenerationService` interface, satisfied
  by the existing Lados AiService in Phase C. Guardrail text lives in
  `src/prompts/shared-guardrails.ts` and must be embedded in every Phase C
  system prompt.

## Hard guardrails (v1)

Arabic Quran text is never generated by AI. No invented references,
translations, tafsir, hadith, or news facts. No "divine punishment" or
"reason for revelation" claims about modern events. Religious review (Gate 2)
and editorial approval (Gate 3) are mandatory, separate, and human.
`QMCP_ALLOW_AUTOPUBLISH` must remain `false`. No MP4 rendering — the Video
Production pack owns production orchestration, and its render backend is
itself still a stub.

## Configuration (future phases)

See Blueprint §18: `LADOS_RELIGIOUS_DATA_PATH`, `LADOS_QUL_*` dataset ids,
`QMCP_DEFAULT_LANGUAGE=ms`, `QMCP_DEFAULT_DURATION_SECONDS=45`,
`QMCP_REQUIRE_RELIGIOUS_REVIEW=true`, `QMCP_REQUIRE_EDITORIAL_APPROVAL=true`,
`QMCP_ALLOW_HADITH=false`, `QMCP_ALLOW_AUTOPUBLISH=false` (frozen).

None of these are read yet in Phase A.

## Local dev/test dataset (interim, not production)

`LADOS_RELIGIOUS_DATA_PATH` can point at a local dataset staged from
`00 RAFIQ`'s already-downloaded QUL/Tanzil raw data instead of needing a
fresh QUL download:

```
node scripts/export-qul-topics-sqlite.mjs        # optional, needs Node 22+ (node:sqlite)
node scripts/stage-qmcp-local-religious-source.mjs
# then add to apps/api/.env (never commit):
# LADOS_RELIGIOUS_DATA_PATH=<repo>/local-data/religious-source
```

Output goes under `local-data/` (gitignored). This stages the Quran script
(Uthmani), two translations (Malay "Abdullah Basamia" — DEV/TEST ONLY, rights
unresolved; English Saheeh International), three tafsir (As-Saadi Arabic,
Ibn Kathir English, Al-Mukhtasar English), and topic/theme search data. See
the scripts' header comments for full provenance and licensing caveats.
