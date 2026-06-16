-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002: Projects
-- QS-OS V2 (QS-WFUI) — Sprint 2
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  code            TEXT        NOT NULL,                 -- e.g. "PROJ-001"
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  currency        TEXT        NOT NULL DEFAULT 'MYR',
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

COMMENT ON TABLE public.projects IS 'A construction project within an organization. Workflows belong to projects.';

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_org_id
  ON public.projects(organization_id);

CREATE INDEX IF NOT EXISTS idx_projects_status
  ON public.projects(status);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Members of the org can view all projects in that org
CREATE POLICY "projects_select_org_members"
  ON public.projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Members (owner/admin/member) can create projects
CREATE POLICY "projects_insert_members"
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Owner/admin can update projects
CREATE POLICY "projects_update_admin"
  ON public.projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only owner can delete projects
CREATE POLICY "projects_delete_owner"
  ON public.projects FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
