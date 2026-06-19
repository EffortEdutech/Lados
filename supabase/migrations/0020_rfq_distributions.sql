-- ============================================================
-- Migration 0020 — RFQ Distributions
-- Sprint 17 (S17-004)
-- ============================================================
-- rfq_distributions : tracks which RFQ docs were sent to which suppliers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rfq_distributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  run_id           UUID REFERENCES public.execution_runs(id) ON DELETE SET NULL,
  trade            TEXT NOT NULL,
  storage_path     TEXT NOT NULL,          -- path in Supabase Storage
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'acknowledged', 'declined')),
  sent_at          TIMESTAMPTZ,
  supplier_ref     TEXT,                   -- supplier's own reference/PO number
  notes            TEXT,
  created_by       UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS rfq_distributions_updated_at ON public.rfq_distributions;
CREATE TRIGGER rfq_distributions_updated_at
  BEFORE UPDATE ON public.rfq_distributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_rfq_dist_org      ON public.rfq_distributions(organization_id);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_run      ON public.rfq_distributions(run_id);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_supplier ON public.rfq_distributions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_dist_trade    ON public.rfq_distributions(trade);

ALTER TABLE public.rfq_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_rfq_dist"
  ON public.rfq_distributions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = rfq_distributions.organization_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "org_members_can_insert_rfq_dist"
  ON public.rfq_distributions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = rfq_distributions.organization_id AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
  ));

CREATE POLICY "org_members_can_update_rfq_dist"
  ON public.rfq_distributions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = rfq_distributions.organization_id AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'member')
  ));

COMMENT ON TABLE  public.rfq_distributions         IS 'Tracks RFQ document distribution to individual suppliers';
COMMENT ON COLUMN public.rfq_distributions.trade   IS 'Trade package this RFQ covers e.g. Structural';
COMMENT ON COLUMN public.rfq_distributions.status  IS 'pending=not yet sent; sent=emailed/shared; acknowledged=supplier confirmed; declined=supplier passed';
