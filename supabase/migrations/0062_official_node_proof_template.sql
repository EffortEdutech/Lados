-- ============================================================
-- Migration 0062: Official-node proof-of-concept workflow template
-- Phase 21 (post-S7, S9 chaining-fix follow-through)
-- ============================================================
--
-- Context: as of 2026-07-04, zero existing workflows across either
-- organization in this project use any `lados.*` official node — every
-- workflow to date (6 draft + 1 published seed) was built entirely from
-- legacy prototype node types (core.*, finance.*, qs.*, etc.). This seeds
-- the first real, instantiable workflow template built exclusively from
-- official (packs/official/*) nodes, so eff can prove the full official
-- runtime pipeline end-to-end in the live app via the existing, already-
-- tested POST /workflow-templates/:id/instantiate flow — not a one-off
-- hand-inserted workflow row for a single org.
--
-- Deliberately kept to 3 nodes and avoids any node whose real chaining
-- behavior hasn't been concretely verified this session (see Checklist.md
-- Handover 2026-07-04(5) — only the qs-commercial BOQ chain has a real
-- graph-based test; finance/procurement/etc. chains are unaudited). This
-- template instead exercises a different, already fully-proven capability
-- end-to-end: trigger -> human approval pause/resume -> log, covering the
-- queue/SSE/approval-task pipeline (S2-S4, S7.4) without depending on any
-- of the still-unaudited pack chains.
--
--   lados.workflow.trigger_manual  (starts the run)
--     -> lados.human.request_approval  (creates a real approval task,
--        pauses the run; AI must never resolve this — only a human with
--        owner|admin role may decide, via POST /approvals/:taskId/decide)
--     -> lados.workflow.write_log  (logs completion once resumed)
--
-- Connections use REAL port ids (not the generic 'out'/'in' placeholder),
-- so this also exercises the Phase 21 (S9) port-aware input resolution
-- fix in packages/execution-engine/src/runner.ts.

INSERT INTO workflow_templates
  (slug, name, description, category, tags, icon, color, preview_nodes, sort_order, definition)
VALUES (
  'official-node-proof',
  'Official Node Proof (Trigger -> Approval -> Log)',
  'A minimal, fully-official-node workflow proving the runtime pipeline works end-to-end: a manual trigger starts a run, pauses for a real human approval task, and logs completion once a human approves. Built entirely from lados.* official nodes (workflow-foundation + human-work) with no prototype pack dependency.',
  'proof-of-concept',
  ARRAY['Official Nodes', 'Proof of Concept', 'Approval', 'Phase 21'],
  'check-circle',
  '#0F766E',
  ARRAY['Manual Trigger', 'Request Approval', 'Write Log'],
  1,
  '{
    "schemaVersion": "1.0",
    "workflow": {
      "id": "00000000-0000-4000-8000-000000000062",
      "name": "Official Node Proof (Trigger -> Approval -> Log)",
      "version": "1.0.0",
      "status": "draft",
      "createdAt": "2026-07-04T00:00:00.000Z",
      "updatedAt": "2026-07-04T00:00:00.000Z"
    },
    "nodes": [
      {
        "id": "n-trigger",
        "type": "lados.workflow.trigger_manual",
        "label": "Start",
        "position": {"x": 80, "y": 200},
        "config": {
          "label": "Official Node Proof",
          "description": "Manual run proving the official-node pipeline end-to-end."
        }
      },
      {
        "id": "n-approval",
        "type": "lados.human.request_approval",
        "label": "Review & Approve",
        "position": {"x": 380, "y": 200},
        "config": {
          "title": "Approve official-node proof run",
          "description": "Confirms the official runtime pipeline (trigger, queue, pause/resume, SSE status) works end-to-end. Approve to let the run complete.",
          "assigneeRole": "owner"
        }
      },
      {
        "id": "n-log",
        "type": "lados.workflow.write_log",
        "label": "Log Completion",
        "position": {"x": 680, "y": 200},
        "config": {
          "message": "Official node proof workflow completed successfully.",
          "level": "info"
        }
      }
    ],
    "connections": [
      {"id": "c1", "sourceNodeId": "n-trigger", "sourcePortId": "trigger", "targetNodeId": "n-approval", "targetPortId": "context"},
      {"id": "c2", "sourceNodeId": "n-approval", "sourcePortId": "approvalTask", "targetNodeId": "n-log", "targetPortId": "data"}
    ],
    "variables": [],
    "metadata": {
      "packId": null,
      "author": "Lados Platform",
      "name": "Official Node Proof (Trigger -> Approval -> Log)",
      "description": "First fully-official-node workflow template, Phase 21 S9 follow-through.",
      "version": "1.0.0"
    }
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  definition  = EXCLUDED.definition,
  updated_at  = now();
