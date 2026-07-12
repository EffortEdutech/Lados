'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  membership: { role: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  currency: string;
  created_at: string;
  // Phase 24 S24.6 — the real projects.program_id FK (S24.1); resolved to a
  // name client-side against the org's own programs list, same pattern as
  // the Departments settings page resolves parent_department_id.
  program_id?: string | null;
}

// Only the fields this page needs to resolve program_id → a display name.
interface Program {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-100 text-gray-500',
};

export default function ProjectsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', currency: 'MYR' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load orgs on mount
  useEffect(() => {
    apiClient.get<Organization[]>('/organizations').then((res) => {
      const list = res.data ?? [];
      setOrgs(list);
      if (list.length > 0) setSelectedOrg(list[0]);
    }).finally(() => setLoading(false));
  }, []);

  // Load projects (+ programs, to resolve program_id → name) when org changes
  const loadProjects = useCallback(() => {
    if (!selectedOrg) return;
    setLoading(true);
    Promise.all([
      apiClient.get<Project[]>(`/organizations/${selectedOrg.id}/projects`),
      apiClient.get<Program[]>(`/organizations/${selectedOrg.id}/programs`),
    ])
      .then(([projRes, programRes]) => {
        setProjects(projRes.data ?? []);
        setPrograms(programRes.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [selectedOrg]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/organizations/${selectedOrg.id}/projects`, form);
      setShowModal(false);
      setForm({ name: '', code: '', description: '', currency: 'MYR' });
      loadProjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            {selectedOrg && (
              <p className="mt-1 text-sm text-gray-500">{selectedOrg.name}</p>
            )}
          </div>
          {selectedOrg && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Project
            </button>
          )}
        </div>

        {/* Org switcher (if multiple orgs) */}
        {orgs.length > 1 && (
          <div className="flex gap-2 mb-6">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedOrg?.id === org.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                {org.name}
              </button>
            ))}
          </div>
        )}

        {/* Empty / loading */}
        {loading && (
          <p className="text-sm text-gray-400 text-center py-16">Loading…</p>
        )}

        {!loading && orgs.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-sm">No organization found.</p>
            <p className="text-gray-400 text-xs mt-1">Ask an admin to add you to an organization.</p>
          </div>
        )}

        {/* Project grid */}
        {!loading && projects.length === 0 && selectedOrg && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-sm font-medium">No projects yet</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">Create your first project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + New Project
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const program = programs.find((p) => p.id === project.program_id);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{project.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{project.code}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{project.description}</p>
                )}
                {program && (
                  <p className="text-[11px] text-violet-600 mb-2">
                    🗂️ Program: <span className="font-medium">{program.name}</span>
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{project.currency}</span>
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">New Project</h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Hospital Extension Block B"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Code <span className="text-red-500">*</span></label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. PRJ-001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Optional project description"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                >
                  <option value="MYR">MYR — Malaysian Ringgit</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
