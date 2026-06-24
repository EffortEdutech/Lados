'use client';

/**
 * Resources — /resources
 * Phase 9 (Platform Architecture §3.10)
 *
 * Generic resource browser. ALL resource types — jobs, trips, invoices,
 * drivers, vehicles, etc. — are accessed here via ?type= query param.
 *
 * The page drives its rendering from pack manifest view configs:
 *   GET /packs/resource-views → { [type]: { displayName, icon, views: { list, inlineActions } } }
 *
 * No industry-specific code lives here. The pack manifest tells the page
 * what fields to show and what inline actions are available per state.
 *
 * Inline actions:
 *   - node === 'state.change'  → POST /resources/:id/transition directly
 *   - other node types         → POST /resources/:id/execute-action via WorkflowActionModal
 *
 * M7 — Driver UI:
 *   When the logged-in user has role 'driver' in their org:
 *   - Only the 'trip' tab is shown
 *   - Trips are filtered to those assigned to the driver's own resource
 *   - A driver banner is shown at the top
 *   - No access to financial/invoice/payroll tabs
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Organization {
  id:   string;
  name: string;
  slug: string;
  membership: { role: string };
}

interface Resource {
  id:         string;
  org_id:     string;
  project_id: string | null;
  type:       string;
  name:       string;
  state:      string;
  data:       Record<string, unknown>;
  parent_id:  string | null;
  created_at: string;
  updated_at: string;
}

interface ResourceListViewConfig {
  primaryField:   string;
  secondaryField?: string;
  badgeField?:    string;
  counterField?:  string;
  mobileLayout?:  'card' | 'row';
}

interface ResourceInlineAction {
  label:           string;
  node:            string;
  visibleInStates: string[];
  icon?:           string;
  requiresConfirm?: boolean;
}

interface ResourceViewConfig {
  list:          ResourceListViewConfig;
  inlineActions?: ResourceInlineAction[];
}

interface PackResourceDefinition {
  type:              string;
  displayName:       string;
  displayNamePlural?: string;
  icon?:             string;
  views?:            ResourceViewConfig;
  packId:            string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve dot-path fields like "data.scheduledDate" from a resource object */
function getField(resource: Resource, field: string): string {
  const parts = field.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = resource;
  for (const p of parts) {
    if (cursor == null) return '';
    cursor = cursor[p];
  }
  if (cursor == null) return '';
  if (typeof cursor === 'object') return JSON.stringify(cursor);
  return String(cursor);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// ── State badge ───────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  draft:            'bg-gray-100 text-gray-600',
  active:           'bg-green-100 text-green-700',
  pending:          'bg-yellow-100 text-yellow-700',
  pending_review:   'bg-orange-100 text-orange-700',
  pending_approval: 'bg-purple-100 text-purple-700',
  in_progress:      'bg-blue-100 text-blue-700',
  completed:        'bg-teal-100 text-teal-700',
  cancelled:        'bg-red-100 text-red-600',
  available:        'bg-emerald-100 text-emerald-700',
  scheduled:        'bg-indigo-100 text-indigo-700',
  dispatched:       'bg-yellow-100 text-yellow-700',
};

function StateBadge({ state }: { state: string }) {
  const cls = STATE_COLORS[state] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

// ── Resource Card ─────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  viewConfig,
  orgId,
  onAction,
  actionBusy,
  driverMode,
}: {
  resource:    Resource;
  viewConfig?: PackResourceDefinition;
  orgId:       string;
  onAction:    (resource: Resource, action: ResourceInlineAction) => void;
  actionBusy:  string | null;
  driverMode:  boolean;
}) {
  const list    = viewConfig?.views?.list;
  const actions = viewConfig?.views?.inlineActions ?? [];

  const primary   = list ? getField(resource, list.primaryField)   : resource.name;
  const secondary = list?.secondaryField ? getField(resource, list.secondaryField) : null;
  const badge     = list?.badgeField     ? getField(resource, list.badgeField)     : resource.state;
  const counter   = list?.counterField   ? getField(resource, list.counterField)   : null;

  const visibleActions = actions.filter((a) => a.visibleInStates.includes(resource.state));
  const isBusy = actionBusy === resource.id;

  // In driver mode show only the primary state-change actions, not financial nodes
  const DRIVER_HIDDEN_NODES = ['contractor.generate_invoice', 'contractor.approve_payroll'];
  const filteredActions = driverMode
    ? visibleActions.filter((a) => !DRIVER_HIDDEN_NODES.includes(a.node))
    : visibleActions;

  return (
    <div className={`rounded-xl border bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all ${
      driverMode ? 'border-yellow-200' : 'border-gray-200'
    }`}>
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {viewConfig?.icon && (
              <span className="text-lg flex-shrink-0">{viewConfig.icon}</span>
            )}
            <h3 className="font-semibold text-gray-900 text-sm truncate">{primary || resource.name}</h3>
          </div>
          <StateBadge state={badge || resource.state} />
        </div>

        {/* Secondary field */}
        {secondary && (
          <p className="mt-1 text-xs text-gray-500 truncate pl-7">{secondary}</p>
        )}

        {/* Counter + date */}
        <div className="mt-2 flex items-center justify-between pl-7">
          {counter ? (
            <span className="text-[11px] text-gray-400">
              <span className="font-semibold text-gray-600">{counter}</span> trips
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">{fmt(resource.created_at)}</span>
          )}
          <span className="text-[10px] font-mono text-gray-300">{resource.id.slice(0, 8)}</span>
        </div>

        {/* Fuel receipt — show AI extracted data if present */}
        {resource.type === 'fuel_receipt' && resource.data?.aiExtracted && (() => {
          type AiEx = { amount?: number|null; liters?: number|null; fuelType?: string; confidence?: number; approvedByHuman?: boolean };
          const ai = resource.data.aiExtracted as AiEx;
          if (ai.amount == null && ai.liters == null) return null;
          return (
            <div className="mt-2 pl-7">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-purple-600 bg-purple-50 rounded px-1.5 py-0.5">🤖 AI extracted</span>
                {ai.amount   != null && <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">MYR {ai.amount.toFixed(2)}</span>}
                {ai.liters   != null && <span className="text-[11px] text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{ai.liters} L</span>}
                {ai.fuelType          && <span className="text-[11px] text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{ai.fuelType}</span>}
                {ai.confidence != null && <span className="text-[10px] text-gray-400">{(ai.confidence * 100).toFixed(0)}% conf.</span>}
              </div>
            </div>
          );
        })()}

        {/* Driver mode: show load details inline */}
        {driverMode && resource.data && (
          <div className="mt-2 pl-7 space-y-0.5">
            {resource.data.loadType && (
              <p className="text-[11px] text-gray-500">
                Load: <span className="font-medium text-gray-700">
                  {String(resource.data.loadQuantity ?? '')} {String(resource.data.loadUnit ?? '')} {String(resource.data.loadType)}
                </span>
              </p>
            )}
            {resource.data.origin && (
              <p className="text-[11px] text-gray-500">
                {String(resource.data.origin)} → {String(resource.data.destination ?? '—')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Inline actions */}
      {filteredActions.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex flex-wrap gap-2">
          {filteredActions.map((action) => {
            const isStateChange = action.node === 'state.change';
            return (
              <button
                key={action.label}
                onClick={() => onAction(resource, action)}
                disabled={isBusy}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                  driverMode
                    ? 'bg-yellow-50 border border-yellow-300 text-yellow-800 hover:bg-yellow-100'
                    : isStateChange
                      ? 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                      : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                }`}
              >
                {action.icon && <span>{action.icon}</span>}
                {isBusy ? '…' : action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  action,
  resource,
  onConfirm,
  onCancel,
  busy,
}: {
  action:    ResourceInlineAction;
  resource:  Resource;
  onConfirm: () => void;
  onCancel:  () => void;
  busy:      boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">{action.label}</h3>
        <p className="mt-2 text-sm text-gray-500">
          Are you sure you want to <strong>{action.label.toLowerCase()}</strong>{' '}
          <strong>{resource.name}</strong>? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Workflow Action Modal ─────────────────────────────────────────────────────
//
// Renders a dynamic form for any pack node that is NOT state.change.
//
// Smart field rendering:
//   - Fields ending in "Id" (vehicleId, driverId, customerId, jobId …)
//     → resource picker dropdown loaded from GET /resources?type={xyz}
//   - Fields named "scheduledDate" or "date" → <input type="date">
//   - Fields named "notes", "description", "remarks" → <textarea>
//   - Everything else → <input type="text|number">
//
// Fields whose key matches the current resource type (e.g. jobId when
// browsing a job) are pre-filled and shown as read-only.

interface NodeInputSchema {
  key:          string;
  label:        string;
  type:         string;
  required?:    boolean;
  description?: string;
}

interface ResourceOption {
  id:    string;
  name:  string;
  state: string;
}

/** Derive the resource type from a field key like "vehicleId" → "vehicle" */
function resourceTypeFromKey(key: string): string | null {
  if (!key.endsWith('Id') || key === 'resourceId') return null;
  return key.slice(0, -2); // strip trailing "Id"
}

function WorkflowActionModal({
  action,
  resource,
  packId,
  orgId,
  onSuccess,
  onCancel,
}: {
  action:    ResourceInlineAction;
  resource:  Resource;
  packId:    string;
  orgId:     string;
  onSuccess: (msg: string) => void;
  onCancel:  () => void;
}) {
  const [schema,          setSchema]          = useState<NodeInputSchema[]>([]);
  const [values,          setValues]          = useState<Record<string, string>>({});
  const [resourceOptions, setResourceOptions] = useState<Record<string, ResourceOption[]>>({});
  const [busy,            setBusy]            = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [result,          setResult]          = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!packId) { setLoading(false); return; }

    apiClient
      .get<{
        nodes: Array<{
          type:    string;
          inputs?: Array<{ name: string; type: string; required?: boolean; description?: string }>;
        }>;
      }>(`/packs/${encodeURIComponent(packId)}`)
      .then(async (res) => {
        const node      = (res.data?.nodes ?? []).find((n) => n.type === action.node);
        const rawInputs = node?.inputs ?? [];

        const fields: NodeInputSchema[] = rawInputs.map((inp) => ({
          key:         inp.name,
          label:       inp.name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .trim(),
          type:        inp.type,
          required:    inp.required ?? false,
          description: inp.description,
        }));

        setSchema(fields);

        // Pre-fill values: own resource type pre-fills its Id field,
        // and any data fields already on the resource are pre-filled too.
        const pre: Record<string, string> = {};
        for (const f of fields) {
          if (f.key === `${resource.type}Id`) {
            pre[f.key] = resource.id;
          } else if (resource.data?.[f.key] !== undefined) {
            pre[f.key] = String(resource.data[f.key]);
          }
        }
        setValues(pre);

        // For each *Id field (except the current resource's own type),
        // fetch the resource list so we can show a picker dropdown.
        const pickerFetches = fields
          .filter((f) => {
            const rt = resourceTypeFromKey(f.key);
            return rt !== null && rt !== resource.type; // own type is pre-filled / read-only
          })
          .map(async (f) => {
            const rt  = resourceTypeFromKey(f.key)!;
            const r   = await apiClient.get<ResourceOption[]>(
              `/resources?organizationId=${orgId}&type=${rt}`,
            );
            return { key: f.key, options: r.data ?? [] };
          });

        const results = await Promise.allSettled(pickerFetches);
        const opts: Record<string, ResourceOption[]> = {};
        for (const r of results) {
          if (r.status === 'fulfilled') {
            opts[r.value.key] = r.value.options;
          }
        }
        setResourceOptions(opts);
      })
      .catch(() => setSchema([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId, action.node, orgId]);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const inputs: Record<string, unknown> = { ...values };
      inputs['resourceId'] ??= resource.id;

      const res = await apiClient.post<{
        success: boolean;
        data: { status: string; outputs: Record<string, unknown>; error?: unknown };
      }>(
        `/resources/${resource.id}/execute-action?organizationId=${orgId}`,
        { node: action.node, inputs },
      );

      // apiClient returns parsed JSON directly — res IS the body, not an axios wrapper
      // Response shape: { success: bool, data: { status: string, outputs: {...}, error?: {...} } }
      if (res.success === false || res.data?.status === 'failure') {
        const errData = res.data?.error;
        const msg = typeof errData === 'object' && errData !== null && 'message' in errData
          ? String((errData as { message: string }).message)
          : JSON.stringify(errData ?? 'Action failed');
        setError(msg);
      } else {
        // Show the outputs to the user before closing
        setResult((res.data?.outputs as Record<string, unknown>) ?? {});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Field renderer ────────────────────────────────────────────────────────

  function renderField(field: NodeInputSchema) {
    const isOwnRef  = field.key === `${resource.type}Id`;
    const resType   = resourceTypeFromKey(field.key);
    const isDateFld = field.key.toLowerCase().includes('date');
    const isTextarea = ['notes', 'description', 'remarks', 'comment'].includes(field.key.toLowerCase());

    const commonCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50';

    // Pre-filled, read-only: own resource reference
    if (isOwnRef) {
      return (
        <div className={`${commonCls} bg-gray-50 text-gray-500 cursor-default`}>
          {resource.name}
          <span className="ml-2 text-[10px] text-gray-400 font-mono">{resource.id.slice(0, 8)}…</span>
        </div>
      );
    }

    // Resource picker dropdown
    if (resType && field.key in resourceOptions) {
      const options = resourceOptions[field.key];
      return (
        <select
          value={values[field.key] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
          disabled={busy}
          className={commonCls}
        >
          <option value="">— Select {resType} —</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name} ({opt.state})
            </option>
          ))}
        </select>
      );
    }

    // Loading picker options
    if (resType && !(field.key in resourceOptions) && loading === false) {
      return (
        <select disabled className={commonCls}>
          <option>No {resType}s found</option>
        </select>
      );
    }

    // Date field
    if (isDateFld) {
      return (
        <input
          type="date"
          value={values[field.key] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
          disabled={busy}
          className={commonCls}
        />
      );
    }

    // Textarea
    if (isTextarea) {
      return (
        <textarea
          rows={3}
          value={values[field.key] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
          placeholder={`Enter ${field.label.toLowerCase()}…`}
          disabled={busy}
          className={`${commonCls} resize-none`}
        />
      );
    }

    // File / image upload — converts to base64 data URI sent inline with the request
    if (field.type === 'file' || field.type === 'image') {
      const hasFile = !!values[field.key];
      return (
        <div>
          <label className={`flex items-center gap-2 cursor-pointer ${commonCls} ${busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
            <span className="text-lg">📎</span>
            <span className="text-gray-600">{hasFile ? '✓ Image selected — click to change' : 'Click to choose receipt image…'}</span>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setValues((v) => ({ ...v, [field.key]: reader.result as string }));
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {hasFile && (
            <p className="text-[10px] text-green-600 mt-1">Image ready — click Extract Data to process</p>
          )}
        </div>
      );
    }

    // Default: text / number
    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={values[field.key] ?? ''}
        onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
        placeholder={`Enter ${field.label.toLowerCase()}…`}
        disabled={busy}
        className={commonCls}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{action.icon} {action.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{resource.name}</p>
          </div>
          <button onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* ── Result panel (shown after success) ── */}
        {result !== null ? (
          <>
            {(() => {
              // Use aiExtracted if present (fuel receipt extraction), else show generic outputs
              type AiEx = { amount?: number|null; liters?: number|null; fuelType?: string; stationName?: string|null; receiptDate?: string|null; vehicleReg?: string|null; confidence?: number; warning?: string; approvedByHuman?: boolean };
              const ai = (result.aiExtracted ?? result) as AiEx;
              const rows: { label: string; value: string; dim?: boolean }[] = [
                { label: 'Amount',      value: ai.amount      != null ? `MYR ${ai.amount.toFixed(2)}` : '—' },
                { label: 'Fuel (L)',    value: ai.liters       != null ? `${ai.liters} L`              : '—' },
                { label: 'Fuel Type',  value: ai.fuelType     ? ai.fuelType                           : '—' },
                { label: 'Station',    value: ai.stationName  ?? '—' },
                { label: 'Date',       value: ai.receiptDate  ?? '—' },
                { label: 'Vehicle',    value: ai.vehicleReg   ?? '—' },
                { label: 'Confidence', value: ai.confidence   != null ? `${(ai.confidence * 100).toFixed(0)}%` : '—' },
              ];
              return (
                <div className="space-y-3 mb-4">
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                    <p className="text-sm font-semibold text-green-800 mb-3">✅ Data extracted</p>
                    <div className="divide-y divide-green-100">
                      {rows.map(r => (
                        <div key={r.label} className="flex justify-between py-1.5 text-xs">
                          <span className="text-gray-500">{r.label}</span>
                          <span className={`font-medium ${r.value === '—' ? 'text-gray-300' : 'text-gray-900'}`}>{r.value}</span>
                        </div>
                     