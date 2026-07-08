'use client';

/**
 * Departments settings page — Phase 22 S22.1
 *
 * Minimal UI, built to smoke-test S22.1 end-to-end: create a department
 * (optionally nested under a parent), and assign/clear a project's
 * department. Deliberately does NOT include member-management UI in this
 * pass — DepartmentService.addMember/removeMember/listMembers are already
 * live via the API, just not surfaced here yet. That naturally lands
 * alongside S22.2's approval-routing UI, which needs the same "who's in
 * this department" picker.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, apiErrorMessage } from '@/lib/api/client';

interface Organization {
  id: string;
  name?: string;
  membership?: { role?: string };
}

interface Department {
  id: string;
  organization_id: string;
  parent_department_id: string | null;
  name: string;
  created_at: string;
}

interface Project {
  id: string;
  organization_id: string;
  department_id: string | null;
  name: string;
  code: string;
  status: string;
}

export default function DepartmentsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState('');
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
    const [deptRes, projRes] = await Promise.all([
      apiClient.get<Department[]>(`/organizations/${orgId}/departments`),
      apiClient.get<Project[]>(`/organizations/${orgId}/projects`),
    ]);

    if (deptRes.error || projRes.error) {
      setError(apiErrorMessage(deptRes.error ?? projRes.error, 'Failed to load departments/projects'));
    } else {
      setDepartments(deptRes.data ?? []);
      setProjects(projRes.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadOrganizations(); }, [loadOrganizations]);
  useEffect(() => { if (selectedOrgId) void loadOrgData(selectedOrgId); }, [selectedOrgId, loadOrgData]);

  async function createDepartment() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    setNotice(null);

    const res = await apiClient.post<Department>(`/organizations/${selectedOrgId}/departments`, {
      name: newName.trim(),
      parentDepartmentId: newParentId || undefined,
    });

    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to create department'));
    } else {
      setNotice(`Department "${newName.trim()}" created.`);
      setNewName('');
      setNewParentId('');
      await loadOrgData(selectedOrgId);
    }
    setCreating(false);
  }

  async function assignProjectDepartment(projectId: string, departmentId: string) {
    setBusyId(projectId);
    setError(null);
    setNotice(null);

    const res = await apiClient.patch(`/organizations/${selectedOrgId}/projects/${projectId}`, {
      departmentId: departmentId || null,
    });

    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to update project department'));
    } else {
      setNotice('Project department updated.');
      await loadOrgData(selectedOrgId);
    }
    setBusyId(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Business-unit layer between organization and project. Phase 22 S22.1.
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
          Your role can view departments, but owner/admin permission is needed to create one or reassign a project.
        </div>
      )}

      {/* Create department */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">New department</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Procurement"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="flex-1 flex flex-col gap-1 text-xs font-semibold text-gray-500">
            Parent department (optional)
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
            >
              <option value="">— none (top-level) —</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void createDepartment()}
            disabled={creating || !newName.trim() || !canManage}
            className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </section>

      {/* Departments list */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Departments ({departments.length})
        </h2>
        {loading && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
        {!loading && departments.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            No departments yet — create one above.
          </p>
        )}
        {!loading && departments.length > 0 && (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {departments.map((dept) => {
              const parent = departments.find((d) => d.id === dept.parent_department_id);
              const projectCount = projects.filter((p) => p.department_id === dept.id).length;
              return (
                <div key={dept.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{dept.name}</p>
                    {parent && (
                      <p className="text-xs text-gray-400">under {parent.name}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Projects — assign department */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Projects ({projects.length}) — assign department
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
                  value={project.department_id ?? ''}
                  onChange={(e) => void assignProjectDepartment(project.id, e.target.value)}
                  disabled={busyId === project.id || !canManage}
                  className="min-w-48 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm disabled:opacity-50"
                >
                  <option value="">— no department —</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
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
