'use client';

/**
 * Approval Inbox — Phase 1 / Phase 22 S22.2
 *
 * Lists all pending approval + input tasks for the current user's
 * organisations. `task_type: 'approval'` cards show Approve / Reject
 * (POST /approvals/:taskId/decide) exactly as before; `task_type: 'input'`
 * cards render a dynamic form built from the node's inputSchema and submit
 * via POST /approvals/:taskId/submit-input (§4.4). Both types can be
 * delegated to another named user via POST /approvals/:taskId/delegate (§4.2).
 *
 * AI guardrail: human must approve / submit. AI is advisory only.
 * Neither approval nor structured input is ever auto-resolved.
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient, apiErrorMessage } from '@/lib/api/client';

interface InputFieldSpec {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required?: boolean;
  options?: string[];
}

interface ApprovalTask {
  id: string;
  title: string;
  description: string | null;
  data: (Record<string, unknown> & { inputSchema?: InputFieldSpec[] }) | null;
  status: 'pending' | 'approved' | 'rejected' | 'submitted';
  assignee_role: string | null;
  assignee_user_id: string | null;
  task_type: 'approval' | 'input';
  escalate_after_minutes: number | null;
  escalated_at: string | null;
  delegated_to_user_id: string | null;
  created_at: string;
  node_id: string | null;
  node_name: string | null;
  execution_id: string;
  workflow_id: string;
  project_id: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DelegateControl({
  taskId,
  onDelegate,
}: {
  taskId: string;
  onDelegate: (taskId: string, toUserId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        Delegate to someone else
      </button>
    );
  }

  async function submit() {
    if (!toUserId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onDelegate(taskId, toUserId.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delegation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={toUserId}
        onChange={(e) => setToUserId(e.target.value)}
        placeholder="User ID to delegate to"
        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => void submit()}
        disabled={busy || !toUserId.trim()}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? '…' : 'Delegate'}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
        Cancel
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function TaskMeta({ task }: { task: ApprovalTask }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
      {task.node_name && (
        <span>Node: <span className="text-gray-600 font-medium">{task.node_name}</span></span>
      )}
      {task.assignee_user_id ? (
        <span>Assigned to: <span className="text-gray-600 font-medium">{task.assignee_user_id}</span></span>
      ) : task.assignee_role ? (
        <span>Role: <span className="text-gray-600 font-medium">{task.assignee_role}</span></span>
      ) : null}
      {task.escalate_after_minutes && (
        <span>Escalates after: <span className="text-gray-600">{task.escalate_after_minutes}m</span></span>
      )}
      <span>Requested: <span className="text-gray-600">{fmt(task.created_at)}</span></span>
    </div>
  );
}

function ApprovalCard({
  task,
  onDecide,
  onDelegate,
}: {
  task: ApprovalTask;
  onDecide: (taskId: string, decision: 'approved' | 'rejected', comments: string) => Promise<void>;
  onDelegate: (taskId: string, toUserId: string) => Promise<void>;
}) {
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(true);
    setError(null);
    try {
      await onDecide(task.id, decision, comments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
          )}
        </div>
        <span className="shrink-0 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">
          Pending
        </span>
      </div>

      <TaskMeta task={task} />

      {task.data && Object.keys(task.data).length > 0 && (
        <details className="text-[11px] text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700 select-none">
            View task data ({Object.keys(task.data).length} fields)
          </summary>
          <pre className="mt-1 bg-gray-50 rounded p-2 text-[10px] overflow-x-auto max-h-40">
            {JSON.stringify(task.data, null, 2)}
          </pre>
        </details>
      )}

      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Optional comments…"
        rows={2}
        maxLength={1000}
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => void decide('approved')}
          disabled={busy}
          className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Saving…' : '✓ Approve'}
        </button>
        <button
          onClick={() => void decide('rejected')}
          disabled={busy}
          className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Saving…' : '✗ Reject'}
        </button>
      </div>

      <DelegateControl taskId={task.id} onDelegate={onDelegate} />
    </div>
  );
}

function InputField({
  field,
  value,
  onChange,
}: {
  field: InputFieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}{field.required && ' *'}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
        {field.label}{field.required && ' *'}
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
        >
          <option value="">— select —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
      {field.label}{field.required && ' *'}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={(value as string | number) ?? ''}
        onChange={(e) => onChange(field.type === 'number' ? e.target.valueAsNumber : e.target.value)}
        className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-400"
      />
    </label>
  );
}

function InputTaskCard({
  task,
  onSubmitInput,
  onDelegate,
}: {
  task: ApprovalTask;
  onSubmitInput: (taskId: string, data: Record<string, unknown>) => Promise<void>;
  onDelegate: (taskId: string, toUserId: string) => Promise<void>;
}) {
  const schema = task.data?.inputSchema ?? [];
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onSubmitInput(task.id, values);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
          )}
        </div>
        <span className="shrink-0 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">
          Input needed
        </span>
      </div>

      <TaskMeta task={task} />

      {schema.length === 0 ? (
        <p className="text-xs text-red-600">This input task has no schema — nothing to fill in.</p>
      ) : (
        <div className="space-y-2">
          {schema.map((field) => (
            <InputField
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
            />
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={() => void submit()}
        disabled={busy || schema.length === 0}
        className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {busy ? 'Submitting…' : 'Submit'}
      </button>

      <DelegateControl taskId={task.id} onDelegate={onDelegate} />
    </div>
  );
}

export default function ApprovalsPage() {
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient.get<ApprovalTask[]>('/approvals');
    if (res.error) {
      setError(apiErrorMessage(res.error, 'Failed to load approvals'));
    } else {
      setTasks(res.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleDecide(
    taskId: string,
    decision: 'approved' | 'rejected',
    comments: string,
  ) {
    const res = await apiClient.post<unknown>(`/approvals/${taskId}/decide`, {
      decision,
      comments,
    });
    if (res.error) throw new Error(apiErrorMessage(res.error, 'Decision failed'));
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleSubmitInput(taskId: string, data: Record<string, unknown>) {
    const res = await apiClient.post<unknown>(`/approvals/${taskId}/submit-input`, { data });
    if (res.error) throw new Error(apiErrorMessage(res.error, 'Submission failed'));
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleDelegate(taskId: string, toUserId: string) {
    const res = await apiClient.post<unknown>(`/approvals/${taskId}/delegate`, { toUserId });
    if (res.error) throw new Error(apiErrorMessage(res.error, 'Delegation failed'));
    // Delegated away from the current user — no longer visible to them.
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Approval Inbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Workflows paused for human sign-off or input. AI output is advisory only — your action is required.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm font-medium text-gray-500">No pending approvals</p>
          <p className="text-xs text-gray-400 mt-1">
            Workflows requiring human approval or input will appear here.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          task.task_type === 'input' ? (
            <InputTaskCard
              key={task.id}
              task={task}
              onSubmitInput={handleSubmitInput}
              onDelegate={handleDelegate}
            />
          ) : (
            <ApprovalCard
              key={task.id}
              task={task}
              onDecide={handleDecide}
              onDelegate={handleDelegate}
            />
          )
        ))}
      </div>
    </div>
  );
}
