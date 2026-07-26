import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { SecurityEngineService } from '../security/security.service';
import { ConnectionCryptoService } from './connection-crypto.service';
import { ConnectionAdapterRegistry } from './connection-adapter.registry';
import type { CreateConnectionDto } from './dto/create-connection.dto';
import type { UpdateConnectionDto } from './dto/update-connection.dto';
import type { ConnectionProfileRow, ConnectionProfileView, ConnectionResolver, ResolvedConnection } from './connection.types';

@Injectable()
export class ConnectionService implements ConnectionResolver {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly security: SecurityEngineService,
    private readonly crypto: ConnectionCryptoService,
    private readonly adapters: ConnectionAdapterRegistry,
  ) {}

  async list(organizationId: string, userId: string): Promise<ConnectionProfileView[]> {
    await this.security.requirePermission(userId, organizationId, 'connection.view');
    const { data, error } = await this.supabase.admin.from('connection_profiles')
      .select('*').eq('organization_id', organizationId).order('name');
    if (error) throw new Error(`Connection list failed: ${error.message}`);
    return (data ?? []).map((row) => this.toView(row as ConnectionProfileRow));
  }

  async create(organizationId: string, userId: string, dto: CreateConnectionDto): Promise<ConnectionProfileView> {
    await this.security.requirePermission(userId, organizationId, 'connection.manage');
    if (dto.authType !== 'none' && !dto.credentials) {
      throw new BadRequestException('Credentials are required for this authentication type');
    }
    this.assertSecretFreeMetadata(dto.metadata);
    const { data, error } = await this.supabase.admin.from('connection_profiles').insert({
      organization_id: organizationId,
      name: dto.name.trim(),
      provider: dto.provider.trim().toLowerCase(),
      connection_type: dto.connectionType.trim().toLowerCase(),
      auth_type: dto.authType,
      scopes: this.normalizeScopes(dto.scopes),
      secret_envelope: dto.credentials ? this.crypto.encrypt(dto.credentials) : null,
      metadata: dto.metadata ?? {},
      token_expires_at: dto.tokenExpiresAt ?? null,
      created_by: userId,
      updated_by: userId,
    }).select('*').single();
    if (error || !data) throw new Error(`Connection creation failed: ${error?.message ?? 'No row returned'}`);
    await this.audit(organizationId, userId, data.id as string, 'connection.created', 'Connection profile created');
    return this.toView(data as ConnectionProfileRow);
  }

  async update(organizationId: string, connectionId: string, userId: string, dto: UpdateConnectionDto): Promise<ConnectionProfileView> {
    await this.security.requirePermission(userId, organizationId, 'connection.manage');
    await this.getRow(organizationId, connectionId);
    const updates: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
    if (dto.name !== undefined) updates['name'] = dto.name.trim();
    if (dto.scopes !== undefined) updates['scopes'] = this.normalizeScopes(dto.scopes);
    if (dto.credentials !== undefined) updates['secret_envelope'] = this.crypto.encrypt(dto.credentials);
    if (dto.metadata !== undefined) updates['metadata'] = dto.metadata;
    this.assertSecretFreeMetadata(dto.metadata);
    if (dto.tokenExpiresAt !== undefined) updates['token_expires_at'] = dto.tokenExpiresAt;
    updates['health_status'] = 'untested';
    updates['last_error_code'] = null;
    const { data, error } = await this.supabase.admin.from('connection_profiles').update(updates)
      .eq('organization_id', organizationId).eq('id', connectionId).select('*').single();
    if (error || !data) throw new Error(`Connection update failed: ${error?.message ?? 'No row returned'}`);
    await this.audit(organizationId, userId, connectionId, 'connection.updated', 'Connection profile updated');
    return this.toView(data as ConnectionProfileRow);
  }

  async test(organizationId: string, connectionId: string, userId: string): Promise<ConnectionProfileView> {
    await this.security.requirePermission(userId, organizationId, 'connection.manage');
    const connection = await this.resolve(organizationId, connectionId);
    const result = await this.adapters.resolve(connection.provider).probe(connection);
    const now = new Date().toISOString();
    const { data, error } = await this.supabase.admin.from('connection_profiles').update({
      health_status: result.healthy ? 'healthy' : 'unhealthy',
      last_verified_at: now,
      last_error_code: result.healthy ? null : (result.code ?? 'PROBE_FAILED'),
      updated_by: userId,
      updated_at: now,
    }).eq('organization_id', organizationId).eq('id', connectionId).select('*').single();
    if (error || !data) throw new Error(`Connection health update failed: ${error?.message ?? 'No row returned'}`);
    await this.audit(organizationId, userId, connectionId, 'connection.tested', result.healthy ? 'Connection test passed' : 'Connection test failed', { code: result.code });
    return this.toView(data as ConnectionProfileRow);
  }

  async setStatus(organizationId: string, connectionId: string, userId: string, status: 'active' | 'disabled' | 'revoked'): Promise<ConnectionProfileView> {
    await this.security.requirePermission(userId, organizationId, 'connection.manage');
    const existing = await this.getRow(organizationId, connectionId);
    if (existing.status === 'revoked' && status !== 'revoked') {
      throw new BadRequestException('A revoked connection cannot be reactivated');
    }
    if (status === 'revoked' && existing.secret_envelope) {
      await this.adapters.resolve(existing.provider).revoke?.(await this.toResolved(existing));
    }
    const { data, error } = await this.supabase.admin.from('connection_profiles').update({
      status,
      health_status: status === 'active' ? 'untested' : existing.health_status,
      secret_envelope: status === 'revoked' ? null : existing.secret_envelope,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }).eq('organization_id', organizationId).eq('id', connectionId).select('*').single();
    if (error || !data) throw new Error(`Connection status update failed: ${error?.message ?? 'No row returned'}`);
    await this.audit(organizationId, userId, connectionId, `connection.${status}`, `Connection profile ${status}`);
    return this.toView(data as ConnectionProfileRow);
  }

  async resolve(organizationId: string, connectionId: string, requiredScopes: string[] = []): Promise<ResolvedConnection> {
    const row = await this.getRow(organizationId, connectionId);
    if (row.status !== 'active') throw new BadRequestException(`Connection is ${row.status}`);
    if (row.token_expires_at && new Date(row.token_expires_at).getTime() <= Date.now()) {
      throw new BadRequestException('Connection token is expired');
    }
    const missing = requiredScopes.filter((scope) => !row.scopes.includes(scope));
    if (missing.length > 0) throw new BadRequestException(`Connection is missing required scopes: ${missing.join(', ')}`);
    return this.toResolved(row);
  }

  private async getRow(organizationId: string, connectionId: string): Promise<ConnectionProfileRow> {
    const { data, error } = await this.supabase.admin.from('connection_profiles').select('*')
      .eq('organization_id', organizationId).eq('id', connectionId).maybeSingle();
    if (error) throw new Error(`Connection lookup failed: ${error.message}`);
    if (!data) throw new NotFoundException('Connection profile not found');
    return data as ConnectionProfileRow;
  }

  private async toResolved(row: ConnectionProfileRow): Promise<ResolvedConnection> {
    return {
      id: row.id,
      organizationId: row.organization_id,
      provider: row.provider,
      connectionType: row.connection_type,
      authType: row.auth_type,
      scopes: row.scopes ?? [],
      credentials: row.secret_envelope ? this.crypto.decrypt(row.secret_envelope) : {},
      metadata: row.metadata ?? {},
    };
  }

  private toView(row: ConnectionProfileRow): ConnectionProfileView {
    return {
      id: row.id, organizationId: row.organization_id, name: row.name,
      provider: row.provider, connectionType: row.connection_type, authType: row.auth_type,
      status: row.status, healthStatus: row.health_status, scopes: row.scopes ?? [],
      hasCredentials: Boolean(row.secret_envelope), metadata: row.metadata ?? {},
      tokenExpiresAt: row.token_expires_at, lastVerifiedAt: row.last_verified_at,
      lastErrorCode: row.last_error_code, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private normalizeScopes(scopes?: string[]): string[] {
    return [...new Set((scopes ?? []).map((scope) => scope.trim()).filter(Boolean))].sort();
  }

  private assertSecretFreeMetadata(metadata?: Record<string, unknown>): void {
    if (!metadata) return;
    const sensitiveKey = /(authorization|password|secret|token|api[_-]?key|credential)/i;
    const inspect = (value: unknown): boolean => {
      if (!value || typeof value !== 'object') return false;
      return Object.entries(value as Record<string, unknown>).some(([key, nested]) => (
        sensitiveKey.test(key) || inspect(nested)
      ));
    };
    if (inspect(metadata)) {
      throw new BadRequestException('Sensitive values belong in credentials, not connection metadata');
    }
  }

  private async audit(organizationId: string, actorId: string, entityId: string, eventType: string, summary: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const { error } = await this.supabase.admin.from('audit_log').insert({
      organization_id: organizationId, actor_id: actorId, event_type: eventType,
      entity_type: 'connection_profile', entity_id: entityId, summary, metadata,
    });
    if (error) throw new Error(`Connection audit failed: ${error.message}`);
  }
}
