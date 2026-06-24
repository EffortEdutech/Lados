'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

interface Organization {
  id: string;
  name: string;
  membership: { role: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  organization_id: string;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  project_id: string;
}

interface Resource {
  id:         string;
  type:       string;
  name:       string;
  state:      string;
  data:       Record<string, unknown>;
  created_at: string;
}

// ── Contractor KPIs ────────────────────────────────────────────────────────────

interface ContractorKPIs {
  activeJobs:            number;
  activeTrips:           number;
  outstandingInvoices:   number;
  vehiclesInMaintenance: number;
  recentJobs:            Resource[];
}

const OWNER_ROLES = ['owner', 'admin'];

const STATE_COLORS: Record<string, string> = {
  draft:            'bg-gray-100 text-gray-500',
  active:           'bg-green-100 text-green-700',
  pending_approval: 'bg-purple-100 text-purple-700',
  in_progress:      'bg-blue-100 text-blue-700',
  completed:        'bg-teal-100 text-teal-700',
  cancelled:        'bg-red-100 text-red-600',
  pending:          'bg-yellow-100 text-yellow-700',
};

function StateBadge({ state }: { state: string }) {
  const cls = STATE_COLORS[state] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

function KPICard({
  label,
  value,
  icon,
  color,
  href,
  loading,
}: {
  label:   string;
  value:   number;
  icon:    string;
  color:   string;
  href:    string;
  loading: boolean;
}) {
  return (
    <Link href={href} className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-md transition-all block">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-medium text-gray-400 group-hover:text-blue-500 transition-colors">
          View →
        </span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>
        {loading ? '—' : value}
      </p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </Link>
  );
}

// ── Contractor Dashboard Section ───────────────────────────────────────────────

function ContractorDashboard({ orgId }: { orgId: string }) {
  const [kpis,    setKpis]    = useState<ContractorKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function loadKPIs() {
      try {
        const base = `/resources?organizationId=${orgId}`;

        const [jobsRes, tripsRes, invoicesRes, vehiclesRes] = await Promise.allSettled([
          apiClient.get<Resource[]>(`${base}&type=job&state=active`),
          apiClient.get<Resource[]>(`${base}&type=trip`),
          apiClient.get<Resource[]>(`${base}&type=invoice&state=pending_approval`),
          apiClient.get<Resource[]>(`${base}&type=vehicle&state=maintenance`),
        ]);

        const jobs     = jobsRes.status     === 'fulfilled' ? (jobsRes.value.data     ?? []) : [];
        const trips    = tripsRes.status    === 'fulfilled' ? (tripsRes.value.data    ?? []) : [];
        const invoices = invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data ?? []) : [];
        const vehicles = vehiclesRes.status === 'fulfilled' ? (vehiclesRes.value.data ?? []) : [];

        const activeTrips = trips.filter((t) =>
          t.state === 'in_progress' || t.state === 'pending',
        );

        setKpis({
          activeJobs:            jobs.length,
          activeTrips:           activeTrips.length,
          outstandingInvoices:   invoices.length,
          vehiclesInMaintenance: vehicles.length,
          recentJobs:            jobs.slice(0, 5),
        });
      } finally {
        setLoading(false);
      }
    }

    loadKPIs();
  }, [orgId]);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Contractor Overview</h2>
        <Link href="/resources" className="text-xs text-blue-600 hover:text-blue-700">
          All Resources →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Jobs"      value={kpis?.activeJobs ?? 0}            icon="🏗️" color="text-blue-600"   href="/resources?type=job"     loading={loading} />
        <KPICard label="Active Trips"     value={kpis?.activeTrips ?? 0}           icon="🚛" color="text-yellow-600" href="/resources?type=trip"    loading={loading} />
        <KPICard label="Pending Invoices" value={kpis?.outstandingInvoices ?? 0}   icon="🧾" color="text-purple-600" href="/resources?type=invoice" loading={loading} />
        <KPICard label="In Maintenance"   value={kpis?.vehiclesInMaintenance ?? 0} icon="🔧" color="text-orange-500" href="/resources?type=vehicle" loading={loading} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Active Jobs</h3>
        {loading && <p className="text-xs text-gray-400 py-4 text-center">Loading…</p>}
        {!loading && (kpis?.recentJobs ?? []).length === 0 && (
          <p className