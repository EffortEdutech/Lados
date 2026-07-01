# QS-OS Workflow Engine Blueprint
# Volume 16 — Skill SDK Specification (V3)
Version: STUB 0.1 (V3)

> **Document status:** 🔲 STUB — Not yet written  
> **Architecture version:** V3  
> **Created:** 2026-06-18 (stub)  
> **Target sprint:** Sprint 16+  
> **Supersedes:** Vol 2 (QS Node SDK) + Vol 2.1 (QS Node Developer Guide) for V3  
> **Related documents:** Vol 3 (Capability Pack), Vol 11 (Core Services), Master Sprint Plan

---

## Scope

This document will be the **V3 definitive reference** for developers building custom Skills (Nodes) for QS-OS.

It supersedes Vol 2 (Node SDK) and Vol 2.1 (Node Developer Guide) in V3 terminology and contract.

---

## Contents (when written)

1. **Skill vs Node — V3 terminology**
2. **Skill anatomy** — identity, inputs, outputs, config schema, runtime handler, validation, permissions, audit events, test fixtures
3. **V3 Skill contract (TypeScript)**
   - `SkillDefinition` interface
   - `SkillInput` / `SkillOutput` types
   - `SkillContext` (execution context, service accessors)
   - `SkillResult` type
4. **Core Service access from a Skill**
   - `context.ai.classify(prompt, schema)` — AI Service
   - `context.storage.upload(file)` — Storage Service
   - `context.ocr.extract(fileId)` — OCR Service
   - `context.audit.log(event)` — Audit Service
5. **Data Pack access from a Skill**
   - `context.dataPack.query('supplier-my', { ... })`
   - Dependency declaration: `data_pack_deps[]`
6. **Skill execution modes** — how the engine calls active/muted/bypassed skills
7. **Skill registration** — `registered_nodes` table format for V3
8. **Config schema** — JSON Schema for the Inspector config form
9. **UI schema** — Control hints for the Skill Inspector (field types, labels, placeholders)
10. **Testing a Skill** — unit test patterns using `SkillTestRunner`
11. **Publishing a Skill** — packaging inside a Capability Pack (Vol 3)
12. **Security rules** — what a Skill must never do

---

## Key V3 Changes from Vol 2

| V2 concept | V3 change |
|---|---|
| `NodeDefinition` | `SkillDefinition` |
| `NodeContext` | `SkillContext` with service accessors |
| No service layer | Skills call `context.ai`, `context.storage`, etc. |
| No data pack | Skills declare `data_pack_deps[]` |
| No mode field | Skills aware of `active / muted / bypassed` |
| `registeredNode.type` | `registeredNode.skillId` + `registeredNode.packId` |

---

## Placeholder Security Note

> ⛔ Skills must NEVER:
> - Make direct HTTP calls to external APIs (use Core Services instead)
> - Access other org's data
> - Emit AI output without the mandatory advisory label
> - Approve, certify, or impersonate a registered Professional Quantity Surveyor

---

*This document is a stub. Full content to be authored in Sprint 16.*
