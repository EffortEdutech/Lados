-- ============================================================
-- Migration 0054: Supabase advisor remediation (PD-3)
-- ============================================================
-- Part A — function_search_path_mutable (6 WARN):
--   Pin search_path on all trigger helper functions so they cannot
--   be hijacked by a role-level search_path change.
-- Part B — unindexed_foreign_keys (34 INFO):
--   Covering indexes for every unindexed FK, generated from
--   pg_constraint on 2026-07-02.
-- ============================================================

-- ── Part A: pin function search_path ─────────────────────────

ALTER FUNCTION public.set_lados_resources_updated_at()      SET search_path = '';
ALTER FUNCTION public.set_lados_state_machines_updated_at() SET search_path = '';
ALTER FUNCTION public.set_api_keys_updated_at()             SET search_path = '';
ALTER FUNCTION public.update_lados_artifacts_updated_at()   SET search_path = '';
ALTER FUNCTION public.update_ai_sessions_updated_at()       SET search_path = '';
ALTER FUNCTION public.set_updated_at()                      SET search_path = '';

-- ── Part B: FK covering indexes ──────────────────────────────

CREATE INDEX IF NOT EXISTS projects_created_by_idx                    ON public.projects (created_by);
CREATE INDEX IF NOT EXISTS workflows_created_by_idx                   ON public.workflows (created_by);
CREATE INDEX IF NOT EXISTS workflows_published_by_idx                 ON public.workflows (published_by);
CREATE INDEX IF NOT EXISTS execution_runs_organization_id_idx         ON public.execution_runs (organization_id);
CREATE INDEX IF NOT EXISTS execution_runs_started_by_idx              ON public.execution_runs (started_by);
CREATE INDEX IF NOT EXISTS uploads_uploaded_by_idx                    ON public.uploads (uploaded_by);
CREATE INDEX IF NOT EXISTS project_files_uploaded_by_idx              ON public.project_files (uploaded_by);
CREATE INDEX IF NOT EXISTS approval_tasks_decided_by_idx              ON public.approval_tasks (decided_by);
CREATE INDEX IF NOT EXISTS approval_tasks_workflow_id_idx             ON public.approval_tasks (workflow_id);
CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx                     ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS project_artifacts_execution_run_id_idx     ON public.project_artifacts (execution_run_id);
CREATE INDEX IF NOT EXISTS project_artifacts_source_workflow_id_idx   ON public.project_artifacts (source_workflow_id);
CREATE INDEX IF NOT EXISTS org_dp_installations_installed_by_idx      ON public.org_data_pack_installations (installed_by);
CREATE INDEX IF NOT EXISTS notifications_org_id_idx                   ON public.notifications (org_id);
CREATE INDEX IF NOT EXISTS rfq_distributions_project_id_idx           ON public.rfq_distributions (project_id);
CREATE INDEX IF NOT EXISTS quotations_distribution_id_idx             ON public.quotations (distribution_id);
CREATE INDEX IF NOT EXISTS workflow_versions_created_by_idx           ON public.workflow_versions (created_by);
CREATE INDEX IF NOT EXISTS lados_resources_created_by_idx             ON public.lados_resources (created_by);
CREATE INDEX IF NOT EXISTS lados_resources_updated_by_idx             ON public.lados_resources (updated_by);
CREATE INDEX IF NOT EXISTS lados_event_subs_created_by_idx            ON public.lados_event_subscriptions (created_by);
CREATE INDEX IF NOT EXISTS api_keys_created_by_idx                    ON public.api_keys (created_by);
CREATE INDEX IF NOT EXISTS lados_artifacts_created_by_idx             ON public.lados_artifacts (created_by);
CREATE INDEX IF NOT EXISTS lados_artifacts_run_id_idx                 ON public.lados_artifacts (run_id);
CREATE INDEX IF NOT EXISTS lados_artifact_versions_written_by_idx     ON public.lados_artifact_versions (written_by);
CREATE INDEX IF NOT EXISTS pack_node_overrides_overridden_by_idx      ON public.pack_node_overrides (overridden_by);
CREATE INDEX IF NOT EXISTS group_run_logs_project_id_idx              ON public.group_run_logs (project_id);
CREATE INDEX IF NOT EXISTS group_run_logs_triggered_by_idx            ON public.group_run_logs (triggered_by);
CREATE INDEX IF NOT EXISTS resource_bindings_created_by_idx           ON public.resource_bindings (created_by);
CREATE INDEX IF NOT EXISTS resource_bindings_project_id_idx           ON public.resource_bindings (project_id);
CREATE INDEX IF NOT EXISTS registry_packs_published_by_idx            ON public.registry_packs (published_by);
CREATE INDEX IF NOT EXISTS registry_packs_verified_by_idx             ON public.registry_packs (verified_by);
CREATE INDEX IF NOT EXISTS org_dp_installs_data_pack_id_idx           ON public.org_data_pack_installs (data_pack_id);
CREATE INDEX IF NOT EXISTS org_dp_installs_installed_by_idx           ON public.org_data_pack_installs (installed_by);
CREATE INDEX IF NOT EXISTS org_dp_installs_version_id_idx             ON public.org_data_pack_installs (version_id);
