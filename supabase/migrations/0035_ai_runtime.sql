-- =============================================================================
-- Migration 0035 — AI Runtime (Phase 10)
--
-- Creates the lados_ai_outputs ledger table.
-- Every call to AiService.runAssist() writes one row here.
--
-- Guardrail: this table is append-only observational data.
-- No row in this table directly modifies resource state, approvals,
-- invoices, or payments. AI outputs are advisory only.
--
-- Sprint 10 (S10-001)
-- =============================================================================

-- ── lados_ai_outputs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lados_ai_outputs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Session groups multiple turns in a single chat conversation
  session_id       text        NOT NULL DEFAULT gen_random_uuid()::text,

  -- Human intent summary (first ~120 chars of user message)
  intent           text,

  -- Snapshot of the context object passed to the model (resources + events)
  context_snapshot jsonb       NOT NULL DEFAULT '{}',

  -- The final text response returned to the caller
  response         text        NOT NULL DEFAULT '',

  -- Raw tool_calls array from the model (may span multiple rounds)
  tool_calls       jsonb       NOT NULL DEFAULT '[]',

  -- Resource IDs referenced by tool call results
  resource_refs    jsonb       NOT NULL DEFAULT '[]',

  -- Token accounting
  tokens_used      integer     NOT NULL DEFAULT 0,

  -- Model used (e.g. 'gpt-4o-mini', 'gpt-4o')
  model            text        NOT NULL DEFAULT 'gpt-4o-mini',

  -- Total wall-clock latency for the full runAssist() call (ms)
  latency_ms       integer,

  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the owner assistant's session history + org-level audit
CREATE INDEX IF NOT EXISTS idx_ai_outputs_org_id     ON lados_ai_outputs(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_actor_id   ON lados_ai_outputs(actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_session_id ON lados_ai_outputs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_created_at ON lados_ai_outputs(created_at DESC);

-- ── Row-level security ───────────────────────────────────────────────────────

ALTER TABLE lados_ai_outputs ENABLE ROW LEVEL SECURITY;

-- Owners and admins can read AI outputs for their org
CREATE POLICY "ai_outputs_read_owner_admin" ON lados_ai_outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = lados_ai_outputs.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- The service role (API server) can insert and select freely
-- (service role bypasses RLS by default in Supabase)

-- ── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE  lados_ai_outputs IS 'Append-only ledger of every AI assist call. Advisory only — no row here affects resource state.';
COMMENT ON COLUMN lados_ai_outputs.session_id       IS 'Groups multiple turns in one chat session (UUID string, owner assigns)';
COMMENT ON COLUMN lados_ai_outputs.context_snapshot IS 'The context object fed to the model: org, role, resourceSummary, recentEvents, availableTools';
COMMENT ON COLUMN lados_ai_outputs.tool_calls       IS 'All tool_calls arrays across all OpenAI rounds in this runAssist call';
COMMENT ON COLUMN lados_ai_outputs.resource_refs    IS 'IDs of lados_resources rows surfaced by tool call results';
COMMENT ON COLUMN lados_ai_outputs.latency_ms       IS 'Total wall-clock time for the full runAssist() including tool rounds';
