'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;
  version: string;
  tags: string[];
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived:  'bg-yellow-100 text-yellow-700',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = useCallback(() => {
    setLoading(true);
    apiClient
      .get<Workflow[]>(`/projects/${projectId}/workflows`)
      .then((res) => setWorkflows(res.data ?? []))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/projects/${projectId}/workflows`, form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      loadWorkflows();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/projects" className="hover:text-gray-600">Projects</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Workflows</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
            <p className="mt-1 text-sm text-gray-500 font-mono">{projectId}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Workflow
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-gray-400 text-center py-16">Loading…</p>
        )}

        {/* Empty */}
        {!loading && workflows.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-sm font-medium">No workflows yet</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">Build your first AI-powered QS workflow</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + New Workflow
            </button>
          </div>
        )}

        {/* Workflow list */}
        <div className="space-y-3">
          {workflows.map((wf) => (
            <Link
              key={wf.id}
              href={`/projects/${projectId}/workflows/${wf.id}`}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                    {wf.name}
                  </h3>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[wf.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {wf.status}
                  </span>
                </div>
                {wf.description && (
                  <p className="text-xs text-gray-500 truncate">{wf.description}</p>
                )}
                {wf.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {wf.tags.map((tag) => (
                      <span key={tag} className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className="text-xs text-gray-400">v{wf.version}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(wf.updated_at).toLocaleDateString()}
                </p>
                <span className="text-xs text-blue-500 group-hover:text-blue-600 mt-1 block">
                  Open canvas →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Create Workflow Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">New Workflow</h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. BOQ to RFQ — Block A Structural"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Optional description of what this workflow does"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
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
                  {saving ? 'Creating…' : 'Create Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
