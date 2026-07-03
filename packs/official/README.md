# Lados Official Capability Pack Skeletons

This folder contains Phase 20B official Capability Pack skeletons.

These packs are manifest-first product contracts. They are intentionally not executable runtime packages yet.

Current prototype packs remain in `packs/*-pack` as temporary compatibility/runtime references. Official packs must be built fresh from the Phase 20A catalogue and canonical capability registry.

## Current Skeletons

| Folder | Official pack |
|---|---|
| `lados-workflow-foundation` | `lados.workflow-foundation` |
| `lados-resource-operations` | `lados.resource-operations` |
| `lados-human-work` | `lados.human-work` |
| `lados-document-intelligence` | `lados.document-intelligence` |
| `lados-qs-commercial` | `lados.qs-commercial` |
| `lados-communication` | `lados.communication` |
| `lados-task-case` | `lados.task-case` |
| `lados-commercial-finance` | `lados.commercial-finance` |
| `lados-procurement` | `lados.procurement` |
| `lados-construction-operations` | `lados.construction-operations` |
| `lados-contract-admin` | `lados.contract-admin` |
| `lados-asset-fleet` | `lados.asset-fleet` |
| `lados-people-payroll` | `lados.people-payroll` |
| `lados-solution-contractor-ops` | `lados.solution.contractor-ops` |
| `lados-solution-qs-practice` | `lados.solution.qs-practice` |
| `lados-template-invoice-approval` | `lados.template.invoice-approval` |
| `lados-template-procurement-rfq` | `lados.template.procurement-rfq` |
| `lados-template-progress-claim` | `lados.template.progress-claim` |
| `lados-template-defect-management` | `lados.template.defect-management` |
| `lados-template-cipaa-preparation` | `lados.template.cipaa-preparation` |

## Template-Only Packs

L3 solution packs and L5 template packs may declare `nodes: []` when they provide `workflowTemplates`.
The official validator checks that every declared template file exists, so these packs can plan real workflows
without adding fake canvas nodes.

## Runtime Status

`runtimeStatus: "manifest_only"` means:

- not synced into `packs` table
- not synced into `registered_nodes`
- not available in the canvas palette yet
- not executing uploaded or new runtime code

Runtime wiring belongs to a later official-pack activation phase after executor planning, registry sync, compatibility migration, browser verification, and rollback planning.
