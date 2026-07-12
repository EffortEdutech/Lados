-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0076: approval_tasks — relax workflow_id/project_id NOT NULL
-- Phase 23 S23.2 — bugfix found while implementing PipelineExecutionService.
--
-- Migration 0075 relaxed execution_id's NOT NULL and added the
-- approval_tasks_execution_xor_pipeline CHECK constraint so a pipeline_gate
-- task could have execution_id NULL. It missed that workflow_id and
-- project_id (migration 0010_sprint10_templates_approvals.sql) are ALSO
-- NOT NULL on this table, and a pipeline_gate task has no associated
-- workflow or project either (it belongs to a pipeline_run, which can span
-- multiple workflows/projects). Without this fix, ApprovalTaskCreator.
-- createPipelineGate() would fail every insert with a NOT NULL violation.
-- Caught before any pipeline_gate row was ever inserted in production —
-- S23.2 is the first code path that actually creates one.
--
-- node_id/node_name are deliberately NOT relaxed here — createPipelineGate()
-- always populates them (node_id = the gate's pipeline-layout stage id,
-- node_name = the gate's configured label), so they stay meaningful and
-- NOT NULL for every task_type.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.approval_tasks
  ALTER COLUMN workflow_id DROP NOT NULL;

ALTER TABLE public.approval_tasks
  ALTER COLUMN project_id DROP NOT NULL;

COMMENT ON COLUMN public.approval_tasks.workflow_id IS
  'NULL for pipeline_gate tasks (not tied to a single workflow). NOT NULL in practice for approval/input tasks. Phase 23 S23.2.';
COMMENT ON COLUMN public.approval_tasks.project_id IS
  'NULL for pipeline_gate tasks (not tied to a single project). NOT NULL in practice for approval/input tasks. Phase 23 S23.2.';
