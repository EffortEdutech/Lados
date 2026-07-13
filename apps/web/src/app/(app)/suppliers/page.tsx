'use client';

/**
 * Supplier Management Page — /suppliers
 *
 * Lists registered suppliers/contractors for the user's organization.
 * Create, edit, deactivate suppliers. Filter by trade and status.
 *
 * Sprint 17 (S17-003)
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Organization {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  trades: string[];
  cidb_grade: string | null;
  registration_no: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_TRADES = [
  'Structural', 'Civil', 'Mechanical', 'Electrical', 'Plumbing',
  'Finishing', 'External Works', 'Preliminaries', 'Specialist',
];

const CIDB_GRADES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];

const TRADE_COLORS: Record<string, string> = {
  'Structural':     'bg-blue-50 text-blue-700 border-blue-200',
  'Mechanical':     'bg-orange-50 text-orange-700 border-orange-200',
  'Electrical':     'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Plumbing':       'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Finishing':      'bg-purple-50 text-purple-700 border-purple-200',
  'Civil':          'bg-stone-50 text-stone-700 border-stone-200',
  'External Works': 'bg-green-50 text-green-700 border-green-200',
  'Preliminaries':  'bg-gray-50 text-gray-600 border-gray-200',
  'Specialist':     'bg-pink-50 text-pink-700 border-pink-200',
};

function tradeColor(trade: string) {
  return TRADE_COLORS[trade] ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

// ── Blank form state ───────────────────────────────────────────────────────────

const BLANK_FORM = {
  name: '', email: '', phone: '', address: '',
  trades: [] as string[], cidb_grade: '', registration_no: '', notes: '',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [orgId, setOrgId]       = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [tradeFilter, setTradeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch]             = useState('');

  // Modal
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Supplier | null>(null);
  const [form, setForm]               = useState({ ...BLANK_FORM });
  const [saving, setSaving]           = useState(false);
  const [modalError, setModalError]   = useState<string | null>(null);

  // Deactivate confirm
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // ── Load org ────────────────────────────────────────────────────────────────

  useEffect(() => {
    apiClient.get<Organization[]>('/organizations').then((res) => {
      const first = res.data?.[0];
      if (first) setOrgId(first.id);
    });
  }, []);

  // ── Load suppliers ──────────────────────────────────────────────────────────

  const load = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (tradeFilter)  params.set('trade', tradeFilter);
    apiClient
      .get<Supplier[]>(`/organizations/${orgId}/suppliers?${params.toString()}`)
      .then((res) => setSuppliers(res.data ?? []))
      .finally(() => setLoading(false));
  }, [orgId, statusFilter, tradeFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Client-side search filter ───────────────────────────────────────────────

  const visible = search.trim()
    ? suppliers.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.registration_no ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : suppliers;

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setForm({ ...BLANK_FORM });
    setModalError(null);
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditTarget(s);
    setForm({
      name: s.name, email: s.email ?? '', phone: s.phone ?? '',
      address: s.address ?? '', trades: [...s.trades],
      cidb_grade: s.cidb_grade ?? '', registration_no: s.registration_no ?? '',
      notes: s.notes ?? '',
    });
    setModalError(null);
    setShowModal(true);
  }

  function toggleTrade(trade: string) {
    setForm((f) => ({
      ...f,
      trades: f.trades.includes(trade)
        ? f.trades.filter((t) => t !== trade)
        : [...f.trades, trade],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        name:            form.name.trim(),
        email:           form.email.trim() || undefined,
        phone:           form.phone.trim() || undefined,
        address:         form.address.trim() || undefined,
        trades:          form.trades,
        cidb_grade:      form.cidb_grade || undefined,
        registration_no: form.registration_no.trim() || undefined,
        notes:           form.notes.trim() || undefined,
      };
      if (editTarget) {
        await apiClient.patch(`/organizations/${orgId}/suppliers/${editTarget.id}`, payload);
      } else {
        await apiClient.post(`/organizations/${orgId}/suppliers`, payload);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!orgId) return;
    setDeactivating(true);
    try {
      await apiClient.delete(`/organizations/${orgId}/suppliers/${id}`);
      setConfirmDeactivateId(null);
      load();
    } finally {
      setDeactivating(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="mt-1 text-sm text-gray-500">
              Registered contractors and suppliers eligible for RFQ distribution
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Supplier
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <input
            type="search"
            placeholder="Search name, email, reg no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 w-52"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All status</option>
          </select>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="">All Trades</option>
            {ALL_TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="ml-auto text-xs text-gray-400">
            {visible.length} supplier{visible.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-gray-400 text-center py-16 animate-pulse">Loading…</p>
        )}

        {/* Empty */}
        {!loading && visible.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-4xl mb-3">🏗️</div>
            <p className="text-gray-700 text-sm font-semibold">No suppliers yet</p>
            <p className="text-gray-400 text-xs mt-1 mb-5">
              Add contractors and suppliers to distribute RFQs to them
            </p>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Add Supplier
            </button>
          </div>
        )}

        {/* Supplier list */}
        <div className="space-y-3">
          {visible.map((s) => (
            <div key={s.id} className="relative group bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                {/* Left: name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{s.name}</h3>
                    {s.cidb_grade && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        CIDB {s.cidb_grade}
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      s.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  {/* Contact */}
                  <div className="flex gap-3 text-xs text-gray-500 flex-wrap mb-2">
                    {s.email && <span>✉ {s.email}</span>}
                    {s.phone && <span>📞 {s.phone}</span>}
                    {s.registration_no && <span className="font-mono">#{s.registration_no}</span>}
                  </div>
                  {/* Trades */}
                  {s.trades.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {s.trades.map((t) => (
                        <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${tradeColor(t)}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                  {s.status === 'active' && (
                    confirmDeactivateId === s.id ? (
                      <div className="flex items-center gap-1 bg-white border border-red-200 rounded-lg px-2 py-1 shadow-sm">
                        <span className="text-xs text-red-600 font-medium">Deactivate?</span>
                        <button
                          onClick={() => handleDeactivate(s.id)}
                          disabled={deactivating}
                          className="text-[11px] bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {deactivating ? '…' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDeactivateId(null)}
                          className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeactivateId(s.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Deactivate
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal: Create / Edit Supplier ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editTarget ? 'Edit Supplier' : 'Add Supplier'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {modalError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Syarikat Bina Jaya Sdn Bhd"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+60 3 1234 5678"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Registration No + CIDB Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reg No (SSM/CIDB)</label>
                  <input
                    value={form.registration_no}
                    onChange={(e) => setForm({ ...form, registration_no: e.target.value })}
                    placeholder="201901234567"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CIDB Grade</label>
                  <select
                    value={form.cidb_grade}
                    onChange={(e) => setForm({ ...form, cidb_grade: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">— Select —</option>
                    {CIDB_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Trades */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Trade Categories</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TRADES.map((trade) => {
                    const selected = form.trades.includes(trade);
                    return (
                      <button
                        key={trade}
                        type="button"
                        onClick={() => toggleTrade(trade)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {trade}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  placeholder="No. 1, Jalan Contoh…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Past performance, preferred status…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
