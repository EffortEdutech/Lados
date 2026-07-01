# QS-OS Workflow Engine Blueprint
# Volume 18 — Permission Engine & Security Specification (V3)
Version: STUB 0.1 (V3)

> **Document status:** 🔲 STUB — Not yet written  
> **Architecture version:** V3  
> **Created:** 2026-06-18 (stub)  
> **Target sprint:** Sprint 16+  
> **Related documents:** Vol 7 (Database), Vol 8 (API), Vol 11 (Core Services)

---

## Scope

This document will specify the **QS-OS Permission Engine and Security Model** — how access to organizations, projects, workflows, skills, approvals, data packs, and platform settings is controlled.

---

## Contents (when written)

1. **Role definitions**
   - Platform Admin, Org Admin, Project Manager, Editor, Viewer, Approver, Data Pack Admin
2. **Resource-level permissions**
   - Organization, Project, Workflow, Skill, Approval, Data Pack, Marketplace
3. **Supabase RLS policy specifications**
   - Full policy matrix per table per role
4. **JWT claims structure** — what goes in the Supabase JWT
5. **Row-Level Security patterns** — `org_id` scoping, project-level isolation
6. **Invitation and onboarding flow** — how users join an org
7. **API-level authorization** — NestJS guards, `@Roles()` decorator usage
8. **Service-level authorization** — how Core Services enforce permissions
9. **AI advisory constraint enforcement** — mandatory UI label, no AI-only approval paths
10. **Audit trail requirements** — what must be logged for compliance
11. **Data Pack access control** — which orgs can access which packs
12. **Secrets management** — `.env` rules, no keys in frontend, rotation policy

---

## Standing Security Rules (from project constraints)

These rules are fixed and must be reflected throughout this document:

> ⛔ NEVER commit `.env` to source control.  
> ⛔ Do NOT put service-role or secret keys in frontend env vars.  
> ⛔ AI is advisory only. AI must not approve, certify, decide entitlement, or impersonate a registered Professional Quantity Surveyor.

---

## Current Permission Implementation

Implemented to date (not yet formalized in this document):
- ✅ Supabase Auth JWT guard on all NestJS routes (Sprint 2)
- ✅ `org_id` RLS policies on organizations, projects, workflows tables
- 🔲 Role-based permissions (all users currently treated as admin)
- 🔲 Approval-role restriction (any user can approve currently)
- 🔲 Data Pack org-scoping (scaffold only)

---

*This document is a stub. Full content to be authored in Sprint 16.*
