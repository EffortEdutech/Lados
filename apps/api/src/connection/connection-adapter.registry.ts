import { Injectable } from '@nestjs/common';
import type { ConnectionProbeResult, ConnectionProviderAdapter, ResolvedConnection } from './connection.types';

class FoundationConnectionAdapter implements ConnectionProviderAdapter {
  readonly provider = '*';

  async probe(connection: ResolvedConnection): Promise<ConnectionProbeResult> {
    const hasCredential = Object.values(connection.credentials).some((value) => (
      typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined
    ));
    if (connection.authType !== 'none' && !hasCredential) {
      return { healthy: false, code: 'CREDENTIALS_MISSING', message: 'Credentials are required' };
    }
    return {
      healthy: true,
      code: 'FOUNDATION_VALIDATED',
      message: 'Connection structure and credential envelope are valid',
    };
  }
}

@Injectable()
export class ConnectionAdapterRegistry {
  private readonly adapters = new Map<string, ConnectionProviderAdapter>();
  private readonly foundation = new FoundationConnectionAdapter();

  register(adapter: ConnectionProviderAdapter): void {
    this.adapters.set(adapter.provider.toLowerCase(), adapter);
  }

  resolve(provider: string): ConnectionProviderAdapter {
    return this.adapters.get(provider.toLowerCase()) ?? this.foundation;
  }
}
