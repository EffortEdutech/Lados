'use client';

/**
 * NodePalette — "Skill Library" in V3 terminology.
 *
 * Shows all available skills grouped by Capability Pack.
 * Drag a skill card onto the canvas to add it as a node.
 *
 * Sprint 5:  initial — flat list driven by live GET /api/v1/nodes
 * Sprint 13: V3 — renamed "Skill Library", grouped by pack, service chips,
 *                  search filters across name + description + tags.
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

// ── Type definitions ──────────────────────────────────────────────────────────

interface RegisteredNode {
  type: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color?: string;
  tags?: string[];
  pack_id: string;
  uses_services?: string[];
  data_pack_deps?: string[];
  packs?: {
    id: string;
    display_name: string;
    color?: string;
    icon?: string;
  };
}

// ── Service chip helpers ──────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, string> = {
  'ai-service':       '🤖',
  'storage-service':  '💾',
  'audit-service':    '📋',
  'auth-service':     '🔐',
  'ocr-service':      '🔍',
  'document-service': '📄',
  'notification-service': '🔔',
};

const SERVICE_LABELS: Record<string, string> = {
  'ai-service':       'AI',
  'storage-service':  'Storage',
  'audit-service':    'Audit',
  'auth-service':     'Auth',
  'ocr-service':      'OCR',
  'document-service': 'Docs',
  'notification-service': 'Notify',
};

function ServiceChip({ service }: { service: string }) {
  const icon  = SERVICE_ICONS[service]  ?? '⚙';
  const label = SERVICE_LABELS[service] ?? service;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-500"
      title={service}
    >
      {icon} {label}
    </span>
  );
}

// ── Pack section ──────────────────────────────────────────────────────────────

interface PackSectionProps {
  packName: string;
  packColor?: string;
  nodes: RegisteredNode[];
  onDragStart: (e: React.DragEvent, node: RegisteredNode) => void;
  defaultOpen?: boolean;
}

function PackSection({ packName, packColor, nodes, onDragStart, defaultOpen = true }: PackSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-3">
      {/* Pack header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-1 mb-1 group"
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: packColor ?? '#6B7280' }}
          />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {packName}
          </span>
          <span className="text-[9px] text-gray-400">
            ({nodes.length})
          </span>
        </div>
        <span className="text-[10px] text-gray-300 group-hover:text-gray-400">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {/* Skill cards */}
      {open && (
        <div className="space-y-1 pl-3 border-l-2" style={{ borderColor: packColor ? `${packColor}40` : '#E5E7EB' }}>
          {nodes.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node)}
              className="cursor-grab rounded border border-gray-200 bg-gray-50 px-2 py-1.5 hover:border-blue-300 hover:bg-blue-50 active:cursor-grabbing transition-colors"
              title={`${node.type}${node.description ? '\n' + node.description : ''}`}
            >
              {/* Skill name */}
              <div className="flex items-center gap-1.5">
                {node.icon ? (
                  <span className="text-xs">{node.icon}</span>
                ) : (
                  <span
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: node.color ?? packColor ?? '#6B7280' }}
                  />
                )}
                <span className="text-xs font-medium text-gray-800 truncate">{node.name}</span>
              </div>

              {/* Description (single line) */}
              {node.description && (
                <p className="mt-0.5 text-[10px] text-gray-400 leading-tight line-clamp-1">
                  {node.description}
                </p>
              )}

              {/* Service chips */}
              {node.uses_services && node.uses_services.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {node.uses_services.map((svc) => (
                    <ServiceChip key={svc} service={svc} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NodePalette() {
  const [nodes, setNodes]   = useState<RegisteredNode[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<RegisteredNode[]>('/nodes')
      .then((res) => setNodes(res.data ?? []))
      .catch(() => setError('Failed to load skills'))
      .finally(() => setLoading(false));
  }, []);

  // Filter by search query across name, description, and tags
  const filtered = search.trim()
    ? nodes.filter((n) =>
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.description?.toLowerCase().includes(search.toLowerCase()) ||
        n.type.toLowerCase().includes(search.toLowerCase()) ||
        n.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      )
    : nodes;

  // Group by pack, preserving pack metadata
  const packMap = new Map<string, { name: string; color?: string; nodes: RegisteredNode[] }>();
  for (const node of filtered) {
    const packId   = node.pack_id;
    const packName = node.packs?.display_name ?? packId;
    const packColor = node.packs?.color ?? undefined;
    if (!packMap.has(packId)) {
      packMap.set(packId, { name: packName, color: packColor, nodes: [] });
    }
    packMap.get(packId)!.nodes.push(node);
  }

  const packs = Array.from(packMap.entries()).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  );

  const onDragStart = (event: React.DragEvent, node: RegisteredNode) => {
    event.dataTransfer.setData('application/qsos-node-type', node.type);
    event.dataTransfer.setData('application/qsos-node-label', node.name);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header + search */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Skill Library
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills…"
          className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
        />
      </div>

      {/* Pack-grouped skill list */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <p className="text-xs text-gray-400 text-center py-4">Loading skills…</p>
        )}
        {error && (
          <p className="text-xs text-red-500 text-center py-4">{error}</p>
        )}
        {!loading && !error && packs.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            {search.trim() ? 'No skills match your search' : 'No skills available'}
          </p>
        )}

        {!loading && !error && packs.map(([packId, pack]) => (
          <PackSection
            key={packId}
            packName={pack.name}
            packColor={pack.color}
            nodes={pack.nodes}
            onDragStart={onDragStart}
            defaultOpen={true}
          />
        ))}

        {/* Drag hint */}
        {!loading && !error && packs.length > 0 && (
          <p className="mt-3 text-[10px] text-center text-gray-300">
            Drag a skill onto the canvas
          </p>
        )}
      </div>
    </aside>
  );
}
