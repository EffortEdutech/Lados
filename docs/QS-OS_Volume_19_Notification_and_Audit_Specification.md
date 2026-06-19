# QS-OS Workflow Engine Blueprint
# Volume 19 — Notification & Audit Engine Specification (V3)
Version: STUB 0.1 (V3)

> **Document status:** 🔲 STUB — Not yet written  
> **Architecture version:** V3  
> **Created:** 2026-06-18 (stub)  
> **Target sprint:** Sprint 14 (Notification Service) / Sprint 19 (full Audit Engine)  
> **Related documents:** Vol 5 (Execution Engine), Vol 7 (Database), Vol 11 (Core Services)

---

## Scope

This document will specify:

1. **Notification Service** — how QS-OS notifies users of workflow events (approvals, completions, failures, quota warnings, Data Pack updates)
2. **Audit Engine** — how QS-OS records an immutable, queryable log of all significant platform events for compliance, debugging, and trust

---

## Contents (when written)

### Notification Service

1. **Notification channels:** In-app (Supabase Realtime), Email (transactional), Webhook
2. **Trigger events** — full table of events that trigger notifications, recipients, and default channel
3. **Notification preferences** — user-level opt-in/out per channel per event type
4. **In-app notification center** — bell icon, unread count, notification list, read/dismiss
5. **Email templates** — approval request, execution failure, quota warning
6. **Webhook payload schema** — for external integrations
7. **Database tables:** `notifications`, `notification_preferences`
8. **API endpoints:** `GET /notifications`, `POST /notifications/:id/read`, `DELETE /notifications/:id`
9. **Realtime subscription** — Supabase channel subscription pattern
10. **Retry and failure handling** — failed email/webhook retry policy

### Audit Engine

1. **Audit event schema** — full `AuditEvent` TypeScript interface
2. **Event taxonomy** — all event action strings (e.g. `skill.executed`, `approval.granted`, `data_pack.installed`)
3. **Audit log database design** — append-only table, immutable rows, no soft deletes
4. **Audit query API** — filter by org, project, workflow, user, action, date range
5. **Audit Trail UI** — bottom drawer Audit Trail tab (see Vol 15 §9.4)
6. **Compliance requirements** — retention period, export format
7. **Sensitive data handling** — what must NOT be stored in audit logs (no PII, no keys)

---

## Current Audit Implementation

- ✅ `audit_logs` table exists (migration 0010, Sprint 10)
- ✅ Basic entries written by execution engine (Sprint 10)
- ✅ Approval events written to audit_logs (Sprint 10)
- 🔲 Notification Service — not built (in-progress for Sprint 14)
- 🔲 Full Audit Engine abstraction — planned Sprint 19
- 🔲 Audit Trail UI tab in bottom drawer — planned Sprint 14

---

## Notification Service — Sprint 14 Scope

The minimum notification work in Sprint 14 (S14-007):
- In-app notification for approval requests (using existing `audit_logs` as a source)
- Bell icon in top bar showing unread approval notifications
- Basic `notifications` table migration

Full transactional email and webhook delivery is Sprint 19.

---

*This document is a stub. Full content to be authored in Sprint 14 (Notification) and Sprint 19 (Audit Engine).*
