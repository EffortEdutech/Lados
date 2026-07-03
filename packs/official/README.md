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

## Runtime Status

`runtimeStatus: "manifest_only"` means:

- not synced into `packs` table
- not synced into `registered_nodes`
- not available in the canvas palette yet
- not executing uploaded or new runtime code

Runtime wiring belongs to a later Phase 20B step after validation and compatibility planning.
