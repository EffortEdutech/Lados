# Phase 27 S27.4 Provider Demand Confirmation

**Date:** 2026-07-26  
**Decision:** No provider family is evidence-selectable yet. Author a communication-bearing business graph before implementing an L4 provider pack.

## Evidence boundary

Provider selection is based on importable workflow graph bodies, not template summaries. Descriptor prose identifies possible business intent but cannot establish exact trigger/action schemas, scopes, pagination, attachment limits, or provider ownership.

## Importable workflow demand

| Workflow | Nodes | External connector demand | Result |
|---|---:|---|---|
| `lados.quran_media.issue_to_dakwah_video` | 23 | None | Local/manual workflow; current-issue research uses the governed allowlisted research service, not an organization Connection Profile |
| `lados.quran_media.issue_to_dakwah_video_revision` | 13 | None | Manual revision workflow; no external provider node |
| `lados.video_production.script_to_scene_plan` | 10 | None | Local/manual workflow; blocked by render backend stub, not an L4 SaaS connector |

**Measured graph-backed demand:** 0 external triggers, 0 external actions, 0 provider-specific scopes.

## Descriptor-only signals

Thirteen composition descriptors still have no importable workflow body. Four declare the Communication Capability Pack:

| Descriptor | Communication intent in summary | Exact provider/action known? |
|---|---|---|
| Contractor Ops - Payroll Prepare to Approval | Notify payroll stakeholders | No |
| Defect Report to Notification | Notify responsible parties and track reminders | No |
| Submit Invoice to Approval | Notify finance stakeholders | No |
| RFQ to Quotation Comparison | Communication pack dependency; summary does not name the channel | No |

The remaining nine descriptor-only workflows declare no Communication Pack dependency. None of the thirteen descriptors specifies Gmail, Outlook, SMTP, Microsoft Graph, Google Workspace, calendar, drive, online spreadsheet, Teams, Slack, WhatsApp, CRM, accounting, or ERP actions.

## Demand score

| Candidate capability | Graph-backed workflows unlocked | Descriptor-only candidates | Shared reuse | Selection |
|---|---:|---:|---|---|
| Outbound stakeholder notification | 0 | 4 | High | Demand-unblock target; channel/provider unresolved |
| Inbound email trigger and attachment read | 0 | 0 explicit | Potentially high | Not selected |
| Microsoft 365 family | 0 | 0 explicit | Unknown | Not selected |
| Google Workspace family | 0 | 0 explicit | Unknown | Not selected |
| SMS | 0 | 0 explicit | Unknown | Not selected; existing SMS node remains an honest stub |
| Render backend | 1 | 0 | Specialized | S27.5/video service decision, not L4 provider wave |

## S27.4 decision

S27.4 provider implementation must not begin from the current evidence. The next additive slice is **S27.4A - Provider Demand Unblock**:

1. Author one importable business workflow graph that genuinely requires Communication.
2. Recommended first graph: `lados.template.invoice_approval.submit_invoice_to_approval`, because its professional nodes and human approval path already exist and its summary explicitly requires stakeholder notification.
3. Define the trigger and outbound communication as channel-neutral requirements first.
4. Decide whether the proof requires SMTP, Microsoft 365, or Google Workspace only after the graph declares mailbox ownership, inbound/outbound behavior, attachments, identity, and scopes.
5. Confirm a sandbox/test account before creating any provider-ready claim.

## Current blockers

- Thirteen L3/L5 descriptors lack importable graph bodies.
- No provider sandbox/test account or organizational provider preference is documented.
- Descriptor summaries do not define exact provider actions, triggers, scopes, or attachment behavior.

## Acceptance to resume S27.4 implementation

- At least one communication-bearing graph validates against official node manifests.
- Exact trigger/action and required Connection Profile scopes are declared.
- Provider family and sandbox account are confirmed.
- Named workflows unlocked by the connector are recorded.

