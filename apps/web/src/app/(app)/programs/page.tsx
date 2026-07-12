'use client';

/**
 * Programs — Phase 23 S23.4 (§6), renamed from Pipelines in Phase 24 S24.4
 *
 * Top-level /programs area (not nested under a project) — org/department
 * selector mirroring the Departments settings page pattern from S22.1's UI
 * delivery, list existing programs, create a new one.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, apiErrorMessage } from '@/lib/api/client';

interface Organization {
  id: string;
  name?: string;
  membership?: { role?: string };
}

interface Department {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  department_id: string | null;
  updated_at: string;
}

// Phase 24 S24.6 — the real projects.program_id FK (S24.1) makes a Program
// an actual parent of Projects, not just a peer entity. Only the fields this
// page's "assign program" section needs are declared here.
interface Project {
  id: string;
  name: string;
  code: string;
  program_id: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-500',
  published: 'bg-green-100 text-green-700',
  archived:  'bg-yellow-100 text-yellow-700',
};

export default function ProgramsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedOrg = orgs.find((org) => org.id === selectedOrgId);
  const canManage = selectedOrg?.membership?.role === 'owner' || selectedOrg?.membership?.role === 'admin';

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

  const loadOrgData = useCallback(async (orgId: string) => {
    setLoading(true);
    const [programRes, deptRes, projRes] = await Promise.all([
      apiClient.get<Program[]>(`/organizations/${orgId}/programs`),
      apiClient.get<Department[]>(`/organizations/${orgId}/departments`),
      apiClient.get<Project[]>(`/organizations/${orgId}/projects`),
    ]);

    if (programRes.error) {
      setError(apiErrorMessage(programRes.error, 'Failed to load programs'));
    } else {
      setPrograms(programRes.data ?? []);
      setDepartments(deptRes.data ?? []);
      setProjects(projRes.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadOrganizations(); }, [loadOrganizations]);
  useEffect(() => { if (selectedOrgId) void loadOrgData(selectedOrgId); }, [selectedOrgId, loadOrgData]);

  // Phase 24 S24.6 — assign/clear a project's parent program, mirroring
  // settings/departments/page.tsx's assignProjectDepartment() exactly.
  async function assignProjectProgram(projectId: string, programId: string) {
    setBusyProjectId(projectId);
    setError(null);
    setNotice(null);

    const res = await apiClient.patch(`/organizations/${selectedOrgId}/projects/${projectId}`, {
      programId: programId || null,
    });

    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to update project program'));
    } else {
      setNotice('Project program updated.');
      await loadOrgData(selectedOrgId);
    }
    setBusyProjectId(null);
  }

  async function createProgram() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);

    const res = await apiClient.post<Program>(`/organizations/${selectedOrgId}/programs`, {
      name: newName.trim(),
      departmentId: newDeptId || undefined,
    });

    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to create program'));
      setCreating(false);
      return;
    }

    setCreating(false);
    if (res.data) {
      router.push(`/programs/${res.data.id}?orgId=${selectedOrgId}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Programs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Chains of workflows spanning projects, gated by named human or stage-gate sign-off. Phase 23 S23.4, renamed from Pipelines in Phase 24 S24.4.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
          Organization
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="min-w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-700 shadow-sm"
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>{org.name ?? org.id}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">Dismiss</button>
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800">Dismiss</button>
        </div>
      )}
      {!canManage && selectedOrgId && (
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Your role can view programs, but owner/admin permission is needed to create one.
        </div>
      )}

      {/* Create program */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">New program</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Procurement-to-Payment"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="flex-1 flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Department (optional)
            <select
              value={newDeptId}
              onChange={(e) => setNewDeptId(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
            >
              <option value="">— org-wide —</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void createProgram()}
            disabled={creating || !newName.trim() || !canManage}
            className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </section>

      {/* Programs list */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Programs ({programs.length})
        </h2>
        {loading && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
        {!loading && programs.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            No programs yet — create one above.
          </p>
        )}
        {!loading && programs.length > 0 && (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {programs.map((p) => {
              const dept = departments.find((d) => d.id === p.department_id);
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/programs/${p.id}?orgId=${selectedOrgId}`)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {dept ? dept.name : 'Org-wide'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {p.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Projects — assign program (Phase 24 S24.6, mirrors the Departments
          settings page's own "assign department" section) */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Projects ({projects.length}) — assign program
        </h2>
        {!loading && projects.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            No projects in this organization.
          </p>
        )}
        {!loading && projects.length > 0 && (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{project.name}</p>
                  <p className="font-mono text-[11px] text-gray-400">{project.code}</p>
                </div>
                <select
                  value={project.program_id ?? ''}
                  onChange={(e) => void assignProjectProgram(project.id, e.target.value)}
                  disabled={busyProjectId === project.id || !canManage}
                  className="min-w-48 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm disabled:opacity-50"
                >
                  <option value="">— no program —</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
