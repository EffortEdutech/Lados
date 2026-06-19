-- ============================================================
-- Migration 0019 — Supplier Database
-- Sprint 17 (S17-001)
-- ============================================================
-- suppliers        : registered supplier/contractor records
-- ============================================================

-- ── suppliers ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.suppliers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  -- Array of trade strings e.g. ['Structural', 'Civil']
  trades           TEXT[]    NOT NULL DEFAULT '{}',
  cidb_grade       TEXT,                        -- e.g. G1, G5, G7
  registration_no  TEXT,                        -- CIDB / SSM registration number
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by       UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS suppliers_updated_at ON public.suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index: fast lookup by org + trade
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_trades ON public.suppliers USING GIN(trades);

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Members of the org can read suppliers
CREATE POLICY "org_members_can_read_suppliers"
  ON public.suppliers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = suppliers.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Members (owner/admin/member) can insert
CREATE POLICY "org_members_can_insert_suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = suppliers.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'member')
    )
  );

-- Members can update their org suppliers
CREATE POLICY "org_members_can_update_suppliers"
  ON public.suppliers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = suppliers.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'member')
    )
  );

-- Only owner/admin can hard-delete
CREATE POLICY "org_admins_can_delete_suppliers"
  ON public.suppliers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = suppliers.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ── Comments ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.suppliers                IS 'Registered supplier/contractor records per organization';
COMMENT ON COLUMN public.suppliers.trades         IS 'Array of trade categories this supplier covers e.g. [Structural, Civil]';
COMMENT ON COLUMN public.suppliers.cidb_grade     IS 'CIDB contractor grade: G1 (smallest) to G7 (largest)';
COMMENT ON COLUMN public.suppliers.registration_no IS 'CIDB or SSM company registration number';
COMMENT ON COLUMN public.suppliers.status         IS 'active = eligible for RFQ; inactive = archived';
