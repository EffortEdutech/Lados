'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import type { FieldProps } from './types';

interface ConnectionOption {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'disabled' | 'revoked';
  healthStatus: 'untested' | 'healthy' | 'unhealthy' | 'expired';
}

export default function ConnectionPickerField({ field, value, onChange, organizationId }: FieldProps) {
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    void apiClient.get<ConnectionOption[]>(`/connections?organizationId=${encodeURIComponent(organizationId)}`)
      .then((res) => {
        if (res.success) {
          setConnections((res.data ?? []).filter((item) => item.status === 'active'));
          setError(null);
        } else setError(res.error?.message ?? 'Connections unavailable');
      });
  }, [organizationId]);

  return (
    <label className="block space-y-1 text-xs font-medium text-gray-700">
      <span>{field.label}{field.required ? ' *' : ''}</span>
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
      >
        <option value="">Select connection</option>
        {connections.map((connection) => (
          <option key={connection.id} value={connection.id}>
            {connection.name} ({connection.provider}, {connection.healthStatus})
          </option>
        ))}
      </select>
      {error && <span className="text-red-600">{error}</span>}
      {field.description && <span className="block font-normal text-gray-500">{field.description}</span>}
    </label>
  );
}

