'use client';

/**
 * Pack Manager — /packs
 * Phase 8 (Pack Installer & Registry) / Phase 14 upgrade
 *
 * Lists all packs from the packs table.
 * - Sync button: POST /packs/sync
 * - Enable/Disable toggle per pack (owner/admin)
 * - Health badge: healthy / degraded / broken  [Phase 14]
 * - Version badge with previous_version hint    [Phase 14]
 *
 * Phase 21 S9.1 (2026-07-05, items 2 + 3):
 * - Layer-based tabs (Capability Packs / Solutions / Templates) so L3
 *   Solution bundles and L5 Template bundles (0 nodes by design — see
 *   getPackHealthByPrefix's doc comment) are no longer mixed in with
 *   real node-providing L0-L2 Capability Packs. Mirrors the Marketplace
 *   page's tab pattern.
 * - Tile/table view toggle per tab, mirroring the /resources page's
 *   existing pattern (same localStorage-persisted preference idea).
 * - Health check switched from N parallel GET /packs/:id/health requests
 *   (one per enabled pack, ~21 today) to a single GET /packs/health bulk
 *   call — the N-request burst was tripping the global 120 req/min
 *   per-IP throttle and causing 429s on whatever page loaded next.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { resolveIcon, PACK_EMOJI } from '@/lib/icon-map';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pack {
  id:               string;
  display_name:     string;
  description:      string | null;
  author:           string;
  version:          string;
  previous_version: string | null;
  icon:             string | null;
  color:            string | null;
  is_official:      boolean;
  is_enabled:       boolean;
  status:           'active' | 'disabled' | 'error';
  dependencies:     string[];
  node_count:       number;
  layer?:           string | null;
}

interface PackReadiness {
  packId: string;
  state: 'runtime_ready' | 'degraded' | 'blocked' | 'catalogue_only';
  nodes: { type: string; state: 'implemented' | 'stub' | 'missing_executor' }[];
  contradictions: string[];
}

interface RuntimeReadinessReport {
  packs: PackReadiness[];
}

type PackTab = 'capability' | 'solution' | 'template';
type ViewMode = 'tile' | 'table';

const TABS: { id: PackTab; label: string; hint: string }[] = [
  { id: 'capability', label: 'Capability Packs', hint: 'L0-L2 — provide workflow nodes' },
  { id: 'solution',   label: 'Solutions',        hint: 'L3 — bundle Capability Packs for a vertical' },
  { id: 'template',   label: 'Templates',        hint: 'L5 — bundle workflow templates, 0 nodes by design' },
];

/** L3 = Solution bundles, L5 = Template bundles, everything else (L0-L2, L4, unset) = Capability Packs. */
function tabForPack(pack: Pack): PackTab {
  if (pack.layer === 'L3') return 'solution';
  if (pack.layer === 'L5') return 'template';
  return 'capability';
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, isEnabled }: { status: Pack['status']; isEnabled: boolean }) {
  if (!isEnabled || status === 'disabled') {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
        Disabled
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100">
        Error
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-50 text-green-600 border border-green-100">
      Active
    </span>
  );
}

// ── Health badge (Phase 14) ───────────────────────────────────────────────────

function HealthBadge({ health }: { health: PackReadiness | null | undefined }) {
  if (!health) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-50 text-gray-400 border border-gray-100">
        ··· checking
      </span>
    );
  }
  if (health.state === 'runtime_ready') {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"
        title={`${health.nodes.length} implemented executors`}>
        Runtime ready
      </span>
    );
  }
  if (health.state === 'degraded') {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100"
        title={`${health.nodes.filter((node) => node.state === 'stub').length} stub executors`}>
        Degraded
      </span>
    );
  }
  if (health.state === 'catalogue_only') {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-200"
        title="Composition pack; does not provide executors">
        Catalogue only
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100"
      title={`${health.nodes.filter((node) => node.state === 'missing_executor').length} missing executors`}>
      Blocked
    </span>
  );
}

// ── Pack tile ─────────────────────────────────────────────────────────────────

function PackTile({
  pack,
  health,
  toggling,
  onToggle,
}: {
  pack:     Pack;
  health:   PackReadiness | undefined;
  toggling: boolean;
  onToggle: (pack: Pack) => void;
}) {
  return (
    <div
      className={`group rounded-xl border bg-white transition-all ${
        pack.is_enabled
          ? 'border-gray-200 hover:border-blue-300 hover:shadow-md'
          : 'border-gray-100 opacity-60'
      }`}
    >
      <Link href={`/packs/${encodeURIComponent(pack.id)}`} className="block p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: pack.color ? `${pack.color}22` : '#F3F4F6' }}
          >
            <span>{PACK_EMOJI[pack.id] ?? resolveIcon(pack.icon) ?? '📦'}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {pack.is_official && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                Official
              </span>
            )}
            <StatusBadge status={pack.status} isEnabled={pack.is_enabled} />
            {pack.is_enabled && <HealthBadge health={health} />}
          </div>
        </div>

        <h2 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
          {pack.display_name}
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
          v{pack.version}
          {pack.previous_version && (
            <span className="ml-1 text-[10px] text-gray-300">(↑ from v{pack.previous_version})</span>
          )}
          {' · '}{pack.author}
          {pack.layer && <span className="ml-1 text-[10px] text-gray-300">· {pack.layer}</span>}
        </p>

        {pack.description && (
          <p className="mt-2 text-xs text-gray-500 leading-snug line-clamp-2">{pack.description}</p>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">{pack.node_count}</span>{' '}
            node{pack.node_count !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] font-medium group-hover:underline" style={{ color: pack.color ?? '#3B82F6' }}>
            View →
          </span>
        </div>
      </Link>

      <div className="px-5 pb-4">
        <button
          onClick={() => onToggle(pack)}
          disabled={toggling}
          className={`w-full rounded-md py-1.5 text-[11px] font-medium transition-colors ${
            pack.is_enabled
              ? 'border border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
              : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          } disabled:opacity-50`}
        >
          {toggling ? '…' : pack.is_enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PacksPage() {
  const [packs,    setPacks]    = useState<Pack[]>([]);
  const [health,   setHealth]   = useState<Record<string, PackReadiness>>({});
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [syncMsg,  setSyncMsg]  = useState<string | null>(null);
  const [tab,      setTab]      = useState<PackTab>('capability');
  // Plain default on both server and first client render to avoid a
  // hydration mismatch; the persisted preference is applied client-only
  // in the effect below (Phase 21 S9.2 — see resources/page.tsx for the
  // same fix and the reasoning).
  const [viewMode, setViewMode] = useState<ViewMode>('tile');

  useEffect(() => {
    const stored = localStorage.getItem('lados_packs_view');
    if (stored === 'tile' || stored === 'table') setViewMode(stored);
  }, []);

  const loadPacks = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.get<Pack[]>('/packs'),
      // Phase 21 S9.1 — one bulk health call instead of one per enabled
      // pack (was tripping the global rate limit — see file header).
      apiClient.get<RuntimeReadinessReport>('/execution/runtime-readiness'),
    ])
      .then(([packsRes, healthRes]) => {
        setPacks(packsRes.data ?? []);
        setHealth(Object.fromEntries((healthRes.data?.packs ?? []).map((pack) => [pack.packId, pack])));
        setError(null);
      })
      .catch(() => setError('Failed to load packs'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('lados_packs_view', mode);
  };

  // ── Sync ────────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await apiClient.post<{ synced: string[]; skipped: string[]; errors: string[] }>(
        '/packs/sync',
        {},
      );
      const { synced, skipped, errors: errs } = res.data ?? { synced: [], skipped: [], errors: [] };
      setSyncMsg(
        `Synced: ${synced.length} updated, ${skipped.length} already current` +
        (errs.length ? `, ${errs.length} errors` : ''),
      );
      loadPacks();
    } catch {
      setSyncMsg('Sync failed — check API logs');
    } finally {
      setSyncing(false);
    }
  };

  // ── Enable / Disable ────────────────────────────────────────────────────

  const handleToggle = async (pack: Pack) => {
    setToggling(pack.id);
    try {
      const action = pack.is_enabled ? 'disable' : 'enable';
      await apiClient.patch(`/packs/${encodeURIComponent(pack.id)}/${action}`, {});
      loadPacks();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Toggle failed';
      setError(msg);
    } finally {
      setToggling(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const tabbedPacks = useMemo(() => {
    const byTab: Record<PackTab, Pack[]> = { capability: [], solution: [], template: [] };
    for (const pack of packs) byTab[tabForPack(pack)].push(pack);
    return byTab;
  }, [packs]);

  const visiblePacks   = tabbedPacks[tab];
  const activePacks    = visiblePacks.filter((p) =>  p.is_enabled);
  const disabledPacks  = visiblePacks.filter((p) => !p.is_enabled);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Capability Packs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage installed packs. Each pack provides workflow nodes, resource capabilities, or bundles other packs for a solution/template.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <span className={syncing ? 'animate-spin' : ''}>⟳</span>
          {syncing ? 'Syncing…' : 'Sync Packs'}
        </button>
      </div>

      {syncMsg && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
          {syncMsg}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <nav className="mb-5 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            title={t.hint}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
              {tabbedPacks[t.id].length}
            </span>
          </button>
        ))}
      </nav>

      {loading && (
        <div className="text-sm text-gray-400 text-center py-16">Loading packs…</div>
      )}

      {!loading && (
        <>
          {/* Stats bar + view toggle */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-700">{activePacks.length}</span> active ·{' '}
              <span className="font-semibold text-gray-700">{disabledPacks.length}</span> disabled ·{' '}
              {visiblePacks.length} total
            </p>

            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                title="Tile view"
                onClick={() => changeViewMode('tile')}
                className={`px-2.5 py-1.5 text-sm transition-colors ${viewMode === 'tile' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                ⊞
              </button>
              <button
                title="Table view"
                onClick={() => changeViewMode('table')}
                className={`px-2.5 py-1.5 text-sm transition-colors border-l border-gray-200 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                ☰
              </button>
            </div>
          </div>

          {visiblePacks.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
              No packs in this category yet.
            </p>
          )}

          {/* Tile view */}
          {viewMode === 'tile' && visiblePacks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visiblePacks.map((pack) => (
                <PackTile
                  key={pack.id}
                  pack={pack}
                  health={health[pack.id]}
                  toggling={toggling === pack.id}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}

          {/* Table view */}
          {viewMode === 'table' && visiblePacks.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Pack</th>
                    <th className="px-4 py-3">Layer</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Author</th>
                    <th className="px-4 py-3">Nodes</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Health</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visiblePacks.map((pack) => (
                    <tr key={pack.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/packs/${encodeURIComponent(pack.id)}`} className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{PACK_EMOJI[pack.id] ?? resolveIcon(pack.icon) ?? '📦'}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 leading-tight truncate hover:text-blue-600">{pack.display_name}</p>
                            <p className="text-[10px] font-mono text-gray-400 truncate">{pack.id}</p>
                          </div>
                          {pack.is_official && (
                            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                              Official
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{pack.layer ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">
                        v{pack.version}
                        {pack.previous_version && (
                          <span className="ml-1 text-[10px] text-gray-300">(↑ v{pack.previous_version})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 truncate max-w-[10rem]">{pack.author}</td>
                      <td className="px-4 py-3 text-gray-600">{pack.node_count}</td>
                      <td className="px-4 py-3"><StatusBadge status={pack.status} isEnabled={pack.is_enabled} /></td>
                      <td className="px-4 py-3">{pack.is_enabled && <HealthBadge health={health[pack.id]} />}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggle(pack)}
                          disabled={toggling === pack.id}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            pack.is_enabled
                              ? 'border border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                              : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {toggling === pack.id ? '…' : pack.is_enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
