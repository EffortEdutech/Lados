export type ConnectionAuthType = 'none' | 'api_key' | 'basic' | 'oauth2' | 'webhook_secret';
export type ConnectionStatus = 'active' | 'disabled' | 'revoked';
export type ConnectionHealthStatus = 'untested' | 'healthy' | 'unhealthy' | 'expired';

export interface SecretEnvelope {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
}

export interface ConnectionProfileRow {
  id: string;
  organization_id: string;
  name: string;
  provider: string;
  connection_type: string;
  auth_type: ConnectionAuthType;
  status: ConnectionStatus;
  health_status: ConnectionHealthStatus;
  scopes: string[];
  secret_envelope: SecretEnvelope | null;
  metadata: Record<string, unknown>;
  token_expires_at: string | null;
  last_verified_at: string | null;
  last_error_code: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionProfileView {
  id: string;
  organizationId: string;
  name: string;
  provider: string;
  connectionType: string;
  authType: ConnectionAuthType;
  status: ConnectionStatus;
  healthStatus: ConnectionHealthStatus;
  scopes: string[];
  hasCredentials: boolean;
  metadata: Record<string, unknown>;
  tokenExpiresAt: string | null;
  lastVerifiedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedConnection {
  id: string;
  organizationId: string;
  provider: string;
  connectionType: string;
  authType: ConnectionAuthType;
  scopes: string[];
  credentials: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ConnectionProbeResult {
  healthy: boolean;
  code?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectionProviderAdapter {
  readonly provider: string;
  probe(connection: ResolvedConnection): Promise<ConnectionProbeResult>;
  revoke?(connection: ResolvedConnection): Promise<void>;
}

export interface ConnectionResolver {
  resolve(organizationId: string, connectionId: string, requiredScopes?: string[]): Promise<ResolvedConnection>;
}

