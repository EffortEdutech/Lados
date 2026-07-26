'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient, apiErrorMessage } from '@/lib/api/client';

interface Organization { id: string; name?: string; membership?: { role?: string } }
interface ConnectionProfile {
  id: string;
  name: string;
  provider: string;
  connectionType: string;
  authType: string;
  status: 'active' | 'disabled' | 'revoked';
  healthStatus: 'untested' | 'healthy' | 'unhealthy' | 'expired';
  scopes: string[];
  hasCredentials: boolean;
}

export default function ConnectionsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('generic');
  const [connectionType, setConnectionType] = useState('http');
  const [authType, setAuthType] = useState('api_key');
  const [credential, setCredential] = useState('');
  const [scopes, setScopes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedOrg = orgs.find((org) => org.id === organizationId);
  const canManage = ['owner', 'admin'].includes(selectedOrg?.membership?.role ?? '');

  const loadConnections = useCallback(async (orgId: string) => {
    const res = await apiClient.get<ConnectionProfile[]>(`/connections?organizationId=${encodeURIComponent(orgId)}`);
    if (res.success) {
      setConnections(res.data ?? []);
      setError(null);
    } else setError(apiErrorMessage(res.error, 'Failed to load connections'));
  }, []);

  useEffect(() => {
    void apiClient.get<Organization[]>('/organizations').then((res) => {
      if (!res.success) {
        setError(apiErrorMessage(res.error, 'Failed to load organizations'));
        return;
      }
      const data = res.data ?? [];
      setOrgs(data);
      setOrganizationId(data[0]?.id ?? '');
    });
  }, []);

  useEffect(() => {
    if (organizationId) void loadConnections(organizationId);
  }, [organizationId, loadConnections]);

  async function createConnection() {
    if (!name.trim() || !provider.trim() || !connectionType.trim()) return;
    setBusy('create');
    setError(null);
    setNotice(null);
    const res = await apiClient.post<ConnectionProfile>(`/connections?organizationId=${encodeURIComponent(organizationId)}`, {
      name: name.trim(),
      provider: provider.trim(),
      connectionType: connectionType.trim(),
      authType,
      scopes: scopes.split(',').map((scope) => scope.trim()).filter(Boolean),
      credentials: authType === 'none' ? undefined : { value: credential },
    });
    setCredential('');
    if (!res.success) setError(apiErrorMessage(res.error, 'Failed to create connection'));
    else {
      setName('');
      setScopes('');
      setNotice('Connection profile created.');
      await loadConnections(organizationId);
    }
    setBusy(null);
  }

  async function lifecycle(id: string, action: 'test' | 'disable' | 'reconnect' | 'revoke') {
    setBusy(`${id}:${action}`);
    setError(null);
    setNotice(null);
    const res = await apiClient.post<ConnectionProfile>(`/connections/${id}/${action}?organizationId=${encodeURIComponent(organizationId)}`, {});
    if (!res.success) setError(apiErrorMessage(res.error, `Connection ${action} failed`));
    else {
      setNotice(`Connection ${action} completed.`);
      await loadConnections(organizationId);
    }
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Connections</h1>
          <p className="text-sm text-gray-500">Organization provider access and health</p>
        </div>
        <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
          {orgs.map((org) => <option key={org.id} value={org.id}>{org.name ?? org.id}</option>)}
        </select>
      </div>

      {error && <div className="border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div className="border-l-4 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {canManage && (
        <section className="space-y-3 border-y border-gray-200 py-5">
          <h2 className="text-sm font-semibold text-gray-900">New connection</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Connection name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input value={connectionType} onChange={(e) => setConnectionType(e.target.value)} placeholder="Connection type" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="none">No authentication</option>
              <option value="api_key">API key</option>
              <option value="basic">Basic</option>
              <option value="oauth2">OAuth 2</option>
              <option value="webhook_secret">Webhook secret</option>
            </select>
            <input type="password" value={credential} onChange={(e) => setCredential(e.target.value)} disabled={authType === 'none'} placeholder="Credential" autoComplete="new-password" className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100" />
            <input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="Scopes, comma separated" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={() => void createConnection()} disabled={busy === 'create' || !name.trim()} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create connection</button>
        </section>
      )}

      <section className="divide-y divide-gray-200 border-y border-gray-200">
        {connections.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No connections configured</p>}
        {connections.map((connection) => (
          <div key={connection.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <div className="font-semibold text-gray-900">{connection.name}</div>
              <div className="text-xs text-gray-500">{connection.provider} · {connection.connectionType} · {connection.hasCredentials ? 'credentials stored' : 'no credentials'}</div>
              {connection.scopes.length > 0 && <div className="mt-1 text-xs text-gray-500">Scopes: {connection.scopes.join(', ')}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs"><span className="border border-gray-200 px-2 py-1">{connection.status}</span><span className="border border-gray-200 px-2 py-1">{connection.healthStatus}</span></div>
            {canManage && connection.status !== 'revoked' && (
              <div className="flex gap-2">
                <button onClick={() => void lifecycle(connection.id, 'test')} disabled={Boolean(busy)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs">Test</button>
                <button onClick={() => void lifecycle(connection.id, connection.status === 'active' ? 'disable' : 'reconnect')} disabled={Boolean(busy)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs">{connection.status === 'active' ? 'Disable' : 'Reconnect'}</button>
                <button onClick={() => void lifecycle(connection.id, 'revoke')} disabled={Boolean(busy)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700">Revoke</button>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
