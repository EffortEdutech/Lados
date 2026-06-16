'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import NodePalette from '@/components/canvas/NodePalette';
import { apiClient } from '@/lib/api/client';
import type { QSWorkflowDefinition } from '@qsos/shared-types';

// React Flow must be client-only (uses browser APIs)
const WorkflowCanvas = dynamic(() => import('@/components/canvas/WorkflowCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      Loading canvas…
    </div>
  ),
});

interface PageProps {
  params: { projectId: string; workflowId: string };
}

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

export default function WorkflowEditorPage({ params }: PageProps) {
  const { projectId, workflowId } = params;
  const [definition, setDefinition] = useState<QSWorkflowDefinition | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [error, setError] = useState<string | null>(null);

  // ── Load workflow ──────────────────────────────────────────────────────────

  useEffect(() => {
    apiClient
      .get<{ definition: QSWorkflowDefinition; name: string }>(
        `/projects/${projectId}/workflows/${workflowId}`,
      )
      .then((res) => {
        if (res.success && res.data) {
          setDefinition(res.data.definition);
          setWorkflowName(res.data.name);
        } else {
          setError(res.error?.message ?? 'Failed to load workflow');
        }
      })
      .catch(() => setError('Network error loading workflow'));
  }, [projectId, workflowId]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (updated: QSWorkflowDefinition) => {
      setSaveState('saving');
      try {
        const res = await apiClient.put<unknown>(
          `/projects/${projectId}/workflows/${workflowId}/definition`,
          { definition: updated },
        );
        setSaveState(res.success ? 'saved' : 'error');
      } catch {
        setSaveState('error');
      }
    },
    [projectId, workflowId],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const saveLabel: Record<SaveState, string> = {
    saved: '✓ Saved',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    error: '⚠ Save failed',
  };

  const saveLabelColor: Record<SaveState, string> = {
    saved: 'text-green-600',
    saving: 'text-gray-400',
    unsaved: 'text-amber-500',
    error: 'text-red-500',
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">{error}</div>
    );
  }

  if (!definition) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400 text-sm">
        Loading workflow…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* ── Toolbar ── */}
      <header className="flex h-12 flex-shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4">
        <span className="text-sm font-semibold text-gray-800 truncate max-w-xs">
          {workflowName}
        </span>
        <span className="text-gray-300">|</span>
        <span className={`text-xs ${saveLabelColor[saveState]}`}>
          {saveLabel[saveState]}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
            Sprint 2 — Canvas
          </span>
        </div>
      </header>

      {/* ── Canvas area ── */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <main className="relative flex-1 overflow-hidden">
          <WorkflowCanvas
            definition={definition}
            onSave={handleSave}
          />
        </main>
      </div>
    </div>
  );
}
