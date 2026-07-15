'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { SkillMode } from '@lados/shared-types';
import DesignStudio from '@/components/canvas/DesignStudio';
import ExecutionLogPanel from '@/components/canvas/ExecutionLogPanel';
import FileUploadPanel from '@/components/canvas/FileUploadPanel';
import ExplorerShell from '@/components/canvas/explorer/ExplorerShell';
import { apiClient } from '@/lib/api/client';
import type { QSWorkflowDefinition, WorkflowConnection, NodeInstanceId } from '@lados/shared-types';
import {
  useCanvasStore,
  useExecutionStore,
  useUIStore,
  useWorkflowStore,
  DEFAULT_RUN_STATE,
} from '@/stores';
import type { SaveState } from '@/stores';
import { useExecutionRunMonitor } from '@/hooks/useExecutionRunMonitor';
import { useExecutionRunStream } from '@/hooks/useExecutionRunStream';

// â”€â”€ Normalize definition from DB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Templates stored via SQL seed may use React Flow's "edges" key instead of
// the canonical "connections" key. Convert to ensure the canvas never crashes.
function normalizeDefinition(raw: unknown): QSWorkflowDefinition {
  const def = raw as QSWorkflowDefinition & {
    version?: string;
    edges?: Array<{ id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
  };

  // Convert seed-style edges [{id, source, target}] â†’ canonical connections
  const connections: WorkflowConnection[] = def.connections?.length
    ? def.connections
    : (def.edges ?? []).map((e) => ({
        id: e.id,
        sourceNodeId: e.source as NodeInstanceId,
        sourcePortId: e.sourceHandle ?? 'out',
        targetNodeId: e.target as NodeInstanceId,
        targetPortId: e.targetHandle ?? 'in',
      })) as WorkflowConnection[];

  return {
    ...def,
    // Ensure canonical schemaVersion so auto-save round-trips cleanly
    schemaVersion: def.schemaVersion ?? '1.0',
    // Ensure workflow metadata stub exists (validator no longer requires it,
    // but the canvas spreads it in auto-save so it must not be undefined)
    workflow: def.workflow ?? {
      id: '' as NodeInstanceId,
      name: '',
      version: '1.0.0',
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    nodes: def.nodes ?? [],
    connections,
  };
}

const WorkflowCanvas = dynamic(() => import('@/components/canvas/WorkflowCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      Loading canvas...
    </div>
  ),
});

interface PageProps {
  params: { projectId: string; workflowId: string };
}

// Node types that need a file input before running
const FILE_NODE_TYPES = new Set([
  'document.upload_file',
  'document.read_excel',
  'qs.read_boq',
]);

function workflowNeedsFile(definition: QSWorkflowDefinition): boolean {
  const nodes = definition.nodes ?? [];
  if (nodes.length === 0) return false;

  // If there are read_excel nodes, only prompt for upload when at least one
  // has no library_file_id â€” the library takes priority at runtime so nodes
  // that are already wired to the library don't need a runtime upload.
  const readExcelNodes = nodes.filter((n) => n.type === 'document.read_excel');
  if (readExcelNodes.length > 0) {
    return readExcelNodes.some((n) => !n.config?.library_file_id);
  }

  // No read_excel nodes â€” fall back to type-based check.
  return nodes.some((n) => FILE_NODE_TYPES.has(n.type));
}

export default function WorkflowEditorPage({ params }: PageProps) {
  const { projectId, workflowId } = params;
  const definition = useWorkflowStore((state) => state.definition);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const saveState = useWorkflowStore((state) => state.saveState);
  const error = useWorkflowStore((state) => state.loadError);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
  const setDefinition = useWorkflowStore((state) => state.setDefinition);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const setSaveState = useWorkflowStore((state) => state.setSaveState);
  const setLoadError = useWorkflowStore((state) => state.setLoadError);
  const resetWorkflowStore = useWorkflowStore((state) => state.reset);
  const organizationId = useUIStore((state) => state.organizationId) ?? '';
  const setOrganizationId = useUIStore((state) => state.setOrganizationId);

  // â”€â”€ Execution state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Phase 25 (2026-07-14) — scoped by workflowId (state.byWorkflow[workflowId])
  // so this page's run tracking is independent of any other open workflow
  // tab/page in the same browser session.
  const running = useExecutionStore((state) => {
    const run = state.byWorkflow[workflowId];
    return !!run && (run.polling || run.runStatus === 'starting' || run.runStatus === 'running');
  });
  const showLogs = useUIStore((state) => state.showExecutionLog);
  const setShowLogs = useUIStore((state) => state.setShowExecutionLog);
  const runSummary = useExecutionStore((state) => state.byWorkflow[workflowId]?.runSummary ?? DEFAULT_RUN_STATE.runSummary);
  const runLogs = useExecutionStore((state) => state.byWorkflow[workflowId]?.nodeLogList ?? DEFAULT_RUN_STATE.nodeLogList);
  const runError = useExecutionStore((state) => state.byWorkflow[workflowId]?.runError ?? DEFAULT_RUN_STATE.runError);
  const activeRunId = useExecutionStore((state) => state.byWorkflow[workflowId]?.runId ?? DEFAULT_RUN_STATE.runId);
  const startRun = useExecutionStore((state) => state.startRun);
  const setRunSummary = useExecutionStore((state) => state.setRunSummary);
  const setNodeLogs = useExecutionStore((state) => state.setNodeLogs);
  const setRunError = useExecutionStore((state) => state.setRunError);
  const resetRun = useExecutionStore((state) => state.resetRun);
  useExecutionRunMonitor(workflowId, activeRunId);
  // Phase 21 S7.4 — additive live per-node status via SSE, on top of the
  // poll-based monitor above (which stays the terminal-status/log fetch
  // safety net). See useExecutionRunStream.ts doc comment.
  useExecutionRunStream(workflowId, activeRunId);

  // â”€â”€ Sidebar tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const setExplorerTab = useUIStore((state) => state.setExplorerTab);
  const setExplorerCollapsed = useUIStore((state) => state.setExplorerCollapsed);
  const [groupRunRefreshKey, setGroupRunRefreshKey] = useState(0);
  // Mobile-only off-canvas toggle for the Explorer panel (2026-07-13 mobile
  // fix) — on desktop the Explorer stays inline/static regardless of this.
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);

  // â”€â”€ Validation state (S18-001) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hasValidationErrors = useCanvasStore((state) => state.hasValidationErrors);
  const setHasValidationErrors = useCanvasStore((state) => state.setHasValidationErrors);

  // â”€â”€ Version history drawer (S18-002) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â”€â”€ Bulk mode request (S14-007) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const bulkModeRequest = useCanvasStore((state) => state.bulkModeRequest);
  const setBulkModeRequest = useCanvasStore((state) => state.setBulkModeRequest);

  // â”€â”€ Phase 4B: AI Design Studio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const showDesignStudio = useUIStore((state) => state.showDesignStudio);
  const setShowDesignStudio = useUIStore((state) => state.setShowDesignStudio);
  const draftRequest = useCanvasStore((state) => state.draftRequest);
  const setDraftRequest = useCanvasStore((state) => state.setDraftRequest);

  const handleApplyDraft = useCallback((draft: QSWorkflowDefinition) => {
    setDraftRequest({ definition: draft, stamp: Date.now() });
  }, []);

  const handleBulkMode = useCallback((nodeTypes: string[], mode: SkillMode) => {
    setBulkModeRequest({ nodeTypes, mode, stamp: Date.now() });
  }, []);

  // â”€â”€ File upload state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const showUploadPanel = useUIStore((state) => state.showUploadPanel);
  const setShowUploadPanel = useUIStore((state) => state.setShowUploadPanel);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // â”€â”€ Load workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    // 2026-07-15 — real bug found via the Phase 25 single-tab smoke test.
    // useWorkflowStore is a single GLOBAL slot (definition/workflowId/etc.),
    // not keyed per workflow like executionStore now is. Next.js reuses this
    // same page component instance across client-side nav to a different
    // workflowId (no remount), so this effect just re-fires. With no guard,
    // a slow in-flight fetch for the workflow you already navigated AWAY
    // from could resolve after the new workflow's fetch and silently
    // overwrite it — you'd be looking at workflow B's URL/run-state while
    // the canvas quietly still showed workflow A's (possibly smaller) node
    // set, with nothing thrown to the console. Two-part fix:
    //  1. `cancelled` flag — any response for a workflowId we've since left
    //     is ignored instead of applied, no matter which order they resolve.
    //  2. `resetWorkflowStore()` up front — clears the previous workflow's
    //     definition immediately (renders the existing "Loading workflow..."
    //     state below) instead of ever showing stale nodes while the new
    //     fetch is in flight.
    let cancelled = false;
    resetWorkflowStore();

    // Load org context for file upload
    apiClient.get<{ id: string; name: string; membership: { role: string } }[]>('/organizations')
      .then((res) => {
        if (cancelled) return;
        const org = res.data?.[0];
        if (!org) return;
        setOrganizationId(org.id);
      });

    apiClient
      .get<{ definition: QSWorkflowDefinition; name: string }>(
        `/projects/${projectId}/workflows/${workflowId}`,
      )
      .then((res) => {
        if (cancelled) return; // stale response for a workflow we've since left
        if (res.success && res.data) {
          setWorkflow(
            workflowId,
            projectId,
            res.data.name,
            normalizeDefinition(res.data.definition),
          );
        } else {
          setLoadError(res.error?.message ?? 'Failed to load workflow');
        }
      })
      .catch(() => { if (!cancelled) setLoadError('Network error loading workflow'); });

    return () => { cancelled = true; };
  }, [projectId, setLoadError, setOrganizationId, setWorkflow, workflowId, resetWorkflowStore]);

  // â”€â”€ Auto-save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Run workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleRunClick = useCallback(() => {
    if (!definition) return;
    // If workflow uses file nodes and no file uploaded yet, show upload panel
    if (workflowNeedsFile(definition) && !uploadedFileId) {
      setShowUploadPanel(true);
      return;
    }
    void executeRun();
  }, [definition, uploadedFileId]);

  const handleFileUploaded = useCallback((fileId: string, fileName: string) => {
    setUploadedFileId(fileId);
    setUploadedFileName(fileName);
    setShowUploadPanel(false);
    // Auto-start run after upload
    setTimeout(() => void executeRun(fileId), 300);
  }, []);

  const handleSkipUpload = useCallback(() => {
    setShowUploadPanel(false);
    void executeRun();
  }, []);

  async function executeRun(fileId?: string) {
    resetRun(workflowId);
    useExecutionStore.getState().setPolling(workflowId, true);
    setShowLogs(true);
    setRunError(workflowId, null);

    // Build inputs â€” pass file_id if available
    const inputs: Record<string, unknown> = {};
    const resolvedFileId = fileId ?? uploadedFileId;
    if (resolvedFileId) {
      inputs['file_id'] = resolvedFileId;
    }

    try {
      // Phase 12: trigger returns immediately with runId (async queue)
      const res = await apiClient.post<{ runId: string; status: string }>(
        `/workflows/${workflowId}/run`,
        { inputs },
      );

      if (!res.success || !res.data) {
        setRunError(workflowId, res.error?.message ?? 'Run failed');
        useExecutionStore.getState().setPolling(workflowId, false);
        return;
      }

      const { runId } = res.data;
      startRun(workflowId, runId);
    } catch (err: unknown) {
      setRunError(workflowId, err instanceof Error ? err.message : 'Unexpected error');
      useExecutionStore.getState().setPolling(workflowId, false);
    }
  }

  // â”€â”€ Publish workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const [publishing, setPublishing] = useState(false);
  const [publishState, setPublishState] = useState<'idle' | 'ok' | 'error'>('idle');

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setPublishState('idle');
    try {
      const res = await apiClient.post<{ version: number }>(
        `/projects/${projectId}/workflows/${workflowId}/publish`,
        {},
      );
      setPublishState(res.success ? 'ok' : 'error');
    } catch {
      setPublishState('error');
    } finally {
      setPublishing(false);
      setTimeout(() => setPublishState('idle'), 3000);
    }
  }, [projectId, workflowId]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const saveLabel: Record<SaveState, string> = {
    saved: 'Saved',
    saving: 'Saving...',
    unsaved: 'Unsaved changes',
    error: 'Save failed',
  };
  const saveLabelColor: Record<SaveState, string> = {
    saved: 'text-green-600',
    saving: 'text-gray-400',
    unsaved: 'text-amber-500',
    error: 'text-red-500',
  };
  if (error) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] md:h-screen items-center justify-center text-red-500">
        {error}
      </div>
    );
  }
  if (!definition) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] md:h-screen items-center justify-center text-gray-400 text-sm">
        Loading workflow...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen flex-col bg-gray-50">
      {/* â”€â”€ Toolbar â”€â”€ */}
      <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4">
        {/* Explorer hamburger â€” mobile only (2026-07-13 mobile fix) */}
        <button
          onClick={() => setMobileExplorerOpen((open) => !open)}
          aria-label={mobileExplorerOpen ? 'Close explorer' : 'Open explorer'}
          className="md:hidden p-1.5 -ml-1.5 mr-0.5 rounded hover:bg-gray-100 text-gray-500 flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileExplorerOpen ? (
              <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            ) : (
              <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
            )}
          </svg>
        </button>
        {/* Breadcrumb */}
        <Link
          href={`/projects/${projectId}`}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
        >
          &larr; Back
        </Link>
        <span className="text-gray-200">|</span>
        <span className="text-sm font-semibold text-gray-800 truncate max-w-xs">
          {workflowName}
        </span>
        <span className="text-gray-300">|</span>
        <span className={`text-xs ${saveLabelColor[saveState]}`}>
          {saveLabel[saveState]}
        </span>

        {/* Uploaded file badge */}
        {uploadedFileName && (
          <>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <span className="truncate max-w-[160px]">{uploadedFileName}</span>
              <button
                onClick={() => { setUploadedFileId(null); setUploadedFileName(null); }}
                className="text-green-400 hover:text-green-600 ml-0.5"
                title="Remove file"
              >
                x
              </button>
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Phase 4B: AI Design Studio button */}
          <button
            onClick={() => setShowDesignStudio(true)}
            className="text-xs font-medium text-purple-600 hover:text-purple-800 px-2 py-1.5 rounded hover:bg-purple-50 transition-colors border border-purple-200 hover:border-purple-300"
            title="AI Design Studio - generate a workflow from a description"
          >
            AI Design
          </button>

          {/* Version history button â€” S18-002 */}
          <button
            onClick={() => {
              setExplorerTab('versions');
              setExplorerCollapsed(false);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Version history"
          >
            Versions
          </button>

          {/* Export button â€” S16-004 */}
          <button
            onClick={async () => {
              const res = await apiClient.get<Record<string, unknown>>(
                `/projects/${projectId}/workflows/${workflowId}/export`,
              );
              if (!res.success || !res.data) return;
              const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href     = url;
              a.download = `${workflowName.replace(/\s+/g, '_')}.lados.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Export workflow JSON"
          >
            Export
          </button>

          {/* Publish button */}
          <button
            onClick={() => void handlePublish()}
            disabled={publishing || hasValidationErrors}
            title={hasValidationErrors ? 'Fix connection errors before publishing' : 'Publish workflow - register event triggers'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              publishState === 'ok'
                ? 'bg-green-50 text-green-700 border-green-300'
                : publishState === 'error'
                  ? 'bg-red-50 text-red-600 border-red-300'
                  : publishing || hasValidationErrors
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            }`}
          >
            {publishing ? 'Publishing...' : publishState === 'ok' ? 'Published' : publishState === 'error' ? 'Failed' : 'Publish'}
          </button>

          {/* Run button */}
          <button
            onClick={handleRunClick}
            disabled={running || hasValidationErrors}
            title={hasValidationErrors ? 'Fix connection errors before running' : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              running || hasValidationErrors
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {running ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-green-400 animate-spin" />
                Running...
              </>
            ) : (
              <>Run</>
            )}
          </button>

          {!showLogs && runSummary && (
            <button
              onClick={() => setShowLogs(true)}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              View logs
            </button>
          )}
        </div>
      </header>

      {/* â”€â”€ Canvas area â”€â”€ */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <ExplorerShell
          workflowId={workflowId}
          projectId={projectId}
          organizationId={organizationId}
          readOnly={saveState === 'error'}
          groupRunRefreshKey={groupRunRefreshKey}
          reRunning={running}
          mobileOpen={mobileExplorerOpen}
          onMobileClose={() => setMobileExplorerOpen(false)}
          onBulkMode={handleBulkMode}
          onLoadRun={(summary, logs) => {
            setRunSummary(workflowId, summary);
            setNodeLogs(workflowId, logs);
            setShowLogs(true);
          }}
          onReRun={() => void executeRun()}
          onApplyTemplate={handleApplyDraft}
          onVersionRestored={() => {
            apiClient
              .get<{ definition: unknown; name: string }>(
                `/projects/${projectId}/workflows/${workflowId}`,
              )
              .then((res) => {
                if (res.success && res.data) {
                  setDefinition(normalizeDefinition(res.data.definition));
                  setWorkflowName(res.data.name);
                }
              });
          }}
        />
        <main className="relative flex-1 overflow-hidden flex flex-col">
          {/* Canvas */}
          <div className="flex-1 overflow-hidden">
            <WorkflowCanvas
              definition={definition}
              onSave={handleSave}
              organizationId={organizationId}
              projectId={projectId}
              workflowId={workflowId}
              bulkModeRequest={bulkModeRequest}
              draftRequest={draftRequest}
              onGroupRunCompleted={() => {
                setExplorerTab('runs');
                setExplorerCollapsed(false);
                setGroupRunRefreshKey((key) => key + 1);
              }}
              onValidationChange={setHasValidationErrors}
            />
          </div>

          {/* File upload overlay */}
          {showUploadPanel && organizationId && (
            <FileUploadPanel
              organizationId={organizationId}
              projectId={projectId}
              workflowId={workflowId}
              onUploaded={handleFileUploaded}
              onSkip={handleSkipUpload}
            />
          )}

          {/* Run error banner */}
          {/* Bugfix 2026-07-07: AiCommandBar/OwnerAssistantSidebar's floating
              trigger buttons were fixed to bottom-right and used to sit on
              top of this banner (blocking its own close "x"). They're now
              docked to the right edge, vertically centered (see
              useFloatingDockPosition), so bottom-4/right-4 is clear again. */}
          {runError && !showLogs && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-center gap-2">
              <span className="font-semibold">Warning</span>
              <span>{runError}</span>
              <button onClick={() => setRunError(workflowId, null)} className="ml-auto text-red-400 hover:text-red-600">x</button>
            </div>
          )}

          {/* Phase 12: paused-for-approval banner */}
          {runSummary?.status === 'paused' && (
            <div className="absolute bottom-4 left-4 right-4 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-3 shadow-md z-10">
              <span className="flex-1">
                <strong>Workflow paused</strong> - waiting for human approval.
              </span>
              <Link
                href="/approvals"
                className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                Go to Approvals
              </Link>
              <button onClick={() => setRunSummary(workflowId, null)} className="text-amber-400 hover:text-amber-600">x</button>
            </div>
          )}

          {/* Execution log panel */}
          {showLogs && (
            <ExecutionLogPanel
              run={runSummary}
              logs={runLogs}
              loading={running}
              onClose={() => setShowLogs(false)}
              workflowId={workflowId}
            />
          )}
        </main>
      </div>

      {/* Phase 4B: AI Design Studio drawer */}
      {definition && (
        <DesignStudio
          projectId={projectId}
          organizationId={organizationId}
          baseDefinition={definition}
          isOpen={showDesignStudio}
          onClose={() => setShowDesignStudio(false)}
          onApply={handleApplyDraft}
        />
      )}
    </div>
  );
}

