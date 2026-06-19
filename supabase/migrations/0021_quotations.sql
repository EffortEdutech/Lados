-- ============================================================
-- Migration 0021 — Quotations
-- Sprint 17 (S17-005)
-- ============================================================
-- quotations  : submitted supplier quotations for a trade package
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quotations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  distribution_id  UUID REFERENCES public.rfq_distributions(id) ON DELETE SET NULL,
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  trade            TEXT NOT NULL,
  -- Line items array: [{item_no, description, unit, qty, rate, amount}]
  line_items       JSONB NOT NULL DEFAULT '[]',
  total_amount     NUMERIC(14, 2),
  currency         TEXT NOT NULL DEFAULT 'MYR',
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validity_days    INTEGER DEFAULT 90,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('draft', 'submitted', 'evaluated', 'awarded', 'rejected')),
  created_by       UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS quotations_updated_at ON public.quotations;
CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_quotations_org       ON public.quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project   ON public.quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier  ON public.quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotations_trade     ON public.quotations(trade);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_quotations"
  ON public.quotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = quotations.organization_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "org_members_can_insert_quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = quotations.organization_id AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
  ));

CREATE POLICY "org_members_can_update_quotations"
  ON public.quotations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = quotations.organization_id AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
  ));

COMMENT ON TABLE  public.quotations              IS 'Supplier quotations received in response to RFQs';
COMMENT ON COLUMN public.quotations.line_items   IS 'JSONB array: [{item_no, description, unit, qty, rate, amount}]';
COMMENT ON COLUMN public.quotations.status       IS 'draft=not submitted; submitted=received; evaluated=reviewed; awarded=PO issued; rejected=not selected';
