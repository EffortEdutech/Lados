'use client';

/**
 * PipelineRunLog
 *
 * Collapsible bottom panel showing the cross-workflow execution timeline
 * while a pipeline run is in progress or just completed.
 *
 * Sprint 12 (S12-004)
 */

import { useState } from 'react';
import type { PipelineLogEntry, NodeRunStatus } from './PipelineRunner';

interface PipelineRunLogProps {
  log: PipelineLogEntry[];
  running: boolean;
  onDismiss: () => void;
}

const STATUS_ICON: Record<NodeRunStatus, string> = {
  idle:      '○',
  queued:    '○',
  running:   '⟳',
  completed: '✓',
  failed:    '✕',
  skipped:   '—',
};

const STATUS_COLOR: Record<NodeRunStatus, string> = {
  idle:      'text-gray-300',
  queued:    'text-gray-400',
  running:   'text-blue-500',
  completed: 'text-emerald-500',
  failed:    'text-red-500',
  skipped:   'text-gray-400',
};

function formatDuration(ms?: number): string {
  if (ms == null) return '…';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function PipelineRunLog({ log, running, onDismiss }: PipelineRunLogProps) {
  const [collapsed, setCollapsed] = useState(false);

  const totalDuration = log.reduce((sum, e) => sum + (e.durationMs ?? 0), 0);
  const failed = log.filter((e) => e.status === 'failed').length;
  const completed = log.filter((e) => e.status === 'completed').length;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">

      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className={`text-xs font-semibold ${running ? 'text-blue-600' : failed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {running ? '▶ Pipeline Running…' : failed > 0 ? `✕ Pipeline Failed (${failed} error${failed > 1 ? 's' : ''})` : '✓ Pipeline Complete'}
        </span>

        {!running && (
          <span className="text-xs text-gray-400">
            {completed} step{completed !== 1 ? 's' : ''} · {formatDuration(totalDuration)} total
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
          >
            {collapsed ? '▲ Show' : '▼ Hide'}
          </button>
          {!running && (
            <button
              onClick={onDismiss}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {!collapsed && (
        <div className="max-h-52 overflow-y-auto px-4 py-3 space-y-0">
          {log.length === 0 && (
            <p className="text-xs text-gray-400 py-2">Starting…</p>
          )}

          {log.map((entry, idx) => (
            <div key={`${entry.nodeId}-${idx}`} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              {/* Timeline spine */}
              <div className="flex flex-col items-center pt-0.5">
                <span className={`text-base font-bold leading-none ${STATUS_COLOR[entry.status]} ${entry.status === 'running' ? 'animate-spin' : ''}`}>
                  {STATUS_ICON[entry.status]}
                </span>
                {idx < log.length - 1 && (
                  <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[16px]" />
                )}
              </div>

              {/* Entry content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-800 truncate">{entry.label}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full capitalize">
                    {entry.nodeType}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-gray-400">{formatTime(entry.startedAt)}</span>
                  {entry.durationMs != null && (
                    <span className="text-[11px] text-gray-400">{formatDuration(entry.durationMs)}</span>
                  )}
                  {entry.error && (
                    <span className="text-[11px] text-red-500 truncate">{entry.error}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {running && (
            <div className="py-2 flex items-center gap-2 text-xs text-blue-500">
              <span className="animate-spin">⟳</span>
              <span>Running…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
