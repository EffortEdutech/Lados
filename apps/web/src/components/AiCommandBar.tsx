'use client';

/**
 * AiCommandBar — Global AI Workflow Trigger (Phase 11)
 *
 * Floating 🤖 button accessible from every page. Guides the user through
 * a multi-turn conversation to trigger the right workflow:
 *
 *   1. Type natural language command (BM or English)
 *   2. Pick a project (if multiple exist)
 *   3. Pick a workflow (from published, pack-constrained workflows)
 *   4. Answer any input gaps (one question at a time)
 *   5. Review node plan (with AI-suggested skips)
 *   6. Confirm → workflow execution starts
 *
 * PACK CONTRACT: Only workflows already saved in the DB are triggered.
 * The AI cannot create workflows that use nodes outside installed packs.
 *
 * API: POST /ai/workflow-trigger (multi-turn, session in request body)
 * Phase 11 (S11-001)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import AiWorkflowDesigner from './AiWorkflowDesigner';

// ── Types (mirror server-side) ────────────────────────────────────────────────

interface NodePlanItem {
  nodeId:     string;
  nodeType:   string;
  label:      string;
  willSkip:   boolean;
  skipReason?: string;
  isPause:    boolean;
}

interface TriggerQuestion {
  text:     string;
  type:     'project' | 'workflow' | 'text' | 'skip_review';
  field?:   string;
  options?: Array<{ id: string; label: string; subtitle?: string }>;
}

interface WorkflowTriggerSession {
  sessionId:     string;
  command:       string;
  orgId:         string;
  phase:         string;
  projectId?:    string;
  projectName?:  string;
  workflowId?:   string;
  workflowName?: string;
  parsedFields:  Record<string, unknown>;
  inputs:        Record<string, unknown>;
  missingFields: string[];
  pendingField?: string;
  skipDecisions: Array<{ nodeId: string; nodeType: string; nodeLabel: string; confirmed: boolean; cancelled: boolean; reason: string }>;
  nodePlan:      NodePlanItem[];
}

interface TriggerResponse {
  phase:     'asking' | 'plan_ready' | 'error' | 'done';
  question?: TriggerQuestion;
  plan?:     NodePlanItem[];
  session:   WorkflowTriggerSession;
  message?:  string;
  runId?:    string;
}

type BarPhase = 'idle' | 'input' | 'working' | 'question' | 'plan' | 'executing' | 'done' | 'error' | 'design';

const NODE_ICONS: Record<string, string> = {
  'resource.create':              '➕',
  'state.change':                 '🔄',
  'foundation.request_approval':  '⏸',
  'core.human_approval':          '⏸',
  'foundation.send_notification': '📬',
  'foundation.assign_user':       '👤',
  'contractor.dispatch_trip':     '🚛',
  'contractor.generate_invoice':  '🧾',
  'contractor.complete_trip':     '✅',
  'contractor.extract_fuel_data': '⛽',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiCommandBar() {
  const [barPhase,  setBarPhase]  = useState<BarPhase>('idle');
  const [orgId,     setOrgId]     = useState('');
  const [command,   setCommand]   = useState('');
  const [session,   setSession]   = useState<WorkflowTriggerSession | null>(null);
  const [question,  setQuestion]  = useState<TriggerQuestion | null>(null);
  const [answer,    setAnswer]    = useState('');
  const [plan,      setPlan]      = useState<NodePlanItem[]>([]);
  const [runId,     setRunId]     = useState('');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [workflowName, setWorkflowName] = useState('');
  // Design mode: when true, command bar opens AiWorkflowDesigner instead of trigger
  const [designMode,  setDesignMode]  = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designDesc,   setDesignDesc]   = useState('');

  const cmdRef    = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);

  // Load org on mount — use the API (not Supabase client direct) to avoid RLS 500s
  useEffect(() => {
    async function loadOrg() {
      const res = await apiClient.get<Array<{ id: string }>>('/organizations');
      if (res.success && Array.isArray(res.data) && res.data[0]) {
        setOrgId(res.data[0].id);
      }
    }
    loadOrg();
  }, []);

  // Focus management
  useEffect(() => {
    if (barPhase === 'input')    setTimeout(() => cmdRef.current?.focus(), 50);
    if (barPhase === 'question') setTimeout(() => answerRef.current?.focus(), 50);
  }, [barPhase]);

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') reset(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const reset = useCallback(() => {
    setBarPhase('idle');
    setCommand('');
    setSession(null);
    setQuestion(null);
    setAnswer('');
    setPlan([]);
    setRunId('');
    setErrorMsg('');
  }, []);

  const open = useCallback(() => { reset(); setBarPhase('input'); }, [reset]);

  // ── API call ──────────────────────────────────────────────────────────────

  async function callTrigger(body: Record<string, unknown>) {
    setBarPhase('working');
    const res = await apiClient.post<TriggerResponse>(
      '/ai/workflow-trigger',
      { ...body, orgId },
    );

    if (!res.success) {
      setErrorMsg((res as { error?: { message?: string } }).error?.message ?? 'Server error');
      setBarPhase('error');
      return;
    }

    const data = res.data!;

    if (data.phase === 'error') {
      setErrorMsg(data.message ?? 'Unknown error');
      setBarPhase('error');
      return;
    }

    if (data.phase === 'done') {
      setRunId(data.runId ?? '');
      setWorkflowName(data.session?.workflowName ?? 'Workflow');
      setBarPhase('done');
      return;
    }

    setSession(data.session);

    if (data.phase === 'plan_ready') {
      setPlan(data.plan ?? data.session.nodePlan ?? []);
      setWorkflowName(data.session.workflowName ?? '');
      setBarPhase('plan');
      return;
    }

    // asking
    if (data.question?.type === 'skip_review') {
      setPlan(data.plan ?? data.session.nodePlan ?? []);
      setWorkflowName(data.session.workflowName ?? '');
      setBarPhase('plan');
      return;
    }

    setQuestion(data.question ?? null);
    setBarPhase('question');
  }

  // ── Submit command (turn 1) ───────────────────────────────────────────────

  async function submitCommand() {
    if (!command.trim() || !orgId) return;
    await callTrigger({ command });
  }

  // ── Submit answer (turns 2+) ──────────────────────────────────────────────

  async function submitAnswer(ans: string) {
    if (!session) return;
    setAnswer('');
    await callTrigger({ command, session, answer: ans });
  }

  // ── Un-skip a node ────────────────────────────────────────────────────────

  async function unskipNode(nodeId: string) {
    if (!session) return;
    await callTrigger({ command, session, unskipNodeId: nodeId });
  }

  // ── Execute (final confirm) ───────────────────────────────────────────────

  async function executeWorkflow() {
    if (!session) return;
    setBarPhase('executing');
    await callTrigger({ command, session: { ...session, phase: 'ready' }, execute: true });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isOpen = barPhase !== 'idle';

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={open}
        title="AI Workflow Trigger"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center text-xl"
        aria-label="Open AI command bar"
      >
        🤖
      </button>

      {/* Backdrop + panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) reset(); }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-500">
              <span className="text-2xl">🤖</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">AI Workflow Trigger</p>
                <p className="text-xs text-blue-100">
                  {barPhase === 'input'     && 'Describe what you want to do'}
                  {barPhase === 'working'   && 'Processing…'}
                  {barPhase === 'question'  && (question?.type === 'project' ? 'Select project' : question?.type === 'workflow' ? 'Select workflow' : 'Input needed')}
                  {barPhase === 'plan'      && `Plan: ${workflowName}`}
                  {barPhase === 'executing' && 'Starting workflow…'}
                  {barPhase === 'done'      && 'Workflow started!'}
                  {barPhase === 'error'     && 'Something went wrong'}
                </p>
              </div>
              <button onClick={reset} className="text-blue-200 hover:text-white text-lg">✕</button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">

              {/* ── Input ── */}
              {barPhase === 'input' && (
                <>
                  {/* Mode tabs */}
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setDesignMode(false)}
                      className={`flex-1 py-2 text-xs font-semibold transition-colors ${!designMode ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      ⚡ Trigger Workflow
                    </button>
                    <button
                      onClick={() => setDesignMode(true)}
                      className={`flex-1 py-2 text-xs font-semibold transition-colors ${designMode ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      ✨ Design Workflow
                    </button>
                  </div>

                  {!designMode ? (
                    /* ── Trigger mode ── */
                    <>
                      <textarea
                        ref={cmdRef}
                        rows={3}
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCommand(); } }}
                        placeholder={'Contoh:\n"Saya terima order 5 tan pasir kasar dari TSBSB"\n"Record expense: RM450 diesel for lorry WXY1234"'}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={submitCommand}
                        disabled={!command.trim()}
                        className="w-full rounded-xl bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
                      >
                        Start →
                      </button>
                      <p className="text-center text-xs text-gray-400">Enter to submit · Esc to close · Works in BM & English</p>
                    </>
                  ) : (
                    /* ── Design mode ── */
                    <>
                      <textarea
                        rows={3}
                        value={designDesc}
                        onChange={(e) => setDesignDesc(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (designDesc.trim()) { reset(); setShowDesigner(true); }
                          }
                        }}
                        placeholder={'Describe the workflow you want to create:\n\n• "Order receipt to invoice workflow"\n• "Trip dispatch with fuel tracking"'}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        onClick={() => { if (designDesc.trim()) { reset(); setShowDesigner(true); } }}
                        disabled={!designDesc.trim()}
                        className="w-full rounded-xl bg-violet-600 text-white py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-40"
                      >
                        ✨ Design with AI →
                      </button>
                      <p className="text-center text-xs text-gray-400">AI suggests nodes from your packs · You review before saving</p>
                    </>
                  )}
                </>
              )}

              {/* ── Working ── */}
              {barPhase === 'working' && (
                <div className="text-center py-8">
                  <div className="text-3xl animate-spin mb-3">⚙️</div>
                  <p className="text-sm text-gray-500">AI is processing your request…</p>
                </div>
              )}

              {/* ── Question ── */}
              {barPhase === 'question' && question && (
                <>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{question.text.replace(/\*\*/g, '')}</p>
                  </div>

                  {/* Option list (project / workflow picker) */}
                  {question.options && (
                    <div className="space-y-2">
                      {question.options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => submitAnswer(opt.id)}
                          className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                          {opt.subtitle && <p className="text-xs text-gray-400 mt-0.5">{opt.subtitle}</p>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Free text input */}
                  {!question.options && (
                    <>
                      <input
                        ref={answerRef}
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(answer); }}
                        placeholder="Your answer…"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitAnswer(answer)}
                          disabled={!answer.trim()}
                          className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
                        >
                          Continue →
                        </button>
                        <button onClick={() => submitAnswer('skip')} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600">
                          Skip
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Plan review ── */}
              {barPhase === 'plan' && plan.length > 0 && (
                <>
                  {/* Context header */}
                  {session && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      {session.projectName && <span className="bg-gray-100 rounded px-2 py-0.5">📁 {session.projectName}</span>}
                      {workflowName       && <span className="bg-blue-50 text-blue-700 rounded px-2 py-0.5">⚡ {workflowName}</span>}
                    </div>
                  )}

                  {/* Node plan */}
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      Execution Plan
                    </div>
                    <div className="divide-y divide-gray-50">
                      {plan.map((node, i) => (
                        <div key={node.nodeId} className={`flex items-start gap-3 px-4 py-2.5 ${node.willSkip ? 'opacity-50 bg-gray-50' : ''}`}>
                          <span className="text-base leading-none mt-0.5 flex-shrink-0">
                            {node.willSkip ? '⬜' : node.isPause ? '⏸' : (NODE_ICONS[node.nodeType] ?? '▶')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${node.willSkip ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {node.label}
                            </p>
                            {node.willSkip && node.skipReason && (
                              <p className="text-xs text-gray-400 mt-0.5">Skip: {node.skipReason}</p>
                            )}
                            {node.isPause && !node.willSkip && (
                              <p className="text-xs text-orange-500 mt-0.5">⏸ Will pause for approval</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] text-gray-300">#{i + 1}</span>
                            {node.willSkip && (
                              <button
                                onClick={() => unskipNode(node.nodeId)}
                                className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                              >
                                Un-skip
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Input summary */}
                  {session && Object.keys(session.inputs).filter(k => !k.startsWith('_')).length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Inputs</p>
                      {Object.entries(session.inputs)
                        .filter(([k, v]) => !k.startsWith('_') && v != null)
                        .map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-xs">
                            <span className="text-gray-400 capitalize min-w-[100px]">{k.replace(/_/g, ' ')}:</span>
                            <span className="text-gray-700 font-medium">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Confirm / edit buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={executeWorkflow}
                      className="flex-1 rounded-xl bg-green-600 text-white py-3 text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      ✓ Ya, trigger workflow
                    </button>
                    <button
                      onClick={() => { setBarPhase('input'); setSession(null); }}
                      className="px-4 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button onClick={reset} className="px-4 text-sm text-gray-400 hover:text-gray-600">
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* ── Executing ── */}
              {barPhase === 'executing' && (
                <div className="text-center py-8">
                  <div className="text-3xl mb-3">⚡</div>
                  <p className="text-sm text-gray-500">Starting {workflowName}…</p>
                </div>
              )}

              {/* ── Done ── */}
              {barPhase === 'done' && (
                <>
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-5 text-center space-y-2">
                    <div className="text-4xl">✅</div>
                    <p className="text-sm font-bold text-green-800">Workflow started!</p>
                    <p className="text-sm text-green-700">{workflowName}</p>
                    {runId && <p className="text-xs text-green-500 font-mono">Run: {runId.slice(0, 8)}…</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={open}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      + Another command
                    </button>
                    <button onClick={reset} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600">
                      Close
                    </button>
                  </div>
                </>
              )}

              {/* ── Error ── */}
              {barPhase === 'error' && (
                <>
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-700 mb-1">⚠ Could not process</p>
                    <p className="text-sm text-red-600">{errorMsg}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setBarPhase('input'); setSession(null); }}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Try again
                    </button>
                    <button onClick={reset} className="px-4 text-sm text-gray-400 hover:text-gray-600">Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Workflow Designer modal (Design tab) ── */}
      {/* NOTE: orgId is optional — designer self-fetches if parent hasn't loaded it yet.
          Passing it here as a hint (avoids a redundant /organizations call if available). */}
      {showDesigner && (
        <AiWorkflowDesigner
          orgId={orgId || undefined}
          initialDesc={designDesc}
          onClose={() => { setShowDesigner(false); setDesignDesc(''); }}
        />
      )}
    </>
  );
}
