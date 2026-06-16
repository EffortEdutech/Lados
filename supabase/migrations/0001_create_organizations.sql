-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0001: Organizations + Organization Members
-- QS-OS V2 (QS-WFUI) — Sprint 2
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Organizations ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS 'Top-level tenant — a company or team using QS-OS.';

-- ── Organization members ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organization_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'member'
                              CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

COMMENT ON TABLE public.organization_members IS 'Many-to-many: users ↔ organizations with a role.';

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON public.organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON public.organization_members(organization_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations: visible to members only
CREATE POLICY "org_select_members"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Organizations: owner/admin can update
CREATE POLICY "org_update_admin"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organizations: authenticated users can create (they become owner via trigger / service layer)
CREATE POLICY "org_insert_authenticated"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Organization members: users can see memberships in their orgs
CREATE POLICY "org_members_select"
  ON public.organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Organization members: owners/admins can manage members
CREATE POLICY "org_members_insert_admin"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_members_delete_admin"
  ON public.organization_members FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
