-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0069: Departments + Department Members
-- Phase 22 S22.1 (Schema Foundations)
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds a department/business-unit layer between organization and project, for
-- multi-department corporations. Fully additive: `projects.department_id` is
-- nullable, so every existing project/org keeps working with zero department
-- assigned. Nothing reads or enforces department scope yet — that lands in
-- S22.2 (approval routing) and S22.3 (monitoring rollups).
--
-- department_members is a SEPARATE table from organization_members (not a
-- column added to it) so a user's org-level role and department-level role
-- can differ — e.g. an org `member` who is `admin` of the Procurement
-- department only. Confirmed with eff 2026-07-05 (Phase22 master plan §9.4).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Departments ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.departments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_department_id  UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  name                  TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

COMMENT ON TABLE public.departments IS
  'Business-unit layer between organization and project. Nullable-parent tree allows nested departments (e.g. "Commercial" > "QS"). Phase 22 S22.1.';

-- ── Department members ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.department_members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id  UUID        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT        NOT NULL DEFAULT 'member'
                              CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, user_id)
);

COMMENT ON TABLE public.department_members IS
  'Many-to-many: users <-> departments with a role, independent of the user''s organization_members role. Phase 22 S22.1.';

-- ── projects.department_id (nullable — existing rows unaffected) ─────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.department_id IS
  'Optional department scope. NULL means org-wide / no department assigned (default for all pre-Phase-22 projects). Phase 22 S22.1.';

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_departments_org_id
  ON public.departments(organization_id);

CREATE INDEX IF NOT EXISTS idx_departments_parent_id
  ON public.departments(parent_department_id);

CREATE INDEX IF NOT EXISTS idx_department_members_user_id
  ON public.department_members(user_id);

CREATE INDEX IF NOT EXISTS idx_department_members_department_id
  ON public.department_members(department_id);

CREATE INDEX IF NOT EXISTS idx_projects_department_id
  ON public.projects(department_id);

-- ── updated_at trigger (reuses public.set_updated_at() from migration 0001) ──

CREATE TRIGGER departments_set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Mirrors migration 0001's organizations/organization_members policy shape.
-- As with every other table in this app, RLS is defense-in-depth — the API
-- uses the service-role client (bypasses RLS) and enforces authorization in
-- SecurityEngineService; these policies matter only for any future direct
-- client access.

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

-- Departments: visible to any member of the parent organization (department
-- membership is a narrower scope on top of org membership, not a replacement
-- for org-level visibility).
CREATE POLICY "departments_select_org_members"
  ON public.departments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Departments: org owner/admin can create/update.
CREATE POLICY "departments_insert_org_admin"
  ON public.departments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "departments_update_org_admin"
  ON public.departments FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Department members: visible to any member of the parent organization.
CREATE POLICY "department_members_select_org_members"
  ON public.department_members FOR SELECT
  USING (
    department_id IN (
      SELECT d.id FROM public.departments d
      JOIN public.organization_members om ON om.organization_id = d.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Department members: org owner/admin, or the department's own owner/admin, can manage membership.
CREATE POLICY "department_members_insert_admin"
  ON public.department_members FOR INSERT
  WITH CHECK (
    department_id IN (
      SELECT d.id FROM public.departments d
      JOIN public.organization_members om ON om.organization_id = d.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
    OR department_id IN (
      SELECT department_id FROM public.department_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "department_members_delete_admin"
  ON public.department_members FOR DELETE
  USING (
    department_id IN (
      SELECT d.id FROM public.departments d
      JOIN public.organization_members om ON om.organization_id = d.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
    OR department_id IN (
      SELECT department_id FROM public.department_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
