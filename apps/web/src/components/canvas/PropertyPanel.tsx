'use client';

/**
 * PropertyPanel — shown on the right when a node is selected on the canvas.
 * Dynamically renders config fields from the node's config_schema.
 *
 * Sprint 5 (S5-007).
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import type { Node } from 'reactflow';

interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'file' | 'json' | 'secret';
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface NodeDefinition {
  type: string;
  name: string;
  description?: string;
  category: string;
  color?: string;
  config_schema: ConfigField[];
  packs?: { display_name: string };
}

interface PropertyPanelProps {
  selectedNode: Node | null;
  onConfigChange: (nodeId: string, config: Record<string, unknown>) => void;
}

export default function PropertyPanel({ selectedNode, onConfigChange }: PropertyPanelProps) {
  const [nodeDef, setNodeDef] = useState<NodeDefinition | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedNode) {
      setNodeDef(null);
      setConfig({});
      return;
    }

    const nodeType = selectedNode.data?.nodeType as string | undefined;
    if (!nodeType) return;

    setLoading(true);
    apiClient
      .get<NodeDefinition>(`/nodes/${encodeURIComponent(nodeType)}`)
      .then((res) => {
        setNodeDef(res.data ?? null);
        // Seed config with existing data from node, falling back to defaults
        const existing = (selectedNode.data?.config ?? {}) as Record<string, unknown>;
        const defaults: Record<string, unknown> = {};
        for (const field of res.data?.config_schema ?? []) {
          defaults[field.key] = existing[field.key] ?? field.defaultValue ?? '';
        }
        setConfig(defaults);
      })
      .catch(() => setNodeDef(null))
      .finally(() => setLoading(false));
  }, [selectedNode?.id, selectedNode?.data?.nodeType]);

  const handleChange = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    if (selectedNode) {
      onConfigChange(selectedNode.id, next);
    }
  };

  if (!selectedNode) {
    return (
      <aside className="w-64 flex-shrink-0 border-l border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-400 text-center mt-8">
          Select a node to configure it
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col overflow-hidden border-l border-gray-200 bg-white">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-100"
        style={{ borderTop: `3px solid ${nodeDef?.color ?? '#6B7280'}` }}
      >
        <p className="text-xs text-gray-400 mb-0.5">
          {nodeDef?.packs?.display_name ?? '—'} Pack
        </p>
        <h3 className="font-semibold text-gray-900 text-sm">
          {nodeDef?.name ?? selectedNode.data?.label ?? 'Node'}
        </h3>
        {nodeDef?.description && (
          <p className="mt-1 text-xs text-gray-500">{nodeDef.description}</p>
        )}
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
        )}

        {!loading && nodeDef && nodeDef.config_schema.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            This node has no configuration.
          </p>
        )}

        {!loading &&
          nodeDef?.config_schema.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>

              {field.description && (
                <p className="text-[11px] text-gray-400 mb-1">{field.description}</p>
              )}

              {/* Text / secret / file */}
              {(field.type === 'string' || field.type === 'secret' || field.type === 'file') && (
                <input
                  type={field.type === 'secret' ? 'password' : 'text'}
                  value={(config[field.key] as string) ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                />
              )}

              {/* Number */}
              {field.type === 'number' && (
                <input
                  type="number"
                  value={(config[field.key] as number) ?? ''}
                  onChange={(e) => handleChange(field.key, Number(e.target.value))}
                  placeholder={field.placeholder}
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                />
              )}

              {/* Boolean */}
              {field.type === 'boolean' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config[field.key])}
                    onChange={(e) => handleChange(field.key, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs text-gray-600">Enabled</span>
                </label>
              )}

              {/* Select */}
              {field.type === 'select' && (
                <select
                  value={(config[field.key] as string) ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none bg-white"
                >
                  <option value="">— Select —</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Textarea / JSON */}
              {(field.type === 'textarea' || field.type === 'json') && (
                <textarea
                  value={(config[field.key] as string) ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.type === 'json' ? 4 : 3}
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none font-mono resize-none"
                />
              )}
            </div>
          ))}
      </div>

      {/* Footer — node type */}
      <div className="p-3 border-t border-gray-100">
        <p className="text-[10px] font-mono text-gray-400 truncate">
          {selectedNode.data?.nodeType ?? '—'}
        </p>
      </div>
    </aside>
  );
}
