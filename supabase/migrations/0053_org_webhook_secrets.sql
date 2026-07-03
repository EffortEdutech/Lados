-- ============================================================
-- Migration 0053: Per-organization webhook secrets (PD-3)
-- ============================================================
-- Replaces the single global WEBHOOK_SECRET with rotatable,
-- per-organization secrets. Multiple active secrets per org are
-- allowed so senders can be migrated without downtime (rotation
-- overlap window). Global WEBHOOK_SECRET remains as a deprecated
-- fallback for orgs with no secret yet.
--
-- Secrets are stored in plaintext because HMAC verification
-- requires the original value (same model as GitHub/Stripe).
-- The table is service-role-only: RLS enabled with NO policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_webhook_secrets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  secret          text NOT NULL,
  label           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz
);

COMMENT ON TABLE organization_webhook_secrets IS
  'Rotatable per-org HMAC secrets for inbound webhooks. Service-role only (RLS, no policies). PD-3.';

-- Fast lookup of active secrets during webhook delivery
CREATE INDEX IF NOT EXISTS org_webhook_secrets_active_idx
  ON organization_webhook_secrets (organization_id)
  WHERE revoked_at IS NULL;

-- Covering index for the created_by FK (advisor: unindexed_foreign_keys)
CREATE INDEX IF NOT EXISTS org_webhook_secrets_created_by_idx
  ON organization_webhook_secrets (created_by);

-- Service-role only: enable RLS, define no policies
ALTER TABLE organization_webhook_secrets ENABLE ROW LEVEL SECURITY;
