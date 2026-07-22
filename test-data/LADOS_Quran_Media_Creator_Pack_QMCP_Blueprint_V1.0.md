# LADOS Official Capability Pack Blueprint

# Quran Media Creator Pack (QMCP) v1.0

**Document type:** Repository-grounded reference and implementation blueprint  
**Platform:** LADOS  
**Pack ID:** `lados.quran-media`  
**Package name:** `@lados/official-quran-media`  
**Node namespace:** `lados.quran_media.*`  
**Target layer:** L2 — Solution Capability Pack  
**Status:** Architecture Freeze Draft  
**Version:** 1.0  
**Date:** 17 July 2026  
**Development mode:** Workflow-first, Pre-KF, Pre-PKA  

---

## Document Control

| Item | Decision |
|---|---|
| Product form | Official LADOS Capability Pack |
| Standalone application | No |
| Primary output | Evidence-grounded dakwah content and media production brief |
| Knowledge Factory dependency | None in v1 |
| PKA / Knowledge Pack dependency | None in v1 |
| Quran and tafsir source | QUL — Quranic Universal Library |
| Hadith verification source | SemakHadis.com |
| AI runtime | Existing LADOS AI Service through a pack-local neutral interface |
| Human review | Mandatory |
| Automatic publication | Not allowed in v1 |
| Automatic MP4 rendering | Not available until the Video Production render backend is implemented |
| Workflow template | Importable LADOS workflow JSON |
| Religious source data | Governed source adapters, not PKA |

---

# 1. Executive Summary

The **Quran Media Creator Pack (QMCP)** is an official LADOS Capability Pack that transforms a current issue into a Quran-centred short-form dakwah content package.

The pack is designed to:

1. discover and assess current issues;
2. separate verified facts from interpretation;
3. identify relevant Islamic themes;
4. retrieve Quran verses, translations, themes, and tafsir from approved QUL datasets;
5. verify optional hadith references through SemakHadis.com;
6. build a traceable religious evidence bundle;
7. generate a reflective dakwah script;
8. validate the script against its evidence;
9. route the content through mandatory human religious and editorial review;
10. prepare a production brief for the existing LADOS Video Production Pack.

QMCP is **not** an autonomous religious authority. It does not issue fatwa, certify interpretations, determine divine intent behind an event, or publish content without human approval.

The core operating principle is:

> **Evidence first, reflection second, publication only after human review.**

---

# 2. Repository Audit Basis

This blueprint is aligned with the actual implementation patterns in the public LADOS repository:

- Repository: `https://github.com/EffortEdutech/Lados`
- Audit branch: `main`
- Audit commit reference: `91a7ce4d7e677813950004e66f3cfa4ce812abc5`

Relevant implementation references include:

```text
packs/official/*
packages/@lados/pack-sdk/
packages/@lados/node-sdk/
packages/@lados/core/
apps/api/src/pack/
apps/api/src/execution/real-nodes/
apps/api/src/ai/
packs/official/lados-workflow-foundation/
packs/official/lados-human-work/
packs/official/lados-video-production/
```

The repository uses official pack skeletons and executors with these main files:

```text
manifest.json
nodes.json
package.json
tsconfig.json
README.md
src/index.ts
src/types.ts
src/nodes/*.ts
templates/*.template.json
templates/*.workflow.json
```

Official packs are discovered under:

```text
packs/official/*
```

---

# 3. Architecture Decisions

## 3.1 QMCP Is an Official Capability Pack

QMCP will be created under:

```text
packs/official/lados-quran-media/
```

It will follow the official contract:

```text
lados.capability-pack.v1
```

The pack provides executable actions, workflow templates, prompts, guardrails, and orchestration logic.

It is not:

- a standalone web application;
- a ChatGPT Custom GPT;
- a Claude Project;
- a PKA;
- a Knowledge Pack;
- a replacement for a scholar;
- a Quran or hadith database publisher.

## 3.2 Workflow-First, Pre-KF, Pre-PKA

QMCP v1 must not wait for Knowledge Factory.

The religious sources are accessed through temporary governed adapters:

```text
QMCP Node
    ↓
Religious Source Service
    ↓
QUL Dataset Adapter / Semak Hadis Adapter
```

Future migration:

```text
QMCP Node
    ↓
Religious Source Service Interface
    ↓
KF / Knowledge Pack Provider
```

The workflow and node output contracts should remain stable when KF is introduced.

## 3.3 Node Is the Executable Runtime Unit

The current LADOS runtime executes nodes through:

```ts
(ctx: NodeContext) => Promise<NodeExecuteResult>
```

The V3 Skill SDK document remains a stub and is not yet the production runtime contract.

Therefore, QMCP v1 uses:

- **Node** for executable workflow capability;
- **Internal skill module** for prompt behaviour, editorial policy, structured reasoning instructions, and safety rules;
- **Skill Group** only as a canvas grouping concept where useful.

Internal skills are not independently registered runtime objects in v1.

## 3.4 Higher-Level Pack Must Reuse Lower-Level Capabilities

QMCP will not duplicate:

- workflow trigger and condition nodes;
- human input and approval nodes;
- video scene planning nodes;
- logging;
- generic resource or file operations.

It will depend on existing packs and services instead.

---

# 4. Pack Identity

```text
Pack ID:
lados.quran-media

Package:
@lados/official-quran-media

Display Name:
Quran Media Creator

Layer:
L2

Palette Group:
Content Production

Category:
Quran Media

Suggested Icon:
BookOpen

Suggested Colour:
#0f766e
```

## 4.1 Owner Boundary

QMCP owns:

- current-issue editorial assessment for dakwah content;
- Islamic theme mapping;
- Quran evidence retrieval through approved sources;
- tafsir-context retrieval through approved sources;
- optional hadith verification workflow;
- religious evidence bundle creation;
- reflective dakwah script generation;
- evidence-grounded dakwah content validation;
- short-video media brief preparation.

## 4.2 Must Not Own

QMCP must not own:

- Quran dataset authorship;
- tafsir authorship;
- hadith grading;
- fatwa or legal rulings;
- scholarly certification;
- final publication approval;
- news reporting as an authoritative news agency;
- generic video rendering;
- social-platform publishing in v1;
- Knowledge Factory or Knowledge Pack storage.

---

# 5. Dependencies

Proposed manifest dependencies:

```json
[
  "lados.workflow-foundation",
  "lados.human-work",
  "lados.video-production"
]
```

## 5.1 Dependency Responsibilities

### `lados.workflow-foundation`

Used for:

- `lados.workflow.trigger_manual`
- `lados.workflow.trigger_schedule`
- `lados.workflow.condition`
- `lados.workflow.parallel`
- `lados.workflow.merge`
- `lados.workflow.write_log`

### `lados.human-work`

Used for:

- `lados.human.request_input`
- `lados.human.request_approval`
- `lados.human.record_decision`
- `lados.human.review_checkpoint`

### `lados.video-production`

Used for:

- `lados.video.read_script`
- `lados.video.draft_scenes`
- `lados.video.generate_scene_batch`
- other existing production-orchestration nodes where appropriate.

QMCP must not duplicate these nodes.

---

# 6. Source Governance

## 6.1 Approved Source Providers

### Quran and Tafsir

Provider:

```text
QUL — Quranic Universal Library
https://qul.tarteel.ai/resources
```

QUL provides downloadable Quranic resources such as:

- Quran scripts;
- translations;
- tafsir;
- Quran metadata;
- Quran topics and concepts;
- ayah themes;
- grammar and morphology;
- similar ayah data.

QUL states that resources are intended to be downloaded and packaged with a project and that no API is available.

### Hadith Verification

Provider:

```text
Semak Hadis
https://semakhadis.com/
```

Semak Hadis is used as a Malay-language hadith checking and reference source.

The site states that it compiles hadith checks from trusted sources and provides references for records.

## 6.2 Source Authority Does Not Remove Human Responsibility

A source record may be technically retrieved correctly but still be used incorrectly in a modern reflection.

The system must distinguish:

```text
Source integrity:
Did the data come from the configured provider?

Reference validity:
Does the surah, ayah, translation, tafsir, or hadith record exist?

Contextual suitability:
Is the evidence suitable for this issue and message?

Publication approval:
Has an authorised human approved its use?
```

These are separate decisions.

## 6.3 Required Provenance

Every religious evidence item must include:

```json
{
  "provider": "QUL",
  "resourceType": "translation",
  "resourceName": "Exact dataset name",
  "resourceId": "Provider resource identifier",
  "language": "ms",
  "sourceUrl": "Original resource page",
  "retrievedAt": "ISO-8601 timestamp",
  "datasetVersion": "Version if available",
  "contentHash": "SHA-256 checksum if locally imported",
  "licenseReference": "Recorded terms or attribution reference"
}
```

For Semak Hadis:

```json
{
  "provider": "Semak Hadis",
  "sourceUrl": "Exact record URL",
  "retrievedAt": "ISO-8601 timestamp",
  "recordTitle": "Record title",
  "statusLabel": "Exact status from source",
  "references": [],
  "humanReviewStatus": "pending"
}
```

---

# 7. QUL Integration Architecture

## 7.1 Access Method

QUL is integrated through downloaded data.

Approved formats may include:

```text
SQLite
JSON
```

No runtime dependency should assume a public QUL API.

## 7.2 Dataset Storage

Recommended deployment arrangement:

```text
LADOS_RELIGIOUS_DATA_PATH=/mounted-data/religious-sources
```

Example:

```text
/mounted-data/religious-sources/
└── qul/
    ├── source-manifest.json
    ├── quran-script.sqlite
    ├── quran-metadata.sqlite
    ├── translation-ms.sqlite
    ├── translation-en.sqlite
    ├── tafsir-primary.sqlite
    ├── tafsir-supporting.sqlite
    ├── ayah-topics.sqlite
    └── ayah-theme.sqlite
```

The downloaded datasets should not automatically be committed into the public repository.

Recommended `.gitignore` entry:

```gitignore
data/religious-sources/**
!data/religious-sources/README.md
!data/religious-sources/example-source-manifest.json
```

## 7.3 Approved Dataset Register

Before production, the project must approve exact datasets.

```yaml
quranScript:
  provider: QUL
  resourceName: TO_BE_SELECTED
  language: ar
  status: pending_approval

primaryTranslation:
  provider: QUL
  resourceName: TO_BE_SELECTED
  language: ms
  status: pending_approval

secondaryTranslation:
  provider: QUL
  resourceName: TO_BE_SELECTED
  language: en
  status: optional

primaryTafsir:
  provider: QUL
  resourceName: TO_BE_SELECTED
  language: ms
  status: pending_approval

supportingTafsir:
  provider: QUL
  resourceName: TO_BE_SELECTED
  language: ar_or_en
  status: optional

ayahTopics:
  provider: QUL
  resourceName: Quran Topics and Concepts
  status: planned

ayahTheme:
  provider: QUL
  resourceName: Ayah Theme
  status: planned
```

The blueprint does not preselect a specific Malay translation or tafsir. Selection requires a separate source-approval decision.

## 7.4 QUL Import Pipeline

```text
Download approved resource
        ↓
Verify file type
        ↓
Calculate checksum
        ↓
Inspect schema
        ↓
Normalize identifiers
        ↓
Run Quran reference integrity checks
        ↓
Register source manifest
        ↓
Activate dataset
```

Validation must check:

- surah number range;
- ayah number range;
- duplicate records;
- missing records;
- encoding;
- Arabic text integrity;
- translation source metadata;
- tafsir ayah grouping;
- topic-to-ayah mapping;
- dataset checksum.

---

# 8. Semak Hadis Integration Architecture

## 8.1 MVP Mode

The blueprint does not assume an undocumented public API.

QMCP v1 uses a **human-assisted verification flow**:

```text
AI proposes optional hadith search terms
        ↓
Human searches SemakHadis.com
        ↓
Human supplies exact record URL or result
        ↓
Adapter records the source information
        ↓
Human confirms suitability
```

## 8.2 Future Modes

A future adapter may use:

- an official Semak Hadis API;
- an approved data export;
- a formal integration agreement;
- a KF Knowledge Pack derived from an approved source.

No scraper should be treated as the default production architecture without permission, legal review, rate limits, and a stable source contract.

## 8.3 Hadith Inclusion Policy

Hadith is optional in QMCP v1.

A hadith must not appear in the final script unless:

```text
source URL exists
AND source status is recorded
AND exact wording is checked
AND attribution is checked
AND human review is approved
```

The system must preserve exact source status labels and must not reduce complex findings into a misleading boolean.

---

# 9. Platform Services

## 9.1 Religious Source Module

Proposed API module:

```text
apps/api/src/religious-source/
├── religious-source.module.ts
├── religious-source.service.ts
├── types.ts
├── adapters/
│   ├── qul-quran.adapter.ts
│   ├── qul-tafsir.adapter.ts
│   └── semak-hadis.adapter.ts
├── repositories/
│   ├── quran.repository.ts
│   ├── tafsir.repository.ts
│   └── topic.repository.ts
└── validators/
    ├── source-integrity.validator.ts
    ├── quran-reference.validator.ts
    └── evidence-citation.validator.ts
```

## 9.2 Current Issue Research Module

Proposed API module:

```text
apps/api/src/current-issue-research/
├── current-issue-research.module.ts
├── current-issue-research.service.ts
├── types.ts
└── adapters/
    ├── rss-source.adapter.ts
    └── approved-news-source.adapter.ts
```

The service owns:

- outbound HTTP;
- source allowlists;
- rate limiting;
- timeout and retry;
- date normalization;
- provenance;
- duplicate detection;
- article retrieval policy;
- source failure handling.

Pack nodes must not make unmanaged direct HTTP calls.

## 9.3 Neutral AI Interface

```ts
export interface ITextGenerationService {
  readonly isConfigured: boolean;

  runCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<string>;
}
```

MVP implementation:

```text
ITextGenerationService
        ↓
Existing LADOS AiService
        ↓
Configured OpenAI provider
```

Future provider adapters may include Claude, Gemini, or local models without changing node contracts.

## 9.4 Religious Source Interface

```ts
export interface IQuranSourceService {
  searchAyahsByTheme(input: {
    themes: string[];
    query?: string;
    language?: string;
    limit?: number;
  }): Promise<QuranCandidate[]>;

  getAyah(input: {
    surah: number;
    ayah: number;
    translationId?: string;
  }): Promise<QuranEvidence>;

  getTafsir(input: {
    surah: number;
    ayah: number;
    tafsirIds: string[];
  }): Promise<TafsirEvidence[]>;

  verifyReference(input: {
    surah: number;
    ayahStart: number;
    ayahEnd?: number;
  }): Promise<QuranReferenceVerification>;
}

export interface IHadithVerificationService {
  createManualVerification(input: {
    sourceUrl: string;
    submittedBy: string;
  }): Promise<HadithVerificationRecord>;

  getVerification(recordId: string): Promise<HadithVerificationRecord>;
}
```

---

# 10. Proposed Pack Structure

```text
packs/
└── official/
    └── lados-quran-media/
        ├── manifest.json
        ├── nodes.json
        ├── package.json
        ├── tsconfig.json
        ├── README.md
        ├── src/
        │   ├── index.ts
        │   ├── types.ts
        │   ├── skills/
        │   │   ├── current-issue-editorial.skill.ts
        │   │   ├── human-impact-analysis.skill.ts
        │   │   ├── islamic-theme-mapping.skill.ts
        │   │   ├── quran-reference-safety.skill.ts
        │   │   ├── tafsir-context-safety.skill.ts
        │   │   ├── hadith-usage-safety.skill.ts
        │   │   ├── reflective-dakwah-writing.skill.ts
        │   │   ├── short-video-storytelling.skill.ts
        │   │   └── dakwah-content-safety.skill.ts
        │   ├── prompts/
        │   │   ├── shared-guardrails.ts
        │   │   ├── structured-output-schemas.ts
        │   │   └── output-parsers.ts
        │   ├── validators/
        │   │   ├── evidence-bundle.validator.ts
        │   │   ├── quran-citation.validator.ts
        │   │   ├── hadith-citation.validator.ts
        │   │   └── publication-gate.validator.ts
        │   └── nodes/
        │       ├── discover-current-issues.ts
        │       ├── rank-issue-candidates.ts
        │       ├── analyze-human-impact.ts
        │       ├── map-islamic-themes.ts
        │       ├── find-quran-candidates.ts
        │       ├── retrieve-quran-evidence.ts
        │       ├── retrieve-tafsir-context.ts
        │       ├── verify-hadith-reference.ts
        │       ├── build-evidence-bundle.ts
        │       ├── compose-reflection.ts
        │       ├── write-short-video-script.ts
        │       ├── validate-dakwah-content.ts
        │       └── prepare-media-brief.ts
        └── templates/
            ├── issue-to-dakwah-video.template.json
            ├── issue-to-dakwah-video.workflow.json
            └── README.md
```

---

# 11. Draft Official Manifest

```json
{
  "contractVersion": "lados.capability-pack.v1",
  "id": "lados.quran-media",
  "version": "0.1.0",
  "displayName": "Quran Media Creator",
  "layer": "L2",
  "status": "draft",
  "runtimeStatus": "stub_executors",
  "description": "Evidence-grounded AI-assisted workflow for transforming current issues into Quran-centred short-form dakwah media under mandatory human review.",
  "ownerBoundary": [
    "assess current issues for reflective dakwah content",
    "map human issues to Islamic themes",
    "retrieve Quran and tafsir evidence from approved QUL datasets",
    "record optional hadith verification from Semak Hadis",
    "build traceable religious evidence bundles",
    "draft reflective dakwah scripts",
    "validate scripts against evidence and safety rules",
    "prepare media production briefs"
  ],
  "mustNotOwn": [
    "fatwa or religious rulings",
    "scholarly certification",
    "Quran translation or tafsir authorship",
    "hadith grading",
    "final publication approval",
    "automatic social publishing",
    "generic video rendering",
    "Knowledge Factory storage"
  ],
  "dependencies": [
    "lados.workflow-foundation",
    "lados.human-work",
    "lados.video-production"
  ],
  "capabilities": [
    "quran_media.issue.discover",
    "quran_media.issue.rank",
    "quran_media.impact.analyze",
    "quran_media.theme.map",
    "quran_media.quran.find",
    "quran_media.quran.retrieve",
    "quran_media.tafsir.retrieve",
    "quran_media.hadith.verify",
    "quran_media.evidence.build",
    "quran_media.reflection.compose",
    "quran_media.script.write",
    "quran_media.content.validate",
    "quran_media.media.prepare"
  ],
  "nodes": [
    "lados.quran_media.discover_current_issues",
    "lados.quran_media.rank_issue_candidates",
    "lados.quran_media.analyze_human_impact",
    "lados.quran_media.map_islamic_themes",
    "lados.quran_media.find_quran_candidates",
    "lados.quran_media.retrieve_quran_evidence",
    "lados.quran_media.retrieve_tafsir_context",
    "lados.quran_media.verify_hadith_reference",
    "lados.quran_media.build_evidence_bundle",
    "lados.quran_media.compose_reflection",
    "lados.quran_media.write_short_video_script",
    "lados.quran_media.validate_dakwah_content",
    "lados.quran_media.prepare_media_brief"
  ],
  "workflowTemplates": [
    "templates/issue-to-dakwah-video.template.json"
  ],
  "knowledgePacks": {
    "required": [],
    "recommended": []
  },
  "guardrails": [
    "Arabic Quran text must come from the configured QUL dataset.",
    "AI must not invent a Quran reference, translation, tafsir quotation, hadith, source, or news fact.",
    "AI thematic matching is advisory and must be verified by a human.",
    "No hadith may appear in a final script while verification is pending.",
    "AI must not claim that a modern event is the direct reason for revelation of an ayah.",
    "AI must not claim that a disaster or tragedy is divine punishment.",
    "Religious review and editorial publication approval are mandatory and separate.",
    "The pack must not publish automatically in v1."
  ],
  "prototypeReferences": [],
  "verification": {
    "manifest": "planned",
    "runtime": "not started",
    "canvas": "not started",
    "templates": "planned"
  },
  "visual": {
    "category": "Quran Media",
    "icon": "BookOpen",
    "color": "#0f766e",
    "paletteGroup": "Content Production"
  }
}
```

---

# 12. Node Catalogue

| Node type | Purpose | AI boundary |
|---|---|---|
| `lados.quran_media.discover_current_issues` | Retrieve and normalize approved current issues | None or advisory |
| `lados.quran_media.rank_issue_candidates` | Rank issues for dakwah suitability | Advisory |
| `lados.quran_media.analyze_human_impact` | Separate facts, human impact, uncertainty, and sensitivity | Advisory |
| `lados.quran_media.map_islamic_themes` | Map the issue to Islamic themes | Advisory |
| `lados.quran_media.find_quran_candidates` | Search QUL topics and themes for candidate references | Advisory plus deterministic retrieval |
| `lados.quran_media.retrieve_quran_evidence` | Retrieve Arabic text, translation, and provenance | None |
| `lados.quran_media.retrieve_tafsir_context` | Retrieve configured tafsir context | None |
| `lados.quran_media.verify_hadith_reference` | Record Semak Hadis verification evidence | None |
| `lados.quran_media.build_evidence_bundle` | Assemble a validated evidence contract | None |
| `lados.quran_media.compose_reflection` | Create an evidence-grounded reflection | Requires human review |
| `lados.quran_media.write_short_video_script` | Produce a short-video script | Requires human review |
| `lados.quran_media.validate_dakwah_content` | Detect evidence, religious, editorial, and safety risks | Advisory |
| `lados.quran_media.prepare_media_brief` | Prepare production handoff | Requires human review |

## 12.1 Common Output Rules

Every AI-generated output must include:

```json
{
  "advisory": true,
  "requiresHumanReview": true,
  "evidenceRefs": [],
  "warnings": []
}
```

Every source-grounded node must return exact provenance.

## 12.2 Short Video Script Contract

```json
{
  "title": "",
  "durationSeconds": 45,
  "hook": "",
  "scenes": [
    {
      "sceneNumber": 1,
      "startSecond": 0,
      "endSecond": 5,
      "visualIntent": "",
      "voiceover": "",
      "onScreenText": "",
      "emotion": "",
      "evidenceRefs": []
    }
  ],
  "caption": "",
  "callToAction": "",
  "sourceAppendix": []
}
```

## 12.3 Validation Output Contract

```json
{
  "passed": false,
  "riskLevel": "high",
  "issues": [],
  "requiredHumanActions": [],
  "publicationBlocked": true
}
```

Passing validation does not constitute religious approval.

---

# 13. Internal Skill Modules

## 13.1 Quran Reference Safety Skill

```text
Never create a Quran reference from model memory.
Use only references returned by the configured Quran source.
Never force an ayah to fit an event.
Never claim that an ayah was revealed for a modern event.
Never present contemporary reflection as tafsir.
Never alter Arabic Quran text.
Always require human religious review.
```

## 13.2 Tafsir Context Safety Skill

```text
Keep retrieved tafsir separate from AI summary.
Identify the exact tafsir source.
Do not combine different tafsir views into a false consensus.
Do not infer legal rulings.
When uncertainty exists, state it.
```

## 13.3 Hadith Usage Safety Skill

```text
Hadith is optional.
Do not generate hadith wording from memory.
Do not invent a narrator or collection reference.
Preserve the exact verification status.
Do not include a pending, weak, fabricated, or disputed narration
without explicit editorial context and human approval.
```

## 13.4 Reflective Dakwah Writing Skill

Preferred language:

```text
“Marilah kita renungkan...”
“Mungkin ayat ini mengingatkan kita...”
“Kadang-kadang kita terlupa...”
“Semoga kita mampu...”
```

Avoid:

```text
“Kamu pasti berdosa...”
“Mereka dihukum kerana...”
“Peristiwa ini membuktikan Allah menghukum...”
“Semua orang wajib bersetuju dengan tafsiran ini...”
```

## 13.5 Tragedy Sensitivity Skill

```text
Do not use suffering as engagement bait.
Do not use graphic imagery.
Do not identify vulnerable individuals unnecessarily.
Do not fabricate personal stories.
Do not imply victims are morally responsible for their suffering.
Prefer dignity, compassion, context, and practical good action.
```

---

# 14. End-to-End Workflow

```text
lados.workflow.trigger_manual
or
lados.workflow.trigger_schedule
              │
              ▼
Discover Current Issues
              │
              ▼
Rank Issue Candidates
              │
              ▼
lados.human.request_input
Select one issue
              │
              ▼
Analyze Human Impact
              │
              ▼
Map Islamic Themes
              │
              ▼
Find Quran Candidates
              │
              ▼
Retrieve Quran Evidence
              │
              ▼
Retrieve Tafsir Context
              │
              ├──────── Optional ────────┐
              │                           ▼
              │                 Verify Hadith Reference
              │                           │
              └──────────────┬────────────┘
                             ▼
                  Build Evidence Bundle
                             │
                             ▼
                  lados.human.request_input
             Religious reviewer confirms evidence
                             │
                             ▼
                    Compose Reflection
                             │
                             ▼
                 Write Short Video Script
                             │
                             ▼
                 Validate Dakwah Content
                             │
                             ▼
                  lados.workflow.condition
                 publicationBlocked == false?
                    │                 │
                  true              false
                    │                 │
                    ▼                 ▼
       lados.human.request_approval   Revision path
          Final editorial approval         │
                    │                      │
                    └────────────── loop ──┘
                             │
                             ▼
                    Prepare Media Brief
                             │
                             ▼
                   lados.video.read_script
                             │
                             ▼
                  lados.video.draft_scenes
                             │
                             ▼
             lados.video.generate_scene_batch
                             │
                             ▼
                Production Package Complete
```

## 14.1 Mandatory Human Gates

### Gate 1 — Issue Selection

Human confirms source quality, suitability, and non-exploitative framing.

### Gate 2 — Religious Evidence Review

Human confirms Quran reference, Arabic text, translation, tafsir context, optional hadith status, and contextual suitability.

### Gate 3 — Editorial Publication Approval

Human confirms script tone, visual sensitivity, wording, evidence appendix, and production suitability.

---

# 15. Religious Evidence Bundle Contract

```json
{
  "bundleVersion": "1.0",
  "issue": {
    "issueId": "",
    "headline": "",
    "summary": "",
    "sources": [],
    "facts": [],
    "uncertainties": []
  },
  "themes": [],
  "quranEvidence": [
    {
      "evidenceId": "quran-001",
      "reference": {
        "surah": 90,
        "ayahStart": 11,
        "ayahEnd": 16
      },
      "arabicText": "",
      "translation": {
        "text": "",
        "sourceName": "",
        "sourceId": ""
      },
      "tafsir": [
        {
          "sourceName": "",
          "sourceId": "",
          "language": "",
          "retrievedText": "",
          "summary": "",
          "summaryGeneratedByAI": true
        }
      ],
      "provenance": {
        "provider": "QUL",
        "datasetHash": "",
        "retrievedAt": ""
      },
      "humanReviewStatus": "pending"
    }
  ],
  "hadithEvidence": [],
  "warnings": [],
  "religiousReview": {
    "status": "pending",
    "reviewedBy": null,
    "reviewedAt": null,
    "notes": ""
  },
  "publicationReady": false
}
```

---

# 16. Error and Failure Policy

Recommended error codes:

```text
RESEARCH_SERVICE_NOT_CONFIGURED
NO_CURRENT_ISSUES_FOUND
SOURCE_FETCH_FAILED
SOURCE_DATE_INVALID
AI_SERVICE_NOT_CONFIGURED
INVALID_AI_RESPONSE
RELIGIOUS_DATA_PATH_NOT_CONFIGURED
QUL_DATASET_NOT_FOUND
QUL_DATASET_INTEGRITY_FAILED
INVALID_QURAN_REFERENCE
TRANSLATION_NOT_CONFIGURED
TAFSIR_NOT_CONFIGURED
HADITH_SOURCE_URL_REQUIRED
HADITH_VERIFICATION_PENDING
EVIDENCE_BUNDLE_INVALID
RELIGIOUS_REVIEW_REQUIRED
EDITORIAL_APPROVAL_REQUIRED
PUBLICATION_BLOCKED
```

A node must not fabricate a successful result when a source or service is unavailable.

---

# 17. Runtime Integration

## 17.1 Pack Resolver

```ts
export interface QuranMediaServices {
  aiService?: ITextGenerationService;
  currentIssueResearchService?: ICurrentIssueResearchService;
  quranSourceService?: IQuranSourceService;
  hadithVerificationService?: IHadithVerificationService;
}

export function resolveNode(
  services: QuranMediaServices = {},
): (nodeType: string) => NodeExecutor | null {
  const table: Record<string, NodeExecutor> = {
    "lados.quran_media.discover_current_issues": (ctx) =>
      discoverCurrentIssues(ctx, services.currentIssueResearchService),

    "lados.quran_media.rank_issue_candidates": (ctx) =>
      rankIssueCandidates(ctx, services.aiService),

    "lados.quran_media.analyze_human_impact": (ctx) =>
      analyzeHumanImpact(ctx, services.aiService),

    "lados.quran_media.map_islamic_themes": (ctx) =>
      mapIslamicThemes(ctx, services.aiService),

    "lados.quran_media.find_quran_candidates": (ctx) =>
      findQuranCandidates(ctx, services.quranSourceService, services.aiService),

    "lados.quran_media.retrieve_quran_evidence": (ctx) =>
      retrieveQuranEvidence(ctx, services.quranSourceService),

    "lados.quran_media.retrieve_tafsir_context": (ctx) =>
      retrieveTafsirContext(ctx, services.quranSourceService),

    "lados.quran_media.verify_hadith_reference": (ctx) =>
      verifyHadithReference(ctx, services.hadithVerificationService),

    "lados.quran_media.build_evidence_bundle": (ctx) =>
      buildEvidenceBundle(ctx),

    "lados.quran_media.compose_reflection": (ctx) =>
      composeReflection(ctx, services.aiService),

    "lados.quran_media.write_short_video_script": (ctx) =>
      writeShortVideoScript(ctx, services.aiService),

    "lados.quran_media.validate_dakwah_content": (ctx) =>
      validateDakwahContent(ctx, services.aiService),

    "lados.quran_media.prepare_media_brief": (ctx) =>
      prepareMediaBrief(ctx, services.aiService)
  };

  return (nodeType) => table[nodeType] ?? null;
}
```

## 17.2 Repository Changes

```text
1. packs/official/lados-quran-media/
2. apps/api/package.json
3. apps/api/src/execution/real-nodes/index.ts
4. apps/api/src/current-issue-research/
5. apps/api/src/religious-source/
6. Execution module/service dependency injection
7. apps/api/test/official-quran-media.spec.ts
8. apps/api/test/official-quran-media-e2e.spec.ts
9. Documentation and source setup guide
```

---

# 18. Configuration

```dotenv
LADOS_RELIGIOUS_DATA_PATH=
LADOS_QUL_SOURCE_MANIFEST=
LADOS_QUL_QURAN_DATASET=
LADOS_QUL_TRANSLATION_DATASET=
LADOS_QUL_TAFSIR_DATASET=
LADOS_QUL_TOPIC_DATASET=
LADOS_QUL_THEME_DATASET=

QMCP_DEFAULT_LANGUAGE=ms
QMCP_DEFAULT_DURATION_SECONDS=45
QMCP_MAX_ISSUE_CANDIDATES=10
QMCP_REQUIRE_RELIGIOUS_REVIEW=true
QMCP_REQUIRE_EDITORIAL_APPROVAL=true
QMCP_ALLOW_HADITH=false
QMCP_ALLOW_AUTOPUBLISH=false
```

`QMCP_ALLOW_AUTOPUBLISH` must remain `false` in v1.

---

# 19. Security and Ethical Guardrails

1. Quran Arabic must come from the configured dataset.
2. Quran references must pass structural validation.
3. Every translation must identify its exact source.
4. Every tafsir record must identify its exact source.
5. AI summaries must be labelled as summaries.
6. AI must not invent hadith text, narrator, source, or grading.
7. No hadith may be used while verification is pending.
8. No content may claim that a tragedy is divine punishment.
9. No content may claim that a modern event is the direct cause of revelation.
10. No content may dehumanise a group.
11. No content may incite violence, hatred, or sectarian hostility.
12. No content may exploit children, victims, or graphic suffering for engagement.
13. AI must not perform the human approval step.
14. Religious review and editorial review must be separately recorded.
15. Publication is blocked when evidence is incomplete.

---

# 20. Video Production Boundary

The existing `lados.video-production` pack is responsible for production orchestration.

QMCP hands over:

```text
Approved script
Scene intent
Visual restrictions
Voice direction
Subtitle package
Evidence appendix
```

QMCP does not claim to:

- execute Remotion;
- produce an MP4;
- edit a final video;
- mix audio;
- publish to TikTok, YouTube, or Instagram.

---

# 21. Testing Strategy

## 21.1 Unit Tests

Create node tests for:

- missing services;
- malformed AI JSON;
- invalid Quran reference;
- missing translation;
- unavailable tafsir;
- unverified hadith;
- evidence-bundle validation;
- prohibited language detection;
- publication gate;
- deterministic output shape.

## 21.2 API Integration Tests

Create:

```text
apps/api/test/official-quran-media.spec.ts
apps/api/test/official-quran-media-e2e.spec.ts
```

Test:

- official pack discovery;
- manifest and nodes validation;
- node resolver registration;
- service injection;
- workflow execution;
- pause and resume for human input;
- pause and resume for approval;
- refusal to continue without religious review;
- output handoff to Video Production.

## 21.3 Source Fixtures

Use small legal test fixtures, not full production datasets:

```text
test/fixtures/qul/
├── quran-sample.json
├── translation-sample.json
├── tafsir-sample.json
├── topics-sample.json
└── source-manifest.json
```

---

# 22. Acceptance Criteria

- [ ] Official manifest passes `validate:official-packs`.
- [ ] Every manifest node has a matching `nodes.json` entry.
- [ ] Every implemented node resolves through `src/index.ts`.
- [ ] API resolver imports and injects the pack.
- [ ] QUL source manifest and checksum validation work.
- [ ] Quran reference retrieval is deterministic.
- [ ] Arabic text is never generated by AI.
- [ ] Translation source appears in every output.
- [ ] Tafsir source appears in every output.
- [ ] Unverified hadith blocks publication.
- [ ] Evidence bundle schema is enforced.
- [ ] Human religious review pauses and resumes correctly.
- [ ] Editorial approval pauses and resumes correctly.
- [ ] Validation failures route to revision.
- [ ] Final output is accepted by the Video Production workflow.
- [ ] No automatic publishing exists.
- [ ] Unit and E2E tests pass.
- [ ] README documents source setup and limitations.

---

# 23. Delivery Phases

## Phase A — Pack Skeleton

Deliver manifest, nodes catalogue, package files, README, template descriptor, and official validation.

## Phase B — Deterministic Evidence Nodes

Implement Quran retrieval, tafsir retrieval, reference validation, source validation, and evidence-bundle construction.

## Phase C — AI Editorial Nodes

Implement issue ranking, human-impact analysis, theme mapping, reflection, script, content validation, and media brief.

## Phase D — Research Integration

Implement Current Issue Research Service, approved source adapters, provenance, duplicate detection, and date filtering.

## Phase E — Workflow and Human Gates

Implement importable workflow JSON, issue selection, religious review, editorial approval, revision branch, and Video Production handoff.

## Phase F — Production Readiness

Complete security review, source licensing records, update procedures, observability, tests, documentation, and reviewer operating guide.

---

# 24. Future KF Migration

When Knowledge Factory is ready:

```text
IQuranSourceService
        ↓
KF Quran Knowledge Pack Adapter

ITafsirSourceService
        ↓
KF Tafsir Knowledge Pack Adapter

IHadithVerificationService
        ↓
KF Hadith Verification Knowledge Pack Adapter
```

The node types, ports, evidence-bundle schema, workflow template, human-review gates, and media-brief output must remain unchanged.

---

# 25. Architecture Freeze

| Area | Frozen decision |
|---|---|
| Pack form | Official LADOS Capability Pack |
| Pack ID | `lados.quran-media` |
| Node namespace | `lados.quran_media.*` |
| Layer | L2 |
| Runtime unit | Node executor |
| Skill implementation | Internal prompt and guardrail modules |
| KF dependency | None |
| PKA dependency | None |
| Quran source | Approved QUL downloaded dataset |
| Tafsir source | Approved QUL downloaded dataset |
| Hadith source | SemakHadis.com |
| QUL integration | Local governed adapter, not API |
| Semak Hadis MVP | Human-assisted verification |
| Arabic Quran text | Never generated by AI |
| Quran matching | Theme search plus source retrieval |
| Religious review | Mandatory |
| Editorial approval | Mandatory |
| Video capability | Reuse `lados.video-production` |
| Automatic MP4 | Out of scope until render backend exists |
| Automatic publishing | Prohibited in v1 |
| Persistence | Stateless pack outputs plus workflow state for MVP |
| Future KF migration | Adapter replacement without workflow redesign |

---

# 26. Source References

## LADOS

- Public repository: https://github.com/EffortEdutech/Lados
- Official pack contract: `packages/@lados/pack-sdk/src/types.ts`
- Node runtime: `packages/@lados/node-sdk/src/types.ts`
- Node manifest: `packages/@lados/core/src/manifest.ts`
- Official loader: `apps/api/src/pack/official-pack-loader.ts`
- Official loader service: `apps/api/src/pack/official-pack-loader.service.ts`
- Real node resolver: `apps/api/src/execution/real-nodes/index.ts`
- AI service: `apps/api/src/ai/ai.service.ts`
- Human Work pack: `packs/official/lados-human-work/`
- Workflow Foundation pack: `packs/official/lados-workflow-foundation/`
- Video Production pack: `packs/official/lados-video-production/`

## Quran and Tafsir

- QUL Resources: https://qul.tarteel.ai/resources

## Hadith

- Semak Hadis: https://semakhadis.com/
- Semak Hadis information: https://semakhadis.com/info
- Semak Hadis technology: https://semakhadis.com/teknologi

---

# 27. Next Implementation Document

The next repository-grounded document should be:

> **QMCP Volume 2 — Node Contracts, Schemas, Prompts, Executors and Test Specification**

Volume 2 should define, for every node:

- node identity;
- ports;
- config groups;
- structured schemas;
- service dependencies;
- prompt contract;
- executor algorithm;
- error codes;
- guardrails;
- sample input and output;
- unit tests;
- E2E acceptance tests.

---

**End of Blueprint**

**LADOS Official Capability Pack — Quran Media Creator Pack (QMCP) v1.0**
