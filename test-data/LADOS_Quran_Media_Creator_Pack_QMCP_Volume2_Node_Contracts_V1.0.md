# LADOS Official Capability Pack — Companion Document

# Quran Media Creator Pack (QMCP) — Volume 2

## Node Contracts, Schemas, Prompts, Executors and Test Specification

**Document type:** Repository-grounded implementation specification
**Companion to:** `LADOS_Quran_Media_Creator_Pack_QMCP_Blueprint_V1.0.md` (Volume 1)
**Platform:** LADOS
**Pack ID:** `lados.quran-media`
**Package name:** `@lados/official-quran-media`
**Node namespace:** `lados.quran_media.*`
**Status:** Draft — grounded in the committed Phase A skeleton (commit `baf321b`)
**Version:** 1.0
**Date:** 18 July 2026

---

## Document Control

| Item | Decision |
|---|---|
| Relationship to Volume 1 | Adds execution detail only — does not change any port, config field, error code, or guardrail already frozen in Volume 1 or the committed Phase A skeleton |
| Ground truth basis | `packs/official/lados-quran-media/{manifest.json,nodes.json,src/types.ts,src/nodes/*.ts,src/prompts/shared-guardrails.ts}` as committed |
| Scope | Node contracts for all 13 nodes, prompt contracts for the 7 AI-boundary nodes, executor algorithms, consolidated error registry, unit + E2E test plan |
| Out of scope | Dataset selection (Volume 1 §7.3, still `TO_BE_SELECTED`), religious-source module implementation itself, actual prompt tuning/eval — this document specifies what Phases B–D must build, not the finished code |
| Next document after this | Phase B implementation PR (`apps/api/src/religious-source/`) |

---

# 1. Purpose and Scope

Volume 1 froze the architecture, pack identity, source governance, and node catalogue. The Phase A skeleton (committed 18 July 2026) turned that catalogue into a real, structurally validated pack: `manifest.json`, `nodes.json` (13 nodes), `src/types.ts` (every service interface and data contract), and 13 honest-stub executors that already encode the exact input validation and error codes each node must produce.

This document is the missing layer between "stub that fails honestly" and "real implementation": for every node it specifies the prompt contract (where AI is involved), the executor algorithm in implementable pseudocode, the full error code behavior, and the test plan — so that Phases B, C, and D can be implemented directly against this document without re-deriving decisions already made in Volume 1 or the Phase A source.

Every schema below is restated verbatim from the committed `src/types.ts`, not re-invented, so Volume 2 stays consistent with what already compiles.

---

# 2. How to Read This Document

Each node section has the same shape:

- **Identity** — type, display name, canonical capability, delivery phase, current `executorStatus`.
- **Ports** — verbatim from `nodes.json`.
- **Config groups** — verbatim from `nodes.json`, with field types and defaults added.
- **Structured schema** — the TypeScript interface(s) from `src/types.ts` this node consumes/produces.
- **Service dependency** — which neutral interface from `src/types.ts` the executor needs injected.
- **Prompt contract** — for AI-boundary nodes only; system/user prompt shape and guardrail composition.
- **Executor algorithm** — pseudocode ready to translate into the real function body (replaces the `notImplemented(...)` call in the current stub).
- **Error codes** — every code this node can emit, already-stubbed ones marked `(Phase A, live)`.
- **Sample input/output** — concrete JSON.
- **Unit tests** — test list for `apps/api/test/official-quran-media.spec.ts`.

Nodes are grouped by Volume 1 §23 delivery phase (B = deterministic evidence, C = AI editorial, D = research integration), matching `packs/official/lados-quran-media/src/nodes/*.ts`'s own phase tags in each file's header comment.

---

# 3. Cross-Cutting Contracts (restated from `src/types.ts`, not new)

## 3.1 Service Interfaces

```ts
export interface ITextGenerationService {
  readonly isConfigured: boolean;
  runCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: { model?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<string>;
}

export interface ICurrentIssueResearchService {
  discoverIssues(input: { topics?: string[]; sinceHours?: number; limit?: number }): Promise<IssueCandidate[]>;
}

export interface IQuranSourceService {
  searchAyahsByTheme(input: { themes: string[]; query?: string; language?: string; limit?: number }): Promise<QuranCandidate[]>;
  getAyah(input: { surah: number; ayah: number; translationId?: string }): Promise<QuranEvidence>;
  getTafsir(input: { surah: number; ayah: number; tafsirIds: string[] }): Promise<TafsirEvidence[]>;
  verifyReference(input: QuranReference): Promise<QuranReferenceVerification>;
}

export interface IHadithVerificationService {
  createManualVerification(input: { sourceUrl: string; submittedBy: string }): Promise<HadithVerificationRecord>;
  getVerification(recordId: string): Promise<HadithVerificationRecord>;
}
```

Phase B wires `IQuranSourceService`/`IHadithVerificationService` from `apps/api/src/religious-source/`. Phase C wires `ITextGenerationService` from the existing `apps/api/src/ai/ai.service.ts`. Phase D wires `ICurrentIssueResearchService` from `apps/api/src/current-issue-research/`. None of these modules exist yet — that is exactly what Phases B–D deliver.

## 3.2 Evidence Bundle Contract (`bundleVersion: '1.0'`)

```ts
export interface EvidenceBundle {
  bundleVersion: '1.0';
  issue: { issueId: string; headline: string; summary: string; sources: SourceProvenance[]; facts: string[]; uncertainties: string[] };
  themes: string[];
  quranEvidence: Array<QuranEvidence & { tafsir: TafsirEvidence[] }>;
  hadithEvidence: HadithVerificationRecord[];
  warnings: string[];
  religiousReview: { status: 'pending' | 'approved' | 'rejected'; reviewedBy: string | null; reviewedAt: string | null; notes: string };
  publicationReady: boolean;
}
```

Produced only by `build_evidence_bundle`. `religiousReview.status` always starts `'pending'` and `publicationReady` always starts `false` — no executor may set either to a non-pending/true value; that is Gate 2's job via `lados.human.request_input`.

## 3.3 Short Video Script Contract

```ts
export interface ShortVideoScene {
  sceneNumber: number; startSecond: number; endSecond: number;
  visualIntent: string; voiceover: string; onScreenText: string; emotion: string; evidenceRefs: string[];
}
export interface ShortVideoScript {
  title: string; durationSeconds: number; hook: string; scenes: ShortVideoScene[];
  caption: string; callToAction: string; sourceAppendix: string[];
}
```

Every scene's `evidenceRefs` must resolve to an `evidenceId` present in the evidence bundle that produced the script — this is the single most important structural check `validate_dakwah_content` performs.

## 3.4 Validation Contract

```ts
export interface DakwahValidationResult {
  passed: boolean; riskLevel: 'low' | 'medium' | 'high';
  issues: string[]; requiredHumanActions: string[]; publicationBlocked: boolean;
}
```

`passed: true` never implies religious or editorial approval — it means no automated risk was detected. Gates 2 and 3 remain mandatory regardless of this result (Volume 1 §12.3).

## 3.5 AI Advisory Envelope

```ts
export interface AiAdvisoryEnvelope { advisory: true; requiresHumanReview: true; evidenceRefs: string[]; warnings: string[]; }
```

Every AI-boundary node's `outputs` object must include this envelope alongside its primary payload. `advisory`/`requiresHumanReview` are literal `true` — never conditionally set to `false` by an executor.

## 3.6 Shared Guardrail Constants (`src/prompts/shared-guardrails.ts`, already committed)

`QURAN_REFERENCE_SAFETY`, `TAFSIR_CONTEXT_SAFETY`, `HADITH_USAGE_SAFETY`, `REFLECTIVE_DAKWAH_REGISTER` (`preferred`/`avoid` phrase lists), `TRAGEDY_SENSITIVITY`, `AI_OUTPUT_ENVELOPE`. Every Phase C system prompt below is built by concatenating the constants relevant to that node — none should be paraphrased or re-authored per node.

---

# 4. Node Contracts

## 4.1 Phase D — Research Integration

### 4.1.1 `lados.quran_media.discover_current_issues`

**Identity**

| Field | Value |
|---|---|
| Canonical capability | `quran_media.issue.discover` |
| Phase | D |
| `executorStatus` today | `stub` |
| AI boundary | none |

**Ports** — inputs: none. outputs: `issues` (array).

**Config** — group `sources`: `topics?: string[]`, `sinceHours?: number`, `limit?: number` (default `10`, ceiling `QMCP_MAX_ISSUE_CANDIDATES` env, default `10`).

**Schema** — `IssueCandidate[]` (§3.1).

**Service dependency** — `ICurrentIssueResearchService.discoverIssues`.

**Prompt contract** — none; deterministic retrieval through the research service's own allowlisted adapters (Volume 1 §9.2). No pack node makes unmanaged HTTP calls.

**Executor algorithm**

```text
1. If researchService missing → fail RESEARCH_SERVICE_NOT_CONFIGURED (Phase A, live).
2. Read cfg.topics, cfg.sinceHours, cfg.limit (default 10).
3. issues = await researchService.discoverIssues({ topics, sinceHours, limit })
4. If issues.length === 0 → fail NO_CURRENT_ISSUES_FOUND.
5. Return { status: 'success', outputs: { issues }, summary: `Discovered ${issues.length} issue candidate(s)` }
```

The service itself (not this node) owns retry/timeout/allowlist/date-normalization per Volume 1 §9.2 — if the service throws, the node must catch and map to `SOURCE_FETCH_FAILED` rather than letting the raw error escape.

**Error codes** — `RESEARCH_SERVICE_NOT_CONFIGURED` (Phase A, live), `NO_CURRENT_ISSUES_FOUND`, `SOURCE_FETCH_FAILED`, `SOURCE_DATE_INVALID`.

**Sample output**

```json
{
  "status": "success",
  "outputs": {
    "issues": [
      {
        "issueId": "iss-2026-07-18-001",
        "headline": "Flood displaces families in ...",
        "summary": "...",
        "publishedAt": "2026-07-18T02:00:00Z",
        "sources": [{ "provider": "ApprovedNewsSource", "sourceUrl": "https://...", "retrievedAt": "2026-07-18T03:00:00Z" }]
      }
    ]
  }
}
```

**Unit tests** — missing service → `RESEARCH_SERVICE_NOT_CONFIGURED`; empty result → `NO_CURRENT_ISSUES_FOUND`; service throws → `SOURCE_FETCH_FAILED`; `limit` respected; `topics`/`sinceHours` passed through unmodified; deterministic output shape (no extra fields).

---

## 4.2 Phase B — Deterministic Evidence Nodes

### 4.2.1 `lados.quran_media.find_quran_candidates`

**Identity** — capability `quran_media.quran.find` · phase B · `executorStatus: stub` · AI boundary `advisory` (search-term refinement only).

**Ports** — inputs: `themes` (array, required). outputs: `candidates` (array).

**Config** — group `search`: `limit?: number` (default 10), `language?: string` (default `ms`).

**Schema** — `QuranCandidate[]`: `{ reference: QuranReference, matchedThemes: string[], matchSource: string }`.

**Service dependency** — `IQuranSourceService.searchAyahsByTheme`; optionally `ITextGenerationService` to refine free-text query terms (never to invent a reference).

**Executor algorithm**

```text
1. If themes empty → fail MISSING_INPUT (Phase A, live).
2. If quranSourceService missing → fail RELIGIOUS_DATA_PATH_NOT_CONFIGURED (Phase A, live).
3. (optional) if aiService configured: ask it to turn themes[] into 1-3 search query
   strings — advisory only, never used to fabricate a reference, only to shape the
   `query` param passed to searchAyahsByTheme.
4. candidates = await quranSourceService.searchAyahsByTheme({ themes, query, language, limit })
5. If candidates.length === 0 → fail with a new code NO_QURAN_CANDIDATES_FOUND
   (add to Volume 1 §16 registry — see §5 of this document).
6. Return { status: 'success', outputs: { candidates } }
```

**Error codes** — `MISSING_INPUT` (Phase A, live), `RELIGIOUS_DATA_PATH_NOT_CONFIGURED` (Phase A, live), `NO_QURAN_CANDIDATES_FOUND` (new — see §5), `AI_SERVICE_NOT_CONFIGURED` (only if the optional query-refinement step is attempted and fails — must not block the deterministic path; on AI failure, fall back to raw `themes` as the query rather than failing the node).

**Sample output**

```json
{ "status": "success", "outputs": { "candidates": [
  { "reference": { "surah": 90, "ayahStart": 11, "ayahEnd": 16 }, "matchedThemes": ["patience", "hardship"], "matchSource": "ayah-topics" }
] } }
```

**Unit tests** — missing `themes` → `MISSING_INPUT`; missing service → `RELIGIOUS_DATA_PATH_NOT_CONFIGURED`; zero matches → `NO_QURAN_CANDIDATES_FOUND`; AI refinement failure does not block deterministic search (fallback path); output never contains `arabicText`/`translation` (that's the next node's job — this node must not over-fetch).

---

### 4.2.2 `lados.quran_media.retrieve_quran_evidence`

**Identity** — capability `quran_media.quran.retrieve` · phase B · `executorStatus: stub` · AI boundary `none`.

**Ports** — inputs: `candidates` (array, required). outputs: `quranEvidence` (array).

**Config** — group `retrieval`: `translationId?: string` (falls back to the approved primary translation per Volume 1 §7.3 dataset register).

**Schema** — `QuranEvidence[]` (§3.2 minus `tafsir`, added by the next node).

**Service dependency** — `IQuranSourceService.getAyah` + `verifyReference`.

**Executor algorithm**

```text
1. If candidates empty → fail MISSING_INPUT (Phase A, live).
2. If quranSourceService missing → fail RELIGIOUS_DATA_PATH_NOT_CONFIGURED (Phase A, live).
3. For each candidate.reference:
   a. verification = await quranSourceService.verifyReference(reference)
   b. If !verification.valid → fail INVALID_QURAN_REFERENCE (do not skip-and-continue;
      a bad reference must stop the run, not silently drop evidence).
   c. evidence = await quranSourceService.getAyah({ surah, ayah: ayahStart, translationId })
   d. If !evidence.translation?.sourceName → fail TRANSLATION_NOT_CONFIGURED.
4. Return { status: 'success', outputs: { quranEvidence: [...] } }
```

Arabic text (`evidence.arabicText`) is passed through verbatim from the service response — this executor must never call the AI service, matching Volume 1 §19 rule 1/6.

**Error codes** — `MISSING_INPUT`, `RELIGIOUS_DATA_PATH_NOT_CONFIGURED` (both Phase A, live), `INVALID_QURAN_REFERENCE`, `TRANSLATION_NOT_CONFIGURED`, `QUL_DATASET_NOT_FOUND` (bubbled from the adapter if the configured dataset file is missing), `QUL_DATASET_INTEGRITY_FAILED` (bubbled from checksum validation).

**Sample output**

```json
{ "status": "success", "outputs": { "quranEvidence": [
  { "evidenceId": "quran-001", "reference": { "surah": 90, "ayahStart": 11, "ayahEnd": 16 },
    "arabicText": "...", "translation": { "text": "...", "sourceName": "TO_BE_SELECTED", "sourceId": "..." },
    "provenance": { "provider": "QUL", "resourceType": "translation", "resourceName": "...", "resourceId": "...",
      "language": "ms", "sourceUrl": "https://qul.tarteel.ai/resources", "retrievedAt": "2026-07-18T04:00:00Z" },
    "humanReviewStatus": "pending" }
] } }
```

**Unit tests** — missing `candidates` → `MISSING_INPUT`; missing service → `RELIGIOUS_DATA_PATH_NOT_CONFIGURED`; invalid surah/ayah → `INVALID_QURAN_REFERENCE` (stops the run); missing translation source → `TRANSLATION_NOT_CONFIGURED`; provenance object always fully populated; `arabicText` byte-for-byte equals the fixture dataset value (no transformation).

---

### 4.2.3 `lados.quran_media.retrieve_tafsir_context`

**Identity** — capability `quran_media.tafsir.retrieve` · phase B · `executorStatus: stub` · AI boundary `none`.

**Ports** — inputs: `quranEvidence` (array, required). outputs: `tafsirEvidence` (array).

**Config** — group `tafsir`: `tafsirIds?: string[]` (falls back to the approved primary + supporting tafsir per §7.3 register).

**Schema** — `TafsirEvidence[]` (§3.2's element type — note `summaryGeneratedByAI` must be `false` here; AI summarization of tafsir is out of scope for this node, deterministic retrieval only).

**Service dependency** — `IQuranSourceService.getTafsir`.

**Executor algorithm**

```text
1. If quranEvidence empty → fail MISSING_INPUT (Phase A, live).
2. If quranSourceService missing → fail TAFSIR_NOT_CONFIGURED (Phase A, live).
3. For each item in quranEvidence:
   tafsir = await quranSourceService.getTafsir({ surah, ayah: ayahStart, tafsirIds })
   If tafsir.length === 0 → do NOT fail the whole node; tafsir is retrievable-but-optional
   at this stage (mandatory-if-configured is enforced later by build_evidence_bundle's
   requireTafsir config) — attach an empty array + a warning string instead.
4. Keep each tafsir source's text and sourceName separate — never concatenate multiple
   tafsir sources into one field (Volume 1 §13.2 "do not combine ... into a false consensus").
5. Return { status: 'success', outputs: { tafsirEvidence } }
```

**Error codes** — `MISSING_INPUT`, `TAFSIR_NOT_CONFIGURED` (both Phase A, live), `QUL_DATASET_NOT_FOUND`, `QUL_DATASET_INTEGRITY_FAILED`.

**Unit tests** — missing input → `MISSING_INPUT`; missing service → `TAFSIR_NOT_CONFIGURED`; zero tafsir results does not fail the node (warning only); multiple tafsir sources stay as separate array entries, never merged; `summaryGeneratedByAI` is always `false` from this node.

---

### 4.2.4 `lados.quran_media.verify_hadith_reference`

**Identity** — capability `quran_media.hadith.verify` · phase B · `executorStatus: stub` · AI boundary `none`.

**Ports** — inputs: none (config-driven). outputs: `hadithEvidence` (object).

**Config** — group `verification`: `sourceUrl: string` (required, human-supplied SemakHadis.com URL), `submittedBy: string` (required, human identity).

**Schema** — `HadithVerificationRecord` (§3.1) — `statusLabel` preserved exactly as returned by the source, never reduced to a boolean (Volume 1 §8.3).

**Service dependency** — `IHadithVerificationService.createManualVerification`.

**Executor algorithm**

```text
1. If !cfg.sourceUrl → fail HADITH_SOURCE_URL_REQUIRED (Phase A, live).
2. If hadithVerificationService missing → fail HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED
   (Phase A, live — note: this exact code is not in Volume 1 §16's original list;
   Volume 1 lists HADITH_VERIFICATION_PENDING for downstream gating. Both codes are
   needed and are reconciled in §5 of this document).
3. record = await hadithVerificationService.createManualVerification({ sourceUrl, submittedBy })
4. record.humanReviewStatus is always 'pending' at this point — this node records evidence,
   it never sets 'approved'.
5. Return { status: 'success', outputs: { hadithEvidence: record } }
```

**Error codes** — `HADITH_SOURCE_URL_REQUIRED`, `HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED` (both Phase A, live).

**Unit tests** — missing `sourceUrl` → `HADITH_SOURCE_URL_REQUIRED`; missing service → `HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED`; output `humanReviewStatus` is always `'pending'`, never settable via config; `statusLabel` passed through verbatim, not normalized to a boolean anywhere in the pipeline.

---

### 4.2.5 `lados.quran_media.build_evidence_bundle`

**Identity** — capability `quran_media.evidence.build` · phase B · `executorStatus: stub` · AI boundary `none`.

**Ports** — inputs: `issue` (object, optional), `themes` (array, optional), `quranEvidence` (array, **required**), `tafsirEvidence` (array, optional), `hadithEvidence` (object, optional). outputs: `bundle` (object).

**Config** — group `bundle`: `requireTafsir?: boolean` (default `true` per Volume 1's "evidence first" principle — if `true` and any `quranEvidence` item has no matching tafsir, fail rather than silently bundle partial evidence).

**Schema** — `EvidenceBundle` (§3.2).

**Service dependency** — none (pure assembly + `src/validators/evidence-bundle.validator.ts`, new in Phase B).

**Executor algorithm**

```text
1. If quranEvidence empty → fail MISSING_INPUT (Phase A, live).
2. Merge each quranEvidence item with its matching tafsirEvidence entries (match on
   reference.surah + reference.ayahStart) into quranEvidence[].tafsir.
3. If cfg.requireTafsir !== false AND any merged item has tafsir.length === 0
   → fail EVIDENCE_BUNDLE_INVALID with message naming the missing ayah.
4. If hadithEvidence present AND hadithEvidence.humanReviewStatus !== 'approved'
   → do NOT drop it, but push a warning string: "hadith evidence pending review,
   excluded from any script until approved" (script-writing enforcement happens later
   in write_short_video_script/validate_dakwah_content per §8.3).
5. bundle = {
     bundleVersion: '1.0', issue: issue ?? { issueId: '', headline: '', summary: '',
     sources: [], facts: [], uncertainties: [] }, themes: themes ?? [],
     quranEvidence: merged, hadithEvidence: hadithEvidence ? [hadithEvidence] : [],
     warnings: [...], religiousReview: { status: 'pending', reviewedBy: null,
     reviewedAt: null, notes: '' }, publicationReady: false }
6. Run evidence-bundle.validator against `bundle` → if it reports structural errors,
   fail EVIDENCE_BUNDLE_INVALID (do not return a bundle that fails its own schema).
7. Return { status: 'success', outputs: { bundle } }
```

**Error codes** — `MISSING_INPUT` (Phase A, live), `EVIDENCE_BUNDLE_INVALID`.

**Unit tests** — missing `quranEvidence` → `MISSING_INPUT`; `requireTafsir: true` + a gap → `EVIDENCE_BUNDLE_INVALID` naming the ayah; `requireTafsir: false` allows the gap through with a warning; `religiousReview.status` is always `'pending'` and `publicationReady` always `false` regardless of input; unapproved hadith is retained (not silently dropped) but flagged; bundle validates against the Volume 1 §15 JSON shape exactly (round-trip test).

---

## 4.3 Phase C — AI Editorial Nodes

All seven nodes in this phase share one prompt-construction rule: **every system prompt must open with the guardrail constant(s) relevant to that node, verbatim from `src/prompts/shared-guardrails.ts`, followed by the node-specific instruction.** None of the seven bodies below should hand-roll the safety language.

### 4.3.1 `lados.quran_media.rank_issue_candidates`

**Identity** — capability `quran_media.issue.rank` · phase C · `executorStatus: stub` · AI boundary `advisory`.

**Ports** — inputs: `issues` (array, required). outputs: `ranked` (array).

**Config** — group `ranking`: `maxCandidates?: number`, `audienceNote?: string`.

**Prompt contract**

```text
System: TRAGEDY_SENSITIVITY + "You rank news issues for suitability as reflective
  Islamic dakwah content. You do not select the issue — a human does. Score each
  issue 0-100 on: relevance to a broad Muslim audience, non-exploitative framing,
  absence of graphic/sensitive content, clarity of a reflective (not political)
  angle. Return JSON only: { ranked: [{ issueId, score, rationale, warnings[] }] }."
User: issues[] (as JSON) + audienceNote if provided.
options: { jsonMode: true, temperature: 0.2 }
```

**Executor algorithm**

```text
1. If issues empty → fail MISSING_INPUT (Phase A, live).
2. If !aiService?.isConfigured → fail AI_SERVICE_NOT_CONFIGURED (Phase A, live).
3. raw = await aiService.runCompletion(systemPrompt, userPrompt, { jsonMode: true })
4. Parse raw as JSON → if parse fails or shape mismatch → fail INVALID_AI_RESPONSE
   (retry once with a "your last response was not valid JSON" repair prompt before failing).
5. ranked = merge each score back onto the original issue object (never let the AI
   invent a new issueId not present in the input — drop/flag any that don't match).
6. Sort descending by score, truncate to maxCandidates if set.
7. Return { status: 'success', outputs: { ranked }, ...AI_OUTPUT_ENVELOPE, evidenceRefs: [] }
```

**Error codes** — `MISSING_INPUT`, `AI_SERVICE_NOT_CONFIGURED` (both Phase A, live), `INVALID_AI_RESPONSE`.

**Unit tests** — malformed AI JSON → repair-retry then `INVALID_AI_RESPONSE`; AI-invented `issueId` not in input is dropped, not trusted; `maxCandidates` truncation; output always carries the advisory envelope; ordering is strictly descending by score.

---

### 4.3.2 `lados.quran_media.analyze_human_impact`

**Identity** — capability `quran_media.impact.analyze` · phase C · `executorStatus: stub` · AI boundary `advisory`.

**Ports** — inputs: `issue` (object, required, the Gate 1 human selection). outputs: `impact` (object).

**Config** — group `analysis`: `language?: string` (default `ms`).

**Prompt contract**

```text
System: TRAGEDY_SENSITIVITY + "Separate the selected issue into: verifiedFacts[]
  (only what the sources actually state), humanImpact (plain description, no
  speculation), uncertainties[] (what is not yet known/confirmed), sensitivityFlags[]
  (e.g. 'involves minors', 'involves death', 'politically contested'). You do not
  assign blame, cause, or divine meaning. Return JSON only matching:
  { verifiedFacts: string[], humanImpact: string, uncertainties: string[],
  sensitivityFlags: string[] }."
User: issue (as JSON), language.
options: { jsonMode: true, temperature: 0.2 }
```

**Executor algorithm** — same missing-input / not-configured / parse-and-repair-or-fail pattern as §4.3.1, operating on a single `issue` object instead of an array. Output wraps the parsed object under `outputs.impact` plus the advisory envelope.

**Error codes** — `MISSING_INPUT`, `AI_SERVICE_NOT_CONFIGURED` (both Phase A, live), `INVALID_AI_RESPONSE`.

**Unit tests** — missing `issue` → `MISSING_INPUT`; output never contains causal/theological language (regex guard against phrases like "hukuman", "balasan" as a defense-in-depth check, on top of the prompt instruction); malformed JSON → repair-retry then `INVALID_AI_RESPONSE`.

---

### 4.3.3 `lados.quran_media.map_islamic_themes`

**Identity** — capability `quran_media.theme.map` · phase C · `executorStatus: stub` · AI boundary `advisory`.

**Ports** — inputs: `impact` (object, required). outputs: `themes` (array).

**Config** — group `mapping`: `maxThemes?: number` (default 5).

**Prompt contract**

```text
System: QURAN_REFERENCE_SAFETY + "From the impact analysis, propose up to
  maxThemes candidate Islamic themes (e.g. 'sabr/patience', 'rahmah/compassion',
  'tawakkul/trust in Allah') that could frame a reflective — not causal — dakwah
  message. You are proposing search terms for a Quran topic/theme dataset, not
  asserting that any ayah applies to this event. Return JSON only:
  { themes: [{ theme: string, rationale: string }] }."
User: impact (as JSON), maxThemes.
options: { jsonMode: true, temperature: 0.3 }
```

**Executor algorithm** — standard pattern; output `outputs.themes` = array of `{ theme, rationale }`, truncated to `maxThemes`.

**Error codes** — `MISSING_INPUT`, `AI_SERVICE_NOT_CONFIGURED` (both Phase A, live), `INVALID_AI_RESPONSE`.

**Unit tests** — `maxThemes` truncation; themes are plain strings/rationale, never contain an ayah reference (that would violate Volume 1 §13.1 — a defense-in-depth regex check for `surah`/ayah-number patterns in the AI output is recommended here).

---

### 4.3.4 `lados.quran_media.compose_reflection`

**Identity** — capability `quran_media.reflection.compose` · phase C · `executorStatus: stub` · AI boundary `requires_human_review`.

**Ports** — inputs: `bundle` (object, required — the Gate-2-confirmed evidence bundle). outputs: `reflection` (object).

**Config** — group `reflection`: `language?: string` (default `ms`), `tone?: string`.

**Prompt contract**

```text
System: QURAN_REFERENCE_SAFETY + TAFSIR_CONTEXT_SAFETY + TRAGEDY_SENSITIVITY +
  "Write a short reflective passage (150-250 words) grounded ONLY in the supplied
  evidence bundle. Use register from REFLECTIVE_DAKWAH_REGISTER.preferred (e.g.
  'Marilah kita renungkan...'); never use REFLECTIVE_DAKWAH_REGISTER.avoid phrasing
  or its pattern (blame, punishment-framing, forced consensus). Cite every claim
  back to an evidenceId from the bundle. Do not summarize tafsir as if it were your
  own interpretation — attribute it. Return JSON only:
  { text: string, evidenceRefs: string[] (evidenceIds used), warnings: string[] }."
User: bundle (as JSON), language, tone.
options: { jsonMode: true, temperature: 0.5 }
```

**Executor algorithm**

```text
1. If !bundle → fail MISSING_INPUT (Phase A, live).
2. If !aiService?.isConfigured → fail AI_SERVICE_NOT_CONFIGURED (Phase A, live).
3. If bundle.religiousReview.status !== 'approved' → fail RELIGIOUS_REVIEW_REQUIRED
   (this is the enforcement point for Gate 2 — do not allow reflection composition
   on an unreviewed bundle even if the graph wiring somehow allows it through).
4. raw = await aiService.runCompletion(...) → parse-or-repair-or-fail INVALID_AI_RESPONSE.
5. Verify every id in parsed.evidenceRefs exists in bundle.quranEvidence[].evidenceId
   → if any don't resolve, fail EVIDENCE_BUNDLE_INVALID (the AI hallucinated a ref).
6. Return { status: 'success', outputs: { reflection: { text, evidenceRefs, warnings } },
   ...AI_OUTPUT_ENVELOPE }
```

**Error codes** — `MISSING_INPUT`, `AI_SERVICE_NOT_CONFIGURED` (both Phase A, live), `RELIGIOUS_REVIEW_REQUIRED`, `INVALID_AI_RESPONSE`, `EVIDENCE_BUNDLE_INVALID`.

**Unit tests** — `bundle.religiousReview.status !== 'approved'` → `RELIGIOUS_REVIEW_REQUIRED` (critical safety test — must be present and must pass before this node ships); AI-hallucinated `evidenceId` → `EVIDENCE_BUNDLE_INVALID`; output text never contains any `REFLECTIVE_DAKWAH_REGISTER.avoid` substrings (exact-match regression test using the actual constant array); envelope always attached.

---

### 4.3.5 `lados.quran_media.write_short_video_script`

**Identity** — capability `quran_media.script.write` · phase C · `executorStatus: stub` · AI boundary `requires_human_review`.

**Ports** — inputs: `reflection` (object, required). outputs: `script` (object).

**Config** — group `script`: `durationSeconds?: number` (default `45`, from `QMCP_DEFAULT_DURATION_SECONDS`), `language?: string`.

**Prompt contract**

```text
System: TRAGEDY_SENSITIVITY + "Turn the reflection into a short-video script of
  exactly durationSeconds length: a hook (first 3-5s), timed scenes (each with
  visualIntent, voiceover, onScreenText, emotion, evidenceRefs carried over from
  the reflection), a caption, a call to action inviting reflection (not a hard
  sell), and a sourceAppendix listing every evidence source by name. No graphic
  imagery instructions. Return JSON only matching the ShortVideoScript shape."
User: reflection (as JSON), durationSeconds, language.
options: { jsonMode: true, temperature: 0.4 }
```

**Executor algorithm** — standard input/config-not-configured pattern, then: parse-or-repair-or-fail `INVALID_AI_RESPONSE`; verify `scenes[].startSecond`/`endSecond` are monotonic and sum to `durationSeconds` (reject/repair if not); verify every scene's `evidenceRefs` is a non-empty subset of the reflection's `evidenceRefs` — a scene with zero evidence refs is a structural defect, not just an editorial one, and should fail `EVIDENCE_BUNDLE_INVALID` rather than being passed to validation for a human to catch later.

**Error codes** — `MISSING_INPUT`, `AI_SERVICE_NOT_CONFIGURED` (both Phase A, live), `INVALID_AI_RESPONSE`, `EVIDENCE_BUNDLE_INVALID`.

**Unit tests** — scene timing doesn't sum to `durationSeconds` → repair-retry then fail if still wrong; a scene with empty `evidenceRefs` → `EVIDENCE_BUNDLE_INVALID`; `sourceAppendix` non-empty whenever `quranEvidence` was non-empty upstream.

---

### 4.3.6 `lados.quran_media.validate_dakwah_content`

**Identity** — capability `quran_media.content.validate` · phase C · `executorStatus: stub` · AI boundary `advisory`.

**Ports** — inputs: `script` (object, required), `bundle` (object, optional). outputs: `validation` (object).

**Config** — group `validation`: `strictMode?: boolean` (default `true`).

**Prompt contract**

```text
System: QURAN_REFERENCE_SAFETY + TAFSIR_CONTEXT_SAFETY + HADITH_USAGE_SAFETY +
  TRAGEDY_SENSITIVITY + "Review the script for: any scene missing evidenceRefs;
  any phrasing matching REFLECTIVE_DAKWAH_REGISTER.avoid patterns (blame,
  punishment-framing, forced consensus); any hadith reference whose
  humanReviewStatus is not 'approved'; any claim that an ayah was revealed for
  this modern event; any graphic/exploitative imagery description. Return JSON
  only: { issues: string[], riskLevel: 'low'|'medium'|'high' }."
User: script (as JSON), bundle (as JSON, if provided).
options: { jsonMode: true, temperature: 0.1, maxTokens: 800 }
```

**Executor algorithm**

```text
1. If !script → fail MISSING_INPUT (Phase A, live).
2. If !aiService?.isConfigured → fail AI_SERVICE_NOT_CONFIGURED (Phase A, live).
3. Run deterministic checks FIRST (do not depend on AI for these — Volume 1 §21.1
   requires "deterministic output shape" testability):
   a. every scene has evidenceRefs.length > 0 → else push issue, riskLevel >= 'high'.
   b. if bundle.hadithEvidence present and any humanReviewStatus !== 'approved'
      and that hadith's content appears referenced in the script → push issue,
      riskLevel = 'high', requiredHumanActions += 'resolve pending hadith review'.
   c. scan script text for any REFLECTIVE_DAKWAH_REGISTER.avoid substring match
      → push issue.
4. Run the AI advisory pass (§ prompt above) for softer/contextual risks, merge
   its issues[] into the deterministic list, take the max riskLevel of the two.
5. passed = issues.length === 0; publicationBlocked = riskLevel !== 'low' || !passed
   (never let publicationBlocked be false while any 'high' issue is open).
6. Return { status: 'success', outputs: { validation: { passed, riskLevel, issues,
   requiredHumanActions, publicationBlocked } } }
```

**Error codes** — `MISSING_INPUT`, `AI_SERVICE_NOT_CONFIGURED` (both Phase A, live), `INVALID_AI_RESPONSE` (AI pass only — a failed AI pass should degrade to deterministic-only results with a warning, not fail the whole node, since the deterministic checks are the safety-critical ones).

**Unit tests** — deterministic checks run and block even if AI is unavailable/degraded (this is the most important test in the whole pack — validation must never become a no-op just because the AI call failed); unapproved hadith referenced in script → `publicationBlocked: true`; scene with empty `evidenceRefs` → `publicationBlocked: true`; clean script with all evidence refs and no flagged phrasing → `passed: true, riskLevel: 'low'`.

---

### 4.3.7 `lados.quran_media.prepare_media_brief`

**Identity** — capability `quran_media.media.prepare` · phase C · `executorStatus: stub` · AI boundary `requires_human_review`.

**Ports** — inputs: `script` (object, required — the Gate-3-approved script), `validation` (object, optional, used as an execution-order dependency so this node cannot run before validation/approval). outputs: `brief` (object).

**Config** — group `brief`: `visualRestrictions?: string`, `voiceDirection?: string`.

**Prompt contract**

```text
System: TRAGEDY_SENSITIVITY + "Package the approved script into a production
  handoff: sceneIntent per scene (derived from visualIntent+emotion), an explicit
  visualRestrictions list (no graphic imagery, no identifiable vulnerable persons,
  plus any config-supplied restrictions), voiceDirection notes, a subtitle package
  (voiceover text timed to scene start/end), and an evidenceAppendix (source names
  only, not full evidence objects). You do not render video, choose music, or
  publish. Return JSON only matching the media brief shape below."
User: script (as JSON), visualRestrictions, voiceDirection.
options: { jsonMode: true, temperature: 0.2 }
```

**Brief output schema (new, not in Volume 1 — defined here for Phase C to implement)**

```ts
interface MediaBrief {
  approvedScript: ShortVideoScript;
  sceneIntent: Array<{ sceneNumber: number; intent: string }>;
  visualRestrictions: string[];
  voiceDirection: string;
  subtitlePackage: Array<{ startSecond: number; endSecond: number; text: string }>;
  evidenceAppendix: string[]; // source names only
}
```

**Executor algorithm** — standard pattern; must copy `script` through unmodified as `approvedScript` (never let the AI paraphrase the already-approved script text); `visualRestrictions` always includes the two hard-coded defaults ("no graphic imagery", "no identifiable vulnerable persons") plus any config additions, even if the AI response omits them.

**Error codes** — `MISSING_INPUT`, `AI_SERVICE_NOT_CONFIGURED` (both Phase A, live), `EDITORIAL_APPROVAL_REQUIRED` (new — enforce that this node only runs after Gate 3; see §5), `INVALID_AI_RESPONSE`.

**Unit tests** — hard-coded visual restrictions always present even with empty AI response; `approvedScript` byte-identical to input `script` (no paraphrase); missing upstream approval signal → `EDITORIAL_APPROVAL_REQUIRED`.

---

# 5. Consolidated Error Code Registry

This reconciles Volume 1 §16's original list with codes the Phase A stubs actually emit and codes this document adds. Every code below must exist in the eventual `apps/api/test/official-quran-media.spec.ts` error-mapping test.

| Code | Source | Emitted by |
|---|---|---|
| `MISSING_INPUT` | Phase A (`stub-helpers.ts`) | every node with required input ports |
| `RESEARCH_SERVICE_NOT_CONFIGURED` | Phase A, live | discover_current_issues |
| `NO_CURRENT_ISSUES_FOUND` | Volume 1 §16 | discover_current_issues |
| `SOURCE_FETCH_FAILED` | Volume 1 §16 | discover_current_issues |
| `SOURCE_DATE_INVALID` | Volume 1 §16 | discover_current_issues |
| `AI_SERVICE_NOT_CONFIGURED` | Phase A, live | all 7 Phase C nodes |
| `INVALID_AI_RESPONSE` | Volume 1 §16 | all 7 Phase C nodes |
| `RELIGIOUS_DATA_PATH_NOT_CONFIGURED` | Phase A, live | find_quran_candidates, retrieve_quran_evidence |
| `QUL_DATASET_NOT_FOUND` | Volume 1 §16 | retrieve_quran_evidence, retrieve_tafsir_context |
| `QUL_DATASET_INTEGRITY_FAILED` | Volume 1 §16 | retrieve_quran_evidence, retrieve_tafsir_context |
| `INVALID_QURAN_REFERENCE` | Volume 1 §16 | retrieve_quran_evidence |
| `TRANSLATION_NOT_CONFIGURED` | Volume 1 §16 | retrieve_quran_evidence |
| `TAFSIR_NOT_CONFIGURED` | Phase A, live | retrieve_tafsir_context |
| `HADITH_SOURCE_URL_REQUIRED` | Phase A, live | verify_hadith_reference |
| `HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED` | Phase A addition (not in V1 §16 — see note below) | verify_hadith_reference |
| `HADITH_VERIFICATION_PENDING` | Volume 1 §16 | validate_dakwah_content, write_short_video_script (downstream gating, not the verify node itself) |
| `EVIDENCE_BUNDLE_INVALID` | Volume 1 §16 | build_evidence_bundle, compose_reflection, write_short_video_script |
| `RELIGIOUS_REVIEW_REQUIRED` | Volume 1 §16 | compose_reflection |
| `EDITORIAL_APPROVAL_REQUIRED` | Volume 1 §16 | prepare_media_brief |
| `PUBLICATION_BLOCKED` | Volume 1 §16 | terminal condition check in the workflow template, not a node error per se |
| `NO_QURAN_CANDIDATES_FOUND` | **New, this document** | find_quran_candidates |

**Reconciliation note:** Volume 1 §16 did not list `HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED` — it only listed `HADITH_VERIFICATION_PENDING` for the downstream gating case. The Phase A skeleton correctly needed a distinct "the service itself isn't wired" code (analogous to `RELIGIOUS_DATA_PATH_NOT_CONFIGURED` for the Quran side) separate from "the verification exists but is still pending human review." Both codes are needed and are now both catalogued here — this is a deliberate, reviewed addition to the Volume 1 registry, not a drift to silently ignore.

---

# 6. Prompt Engineering Notes (Phase C, shared across all 7 AI nodes)

- Every system prompt opens with the guardrail constant(s) verbatim — never paraphrase `shared-guardrails.ts`. If a guardrail needs to change, change the constant, not a per-node copy.
- `options.jsonMode: true` on every call; every executor must parse-or-repair-once-or-fail with `INVALID_AI_RESPONSE` (one repair attempt with a "your last response was not valid JSON, return JSON only" follow-up turn, then fail — never loop indefinitely, never accept partial JSON).
- No executor may trust an AI-generated `evidenceId`, `issueId`, or Quran reference that doesn't already exist in its own input — the AI can select/summarize/write prose around evidence, never mint new evidence identifiers.
- `compose_reflection` is the single mandatory checkpoint enforcing `bundle.religiousReview.status === 'approved'` in code (§4.3.4 step 3) — this is the actual Gate 2 enforcement, not just a UI convention, and must have its own dedicated unit test before this pack ships.
- Temperature guidance: `0.1–0.2` for classification/validation-style outputs (ranking, impact analysis, theme mapping, validation), `0.3–0.5` for generative prose (theme rationale, reflection, script, media brief) — keep validation and religious-adjacent classification low-temperature for consistency.

---

# 7. Unit Test Plan Matrix (`apps/api/test/official-quran-media.spec.ts`)

| Node | Missing input | Missing service | Invalid AI JSON | Domain-specific safety test |
|---|---|---|---|---|
| discover_current_issues | n/a (no input ports) | ✅ | n/a | zero-results, source-throw mapping |
| rank_issue_candidates | ✅ | ✅ | ✅ | AI-invented issueId dropped |
| analyze_human_impact | ✅ | ✅ | ✅ | no causal/theological language regex |
| map_islamic_themes | ✅ | ✅ | ✅ | no ayah reference leaks into themes |
| find_quran_candidates | ✅ | ✅ | n/a (advisory only, non-blocking) | zero-candidates code |
| retrieve_quran_evidence | ✅ | ✅ | n/a | invalid reference stops run; provenance always populated |
| retrieve_tafsir_context | ✅ | ✅ | n/a | multiple tafsir sources never merged |
| verify_hadith_reference | n/a (config-driven) | ✅ | n/a | statusLabel never booleanized |
| build_evidence_bundle | ✅ | n/a (no service) | n/a | `religiousReview.status` always starts pending |
| compose_reflection | ✅ | ✅ | ✅ | **`RELIGIOUS_REVIEW_REQUIRED` gate enforcement (critical)** |
| write_short_video_script | ✅ | ✅ | ✅ | scene with empty evidenceRefs fails |
| validate_dakwah_content | ✅ | ✅ | degrade-not-fail | **deterministic checks run even if AI is down (critical)** |
| prepare_media_brief | ✅ | ✅ | ✅ | hard-coded visual restrictions always present |

Two tests are marked critical: they are the code-level enforcement of Gate 2 and of "validation must never silently no-op." Both must exist and pass before any Phase C node is considered done, independent of everything else in this table.

---

# 8. E2E Acceptance Test Plan (`apps/api/test/official-quran-media-e2e.spec.ts`)

Per Volume 1 §21.2, using the small legal fixtures at `test/fixtures/qul/` (Volume 1 §21.3 — not full production datasets):

1. Official pack discovery — `lados.quran-media` appears in `OfficialPackLoaderService`'s registry alongside the other 21 packs (already true structurally per `validate:official-packs`; this test exercises the runtime loader, not just the JSON).
2. Manifest and `nodes.json` validation — 13/13 nodes resolve through `resolveNode()`.
3. Full chain with all services stubbed-but-configured against fixtures: `discover → rank → [Gate 1] → analyze → map → find → retrieve_quran → retrieve_tafsir → build_bundle → [Gate 2] → compose_reflection → write_script → validate → [condition] → [Gate 3] → prepare_brief`.
4. Pause/resume at Gate 1 (`lados.human.request_input`), Gate 2, and Gate 3 (`lados.human.request_approval`) — run must actually suspend and resume correctly, not just call the node function directly.
5. Refusal path: attempt to run `compose_reflection` with a bundle whose `religiousReview.status` is still `'pending'` (bypassing the graph's normal Gate 2 wiring) → must fail `RELIGIOUS_REVIEW_REQUIRED`, proving the enforcement is in the node, not just the graph shape.
6. `validation.publicationBlocked === true` path routes to the revision branch (`write_log` warning per the current template — Volume 1 §14 "revision path" is still a stub loop per `templates/README.md`, so this test asserts the current documented behavior, not a full loop-back, until Phase E).
7. Output handoff shape: `prepare_media_brief`'s `brief` output is accepted as valid input by `lados.video.read_script`'s expected shape (or documents the exact adapter needed if the shapes don't match — `templates/README.md` already flags this as an open port-shape gap).

---

# 9. Implementation Order Recommendation

The Volume 1 §23 phase labels (B = deterministic, C = AI editorial, D = research) describe *categories* of work, not a strict build sequence — the actual data flow interleaves them: `map_islamic_themes` (Phase C) must produce output before `find_quran_candidates` (Phase B) can run. Recommended real build order:

1. **Shared infrastructure first, regardless of phase label:** the `ITextGenerationService` neutral wrapper over the existing `AiService` (small, unblocks all 7 Phase C nodes at once) and the `apps/api/src/religious-source/` module skeleton with the two adapters stubbed against the Volume 1 §21.3 test fixtures (unblocks all 5 Phase B nodes against fixture data without waiting on real QUL dataset selection).
2. **Build the full chain against fixtures**, not production data — this is what makes the E2E test in §8 possible early and cheaply, and it decouples "the pack works end-to-end" from "eff has approved a specific Malay translation/tafsir" (Volume 1 §7.3, still open).
3. **Only after the fixture-driven chain is green**, swap in real QUL datasets once §7.3's `TO_BE_SELECTED` entries are resolved — the node contracts and error codes in this document do not change when that happens, only the adapter's data source does.
4. Phase D (`discover_current_issues` / current-issue-research module) can be built last and in parallel by a different work-stream — nothing else in the chain depends on it except the very first node, and Gate 1 can be exercised in tests with a hand-fed `issues[]` fixture instead.

---

# 10. Open Decisions Before Coding Starts (carried over, still unresolved)

- Volume 1 §7.3: exact QUL translation/tafsir dataset selection (`TO_BE_SELECTED` in all relevant rows) — a content decision for eff, not an engineering one.
- `QMCP_ALLOW_HADITH` default is `false` in Volume 1 §18 — confirm whether Phase B should build the hadith path at all in its first pass, or defer `verify_hadith_reference`'s real implementation to a later increment since it's optional in v1.
- `write_short_video_script`'s scene-timing repair strategy (§4.3.5) assumes one AI repair retry is enough — if this proves unreliable in practice, a deterministic post-processing rebalancer may be needed instead of relying on a second AI call.

---

**End of Volume 2**

**LADOS Official Capability Pack — Quran Media Creator Pack (QMCP) — Node Contracts, Schemas, Prompts, Executors and Test Specification**
