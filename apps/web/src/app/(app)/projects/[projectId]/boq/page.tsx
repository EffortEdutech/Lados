'use client';

/**
 * BOQ Structured Table Page — /projects/[projectId]/boq
 *
 * Reads the most recent qs.read_boq execution output for the project and renders
 * the BOQ as a sortable, filterable table.
 *
 * Columns: Item No · Description · Unit · Qty · Rate (MYR) · Amount (MYR) · Trade
 *
 * Sprint 16 (S16-005)
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BOQItem {
  item_no: string;
  description: string;
  unit: string;
  qty: number | null;
  rate: number | null;
  amount: number | null;
  is_section_header: boolean;
  trade?: string;
  confidence?: number;
}

interface BOQDocument {
  boq_id: string;
  currency: string;
  total_items: number;
  section_count: number;
  total_value: number;
  items: BOQItem[];
  sections: string[];
}

interface LatestBoqResponse {
  outputs: {
    boq: BOQDocument;
    total_items: number;
    total_value: number;
    currency: string;
    sections: string[];
  };
  started_at: string;
  run_id: string;
}

type SortKey = 'item_no' | 'description' | 'unit' | 'qty' | 'rate' | 'amount' | 'trade';
type SortDir = 'asc' | 'desc';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function confidenceColor(confidence?: number): string {
  if (!confidence) return 'text-gray-300';
  if (confidence >= 0.85) return 'text-green-600';
  if (confidence >= 0.60) return 'text-amber-500';
  return 'text-red-500';
}

const TRADE_COLORS: Record<string, string> = {
  'Structural':        'bg-blue-50 text-blue-700',
  'Mechanical':        'bg-orange-50 text-orange-700',
  'Electrical':        'bg-yellow-50 text-yellow-700',
  'Plumbing':          'bg-cyan-50 text-cyan-700',
  'Finishing':         'bg-purple-50 text-purple-700',
  'Civil':             'bg-stone-50 text-stone-700',
  'External Works':    'bg-green-50 text-green-700',
  'Preliminaries':     'bg-gray-50 text-gray-600',
};

function tradeChip(trade?: string) {
  if (!trade) return null;
  const cls = TRADE_COLORS[trade] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {trade}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BoqPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [data, setData]       = useState<LatestBoqResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Filters
  const [search, setSearch]         = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [hideHeaders, setHideHeaders] = useState(true);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('item_no');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<LatestBoqResponse>(`/projects/${projectId}/boq-latest`)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error?.message ?? 'No BOQ data found. Run a workflow with the Read BOQ node first.');
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load BOQ');
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const boq = data?.outputs?.boq;
  const allItems = boq?.items ?? [];
  const currency = data?.outputs?.currency ?? 'MYR';

  // Unique trade values for filter dropdown
  const allTrades = useMemo(() => {
    const trades = new Set<string>();
    allItems.forEach((i) => { if (i.trade) trades.add(i.trade); });
    return Array.from(trades).sort();
  }, [allItems]);

  // Filtered + sorted items
  const visibleItems = useMemo(() => {
    let items = allItems;

    if (hideHeaders) items = items.filter((i) => !i.is_section_header);

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.description.toLowerCase().includes(q) ||
          i.item_no.toLowerCase().includes(q) ||
          (i.trade ?? '').toLowerCase().includes(q),
      );
    }

    if (tradeFilter) {
      items = items.filter((i) => i.trade === tradeFilter);
    }

    items = [...items].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';

      if (sortKey === 'item_no')      { va = a.item_no;      vb = b.item_no; }
      else if (sortKey === 'description') { va = a.description; vb = b.description; }
      else if (sortKey === 'unit')    { va = a.unit;         vb = b.unit; }
      else if (sortKey === 'qty')     { va = a.qty ?? -Infinity; vb = b.qty ?? -Infinity; }
      else if (sortKey === 'rate')    { va = a.rate ?? -Infinity; vb = b.rate ?? -Infinity; }
      else if (sortKey === 'amount')  { va = a.amount ?? -Infinity; vb = b.amount ?? -Infinity; }
      else if (sortKey === 'trade')   { va = a.trade ?? ''; vb = b.trade ?? ''; }

      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc'
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });

    return items;
  }, [allItems, hideHeaders, search, tradeFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-0.5">↕</span>;
    return <span className="text-blue-500 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const filteredTotal = visibleItems.reduce((s, i) => s + (i.amount ?? 0), 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Project
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-900">BOQ Table</h1>

        {boq && (
          <span className="ml-2 text-xs text-gray-400">
            {boq.total_items} items · {boq.section_count} sections ·{' '}
            <span className="font-medium text-gray-600">
              {currency} {fmt(boq.total_value)}
            </span>
          </span>
        )}

        {data?.started_at && (
          <span className="ml-auto text-xs text-gray-400">
            Last run: {new Date(data.started_at).toLocaleString()}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400 animate-pulse">Loading BOQ data…</p>
        </div>
      )}

      {/* Error / empty state */}
      {!loading && error && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">No BOQ Data Yet</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Go to Project Workflows
            </Link>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && boq && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 flex-wrap">
            <input
              type="search"
              placeholder="Search description, item no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 w-56"
            />

            {allTrades.length > 0 && (
              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="">All Trades</option>
                {allTrades.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideHeaders}
                onChange={(e) => setHideHeaders(e.target.checked)}
                className="rounded"
              />
              Hide section headers
            </label>

            <span className="ml-auto text-xs text-gray-500 font-medium">
              {visibleItems.length} row{visibleItems.length !== 1 ? 's' : ''}
              {' · '}
              <span className="text-gray-700">
                {currency} {fmt(filteredTotal)}
              </span>
              {tradeFilter || search ? ' (filtered)' : ''}
            </span>
          </div>

          {/* Scrollable table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  {([
                    ['item_no',      'Item No',        'w-24  text-left'],
                    ['description',  'Description',    'text-left'],
                    ['unit',         'Unit',           'w-16  text-center'],
                    ['qty',          'Qty',            'w-20  text-right'],
                    ['rate',         `Rate (${currency})`, 'w-28  text-right'],
                    ['amount',       `Amount (${currency})`, 'w-32  text-right'],
                    ['trade',        'Trade',          'w-36  text-center'],
                  ] as [SortKey, string, string][]).map(([key, label, cls]) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className={`${cls} px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider text-[10px] cursor-pointer select-none hover:bg-gray-200 transition-colors border-b border-gray-200`}
                    >
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      No items match your filter.
                    </td>
                  </tr>
                )}
                {visibleItems.map((item, idx) => {
                  if (item.is_section_header) {
                    return (
                      <tr key={idx} className="bg-gray-50">
                        <td colSpan={7} className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200 text-[11px] uppercase tracking-wide">
                          {item.item_no && <span className="text-gray-400 mr-2">{item.item_no}</span>}
                          {item.description}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-gray-500">{item.item_no || '—'}</td>
                      <td className="px-3 py-2 text-gray-800 leading-snug max-w-xs">
                        {item.description}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{item.unit || '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {fmt(item.qty, 0)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                        {fmt(item.rate)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                        {fmt(item.amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {tradeChip(item.trade)}
                          {item.confidence !== undefined && (
                            <span
                              className={`text-[9px] font-mono ${confidenceColor(item.confidence)}`}
                              title={`AI confidence: ${Math.round((item.confidence ?? 0) * 100)}%`}
                            >
                              {Math.round((item.confidence ?? 0) * 100)}%
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {visibleItems.length > 0 && (
                <tfoot className="sticky bottom-0 bg-white border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={5} className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {tradeFilter || search ? 'Filtered Total' : 'Grand Total'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sm font-bold text-gray-900">
                      {currency} {fmt(filteredTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
