'use client';

/**
 * AiWorkflowDesigner — Design Studio (Phase 11 v2)
 *
 * Three-panel interactive workflow builder with AI co-pilot.
 *
 * Flow:
 *   input → [create_project?] → [project_pick?] → generating → design → saving → done
 *
 * Design phase panels:
 *   1. SEQUENCE     — ordered steps, reorder/remove/rename
 *   2. PALETTE      — available nodes from packs, click to add, AI highlights
 *   3. AI CHAT      — conversational editing: add/remove/find/suggest packs
 *
 * API:
 *   POST /ai/workflow-suggest → { suggestedNodes, availableNodes, name, description }
 *   POST /ai/workflow-edit    → { action, updatedNodes?, highlights?, message }
 *   POST /projects/:id/workflows → create record
 *   PUT  /projects/:id/workflows/:id/definition → save definition
 *
 * Phase 11 (S11-004 v2)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DesignNode {
  id:       string;
  type:     string;
  label:    string;
  position: { x: number; y: number };
}

interface WorkflowConnection {
  id: string; sourceNodeId: string; sourcePortId: string;
  targetNodeId: string; targetPortId: string;
}

interface WorkflowSuggestion {
  name:           string;
  description:    string;
  suggestedNodes: DesignNode[];
  availableNodes: DesignNode[];   // full palette (superset of suggestedNodes)
  connections:    WorkflowConnection[];
}

interface EditResponse {
  action:        'update_sequence' | 'highlight_nodes' | 'suggest_pack' | 'answer';
  updatedNodes?: DesignNode[];
  highlights?:   string[];
  message:       string;
  suggestPack?:  string;
}

interface ChatMessage {
  role:    'user' | 'ai';
  text:    string;
  action?: string;
}

interface Project { id: string; name: string; }

type DesignerPhase =
  | 'loading' | 'input' | 'create_project' | 'project_pick'
  | 'generating' | 'design' | 'saving' | 'done' | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

const NODE_ICONS: Record<string, string> = {
  'resource.create':              '➕',
  'resource.update':              '✏️',
  'resource.transition':          '🔄',
  'state.change':                 '🔄',
  'foundation.request_approval':  '⏸',
  'core.human_approval':          '⏸',
  'foundation.send_notification': '📬',
  'foundation.assign_user':       '👤',
  'contractor.create_job':        '📋',
  'contractor.dispatch_trip':     '🚛',
  'contractor.complete_trip':     '✅',
  'contractor.generate_invoice':  '🧾',
  'contractor.extract_fuel_data': '⛽',
  'event.publish':                '📡',
  'artifact.write':               '💾',
};
const nodeIcon = (type: string) => NODE_ICONS[type] ?? '▶';

function buildConnections(nodes: DesignNode[]): WorkflowConnection[] {
  return nodes.slice(0, -1).map((n, i) => ({
    id: `conn-${i}`, sourceNodeId: n.id, sourcePortId: 'out',
    targetNodeId: nodes[i + 1].id, targetPortId: 'in',
  }));
}

function suggestProjectName(description: string): string {
  const words = description.trim().split(/\s+/).slice(0, 5).join(' ');
  return words.length > 3 ? words : 'My Project';
}

function deriveProjectCode(name: string): string {
  const initials = name.trim().split(/\s+/).slice(0, 4)
    .map(w => w.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase())
    .filter(Boolean).join('');
  const prefix = initials || 'PRJ';
  return `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`.slice(0, 20);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  orgId?:       string;
  onClose:      () => void;
  initialDesc?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AiWorkflowDesigner({ orgId: propOrgId, onClose, initialDesc = '' }: Props) {
  const router = useRouter();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [phase,        setPhase]       = useState<DesignerPhase>('loading');
  const [orgId,        setOrgId]       = useState(propOrgId ?? '');
  const [projects,     setProjects]    = useState<Project[]>([]);
  const [description,  setDescription] = useState(initialDesc);
  const [projectId,    setProjectId]   = useState('');
  const [projectName,  setProjectName] = useState('');

  // Create-project phase
  const [newProjName,   setNewProjName]   = useState('');
  const [newProjDesc,   setNewProjDesc]   = useState('');
  const [creatingProj,  setCreatingProj]  = useState(false);

  // Design session state
  const [sequence,     setSequence]    = useState<DesignNode[]>([]);
  const [allNodes,     setAllNodes]    = useState<DesignNode[]>([]); // full palette master
  const [wfName,       setWfName]      = useState('');
  const [wfDesc,       setWfDesc]      = useState('');
  const [editingIdx,   setEditingIdx]  = useState<number | null>(null);
  const [editLabel,    setEditLabel]   = useState('');
  const [highlights,   setHighlights]  = useState<Set<string>>(new Set());

  // AI Chat state
  const [chatHistory,  setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput,    setChatInput]   = useState('');
  const [chatLoading,  setChatLoading] = useState(false);

  // Done / error
  const [savedWfId,    setSavedWfId]   = useState('');
  const [errorMsg,     setErrorMsg]    = useState('');

  // Refs
  const descRef     = useRef<HTMLTextAreaElement>(null);
  const chatRef     = useRef<HTMLInputElement>(null);
  const chatEndRef  = useRef<HTMLDivElement>(null);

  // ── Derived: palette = allNodes whose type is not already in sequence ───────
  const seqTypes = new Set(sequence.map(n => n.type));
  const palette  = allNodes.filter(n => !seqTypes.has(n.type));

  // ── Boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      let resolvedOrgId = propOrgId ?? '';
      if (!resolvedOrgId) {
        const res = await apiClient.get<Array<{ id: string }>>('/organizations');
        if (res.success && Array.isArray(res.data) && res.data[0]) {
          resolvedOrgId = res.data[0].id;
          setOrgId(resolvedOrgId);
        } else {
          setErrorMsg('No organisation found. Please set up your account first.');
          setPhase('error'); return;
        }
      }
      const projRes = await apiClient.get<Project[]>(`/organizations/${resolvedOrgId}/projects`);
      if (projRes.success && Array.isArray(projRes.data)) setProjects(projRes.data);
      setPhase('input');
    }
    boot();
  }, [propOrgId]);

  // Focus management
  useEffect(() => {
    if (phase === 'input')          setTimeout(() => descRef.current?.focus(), 80);
    if (phase === 'design')         setTimeout(() => chatRef.current?.focus(), 150);
  }, [phase]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Clear highlights after 3s
  useEffect(() => {
    if (highlights.size === 0) return;
    const t = setTimeout(() => setHighlights(new Set()), 3000);
    return () => clearTimeout(t);
  }, [highlights]);

  const reset = useCallback(() => {
    setPhase('input'); setDescription(''); setSequence([]); setAllNodes([]);
    setWfName(''); setWfDesc(''); setChatHistory([]); setChatInput('');
    setHighlights(new Set()); setErrorMsg(''); setEditingIdx(null);
  }, []);

  // ── Step 1: submit description ─────────────────────────────────────────────
  async function submitDescription() {
    if (!description.trim()) return;
    if (projects.length === 0) {
      setNewProjName(suggestProjectName(description));
      setNewProjDesc('');
      setPhase('create_project'); return;
    }
    if (projects.length === 1) { selectProject(projects[0]); }
    else                       { setPhase('project_pick'); }
  }

  // ── Step 2a: create project ────────────────────────────────────────────────
  async function createProject() {
    if (!newProjName.trim() || !orgId) return;
    setCreatingProj(true);
    const res = await apiClient.post<{ id: string; name: string }>(
      `/organizations/${orgId}/projects`,
      { name: newProjName.trim(), code: deriveProjectCode(newProjName), description: newProjDesc.trim() || undefined },
    );
    setCreatingProj(false);
    if (!res.success || !res.data?.id) {
      setErrorMsg('Could not create project. Please create one manually first.');
      setPhase('error'); return;
    }
    const newProj = { id: res.data.id, name: res.data.name ?? newProjName };
    setProjects(prev => [...prev, newProj]);
    selectProject(newProj);
  }

  // ── Step 2b: select project ────────────────────────────────────────────────
  function selectProject(proj: Project) {
    setProjectId(proj.id); setProjectName(proj.name);
    generate();
  }

  // ── Step 3: generate ──────────────────────────────────────────────────────
  async function generate() {
    setPhase('generating');
    const res = await apiClient.post<{ suggestion: WorkflowSuggestion }>(
      '/ai/workflow-suggest', { orgId, description },
    );
    if (!res.success || !res.data?.suggestion) {
      setErrorMsg(String((res as { error?: unknown }).error ?? '') || 'AI could not generate a workflow. Try a clearer description.');
      setPhase('error'); return;
    }
    const s = res.data.suggestion;
    setSequence(s.suggestedNodes);
    setAllNodes(s.availableNodes);
    setWfName(s.name);
    setWfDesc(s.description);
    setChatHistory([{
      role: 'ai',
      text: `I've drafted a ${s.suggestedNodes.length}-step workflow: "${s.name}". Review the sequence, use the palette to add more steps, or chat with me to refine it.`,
    }]);
    setPhase('design');
  }

  // ── Sequence editing ───────────────────────────────────────────────────────
  const moveUp   = (i: number) => setSequence(prev => { const a=[...prev]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; });
  const moveDown = (i: number) => setSequence(prev => { const a=[...prev]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; });
  const removeFromSequence = (i: number) => setSequence(prev => prev.filter((_,j)=>j!==i));

  function addToSequence(node: DesignNode) {
    const newNode = { ...node, id: `node-${crypto.randomUUID()}`, position: { x: 250, y: 60 } };
    setSequence(prev => [...prev, newNode]);
  }

  function startEditLabel(i: number) { setEditingIdx(i); setEditLabel(sequence[i].label); }
  function saveLabel() {
    if (editingIdx === null) return;
    setSequence(prev => prev.map((n, i) => i === editingIdx ? { ...n, label: editLabel } : n));
    setEditingIdx(null);
  }

  // ── AI Chat ────────────────────────────────────────────────────────────────
  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);

    const res = await apiClient.post<EditResponse>('/ai/workflow-edit', {
      orgId,
      message:           msg,
      currentNodes:      sequence.map(n => ({ id: n.id, type: n.type, label: n.label })),
      allAvailableNodes: allNodes.map(n => ({ type: n.type, name: n.label })),
    });

    setChatLoading(false);

    if (!res.success || !res.data) {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Sorry, I hit an error. Please try again.' }]);
      return;
    }

    const data = res.data;
    setChatHistory(prev => [...prev, { role: 'ai', text: data.message, action: data.action }]);

    if (data.action === 'update_sequence' && data.updatedNodes) {
      setSequence(data.updatedNodes.map((n, i) => ({ ...n, position: { x: 250, y: 60 + i * 160 } })));
    }
    if (data.action === 'highlight_nodes' && data.highlights) {
      setHighlights(new Set(data.highlights));
    }
  }

  // ── Quick-chat suggestions ─────────────────────────────────────────────────
  const suggestions = [
    'Add approval step',
    'Add driver notification',
    'Find fuel nodes',
    'Suggest better sequence',
  ];

  // ── Save draft ────────────────────────────────────────────────────────────
  async function saveDraft() {
    if (sequence.length === 0 || !wfName.trim()) return;
    setPhase('saving');

    const createRes = await apiClient.post<{ id: string }>(
      `/projects/${projectId}/workflows`,
      { name: wfName.trim(), description: wfDesc },
    );
    if (!createRes.success || !createRes.data?.id) {
      setErrorMsg('Failed to create workflow. Please try again.');
      setPhase('error'); return;
    }
    const wfId = createRes.data.id;

    const definition = {
      schemaVersion: '1.0',
      workflow: { id: wfId, name: wfName.trim(), version: '1.0.0', status: 'draft',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      nodes: sequence,
      connections: buildConnections(sequence),
    };
    await apiClient.put(`/projects/${projectId}/workflows/${wfId}/definition`, { definition });

    setSavedWfId(wfId);
    setPhase('done');
  }

  function openEditor() {
    onClose();
    router.push(`/projects/${projectId}/workflows/${savedWfId}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const phaseLabel: Partial<Record<DesignerPhase, string>> = {
    loading:        'Loading…',
    input:          'Describe your workflow',
    create_project: 'Create a project first',
    project_pick:   'Select a project',
    generating:     'AI is designing…',
    design:         `Design Studio · ${sequence.length} step${sequence.length !== 1 ? 's' : ''}`,
    saving:         'Saving draft…',
    done:           'Draft saved!',
    error:          'Something went wrong',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-600 to-violet-500 flex-shrink-0">
          <span className="text-2xl">{phase === 'done' ? '🎉' : phase === 'error' ? '⚠️' : '✨'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">AI Workflow Designer</p>
            <p className="text-xs text-violet-200 truncate">{phaseLabel[phase] ?? ''}</p>
          </div>
          {phase === 'design' && (
            <button
              onClick={saveDraft}
              disabled={sequence.length === 0 || !wfName.trim()}
              className="mr-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              💾 Save Draft
            </button>
          )}
          <button onClick={onClose} className="text-violet-200 hover:text-white text-lg leading-none flex-shrink-0">✕</button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Loading ── */}
          {phase === 'loading' && (
            <div className="text-center py-16">
              <div className="text-3xl mb-3 animate-spin">✨</div>
              <p className="text-sm text-gray-400">Preparing…</p>
            </div>
          )}

          {/* ── Input ── */}
          {phase === 'input' && (
            <div className="px-5 py-4 space-y-3">
              <textarea
                ref={descRef} rows={4} value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDescription(); } }}
                placeholder={'Describe the workflow you want to design:\n\n• "Order receipt to receive payment workflow"\n• "Trip dispatch with manager approval and fuel tracking"\n• "Fuel receipt to expense recording workflow"'}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button onClick={submitDescription} disabled={!description.trim()}
                className="w-full rounded-xl bg-violet-600 text-white py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-40">
                Design Workflow →
              </button>
              <p className="text-center text-xs text-gray-400">Works in BM & English · Enter to submit</p>
            </div>
          )}

          {/* ── Create project ── */}
          {phase === 'create_project' && (
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-800 mb-1">📁 No projects yet</p>
                <p className="text-sm text-amber-700">Workflows live inside a project. Let me create one for you.</p>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Name</label>
                  <input type="text" value={newProjName} onChange={(e) => setNewProjName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createProject(); }}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g. Pasir Kasar Operations" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description (optional)</label>
                  <input type="text" value={newProjDesc} onChange={(e) => setNewProjDesc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="What is this project about?" />
                </div>
              </div>
              <button onClick={createProject} disabled={!newProjName.trim() || creatingProj}
                className="w-full rounded-xl bg-violet-600 text-white py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-40">
                {creatingProj ? 'Creating…' : '📁 Create Project & Continue →'}
              </button>
              <button onClick={() => setPhase('input')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                ← Back to description
              </button>
            </div>
          )}

          {/* ── Project pick ── */}
          {phase === 'project_pick' && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-600">Which project should this workflow belong to?</p>
              <div className="space-y-2">
                {projects.map(p => (
                  <button key={p.id} onClick={() => selectProject(p)}
                    className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-violet-400 hover:bg-violet-50 transition-colors">
                    <p className="text-sm font-medium text-gray-800">📁 {p.name}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setPhase('input')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Back</button>
            </div>
          )}

          {/* ── Generating ── */}
          {phase === 'generating' && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4 animate-spin">✨</div>
              <p className="text-sm font-medium text-gray-700">Designing your workflow…</p>
              <p className="text-xs text-gray-400 mt-1">AI is scanning installed packs and selecting nodes</p>
              {projectName && <p className="text-xs text-violet-500 mt-2">📁 {projectName}</p>}
            </div>
          )}

          {/* ── DESIGN STUDIO ────────────────────────────────────────────────── */}
          {phase === 'design' && (
            <div className="divide-y divide-gray-100">

              {/* Panel header row: project + wf name */}
              <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2 flex-wrap">
                {projectName && <span className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">📁 {projectName}</span>}
                <input
                  type="text" value={wfName} onChange={(e) => setWfName(e.target.value)}
                  className="flex-1 min-w-[160px] text-sm font-semibold text-gray-800 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-violet-400 py-0.5"
                  placeholder="Workflow name…"
                />
              </div>

              {/* ── Panel 1: Sequence ── */}
              <div>
                <div className="px-4 py-2 flex items-center justify-between bg-white">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Workflow Sequence
                  </span>
                  <span className="text-xs text-gray-400">{sequence.length} step{sequence.length !== 1 ? 's' : ''}</span>
                </div>

                {sequence.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    No steps yet. Add from the palette below or ask AI.
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto divide-y divide-gray-50">
                    {sequence.map((node, i) => (
                      <div key={node.id} className="flex items-center gap-2 px-3 py-2.5">
                        {/* Reorder */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button onClick={() => moveUp(i)} disabled={i === 0}
                            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
                          <button onClick={() => moveDown(i)} disabled={i === sequence.length - 1}
                            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
                        </div>
                        {/* Icon */}
                        <span className="text-lg leading-none flex-shrink-0">{nodeIcon(node.type)}</span>
                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          {editingIdx === i ? (
                            <input autoFocus value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              onBlur={saveLabel}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setEditingIdx(null); }}
                              className="w-full text-sm border-b border-violet-400 outline-none py-0.5" />
                          ) : (
                            <button onClick={() => startEditLabel(i)}
                              className="text-sm text-gray-800 text-left hover:text-violet-600 truncate w-full block">
                              {node.label}
                            </button>
                          )}
                          <p className="text-[10px] text-gray-400 font-mono truncate">{node.type}</p>
                        </div>
                        {/* Index + remove */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] text-gray-300">#{i + 1}</span>
                          <button onClick={() => removeFromSequence(i)}
                            className="text-gray-300 hover:text-red-400 transition-colors text-sm">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Panel 2: Palette ── */}
              <div>
                <div className="px-4 py-2 flex items-center justify-between bg-white">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Available Nodes
                  </span>
                  <span className="text-xs text-gray-400">{palette.length} available · click to add</span>
                </div>

                {palette.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-gray-400">
                    All available nodes are in the sequence.
                  </div>
                ) : (
                  <div className="px-3 py-2.5 max-h-[130px] overflow-y-auto flex flex-wrap gap-1.5">
                    {palette.map(node => {
                      const isHighlighted = highlights.has(node.type);
                      return (
                        <button
                          key={node.type}
                          onClick={() => addToSequence(node)}
                          title={`${node.type} — click to add`}
                          className={`
                            inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium
                            transition-all duration-200 cursor-pointer
                            ${isHighlighted
                              ? 'border-violet-400 bg-violet-100 text-violet-800 ring-2 ring-violet-300 ring-offset-1'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700'
                            }
                          `}
                        >
                          <span>{nodeIcon(node.type)}</span>
                          <span className="max-w-[140px] truncate">{node.label}</span>
                          {isHighlighted && <span className="text-violet-500">✦</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Panel 3: AI Chat ── */}
              <div>
                <div className="px-4 py-2 bg-white flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">AI Co-pilot</span>
                  <span className="text-xs text-gray-400">chat to edit</span>
                </div>

                {/* Chat history */}
                <div className="max-h-[180px] overflow-y-auto px-3 py-2 space-y-2 bg-gray-50">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-violet-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm shadow-sm'
                        }
                      `}>
                        {msg.role === 'ai' && msg.action === 'update_sequence' && (
                          <span className="block text-[10px] font-bold text-violet-500 mb-1 uppercase tracking-wide">
                            ✓ Sequence updated
                          </span>
                        )}
                        {msg.role === 'ai' && msg.action === 'highlight_nodes' && (
                          <span className="block text-[10px] font-bold text-amber-500 mb-1 uppercase tracking-wide">
                            ✦ Nodes highlighted in palette
                          </span>
                        )}
                        {msg.role === 'ai' && msg.action === 'suggest_pack' && (
                          <span className="block text-[10px] font-bold text-blue-500 mb-1 uppercase tracking-wide">
                            📦 Pack suggestion
                          </span>
                        )}
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 text-xs text-gray-400 shadow-sm">
                        <span className="animate-pulse">AI is thinking…</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick suggestions */}
                <div className="px-3 pt-2 pb-1 flex gap-1.5 flex-wrap bg-gray-50 border-t border-gray-100">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => { setChatInput(s); setTimeout(() => chatRef.current?.focus(), 50); }}
                      className="text-[10px] bg-white border border-gray-200 rounded-full px-2.5 py-1 text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="px-3 py-2.5 bg-white border-t border-gray-100 flex gap-2">
                  <input
                    ref={chatRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                    disabled={chatLoading}
                    placeholder='e.g. "add approval before invoice" · "find fuel nodes" · "remove last step"'
                    className="flex-1 text-xs rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                    className="rounded-lg bg-violet-600 text-white px-3 py-2 text-xs font-bold hover:bg-violet-700 transition-colors disabled:opacity-40">
                    Send
                  </button>
                </div>
              </div>

            </div>
          )}
          {/* ── /DESIGN STUDIO ── */}

          {/* ── Saving ── */}
          {phase === 'saving' && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">💾</div>
              <p className="text-sm text-gray-500">Saving workflow draft…</p>
            </div>
          )}

          {/* ── Done ── */}
          {phase === 'done' && (
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-5 text-center space-y-2">
                <div className="text-4xl">🎉</div>
                <p className="text-sm font-bold text-green-800">Draft saved!</p>
                <p className="text-sm text-green-700 font-medium">{wfName}</p>
                <p className="text-xs text-green-500">Open in canvas to add node configs · Publish when ready</p>
              </div>
              <button onClick={openEditor}
                className="w-full rounded-xl bg-violet-600 text-white py-3 text-sm font-bold hover:bg-violet-700 transition-colors">
                Open in Canvas Editor →
              </button>
              <div className="flex gap-2">
                <button onClick={reset} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Design another
                </button>
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Close</button>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700 mb-1">⚠ Could not continue</p>
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPhase('input'); setErrorMsg(''); }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  Try again
                </button>
                <button onClick={onClose} className="px-4 text-sm text-gray-400 hover:text-gray-600">Close</button>
              </div>
            </div>
          )}

        </div>{/* /body */}
      </div>
    </div>
  );
}
