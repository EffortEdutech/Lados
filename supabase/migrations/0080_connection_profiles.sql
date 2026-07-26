-- Phase 27 S27.3: organization-scoped Connection Profiles.
-- Secret material is encrypted by the API before it reaches this table.

CREATE TABLE public.connection_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  connection_type TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('none', 'api_key', 'basic', 'oauth2', 'webhook_secret')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'revoked')),
  health_status TEXT NOT NULL DEFAULT 'untested' CHECK (health_status IN ('untested', 'healthy', 'unhealthy', 'expired')),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  secret_envelope JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  token_expires_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_connection_profiles_org_provider
  ON public.connection_profiles (organization_id, provider, status);

ALTER TABLE public.connection_profiles ENABLE ROW LEVEL SECURITY;

-- The API uses the service role and applies SecurityEngine permissions.
-- No direct authenticated-client policy is intentionally granted because
-- secret_envelope must never cross the API boundary.

COMMENT ON TABLE public.connection_profiles IS
  'Organization connection metadata plus API-encrypted credential envelope. Service-role access only.';
COMMENT ON COLUMN public.connection_profiles.secret_envelope IS
  'AES-256-GCM envelope. Never return through an API response or execution log.';

