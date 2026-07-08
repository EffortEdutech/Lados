'use client';

/**
 * Operations Dashboard — Phase 22 S22.3
 *
 * Cross-run monitoring: "what's the failure rate of workflow X this week"
 * without a live table scan (concern #2). Reads the daily rollup tables
 * (workflow_run_stats_daily / node_execution_stats_daily) via
 * GET /analytics/workflow-runs and GET /analytics/node-stats, aggregated
 * client-side over the selected date range for an at-a-glance summary.
 *
 * Additive to, not a replacement for, the existing per-run
 * ExecutionLogPanel/SSE live view — that stays the detail drill-down for a
 * single run; this is the "how's everything doing" cross-run view.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, apiErrorMessage } from '@/lib/api/client';

interface Organization {
  id: string;
  name?: string;
}

interface Department {
  id: string;
  name: string;
}

interface WorkflowRunStatRow {
  workflow_id: string;
  workflow_name: string | null;
  department_id: string | null;
  date: string;
  total_runs: number;
  succeeded: number;
  failed: number;
  timed_out: number;
  avg_duration_ms: number | null;
  p95_duration_ms: number | null;
}

interface NodeExecutionStatRow {
  workflow_id: string;
  workflow_name: string | null;
  node_type: string;
  date: string;
  total_executions: number;
  succeeded: number;
  failed: number;
  avg_duration_ms: number | null;
  p95_duration_ms: number | null;
}

const RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function aggregateWorkflowStats(rows: WorkflowRunStatRow[]) {
  const byWorkflow = new Map<string, {
    workflowId: string; workflowName: string;
    totalRuns: number; succeeded: number; failed: number; timedOut: number;
    durationWeightedSum: number; durationWeight: number; maxP95: number | null;
  }>();

  for (const row of rows) {
    const bucket = byWorkflow.get(row.workflow_id) ?? {
      workflowId: row.workflow_id,
      workflowName: row.workflow_name ?? row.workflow_id,
      totalRuns: 0, succeeded: 0, failed: 0, timedOut: 0,
      durationWeightedSum: 0, durationWeight: 0, maxP95: null,
    };
    bucket.totalRuns += row.total_runs;
    bucket.succeeded += row.succeeded;
    bucket.failed += row.failed;
    bucket.timedOut += row.timed_out;
    if (row.avg_duration_ms != null) {
      bucket.durationWeightedSum += row.avg_duration_ms * row.total_runs;
      bucket.durationWeight += row.total_runs;
    }
    if (row.p95_duration_ms != null) {
      bucket.maxP95 = bucket.maxP95 == null ? row.p95_duration_ms : Math.max(bucket.maxP95, row.p95_duration_ms);
    }
    byWorkflow.set(row.workflow_id, bucket);
  }

  return [...byWorkflow.values()]
    .map((b) => ({
      ...b,
      avgDuration: b.durationWeight > 0 ? Math.round(b.durationWeightedSum / b.durationWeight) : null,
      successRate: b.totalRuns > 0 ? Math.round((b.succeeded / b.totalRuns) * 100) : null,
    }))
    .sort((a, b) => b.totalRuns - a.totalRuns);
}

function aggregateNodeStats(rows: NodeExecutionStatRow[]) {
  const byNode = new Map<string, {
    workflowId: string; workflowName: string; nodeType: string;
    totalExecutions: number; succeeded: number; failed: number;
    durationWeightedSum: number; durationWeight: number; maxP95: number | null;
  }>();

  for (const row of rows) {
    const key = `${row.workflow_id}::${row.node_type}`;
    const bucket = byNode.get(key) ?? {
      workflowId: row.workflow_id,
      workflowName: row.workflow_name ?? row.workflow_id,
      nodeType: row.node_type,
      totalExecutions: 0, succeeded: 0, failed: 0,
      durationWeightedSum: 0, durationWeight: 0, maxP95: null,
    };
    bucket.totalExecutions += row.total_executions;
    bucket.succeeded += row.succeeded;
    bucket.failed += row.failed;
    if (row.avg_duration_ms != null) {
      bucket.durationWeightedSum += row.avg_duration_ms * row.total_executions;
      bucket.durationWeight += row.total_executions;
    }
    if (row.p95_duration_ms != null) {
      bucket.maxP95 = bucket.maxP95 == null ? row.p95_duration_ms : Math.max(bucket.maxP95, row.p95_duration_ms);
    }
    byNode.set(key, bucket);
  }

  return [...byNode.values()].map((b) => ({
    ...b,
    avgDuration: b.durationWeight > 0 ? Math.round(b.durationWeightedSum / b.durationWeight) : null,
    failureRate: b.totalExecutions > 0 ? Math.round((b.failed / b.totalExecutions) * 100) : null,
  }));
}

export default function AnalyticsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [rangeDays, setRangeDays] = useState(30);

  const [workflowStats, setWorkflowStats] = useState<WorkflowRunStatRow[]>([]);
  const [nodeStats, setNodeStats] = useState<NodeExecutionStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    const res = await apiClient.get<Organization[]>('/organizations');
    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to load organizations'));
      return;
    }
    const data = res.data ?? [];
    setOrgs(data);
    setSelectedOrgId((current) => current || data[0]?.id || '');
  }, []);

  const loadDepartments = useCallback(async (orgId: string) => {
    const res = await apiClient.get<Department[]>(`/organizations/${orgId}/departments`);
    if (!res.error) setDepartments(res.data ?? []);
  }, []);

  const loadStats = useCallback(async (orgId: string, departmentId: string, days: number) => {
    setLoading(true);
    setError(null);

    const dateTo = toDateStr(new Date());
    const dateFrom = toDateStr(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

    const params = new URLSearchParams({ organizationId: orgId, dateFrom, dateTo });
    if (departmentId) params.set('departmentId', departmentId);

    const [wfRes, nodeRes] = await Promise.all([
      apiClient.get<WorkflowRunStatRow[]>(`/analytics/workflow-runs?${params.toString()}`),
      apiClient.get<NodeExecutionStatRow[]>(`/analytics/node-stats?${params.toString()}`),
    ]);

    if (wfRes.error || nodeRes.error) {
      setError(apiErrorMessage(wfRes.error ?? nodeRes.error, 'Failed to load analytics'));
    } else {
      setWorkflowStats(wfRes.data ?? []);
      setNodeStats(nodeRes.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadOrganizations(); }, [loadOrganizations]);
  useEffect(() => {
    if (!selectedOrgId) return;
    setSelectedDepartmentId('');
    void loadDepartments(selectedOrgId);
  }, [selectedOrgId, loadDepartments]);
  useEffect(() => {
    if (!selectedOrgId) return;
    void loadStats(selectedOrgId, selectedDepartmentId, rangeDays);
  }, [selectedOrgId, selectedDepartmentId, rangeDays, loadStats]);

  const workflowSummary = useMemo(() => aggregateWorkflowStats(workflowStats), [workflowStats]);
  const nodeSummary = useMemo(
    () => aggregateNodeStats(nodeStats).sort((a, b) => (b.failureRate ?? 0) - (a.failureRate ?? 0) || (b.avgDuration ?? 0) - (a.avgDuration ?? 0)),
    [nodeStats],
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cross-run monitoring, rolled up daily. Phase 22 S22.3. For a single run's live detail, use its own execution log.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Organization
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="min-w-48 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-700 shadow-sm"
            >
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name ?? org.id}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Department
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="min-w-40 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-700 shadow-sm"
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Range
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
              className="min-w-32 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-700 shadow-sm"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Workflow run stats */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Workflow runs ({workflowSummary.length})
        </h2>
        {loading && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
        {!loading && workflowSummary.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            No runs in this range yet — rollups are computed every 5 minutes, so a very recent run may not show up immediately.
          </p>
        )}
        {!loading && workflowSummary.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2">Workflow</th>
                  <th className="px-4 py-2 text-right">Total runs</th>
                  <th className="px-4 py-2 text-right">Success rate</th>
                  <th className="px-4 py-2 text-right">Failed</th>
                  <th className="px-4 py-2 text-right">Timed out</th>
                  <th className="px-4 py-2 text-right">Avg duration</th>
                  <th className="px-4 py-2 text-right">P95 duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workflowSummary.map((row) => (
                  <tr key={row.workflowId}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.workflowName}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.totalRuns}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={
                        row.successRate == null ? 'text-gray-400'
                        : row.successRate >= 90 ? 'text-emerald-600 font-semibold'
                        : row.successRate >= 70 ? 'text-amber-600 font-semibold'
                        : 'text-red-600 font-semibold'
                      }>
                        {row.successRate == null ? '—' : `${row.successRate}%`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.failed}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.timedOut}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtMs(row.avgDuration)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtMs(row.maxP95)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Node execution stats — slowest / most-failing */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Node types — slowest / most-failing ({nodeSummary.length})
        </h2>
        {!loading && nodeSummary.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            No node executions in this range yet.
          </p>
        )}
        {!loading && nodeSummary.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2">Node type</th>
                  <th className="px-4 py-2">Workflow</th>
                  <th className="px-4 py-2 text-right">Executions</th>
                  <th className="px-4 py-2 text-right">Failure rate</th>
                  <th className="px-4 py-2 text-right">Avg duration</th>
                  <th className="px-4 py-2 text-right">P95 duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nodeSummary.map((row) => (
                  <tr key={`${row.workflowId}::${row.nodeType}`}>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-gray-700">{row.nodeType}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.workflowName}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.totalExecutions}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={
                        row.failureRate == null || row.failureRate === 0 ? 'text-gray-500'
                        : row.failureRate <= 10 ? 'text-amber-600 font-semibold'
                        : 'text-red-600 font-semibold'
                      }>
                        {row.failureRate == null ? '—' : `${row.failureRate}%`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtMs(row.avgDuration)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtMs(row.maxP95)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
