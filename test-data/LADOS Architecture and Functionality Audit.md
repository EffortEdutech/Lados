# LADOS Architecture and Functionality Audit Report

**Project:** LADOS — Low-code Application Development & Orchestration System
**Repository:** `EffortEdutech/Lados`
**Audit commit:** `91a7ce4d7e677813950004e66f3cfa4ce812abc5`
**Audit date:** 22 July 2026
**Report status:** Repository-grounded static architecture audit
**Prepared from:** The complete LADOS-versus-n8n discussion and the public LADOS repository

---

## Document Purpose

This report consolidates the complete discussion beginning with:

> Why, when I look at n8n, do I feel like LADOS duplicates n8n?

It follows the discussion through the subsequent questions about:

* whether n8n is open source;
* whether LADOS can read email and automate external applications;
* whether LADOS needs n8n or another integration engine;
* which genuinely open-source integration platforms are available;
* whether L0–L4 packs are functional;
* whether LADOS has an execution engine;
* whether Professional Knowledge Assets have a runtime;
* and what the public LADOS repository actually implements.

The report has four purposes:

1. Correct conclusions previously made without sufficient repository evidence.
2. Establish which LADOS components execute today.
3. Identify which components remain partial, stubbed, manifest-only, or unimplemented.
4. Define the practical development roadmap from the current platform to a production-ready professional application and knowledge runtime.

This is a **static source-code and architecture audit**. It is not a claim that every migration, test suite, browser flow, infrastructure configuration, provider connection, or official node was executed during this review.

---

# 1. Executive Verdict

## 1.1 Primary conclusion

LADOS is **not merely a display-only node canvas**.

LADOS is also **not simply an n8n clone**.

The repository contains a genuine workflow platform foundation, including:

* a graph planner;
* cycle detection;
* topological execution planning;
* parallel execution levels;
* concurrency controls;
* node input and output propagation;
* typed node runtime contracts;
* real executor resolution;
* workflow pause and resume;
* human approval checkpoints;
* asynchronous queue support;
* execution persistence;
* progress events;
* pack contracts;
* official-pack loading;
* resource, state, event, security, artifact, document, AI, notification, approval, and Knowledge Pack services;
* real L0, L1, and L2 node executors.

The execution engine is real. It is not merely a canvas simulation. The runner resolves real node executors, executes dependency levels, supports parallel work, propagates port-aware inputs, handles failures, and can pause and resume workflows.

However, LADOS is **not yet a complete integration automation platform comparable to n8n in connector breadth**.

Its largest missing layer is L4 vendor and integration packs for services such as:

* Gmail inbox access;
* Outlook and Microsoft Graph;
* Google Calendar;
* Microsoft Calendar;
* Google Sheets;
* Excel Online;
* Google Drive;
* OneDrive;
* SharePoint;
* WhatsApp;
* Slack;
* Microsoft Teams;
* accounting systems;
* CRM systems;
* ERP systems;
* supplier platforms.

LADOS also does not yet demonstrate a first-class **PKA Runtime** that loads a Professional Knowledge Asset as one governed executable unit containing its:

* professional instructions;
* ontology;
* policies;
* prompts;
* retrieval sources;
* workflows;
* tools;
* templates;
* tests;
* versions;
* provenance rules;
* human-review boundaries.

The accurate current conclusion is:

> **LADOS already has an executable workflow and node runtime, together with substantial L0–L2 capability implementation. L3 and L5 are mainly manifest/template assets, L4 provider integrations are not implemented as official packs, and a cohesive PKA runtime remains future work.**

---

## 1.2 Direct answers to the discussion questions

| Question                                            | Audited answer                                                                                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is LADOS duplicating n8n?                           | No. They share a visual node-canvas pattern, but LADOS is designed around professional capabilities, persistent resources, human decisions, evidence, applications, and governed knowledge. |
| Can LADOS automate email and external applications? | The architecture can support this. Outbound SMTP email exists, but Gmail/Outlook inbox reading, OAuth, provider triggers, and broad productivity-suite connectors are not yet implemented.  |
| Does LADOS have an execution engine?                | Yes. A graph planner, workflow runner, real node resolver, queue integration, logs, checkpoints, and pause/resume behavior exist.                                                           |
| Are L0–L4 packs only displayed in the UI?           | No. L0 and much of L1/L2 are executable. L3 is mostly manifest/template based. L4 is a planned connector layer with no official provider packs found at the audited commit.                 |
| Are all LADOS nodes functional?                     | No. Most inspected L0–L2 nodes are marked implemented, but several are explicit stubs and some degrade when required infrastructure is not configured.                                      |
| Does LADOS have a PKA engine?                       | No complete first-class PKA runtime was evidenced. A real Knowledge Pack subsystem exists, but it is not yet the full PKA model.                                                            |
| Should LADOS use n8n as its main engine?            | No. LADOS should retain its own engine. External platforms may be optional connector bridges behind LADOS-owned contracts.                                                                  |

---

# 2. Discussion History and Correction Register

The discussion passed through several provisional conclusions. Some were directionally correct, while others require correction after reviewing the repository.

## 2.1 Initial observation: LADOS looks like n8n

This observation was reasonable.

Both platforms use:

* nodes;
* connections;
* a workflow canvas;
* triggers;
* configuration panels;
* execution flows.

The visual similarity alone does not make LADOS a duplicate.

Node graphs are a general interaction model also used by:

* Node-RED;
* ComfyUI;
* Apache NiFi;
* Unreal Engine Blueprints;
* data pipeline systems;
* AI agent builders.

The real distinction must be found in what the platform executes and governs.

## 2.2 Early strategic distinction

The early discussion positioned:

* n8n as an integration automation platform;
* LADOS as a professional knowledge and business-capability platform.

This remains directionally correct, but it was described too much as an existing completed distinction.

The repository shows that LADOS has already implemented parts of that distinction through:

* persistent Workspace Resources;
* resource state;
* artifacts;
* event and state engines;
* human approvals;
* professional guardrails;
* Capability Pack ownership boundaries;
* Knowledge Pack provenance;
* QS, construction, contract, procurement, finance, payroll, and fleet capabilities.

However, the full distinction will only become obvious to users when LADOS also has:

* working provider connectors;
* complete solution workflows;
* role-based applications;
* production-grade PKA integration.

Until then, many users will naturally compare the canvas to n8n.

## 2.3 Earlier suggestion: use n8n internally as the integration engine

This was presented too strongly.

The audit confirms that LADOS already owns a meaningful execution engine. Replacing or subordinating it to n8n would weaken LADOS ownership of:

* execution semantics;
* resource behavior;
* professional approval boundaries;
* program execution;
* provenance;
* pack compatibility;
* future PKA context.

The corrected architecture is:

```text
LADOS Workflow and Professional Runtime
        |
        +-- Native LADOS Connector Packs
        |
        +-- Optional Connector Bridges
              |
              +-- n8n
              +-- Node-RED
              +-- Activepieces
              +-- Enterprise integration services
```

An external platform may provide connectivity when useful, but the LADOS workflow and capability contract must remain authoritative.

## 2.4 Earlier conclusion: L1–L4 could be display packs

This conclusion was too pessimistic.

The API directly imports official LADOS pack packages, and `buildRealNodeResolver()` maps many official node types to real executor implementations.

The accurate position is:

* L0 is substantially executable.
* L1 is substantially executable but contains document and communication gaps.
* L2 is substantially executable but contains professional-depth and provider limitations.
* L3 is currently manifest/template focused.
* L4 has not been implemented as an official provider-pack layer.
* L5 is manifest/template focused.

## 2.5 Earlier conclusion: LADOS did not have an engine

This was incorrect.

The repository includes:

* `graph-planner.ts`;
* `runner.ts`;
* real and mock node registries;
* an asynchronous execution service;
* BullMQ integration;
* crash recovery;
* event-bus workflow triggering;
* checkpoint resume;
* real node progress events;
* execution persistence.

The missing engine is not the basic workflow engine.

The missing components are more specific:

1. connector/provider runtime;
2. PKA runtime;
3. production-strict executor enforcement;
4. complete solution/template activation;
5. full provider and graph-level verification.

## 2.6 Earlier score of 78/100

The earlier single score was too broad and insufficiently grounded.

It mixed:

* architectural quality;
* runtime implementation;
* pack implementation;
* provider integration;
* product readiness;
* knowledge runtime maturity.

This report replaces the single number with a layered scorecard.

---

# 3. LADOS Versus n8n

## 3.1 n8n licence position

n8n is publicly accessible and self-hostable, but its main codebase is distributed under the **Sustainable Use License**, with separate enterprise-licensed sections.

The Sustainable Use License permits internal business, personal, and non-commercial use while restricting certain redistribution and commercial platform use. n8n describes its model as **fair-code** and **source available** rather than conventional unrestricted open source.

Therefore:

> n8n should not be treated as equivalent to an MIT- or Apache-licensed integration library when considering embedding or redistribution inside LADOS.

Any commercial embedding decision requires proper licence review.

## 3.2 Strategic comparison

| Dimension              | n8n                                          | LADOS target                                                                |
| ---------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Main purpose           | Integration and workflow automation          | Low-code professional applications and orchestration                        |
| Main unit              | Provider/action node                         | Governed capability node operating on business resources                    |
| Main ecosystem         | Integrations                                 | Capability, solution, template, integration, and knowledge packs            |
| Data model             | Workflow payloads and execution data         | Workflows, persistent resources, artifacts, state, evidence, and provenance |
| Human work             | Workflow approvals and input                 | Explicit auditable human-decision boundaries                                |
| Professional domains   | Usually implemented by workflow authors      | Intended to be packaged as reusable governed capabilities                   |
| Knowledge              | Prompt, database, or user-designed retrieval | Knowledge Packs and future PKAs                                             |
| Application model      | Automation platform                          | Workflows, dashboards, resources, programs, APIs, and professional apps     |
| Governance             | General automation governance                | Professional guardrails and evidence requirements                           |
| Future KF relationship | Not central                                  | Knowledge Factory can become a governed PKA provider                        |

## 3.3 Competitive reality

The strategic differentiation is valid, but current executable breadth still matters.

At the audited stage:

* n8n has a much broader connector catalogue;
* LADOS has a stronger emerging professional resource and pack model;
* LADOS lacks the provider breadth necessary for common SaaS automation;
* L3 and L5 packs are not yet complete applications;
* PKA execution is not first-class.

Therefore:

> LADOS is not architecturally an n8n duplicate, but it must complete its connectors, solutions, and professional knowledge runtime to make the distinction visible in actual use.

---

# 4. Repository Architecture

## 4.1 Monorepo structure

The repository is a pnpm monorepo covering:

```text
apps/*
packages/*
packages/@lados/*
packs/*
packs/official/*
```

The API has workspace dependencies on the execution engine, node SDK, pack SDK, shared types, workflow JSON, and official LADOS packs.

This confirms that the official pack system is integrated into the application build.

## 4.2 Applications

The repository includes:

* a Next.js web application;
* a NestJS API;
* Supabase persistence;
* React Flow workflow UI;
* BullMQ queue support;
* AI, document, notification, approval, resource, artifact, event, state, security, and pack modules.

## 4.3 Documentation drift

The root README still presents the project as the older:

* QS-WFUI;
* Quantity Surveying Workflow UI;
* QS-OS Version 2;
* early sprint implementation.

The current code has advanced substantially beyond that description.

Some source comments also retain obsolete statements. For example, the official pack loader comments describe official skeleton nodes as non-executable, while current manifests and the real-node resolver show that many official nodes now have real executors.

Documentation drift creates several risks:

1. developers misunderstand the architecture;
2. AI coding agents follow outdated guidance;
3. users underestimate the implementation;
4. duplicate implementations may be introduced;
5. public product positioning remains unclear.

### Recommendation

Documentation synchronization should become a release requirement.

---

# 5. Node and Pack Contracts

## 5.1 Node SDK

The node SDK defines a genuine executable contract.

A `NodeContext` can contain:

* node ID;
* node type;
* execution ID;
* workflow ID;
* project ID;
* organization ID;
* user ID;
* configuration;
* resolved inputs;
* upstream outputs;
* workflow variables;
* logger;
* injected services;
* program run and stage context.

A node executor returns a structured result that can represent:

* success;
* failure;
* pause;
* pending approval;
* skip;
* outputs;
* logs;
* structured errors;
* pause metadata.

The executable contract is:

```ts
(ctx: NodeContext) => Promise<NodeExecuteResult>
```

This is a sound atomic capability model.

## 5.2 Node manifest

The manifest model supports:

* typed input and output ports;
* configuration fields;
* UI grouping;
* resource requirements;
* events;
* data schemas;
* visual metadata.

This is materially stronger than a node containing only a label and arbitrary parameters.

## 5.3 Pack contract

The pack contract supports:

* layers L0 through L5;
* dependencies;
* permissions;
* ownership boundaries;
* prohibited ownership;
* capability declarations;
* nodes;
* workflow templates;
* Knowledge Pack requirements;
* professional guardrails;
* runtime status;
* executor status;
* verification status;
* state machines;
* resource views.

The architecture is explicitly trying to prevent node duplication by assigning each canonical capability to one owning pack.

---

# 6. Workflow Engine Audit

## 6.1 Graph planner

The graph planner performs:

* topological sorting;
* cycle detection;
* dependency analysis;
* execution-level construction;
* parallel grouping;
* port-aware input binding.

This is a real workflow execution plan rather than UI-only graph storage.

## 6.2 Workflow runner

The runner provides:

* dependency-level execution;
* parallel node execution;
* optional concurrency limiting;
* input resolution;
* output propagation;
* workflow variables;
* node logging;
* progress callbacks;
* node skipping;
* muted and bypassed behavior;
* workflow pause;
* checkpoint resume;
* error handling;
* abort signals.

The runner can execute real nodes when the resolver finds an implementation.

## 6.3 Execution service

The NestJS execution service adds:

* asynchronous BullMQ execution;
* inline execution fallback if Redis is unavailable;
* persisted run records;
* stale-run crash recovery;
* event-trigger callbacks;
* real-node resolver injection;
* SSE-style progress events;
* program context;
* idempotency handling.

The code explicitly avoids leaving a run stranded when a queue operation fails by falling back to inline execution.

## 6.4 Human pause and resume

The node result contract and runner support paused and pending-approval states.

The Phase 21 checklist also documents debugging of an approval workflow and API response-shape issue, indicating that the approval path has received real live testing rather than existing only in design documents.

## 6.5 Verdict

> **The LADOS workflow execution engine exists and is one of the stronger parts of the repository.**

It should not be replaced by n8n.

---

# 7. Critical Runtime Risk: Mock Fallback

## 7.1 Current behavior

The runner first attempts to locate a real executor.

When none is returned, it falls back to the mock registry.

The mock registry also contains a generic unknown-node fallback that can return a successful result containing the node type.

## 7.2 Why this is dangerous

A missing production executor may:

* appear successful;
* allow downstream nodes to continue;
* make an incomplete workflow seem operational;
* hide a missing connector;
* hide a pack installation problem;
* generate misleading audit logs;
* create serious risk in commercial or professional workflows.

This is useful for prototype development but unsafe as a production default.

## 7.3 Required runtime modes

LADOS should introduce explicit modes:

```text
development-simulation
test
production-strict
```

| Mode                   | Missing executor behavior                                       |
| ---------------------- | --------------------------------------------------------------- |
| Development simulation | Run a clearly marked mock and watermark the result as simulated |
| Test                   | Run only mocks explicitly registered by the test                |
| Production strict      | Fail with `EXECUTOR_NOT_FOUND`                                  |

Every node-run record should state whether it executed as:

* real;
* degraded;
* stub;
* mock;
* simulated.

No professional workflow should silently complete using a mock.

---

# 8. Pack Layer Model

The current target catalogue defines six layers:

| Layer | Name                         | Purpose                                                   |
| ----- | ---------------------------- | --------------------------------------------------------- |
| L0    | Platform Foundation          | Workflow primitives, resources, artifacts, human work     |
| L1    | Core Business Domains        | Documents, communication, tasks, finance, procurement     |
| L2    | Professional Domains         | QS, contract administration, construction, fleet, payroll |
| L3    | Solution Packs               | End-to-end operating solutions                            |
| L4    | Vendor and Integration Packs | Provider-specific connectors                              |
| L5    | Template Packs               | Reusable workflow playbooks                               |

The correct dependency direction is:

```text
L5 -> lower-layer capabilities
L4 -> platform and provider contracts
L3 -> L2, L1, and L0
L2 -> L1 and L0
L1 -> L0
L0 -> platform runtime
```

---

# 9. Audited Node Totals

Based on the official manifests inspected:

| Layer group     | Declared nodes | Marked implemented | Explicit stubs |
| --------------- | -------------: | -----------------: | -------------: |
| L0              |             26 |                 26 |              0 |
| L1              |             28 |                 25 |              3 |
| L2              |             36 |                 35 |              1 |
| **Total L0–L2** |         **90** |             **86** |          **4** |

The four explicit stubs are:

1. Document Intelligence — Read PDF.
2. Document Intelligence — Read DOCX.
3. Communication — Send SMS.
4. Video Production — Render Scenes.

These numbers reflect manifest verification statements and source wiring. They do not mean that all 86 nodes have independently passed production-level end-to-end testing.

---

# 10. L0 Audit

## 10.1 Workflow Foundation

**Layer:** L0
**Runtime:** `runtime_enabled`
**Declared nodes:** 12

Capabilities include:

* manual trigger;
* scheduled trigger;
* conditions;
* switch;
* parallel;
* merge;
* delay;
* workflow logging;
* looping;
* event publication;
* program artifact read/write.

The event trigger is represented through event-bus subscription dispatch rather than as an ordinary runnable node.

### Assessment

**Substantially functional.**

Remaining concerns:

* pack-level canvas verification is marked `not_started`;
* templates are marked `not_started`;
* scheduler and event behavior rely on surrounding infrastructure;
* production mock fallback must be removed.

## 10.2 Resource Operations

**Layer:** L0
**Runtime:** `runtime_enabled`
**Declared nodes:** 9
**Manifest verification:** all 9 implemented

Capabilities include:

* create resource;
* read resource;
* list resources;
* update resource;
* transition state;
* resolve resource binding;
* write artifact;
* read artifact;
* assign resource.

The manifest reports all nine nodes as implemented.

### Assessment

**Functionally substantial.**

This resource model is an important distinction from simple data-passing automation.

## 10.3 Human Work

**Layer:** L0
**Runtime:** `runtime_enabled`
**Declared nodes:** 5

Capabilities include:

* request approval;
* request human input;
* assign user;
* record decision;
* review checkpoint.

The manifest reports the runtime as implemented.

### Assessment

**One of the strongest and most distinctive LADOS subsystems.**

---

# 11. L1 Audit

## 11.1 Document Intelligence

**Runtime:** `stub_executors`

| Capability        | Status                                            |
| ----------------- | ------------------------------------------------- |
| Upload File       | Implemented                                       |
| Read Excel        | Implemented                                       |
| Extract Table     | Implemented                                       |
| Generate Document | Implemented, but storage output may remain inline |
| Read PDF          | Stub                                              |
| Read DOCX         | Stub                                              |

The official manifest explicitly reports PDF and DOCX reading as pending extraction dependencies.

### Assessment

**Partially functional.**

Local or uploaded spreadsheet handling exists, but this does not provide:

* Google Sheets;
* Excel Online;
* Google Drive;
* SharePoint;
* OneDrive.

## 11.2 Communication

**Runtime:** `stub_executors`

| Capability               | Status      |
| ------------------------ | ----------- |
| Send Email               | Implemented |
| Send In-App Notification | Implemented |
| Send Reminder            | Implemented |
| Send SMS                 | Stub        |

The email service uses SMTP through Nodemailer. Without `SMTP_HOST`, it runs in stub mode and returns `sent: false`.

### What is not implemented

* Gmail inbox reading;
* Gmail push trigger;
* Outlook mailbox reading;
* Microsoft Graph subscription;
* IMAP polling;
* OAuth consent;
* token refresh;
* mailbox folder handling;
* attachment synchronization.

### Assessment

**Outbound communication exists. Provider integration breadth does not.**

## 11.3 Task and Case Management

**Runtime:** `runtime_enabled`
**Declared nodes:** 4
**Manifest verification:** all implemented

Capabilities:

* create task;
* update task status;
* open case;
* close case.

Dedicated checklist capability remains aspirational.

### Assessment

**Functionally usable at a basic business-process level.**

## 11.4 Commercial Finance

**Runtime:** `runtime_enabled`
**Declared nodes:** 8
**Manifest verification:** all implemented

Capabilities include:

* submit invoice;
* verify invoice;
* record invoice approval;
* record payment;
* create purchase order;
* record PO approval;
* claim retention release;
* record retention release.

The pack records business actions. It does not execute payments through a bank or payment gateway.

### Assessment

**Executable finance-record capability pack, not a banking connector.**

## 11.5 Procurement

**Runtime:** `runtime_enabled`
**Declared nodes:** 6
**Manifest verification:** all implemented

Capabilities:

* create RFQ;
* issue RFQ;
* receive quotation;
* compare quotations;
* recommend award;
* generate PO request.

Comparison and recommendation are advisory and stateless. Human approval should occur through Human Work.

### Assessment

**Executable procurement primitives exist.**

Supplier portals, email receipt, accounting handoff, and ERP synchronization remain future connector work.

## 11.6 AI Operations

The target catalogue defines `lados.ai-operations`.

No official `lados.ai-operations` manifest or API package dependency was found at the audited commit.

An `AiService` exists and is used by selected domain nodes, but the generic official AI Operations pack has not been implemented.

### Assessment

**Target-design pack, not current official runtime pack.**

---

# 12. L2 Audit

## 12.1 QS Commercial

**Runtime:** `runtime_enabled`
**Declared nodes:** 7
**Manifest verification:** all seven declared nodes implemented

Implemented declared nodes include:

* read BOQ;
* normalize BOQ;
* classify trade;
* split work packages;
* assess progress claim;
* value variation;
* reconcile final account.

Important limitations:

1. Several computations are deterministic rule-based operations rather than LLM reasoning.
2. Five additional capabilities in the manifest have no corresponding declared nodes:

   * BOQ draft generation;
   * claim submission;
   * claim certification record;
   * variation submission;
   * variation approval record.
3. Certification, entitlement, and final acceptance remain human decisions.
4. A complete PKA-based QS reasoning runtime is not present.

These limitations are explicitly documented in the manifest.

### Assessment

**A real professional capability pack, but not yet a complete digital QS practice.**

## 12.2 Construction Operations

**Runtime:** `runtime_enabled`
**Declared nodes:** 6
**Manifest verification:** all implemented

Capabilities:

* create project or site resource;
* create inspection;
* submit inspection report;
* log defect;
* create site diary;
* run handover checklist.

Handover sign-off remains a separate human decision.

### Assessment

**Executable construction operations capability pack.**

## 12.3 Contract Administration

**Runtime:** `runtime_enabled`
**Declared nodes:** 5
**Manifest verification:** all implemented

Capabilities:

* register instruction;
* prepare notice;
* track notice due date;
* look up clause reference;
* link correspondence evidence.

The clause lookup implementation is described as deterministic keyword matching rather than a real Knowledge Pack search or legal reasoning system.

### Assessment

**Executable workflow support, not a legal or contract-knowledge engine.**

## 12.4 Asset and Fleet Operations

**Runtime:** `runtime_enabled`
**Declared nodes:** 7
**Manifest verification:** all implemented

Capabilities:

* create fleet job;
* dispatch trip;
* complete trip;
* upload fuel receipt;
* extract fuel data;
* create maintenance record;
* clear maintenance.

Fuel extraction can use the configured AI vision service. Without AI configuration, it can fall back to a confidence-zero advisory result.

### Assessment

**Functionally meaningful, with honest degraded AI behavior.**

## 12.5 People and Payroll Operations

**Runtime:** `runtime_enabled`
**Declared nodes:** 3
**Manifest verification:** all implemented

Capabilities:

* prepare payroll run;
* record payroll approval;
* record expense approval.

The pack does not autonomously approve or pay. Human identity is required for approval records.

### Assessment

**Executable payroll-preparation and approval-record capability, not a statutory payroll or payment platform.**

## 12.6 Video Production

**Runtime:** `stub_executors`
**Declared nodes:** 8

Seven are described as implemented:

* read script;
* scaffold project;
* draft scenes;
* generate scene batch;
* revise layout;
* validate background-removal requirements;
* insert images.

`render_scenes` is a stub because no Remotion rendering backend is connected.

### Assessment

**Partially functional orchestration and validation pack, not an actual rendering engine.**

---

# 13. L3 Solution Pack Audit

Two L3 solution manifests were found:

* `lados.solution.contractor-ops`;
* `lados.solution.qs-practice`.

Both report:

* `status: skeleton`;
* `runtimeStatus: manifest_only`;
* no nodes;
* draft workflow templates;
* runtime verification `not_started`;
* canvas verification `not_started`.

The Contractor Operations Solution declares five workflow templates but no runtime nodes of its own.

The QS Practice Solution follows the same model.

This architecture is valid because solution packs should orchestrate lower-layer capabilities rather than duplicate them.

However, a solution pack is only functionally complete when it can be:

* installed;
* dependency checked;
* configured;
* imported;
* executed without mocks;
* verified through the actual graph runner;
* used through role-oriented screens;
* upgraded safely.

### Assessment

**Architecturally valid but not yet a completed functional solution layer.**

---

# 14. L4 Integration Pack Audit

The target catalogue defines L4 patterns such as:

```text
lados.integration.accounting.<vendor>
lados.integration.storage.<vendor>
lados.integration.messaging.<vendor>
lados.integration.erp.<vendor>
lados.integration.supplier.<vendor>
```

The design gives examples including:

* Xero;
* QuickBooks;
* SharePoint;
* WhatsApp;
* SAP.

No official L4 pack manifest was found at the audited commit.

Repository searches also did not identify official implementations for:

* Gmail;
* Outlook;
* Microsoft Graph;
* Google Calendar;
* Google Sheets;
* IMAP;
* OneDrive;
* SharePoint;
* WhatsApp.

### Assessment

> **L4 is currently a target architecture layer, not an implemented connector ecosystem.**

This is the largest reason LADOS cannot yet provide the integration breadth users associate with n8n.

---

# 15. L5 Template Pack Audit

Five official L5 template packs were found:

1. Invoice Approval Templates.
2. Procurement RFQ Templates.
3. Progress Claim Templates.
4. Defect Management Templates.
5. CIPAA Preparation Templates.

All five inspected manifests report:

* `status: skeleton`;
* `runtimeStatus: manifest_only`;
* no nodes;
* one draft workflow template;
* runtime verification `not_started`;
* canvas verification `not_started`;
* template verification `draft`.

Examples:

* Invoice Approval Templates:
* Procurement RFQ Templates:
* Progress Claim Templates:
* Defect Management Templates:
* CIPAA Preparation Templates:

### Assessment

**These are genuine reusable pack assets, but they are not yet certified end-to-end applications.**

---

# 16. Knowledge Pack Audit

## 16.1 What already exists

The repository contains a real `DataPacksService`, presented in newer UI copy as Knowledge Packs.

It supports:

* listing packs;
* listing versions;
* version metadata;
* organization installation;
* disabling installed packs;
* collections;
* items;
* source names;
* source URLs;
* source dates;
* regions;
* effective dates;
* classifications;
* assumptions;
* advisory status;
* installed-pack search;
* effective-date filtering;
* runtime usage resolution;
* provenance information.

The service includes a structured runtime usage object containing:

* item identity;
* pack identity;
* version;
* collection;
* source;
* source date;
* effective dates;
* classification;
* advisory status;
* applicability notes;
* assumptions.

The runtime can scan node configuration for referenced Knowledge Pack item UUIDs and resolve provenance for those items.

### Assessment

> **Knowledge Packs are not merely displayed files. A real versioned reference-data, installation, search, and provenance subsystem exists.**

## 16.2 Why this is not yet a full PKA

A Professional Knowledge Asset, as defined in the wider project discussions, is broader than searchable reference data.

A complete PKA can contain:

* professional instructions;
* domain ontology;
* policies;
* calculations;
* prompts;
* retrieval collections;
* source evidence;
* workflow templates;
* tools;
* node requirements;
* human review rules;
* expert examples;
* historical cases;
* validation tests;
* versions;
* organizational overlays;
* approved operational learning.

No first-class runtime was found that loads this complete structure and establishes it as the governed execution context for a workflow or professional application.

## 16.3 Correct conclusion

> **LADOS has real Knowledge Pack infrastructure, but it does not yet have the complete PKA runtime envisioned for Knowledge Factory integration.**

---

# 17. Future Knowledge Factory Interface

Knowledge Factory integration should not require redesigning the workflow engine.

Nodes and workflows should consume an abstract provider:

```ts
interface KnowledgeProvider {
  resolveAsset(
    assetReference: string,
    version?: string
  ): Promise<ResolvedKnowledgeAsset>;

  search(
    query: KnowledgeQuery
  ): Promise<KnowledgeResult[]>;

  getProvenance(
    resultId: string
  ): Promise<KnowledgeProvenance>;

  validateRequirements(
    requirements: KnowledgeRequirement[]
  ): Promise<KnowledgeValidationResult>;
}
```

Possible implementations:

```text
LocalKnowledgePackProvider
KnowledgeFactoryProvider
EnterprisePKAProvider
RemoteGovernedProvider
TestKnowledgeProvider
```

The provider must return:

* knowledge item;
* asset and version;
* source references;
* source dates;
* applicability;
* confidence;
* assumptions;
* warnings;
* policy requirements;
* review requirements.

This preserves the present workflow-first and pre-KF/pre-PKA implementation while allowing KF integration later.

---

# 18. Skill Runtime Audit

The discussion sometimes used “skill” and “node” interchangeably.

The code shows that the atomic executable unit is a **node executor**.

A separate first-class Skill Registry or independent Skill Runtime was not evidenced.

There are two valid product models.

## 18.1 Model A — Skill equals node

```text
User-facing term: Skill
Runtime term: Node
One manifest
One executor
```

This is the simplest model.

## 18.2 Model B — Skill is a compound capability

```text
Skill
  |- workflow fragment
  |- multiple nodes
  |- configuration profile
  |- knowledge requirements
  |- policy
  |- tests
```

Under this model, the skill should compile or expand into executable workflow nodes.

It should not introduce a second competing low-level execution engine.

## 18.3 Recommendation

> Keep the node as the atomic runtime unit. Define a skill as a reusable compound capability only when necessary.

---

# 19. Email, Calendar, Spreadsheet, and Document Findings

## 19.1 Email

### Implemented

* SMTP outbound email;
* LADOS Communication abstraction;
* in-app notifications;
* reminders.

### Not implemented as official provider integrations

* Gmail inbox reading;
* Gmail watch trigger;
* Outlook inbox reading;
* Microsoft Graph subscriptions;
* IMAP polling;
* OAuth consent;
* refresh-token lifecycle;
* mailbox folders;
* message threading;
* provider-specific attachment handling.

## 19.2 Calendar

No official calendar capability or provider pack was found for:

* Google Calendar;
* Microsoft 365 Calendar;
* CalDAV.

## 19.3 Spreadsheet

### Implemented

* uploaded/local Excel reading;
* `xlsx` dependency;
* table extraction.

### Not found

* Google Sheets connector;
* Excel Online connector;
* workbook OAuth;
* cloud range updates;
* row-change triggers;
* provider workbook synchronization.

## 19.4 Documents and storage

### Implemented or partial

* file upload;
* artifacts;
* Excel processing;
* document generation;
* Knowledge Pack provenance.

### Missing or incomplete

* official PDF text extraction;
* official DOCX text extraction;
* Google Drive;
* OneDrive;
* SharePoint;
* Dropbox;
* S3 vendor pack;
* provider synchronization.

## 19.5 Conclusion

The LADOS pack and node model is functional, but external productivity-suite integration is incomplete.

A “Read Email” node only becomes operational when it has:

* provider adapter;
* credential profile;
* OAuth or protocol authentication;
* token refresh;
* pagination;
* retries;
* rate-limit handling;
* attachment processing;
* normalized outputs;
* error translation;
* webhook or polling lifecycle.

---

# 20. Connector Runtime Architecture

## 20.1 Recommended pattern

```text
Professional Capability Node
          |
          v
Provider-Neutral Connector Contract
          |
   +------+------+------+
   |             |      |
 Gmail      Microsoft  IMAP
              Graph
```

The same pattern applies to:

* calendar;
* spreadsheets;
* storage;
* messaging;
* accounting;
* ERP;
* CRM;
* supplier portals.

## 20.2 Required connector services

LADOS should implement:

1. **Connection Profile Service**
   Stores provider, organization, account identity, permissions, connection status, and health.

2. **Credential and Secret Vault**
   Keeps secrets and refresh tokens outside workflow JSON.

3. **OAuth Lifecycle Service**
   Handles consent, callbacks, refresh, revocation, and scope changes.

4. **Provider Adapter SDK**
   Defines normalized methods, inputs, outputs, and errors.

5. **Retry and Rate-Limit Engine**
   Supports backoff, quotas, `Retry-After`, and provider rules.

6. **Webhook Subscription Manager**
   Creates, renews, validates, and removes provider subscriptions.

7. **Polling Adapter**
   Supports providers without webhooks.

8. **Connector Observability**
   Tracks health, quota, latency, expiry, errors, and last success.

9. **Idempotency and Deduplication**
   Prevents duplicate email, webhook, invoice, or scheduled processing.

10. **Permission Enforcement**
    Enforces pack declarations for external APIs, secrets, files, email, and databases.

## 20.3 Recommended initial L4 packs

### Foundation

```text
lados.integration.http
lados.integration.webhook
lados.integration.email.imap-smtp
```

### Google Workspace

```text
lados.integration.google.gmail
lados.integration.google.calendar
lados.integration.google.drive
lados.integration.google.sheets
```

### Microsoft 365

```text
lados.integration.microsoft.outlook
lados.integration.microsoft.calendar
lados.integration.microsoft.onedrive
lados.integration.microsoft.sharepoint
lados.integration.microsoft.excel
```

### Business communication

```text
lados.integration.messaging.whatsapp
lados.integration.messaging.slack
lados.integration.messaging.teams
```

---

# 21. Open-Source Integration Alternatives

| Platform     | Licence position                                   | Potential role                                                                    |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Node-RED     | Apache 2.0                                         | Permissive event/API integration engine and useful connector reference            |
| Activepieces | MIT-licensed core with commercial enterprise areas | Modern TypeScript connector SDK and optional integration bridge                   |
| Apache Camel | Apache 2.0                                         | Embedded enterprise integration framework without adopting another visual builder |
| Kestra       | Apache 2.0                                         | Durable scheduling and data/infrastructure orchestration                          |
| Windmill     | AGPL source areas plus proprietary components      | Developer scripts, jobs, APIs, and internal apps; licence review required         |
| n8n          | Sustainable Use License plus enterprise licence    | Large connector ecosystem; source-available rather than conventional open source  |

Node-RED is Apache 2.0 licensed.

Activepieces states that its core is MIT licensed while enterprise areas use a commercial licence.

Kestra is Apache 2.0 licensed.

Windmill combines AGPL, Apache, and proprietary areas, so its exact intended use requires careful licence review.

## Recommendation

Do not replace the LADOS engine.

Use one or more of these strategies:

1. Build native L4 adapters.
2. Embed a suitable permissively licensed backend framework where justified.
3. Offer optional bridge nodes to external automation systems.

---

# 22. Repository Licence Finding

The LADOS repository is public, but no root `LICENSE` file was located at the audited commit.

A public repository does not by itself establish open-source reuse or redistribution rights.

Before external marketplace or contributor growth, LADOS should:

1. choose a root licence;
2. add the licence file;
3. document third-party dependencies;
4. define contributor terms;
5. distinguish licences for:

   * core engine;
   * official Capability Packs;
   * marketplace packs;
   * Knowledge Packs;
   * future PKAs;
   * proprietary enterprise components.

This finding is not legal advice and should be reviewed professionally.

---

# 23. Major Architecture Risks

## Risk 1 — Production mock fallback

**Severity:** Critical

Missing executors can appear successful.

**Required action:** production-strict execution.

## Risk 2 — Runtime truth is fragmented

Readiness is represented across:

* pack runtime status;
* node executor status;
* resolver wiring;
* service configuration;
* environment variables;
* degraded fallbacks;
* verification notes.

**Required action:** generated runtime readiness matrix based on executable probes.

## Risk 3 — Generic configuration schema

The official pack loader currently derives fields as optional strings because the source manifests provide grouped keys rather than complete field definitions.

This prevents accurate UI support for:

* numbers;
* toggles;
* select lists;
* dates;
* secrets;
* connection profiles;
* resources;
* Knowledge Pack items;
* validation;
* conditional fields.

**Required action:** full field definitions in official node manifests.

## Risk 4 — Documentation drift

The README and comments contradict current runtime maturity.

**Required action:** documentation update as a release gate.

## Risk 5 — Insufficient graph-level verification

A runner comment records that hand-chained executor tests previously missed a real port-binding problem that only appeared through actual graph execution.

**Required action:** real graph E2E test for every runtime-enabled pack.

## Risk 6 — Missing L4

Provider connectors are the largest capability gap.

## Risk 7 — Draft packs may look completed

L3 and L5 packs can be visible while their runtime and canvas verification remain not started.

**Required action:** visible maturity badges and certification gates.

## Risk 8 — Knowledge Pack and PKA confusion

Users may interpret the existing Knowledge Pack subsystem as the complete PKA system.

**Required action:** formal glossary and product definitions.

## Risk 9 — Hidden degraded behavior

SMTP, AI, SMS, storage, and rendering can be unavailable.

**Required action:** connection-health dashboard and pre-run capability checks.

## Risk 10 — No explicit repository licence

**Required action:** licensing decision before ecosystem expansion.

---

# 24. Maturity Scorecard

| Area                               |  Score | Assessment                                                                  |
| ---------------------------------- | -----: | --------------------------------------------------------------------------- |
| Monorepo organization              | 88/100 | Strong modular workspace structure                                          |
| Node execution contract            | 84/100 | Clear execution, failure, pause, and service model                          |
| Pack contract                      | 82/100 | Strong capability boundaries, guardrails, layers, and verification metadata |
| Graph planning                     | 80/100 | Topological planning, cycle detection, parallel groups, and bindings        |
| Workflow runner                    | 76/100 | Real execution; mock fallback is a major production defect                  |
| Queue and execution operations     | 72/100 | Queue, fallback, logs, recovery, and progress exist                         |
| L0 runtime                         | 82/100 | Substantially implemented                                                   |
| L1 runtime                         | 67/100 | Useful business capabilities with document and communication gaps           |
| L2 runtime                         | 70/100 | Significant professional capability implementation                          |
| L3 solution layer                  | 22/100 | Skeleton manifests and draft templates                                      |
| L4 connector layer                 |  5/100 | Designed but no official provider packs found                               |
| L5 template layer                  | 25/100 | Five draft manifest-only packs                                              |
| Knowledge Pack infrastructure      | 58/100 | Versioning, search, installation, effective dates, and provenance           |
| First-class PKA runtime            | 15/100 | No cohesive PKA execution unit found                                        |
| Provider OAuth runtime             | 10/100 | No general implementation found                                             |
| Canvas and configuration alignment | 45/100 | UI exists, but pack verification and field typing remain incomplete         |
| Testing and verification           | 48/100 | Useful testing exists, but graph/provider E2E coverage needs expansion      |
| Documentation and release clarity  | 35/100 | Significant drift and no root licence                                       |

## Composite interpretation

| Dimension                          | Approximate maturity |
| ---------------------------------- | -------------------: |
| Architecture and contracts         |               78/100 |
| Runtime implementation             |               68/100 |
| Product readiness                  |               48/100 |
| Connector ecosystem                |               12/100 |
| Professional Knowledge/PKA runtime |               20/100 |

The earlier 78/100 score should therefore not be interpreted as overall completion.

It more accurately represents architecture and contract maturity.

---

# 25. Definition of Functional

A pack should not be called functional merely because it appears in the palette or contains an executor file.

| Level                     | Definition                                                                |
| ------------------------- | ------------------------------------------------------------------------- |
| F0 — Listed               | Manifest validates and appears in the registry                            |
| F1 — Resolvable           | Every declared node maps to a real executor                               |
| F2 — Locally executable   | Executors pass deterministic fixture tests                                |
| F3 — Graph verified       | Saved multi-node workflow runs through the real engine                    |
| F4 — Service integrated   | Required external services and credentials work                           |
| F5 — UI configurable      | All fields, resources, connections, and secrets are configurable          |
| F6 — Recovery verified    | Retry, restart, pause/resume, idempotency, and failure paths pass         |
| F7 — Production certified | Security, load, permissions, audit, upgrade, and documentation gates pass |

Current approximate position:

* many L0–L2 nodes: F2–F3;
* some provider-dependent nodes: F2 or degraded;
* L3: mainly F0;
* L4: not implemented as official packs;
* L5: mainly F0;
* PKA runtime: design stage.

---

# 26. Recommended Roadmap

## Phase A — Runtime Truth and Safety

**Priority:** Immediate

1. Add `production-strict` executor mode.
2. Disable generic mock success in production.
3. Persist real, mock, stub, and degraded status per node execution.
4. Generate runtime readiness at API startup.
5. Rewrite the root README.
6. update obsolete comments;
7. add a repository licence;
8. create graph-level E2E tests for each runtime-enabled pack;
9. fail validation when manifest status contradicts resolver status;
10. implement complete typed configuration schemas.

### Completion gate

No runtime-enabled node can silently execute as a mock.

## Phase B — Connector Runtime

1. Connection Profile model.
2. Encrypted secret storage.
3. OAuth lifecycle.
4. Provider SDK.
5. HTTP node.
6. Webhook subscription manager.
7. IMAP/SMTP provider.
8. Gmail pack.
9. Microsoft Graph pack.
10. Calendar packs.
11. Drive, OneDrive, and SharePoint packs.
12. Google Sheets and Excel Online packs.
13. Connector health dashboard.
14. Retry, rate-limit, pagination, and idempotency policies.

### Completion gate

A real inbound email can trigger a workflow, process an attachment, require approval, and send a real reply without mock execution.

## Phase C — Executable Solutions

1. Dependency-aware template installation.
2. Template schema validation.
3. Setup wizard for connections and resources.
4. Contractor Operations end-to-end workflow.
5. QS Practice end-to-end workflow.
6. Role-based resource views.
7. Operational dashboards.
8. Template certification.

### Completion gate

A non-developer can install and operate one L3 solution from start to finish.

## Phase D — PKA Runtime

1. Define `lados.pka.v1`.
2. Define PKA components and version pinning.
3. Add the Knowledge Provider interface.
4. Implement local Knowledge Pack provider.
5. Add future Knowledge Factory provider.
6. Add retrieval and provenance contracts.
7. Add PKA validation tests.
8. Bind PKA requirements to nodes and templates.
9. Record PKA versions and sources in executions.
10. Preserve required human review.

### Completion gate

A workflow can declare a PKA requirement, load a pinned version, retrieve governed knowledge, expose provenance, and switch between local and KF providers without workflow redesign.

## Phase E — Marketplace and Governance

1. Package signing.
2. Integrity checks.
3. Dependency resolution.
4. Upgrade and rollback.
5. Runtime permission enforcement.
6. External-code sandbox.
7. Publisher identity.
8. Review workflow.
9. Compatibility matrix.
10. Deprecation and migration policy.

---

# 27. Recommended Proof Workflow

The strongest demonstration of the LADOS product should use the exact capabilities discussed:

```text
Gmail or Outlook Trigger
        |
        v
Read Email and Attachments
        |
        v
Classify Document
        |
        v
Read BOQ, Invoice, Claim, or Quotation
        |
        v
Apply Knowledge Pack or PKA Rules
        |
        v
Create or Update Workspace Resource
        |
        v
Human Review and Decision
        |
        v
Generate Document or Response
        |
        v
Send Email
        |
        v
Record Audit, Artifact, Provenance, and State
```

## Acceptance criteria

* no mock executors;
* real provider credentials;
* attachment provenance retained;
* duplicate messages deduplicated;
* workflow can recover after restart;
* professional decisions require a human;
* knowledge version is pinned;
* sources and assumptions are visible;
* failure results in a recoverable state;
* provider token expiry is handled;
* outputs are stored as resources and artifacts.

This workflow would show clearly why LADOS is more than an n8n duplicate.

---

# 28. Strategic Product Recommendation

LADOS should not attempt to win by rebuilding every n8n connector before demonstrating its professional value.

It should establish three defensible layers.

## 28.1 Professional Operating Runtime

* Workspace Resources;
* state;
* artifacts;
* evidence;
* human decisions;
* programs;
* professional guardrails;
* auditable workflows.

## 28.2 Connector Runtime

* provider-neutral interfaces;
* native L4 adapters;
* optional external bridges;
* OAuth and credential governance.

## 28.3 Professional Knowledge Runtime

* Knowledge Packs now;
* PKA provider interface next;
* Knowledge Factory integration later;
* versioning;
* provenance;
* validation;
* organization-specific growth.

The canvas is not the product. It is only the authoring surface.

The product is:

> **A low-code application development and orchestration platform combining executable business capabilities, persistent resources, human work, external integrations, and governed professional knowledge into auditable applications.**

---

# 29. Final Audit Conclusion

The repository disproves the statement that LADOS is merely a visual prototype.

Its strongest areas are:

* node and pack contracts;
* workflow graph execution;
* resource and artifact handling;
* human approval and pause/resume;
* professional capability boundaries;
* Knowledge Pack reference data and provenance;
* L0–L2 runtime implementation.

Its weakest areas are:

* production-safe executor resolution;
* L4 provider connectors;
* OAuth and credential lifecycle;
* rich configuration schemas;
* graph-level and provider-level E2E verification;
* executable L3 and L5 productization;
* first-class PKA runtime;
* documentation and licensing clarity.

The definitive conclusion is:

> **LADOS is functional at the workflow-engine level and across much of its L0–L2 capability layer. It is not yet functionally complete as a broad integration automation platform, a verified solution-pack product, or a PKA-powered professional operating system.**

The next priority should not be another large catalogue of packs that only appear in the UI.

The next priority should be:

1. strict runtime truth;
2. connector runtime;
3. executable end-to-end solutions;
4. PKA provider and runtime integration;
5. marketplace governance.

---

# Appendix A — Repository Evidence Index

## Root and workspace

```text
README.md
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
```

## Runtime contracts

```text
packages/@lados/node-sdk/src/types.ts
packages/@lados/core/src/manifest.ts
packages/@lados/pack-sdk/src/types.ts
```

## Execution engine

```text
packages/execution-engine/src/graph-planner.ts
packages/execution-engine/src/runner.ts
packages/execution-engine/src/mock-registry.ts
```

## API execution and registry

```text
apps/api/src/execution/execution.service.ts
apps/api/src/execution/real-nodes/index.ts
apps/api/src/pack/official-pack-loader.ts
apps/api/src/pack/official-pack-loader.service.ts
apps/api/src/notification/email.service.ts
apps/api/src/data-packs/data-packs.service.ts
```

## L0 packs

```text
packs/official/lados-workflow-foundation/manifest.json
packs/official/lados-workflow-foundation/nodes.json
packs/official/lados-resource-operations/manifest.json
packs/official/lados-human-work/manifest.json
```

## L1 packs

```text
packs/official/lados-document-intelligence/manifest.json
packs/official/lados-communication/manifest.json
packs/official/lados-task-case/manifest.json
packs/official/lados-commercial-finance/manifest.json
packs/official/lados-procurement/manifest.json
```

## L2 packs

```text
packs/official/lados-qs-commercial/manifest.json
packs/official/lados-construction-operations/manifest.json
packs/official/lados-contract-admin/manifest.json
packs/official/lados-asset-fleet/manifest.json
packs/official/lados-people-payroll/manifest.json
packs/official/lados-video-production/manifest.json
```

## L3 packs

```text
packs/official/lados-solution-contractor-ops/manifest.json
packs/official/lados-solution-qs-practice/manifest.json
```

## L5 packs

```text
packs/official/lados-template-invoice-approval/manifest.json
packs/official/lados-template-procurement-rfq/manifest.json
packs/official/lados-template-progress-claim/manifest.json
packs/official/lados-template-defect-management/manifest.json
packs/official/lados-template-cipaa-preparation/manifest.json
```

## Architecture documents

```text
docs/Lados/V4/Design/Lados_V4_Phase20A_Target_Capability_Pack_Catalogue.md
docs/Lados/V4/Sprint/Lados_V4_Phase21_Checklist.md
```

---

# Appendix B — Audit Limitations

This review did not independently:

* install all dependencies;
* execute all typechecks;
* execute every test suite;
* start the complete web/API/Supabase/Redis stack;
* apply all database migrations;
* authenticate external providers;
* execute every official node;
* perform browser verification;
* perform load testing;
* perform security penetration testing;
* validate legal licensing conclusions.

Manifest claims such as “all nodes implemented” remain project assertions until independently exercised through repeatable graph-level E2E tests.

---

# Appendix C — Architecture Decisions

## Decision 1

LADOS retains its own workflow engine.

## Decision 2

External automation platforms may be optional connector bridges, not the core runtime.

## Decision 3

The node remains the atomic execution unit.

## Decision 4

A skill may represent a reusable compound capability built from nodes.

## Decision 5

L4 provider integration becomes an explicit priority.

## Decision 6

Production execution fails closed when an executor is missing.

## Decision 7

L3 and L5 assets are not described as functional products until certified.

## Decision 8

Knowledge Packs are recognized as a real implemented subsystem but not yet the complete PKA model.

## Decision 9

Future KF/PKA integration uses a replaceable Knowledge Provider interface.

## Decision 10

Current workflows remain pre-KF and pre-PKA and must not be redesigned when the provider is later added.

## Decision 11

Documentation and repository licensing must be corrected before wider ecosystem growth.

---

**End of Report**
