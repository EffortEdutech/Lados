'use client';

import { useState, useEffect } from 'react';
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

export default function DashboardPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentWorkflows, setRecentWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const orgRes = await apiClient.get<Organization[]>('/organizations');
        const orgList = orgRes.data ?? [];
        setOrgs(orgList);

        if (orgList.length === 0) return;

        // Load projects for first org
        const org = orgList[0];
        const projRes = await apiClient.get<Project[]>(`/organizations/${org.id}/projects`);
        const projList = projRes.data ?? [];
        setProjects(projList);

        // Load workflows for first project
        if (projList.length > 0) {
          const wfRes = await apiClient.get<Workflow[]>(`/projects/${projList[0].id}/workflows`);
          setRecentWorkflows((wfRes.data ?? []).slice(0, 5));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const org = orgs[0];

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {org && (
            <p className="mt-1 text-sm text-gray-500">
              {org.name} · <span className="capitalize">{org.membership.role}</span>
            </p>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Projects</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {loading ? '—' : projects.length}
            </p>
            <Link href="/projects" className="mt-2 text-xs text-blue-500 hover:text-blue-600 block">
              View all →
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Workflows</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">
              {loading ? '—' : recentWorkflows.length}
            </p>
            <p className="mt-2 text-xs text-gray-400">In active project</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Node Library</p>
            <p className="mt-2 text-3xl font-bold text-green-600">12</p>
            <p className="mt-2 text-xs text-gray-400">MVP nodes across 5 packs</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/projects"
                className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>📁</span> New Project
              </Link>
              {projects.length > 0 && (
                <Link
                  href={`/projects/${projects[0].id}`}
                  className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>⚡</span> New Workflow in {projects[0].name}
                </Link>
              )}
            </div>
          </div>

          {/* Recent workflows */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Workflows</h2>
            {loading && <p className="text-xs text-gray-400">Loading…</p>}
            {!loading && recentWorkflows.length === 0 && (
              <p className="text-xs text-gray-400">No workflows yet. Create a project first.</p>
            )}
            <div className="space-y-2">
              {recentWorkflows.map((wf) => (
                <Link
                  key={wf.id}
                  href={`/projects/${wf.project_id}/workflows/${wf.id}`}
                  className="flex items-center justify-between py-1.5 hover:text-blue-600 transition-colors"
                >
                  <span className="text-sm text-gray-700 truncate">{wf.name}</span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {new Date(wf.updated_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Stack status */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800">✅ Sprint 1–5 complete — stack is live</p>
          <p className="mt-1 text-xs text-green-600">
            API: http://localhost:4000/api/v1 · Web: http://localhost:3000 · Nodes: 12 registered
          </p>
        </div>
      </div>
    </div>
  );
}
