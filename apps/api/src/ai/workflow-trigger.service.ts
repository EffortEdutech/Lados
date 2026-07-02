/**
 * WorkflowTriggerService — Phase 11
 *
 * Stateless multi-turn service that converts a natural language command
 * into a fully validated workflow execution trigger.
 *
 * ARCHITECTURAL CONTRACT (non-negotiable):
 *   The AI can ONLY trigger workflows that already exist in the database
 *   (saved under a project from a pack template or user-built workflow).
 *   AI cannot create new node types, modify pack definitions, or trigger
 *   workflow graphs that contain nodes outside the installed packs.
 *
 * Turn phases (session.phase drives the state machine):
 *   init          → AI parses command, fetches projects, asks "which project?"
 *   project_needed → project selected, fetches workflows, asks "which workflow?"
 *   workflow_needed → workflow selected, AI fills inputs, auto-detects skips
 *   inputs_needed  → asks for one missing input at a time
 *   skip_review   → shows auto-detected skip decisions, user can override
 *   ready         → full plan shown, waiting for execute:true
 *
 * Session state is stateless on the server — the entire session object
 * is returned to the client and sent back on each subsequent request.
 *
 * Sprint 11 (S11-002)
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService }  from '../common/supabase/supabase.service';
import { AiService }        from './ai.service';
import { ResourceService }  from '../resource/resource.service';

// ── Session types ─────────────────────────────────────────────────────────────

export type TriggerPhase =
  | 'init'
  | 'project_needed'
  | 'workflow_needed'
  | 'inputs_needed'
  | 'skip_review'
  | 'ready';

export interface SkipDecision {
  nodeId:      string;
  nodeType:    string;
  nodeLabel:   string;
  outputs:     Record<string, unknown>;
  reason:      string;
  /** false = AI auto-detected, true = user confirmed or overrode */
  confirmed:   boolean;
  /** if true, user wants to un-skip this node */
  cancelled:   boolean;
}

export interface WorkflowTriggerSession {
  sessionId:      string;
  command:        string;
  orgId:          string;
  phase:          TriggerPhase;
  projectId?:     string;
  projectName?:   string;
  workflowId?:    string;
  workflowName?:  string;
  /** Fields extracted by AI from the original command */
  parsedFields:   Record<string, unknown>;
  /** All inputs accumulated across turns */
  inputs:         Record<string, unknown>;
  /** Fields the workflow still needs that haven't been filled */
  missingFields:  string[];
  /** Currently pending input field (what we're asking for next) */
  pendingField?:  string;
  /** Auto-detected or user-confirmed skip decisions */
  skipDecisions:  SkipDecision[];
  /** Node plan to display in confirmation screen */
  nodePlan:       NodePlanItem[];
}

export interface NodePlanItem {
  nodeId:    string;
  nodeType:  string;
  label:     string;
  willSkip:  boolean;
  skipReason?: string;
  isPause:   boolean;  // true for request_approval nodes
}

// ── Request / Response ────────────────────────────────────────────────────────

export interface WorkflowTriggerRequest {
  orgId:    string;
  command:  string;
  session?: WorkflowTriggerSession;
  /** User's answer to the current question */
  answer?:  string;
  /** Set to true to execute (confirm the plan) */
  execute?: boolean;
  /** nodeId the user wants to un-skip (override AI suggestion) */
  unskipNodeId?: string;
}

export type QuestionType = 'project' | 'workflow' | 'text' | 'skip_review';

export interface TriggerQuestion {
  text:     string;
  type:     QuestionType;
  field?:   string;
  options?: Array<{ id: string; label: string; subtitle?: string }>;
}

export interface WorkflowTriggerResponse {
  phase:     'asking' | 'plan_ready' | 'error';
  question?: TriggerQuestion;
  plan?:     NodePlanItem[];
  session:   WorkflowTriggerSession;
  message?:  string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class WorkflowTriggerService {
  private readonly logger = new Logger(WorkflowTriggerService.name);

  constructor(
    private readonly supabase:   SupabaseService,
    private readonly ai:         AiService,
    private readonly resources:  ResourceService,
  ) {}

  // ── Main entry point ─────────────────────────────────────────────────────

  async process(req: WorkflowTriggerRequest, actorId: string): Promise<WorkflowTriggerResponse> {
    // Verify membership
    const { data: member } = await this.supabase.admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', req.orgId)
      .eq('user_id', actorId)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role as string)) {
      throw new ForbiddenException('AI workflow trigger is available to owners and admins only');
    }

    const session = req.session ?? this.initSession(req.command, req.orgId);

    // Route by phase
    switch (session.phase) {
      case 'init':           return this.phaseInit(session, actorId);
      case 'project_needed': return this.phaseProjectAnswer(session, req.answer ?? '', actorId);
      case 'workflow_needed': return this.phaseWorkflowAnswer(session, req.answer ?? '', actorId);
      case 'inputs_needed':  return this.phaseInputAnswer(session, req.answer ?? '', actorId);
      case 'skip_review':    return this.phaseSkipReview(session, req.unskipNodeId, req.execute, actorId);
      case 'ready':          return this.phaseReady(session);
      default:               return this.phaseReady(session);
    }
  }

  // ── Phase: init ───────────────────────────────────────────────────────────

  private async phaseInit(session: WorkflowTriggerSession, actorId: string): Promise<WorkflowTriggerResponse> {
    // 1. AI parses the command to extract structured fields
    const parsed = await this.ai.parseWorkflowCommand(session.command);
    session.parsedFields = { ...parsed.data, _intent: parsed.action, _resourceType: parsed.resourceType };
    session.inputs = { ...parsed.data };

    // 2. Fetch active projects for the user's org
    const projects = await this.fetchProjects(session.orgId);

    if (projects.length === 0) {
      return this.error(session, 'No active projects found. Please create a project first before triggering a workflow.');
    }

    if (projects.length === 1) {
      // Auto-select the only project
      session.projectId   = projects[0].id;
      session.projectName = projects[0].name;
      session.phase = 'workflow_needed';
      return this.phaseProjectAnswer(session, projects[0].id, actorId);
    }

    session.phase = 'project_needed';
    return {
      phase:   'asking',
      session,
      question: {
        text:    `I understood: "${parsed.summary}"\n\nWhich project should this workflow run under?`,
        type:    'project',
        options: projects.map(p => ({ id: p.id, label: p.name, subtitle: p.description ?? '' })),
      },
    };
  }

  // ── Phase: project answer ─────────────────────────────────────────────────

  private async phaseProjectAnswer(session: WorkflowTriggerSession, answer: string, _actorId: string): Promise<WorkflowTriggerResponse> {
    // answer = project UUID
    const projects = await this.fetchProjects(session.orgId);
    const project  = projects.find(p => p.id === answer || p.name.toLowerCase().includes(answer.toLowerCase()));

    if (!project) {
      return this.error(session, `Project "${answer}" not found. Please choose from the list.`);
    }

    session.projectId   = project.id;
    session.projectName = project.name;
    session.phase = 'workflow_needed';

    // Fetch workflows for this project
    const workflows = await this.fetchWorkflows(project.id, session.orgId);

    if (workflows.length === 0) {
      return this.error(session, `No published workflows found in "${project.name}". Please create and publish a workflow in this project first.`);
    }

    // AI suggests the best match
    const suggested = await this.suggestWorkflow(session.command, workflows);

    return {
      phase:   'asking',
      session,
      question: {
        text:    `Project: **${project.name}**\n\nWhich workflow should I trigger?\n(${suggested ? `Suggested: ${suggested.name}` : 'Please choose'})`,
        type:    'workflow',
        options: workflows.map(w => ({
          id:       w.id,
          label:    w.name,
          subtitle: w.description ?? (w.id === suggested?.id ? '⭐ Suggested match' : ''),
        })),
      },
    };
  }

  // ── Phase: workflow answer ────────────────────────────────────────────────

  private async phaseWorkflowAnswer(session: WorkflowTriggerSession, answer: string, _actorId: string): Promise<WorkflowTriggerResponse> {
    const workflows = await this.fetchWorkflows(session.projectId!, session.orgId);
    const workflow  = workflows.find(w => w.id === answer || w.name.toLowerCase().includes(answer.toLowerCase()));

    if (!workflow) {
      return this.error(session, `Workflow "${answer}" not found. Please choose from the list.`);
    }

    session.workflowId   = workflow.id;
    session.workflowName = workflow.name;

    // Load workflow definition
    const definition = await this.loadWorkflowDefinition(workflow.id);
    if (!definition) {
      return this.error(session, `Workflow "${workflow.name}" has no published version. Please publish it first.`);
    }

    // Build node plan from definition
    session.nodePlan = this.buildNodePlan(definition);

    // Detect skippable nodes by checking existing resources
    session.skipDecisions = await this.detectSkips(session.nodePlan, session.inputs, session.orgId);

    // Determine what inputs are still missing
    session.missingFields = await this.findMissingInputs(session.nodePlan, session.inputs, session.command);

    if (session.missingFields.length > 0) {
      session.pendingField = session.missingFields[0];
      session.phase = 'inputs_needed';
      return {
        phase:   'asking',
        session,
        question: {
          text:  this.inputQuestion(session.pendingField!, session.nodePlan),
          type:  'text',
          field: session.pendingField,
        },
      };
    }

    // All inputs filled — go to skip review
    return this.goToSkipReview(session);
  }

  // ── Phase: input answer ───────────────────────────────────────────────────

  private async phaseInputAnswer(session: WorkflowTriggerSession, answer: string, _actorId: string): Promise<WorkflowTriggerResponse> {
    if (session.pendingField) {
      session.inputs[session.pendingField] = answer;
    }

    // Remove the field we just filled
    session.missingFields = session.missingFields.filter(f => f !== session.pendingField);

    if (session.missingFields.length > 0) {
      session.pendingField = session.missingFields[0];
      return {
        phase:   'asking',
        session,
        question: {
          text:  this.inputQuestion(session.pendingField!, session.nodePlan),
          type:  'text',
          field: session.pendingField,
        },
      };
    }

    return this.goToSkipReview(session);
  }

  // ── Phase: skip review ────────────────────────────────────────────────────

  private async phaseSkipReview(
    session: WorkflowTriggerSession,
    unskipNodeId?: string,
    execute?: boolean,
    _actorId?: string,
  ): Promise<WorkflowTriggerResponse> {
    // User wants to un-skip a node
    if (unskipNodeId) {
      session.skipDecisions = session.skipDecisions.map(sd =>
        sd.nodeId === unskipNodeId ? { ...sd, cancelled: true, confirmed: true } : sd,
      );
    }

    if (!execute) {
      // Show the review
      return {
        phase:   'asking',
        session,
        question: {
          text:  'Review the execution plan. Confirm to proceed, or tell me which nodes to change.',
          type:  'skip_review',
        },
        plan: this.planWithSkips(session),
      };
    }

    // User confirmed — move to ready
    session.phase = 'ready';
    return { phase: 'plan_ready', plan: this.planWithSkips(session), session };
  }

  // ── Phase: ready (execute) ────────────────────────────────────────────────

  private phaseReady(session: WorkflowTriggerSession): WorkflowTriggerResponse {
    return { phase: 'plan_ready', plan: this.planWithSkips(session), session };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private initSession(command: string, orgId: string): WorkflowTriggerSession {
    return {
      sessionId:     crypto.randomUUID(),
      command,
      orgId,
      phase:         'init',
      parsedFields:  {},
      inputs:        {},
      missingFields: [],
      skipDecisions: [],
      nodePlan:      [],
    };
  }

  private error(session: WorkflowTriggerSession, message: string): WorkflowTriggerResponse {
    return { phase: 'error', session, message };
  }

  private goToSkipReview(session: WorkflowTriggerSession): WorkflowTriggerResponse {
    session.phase = 'skip_review';
    const hasAutoSkips = session.skipDecisions.some(sd => !sd.confirmed && !sd.cancelled);

    if (!hasAutoSkips) {
      // No skips to review — go straight to ready
      session.phase = 'ready';
      return { phase: 'plan_ready', plan: this.planWithSkips(session), session };
    }

    return {
      phase:   'asking',
      session,
      question: {
        text:  'I found some nodes that may be skipped. Review and confirm.',
        type:  'skip_review',
      },
      plan: this.planWithSkips(session),
    };
  }

  private planWithSkips(session: WorkflowTriggerSession): NodePlanItem[] {
    const skipMap = new Map(session.skipDecisions
      .filter(sd => !sd.cancelled)
      .map(sd => [sd.nodeId, sd]),
    );

    return session.nodePlan.map(node => ({
      ...node,
      willSkip:   skipMap.has(node.nodeId),
      skipReason: skipMap.get(node.nodeId)?.reason,
    }));
  }

  /** Human-readable question for a missing input field */
  private inputQuestion(field: string, _nodePlan: NodePlanItem[]): string {
    const label = field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    return `Please provide: **${label}**`;
  }

  // ── DB helpers ────────────────────────────────────────────────────────────

  private async fetchProjects(orgId: string) {
    const { data } = await this.supabase.admin
      .from('projects')
      .select('id, name, description, status')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(20);
    return (data ?? []) as Array<{ id: string; name: string; description?: string }>;
  }

  private async fetchWorkflows(projectId: string, _orgId: string) {
    const { data } = await this.supabase.admin
      .from('workflows')
      .select('id, name, description, status, published_version_id')
      .eq('project_id', projectId)
      .not('published_version_id', 'is', null)  // only published
      .order('updated_at', { ascending: false })
      .limit(20);
    return (data ?? []) as Array<{ id: string; name: string; description?: string; published_version_id?: string }>;
  }

  private async loadWorkflowDefinition(workflowId: string) {
    const { data: wf } = await this.supabase.admin
      .from('workflows')
      .select('published_version_id')
      .eq('id', workflowId)
      .single();
    if (!wf?.published_version_id) return null;

    const { data: snap } = await this.supabase.admin
      .from('workflow_versions')
      .select('definition')
      .eq('id', wf.published_version_id as string)
      .single();
    return snap?.definition ?? null;
  }

  private buildNodePlan(definition: { nodes?: Array<{ id: string; type: string; label?: string; config?: Record<string, unknown> }> }): NodePlanItem[] {
    return (definition.nodes ?? []).map(n => ({
      nodeId:   n.id,
      nodeType: n.type,
      label:    n.label ?? n.type,
      willSkip: false,
      isPause:  n.type === 'foundation.request_approval' || n.type === 'core.human_approval',
    }));
  }

  /** AI suggests the best workflow from the list for this command */
  private async suggestWorkflow(command: string, workflows: Array<{ id: string; name: string }>) {
    if (!this.ai.isConfigured || workflows.length <= 1) return workflows[0] ?? null;

    const prompt = `Given this user command: "${command}"
Which of these workflows best matches the intent?
${workflows.map((w, i) => `${i + 1}. ${w.name} (id: ${w.id})`).join('\n')}

Return ONLY the id of the best match, or "none" if nothing matches.`;

    try {
      const raw = await this.ai.runCompletion('You are a workflow matcher. Return only the workflow id or "none".', prompt, {
        model: 'gpt-4o-mini', temperature: 0, maxTokens: 50,
      });
      const id = raw.trim().replace(/['"]/g, '');
      return workflows.find(w => w.id === id) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Auto-detect nodes that can be skipped.
   * Currently checks: resource.create nodes for types that already exist
   * with a matching name in the org.
   */
  private async detectSkips(
    nodePlan: NodePlanItem[],
    inputs:   Record<string, unknown>,
    orgId:    string,
  ): Promise<SkipDecision[]> {
    const decisions: SkipDecision[] = [];

    for (const node of nodePlan) {
      if (node.nodeType !== 'resource.create' && !node.nodeType.endsWith('.create_customer') && !node.nodeType.endsWith('.create_job')) continue;

      // Check if a customer resource already exists with the given name
      const customerName = (inputs['customerName'] ?? inputs['customer'] ?? inputs['clientName']) as string | undefined;
      if (customerName && (node.label.toLowerCase().includes('customer') || node.nodeType.includes('customer'))) {
        const { data: existing } = await this.supabase.admin
          .from('lados_resources')
          .select('id, name')
          .eq('org_id', orgId)
          .eq('type', 'customer')
          .ilike('name', `%${customerName}%`)
          .limit(1)
          .maybeSingle();

        if (existing) {
          decisions.push({
            nodeId:    node.nodeId,
            nodeType:  node.nodeType,
            nodeLabel: node.label,
            outputs:   { customerId: existing.id, customerName: existing.name },
            reason:    `Customer "${existing.name}" already exists in the system`,
            confirmed: false,
            cancelled: false,
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Ask AI to determine which workflow inputs are still missing
   * given what was parsed from the command.
   */
  private async findMissingInputs(
    nodePlan:  NodePlanItem[],
    inputs:    Record<string, unknown>,
    command:   string,
  ): Promise<string[]> {
    if (!this.ai.isConfigured) return [];

    const nodeTypes = [...new Set(nodePlan.map(n => n.nodeType))].join(', ');
    const filledKeys = Object.keys(inputs).filter(k => inputs[k] != null && !k.startsWith('_'));

    const prompt = `A workflow with these node types will be triggered: ${nodeTypes}

The user said: "${command}"
Fields already extracted: ${filledKeys.length > 0 ? filledKeys.join(', ') : 'none'}
Field values: ${JSON.stringify(inputs, null, 2)}

What CRITICAL inputs are still missing that the workflow nodes will need?
Return a JSON array of field name strings, e.g. ["quantity", "unit", "deliveryDate"]
Return [] if nothing critical is missing.
Return ONLY the JSON array.`;

    try {
      const raw = await this.ai.runCompletion(
        'You are a workflow input checker. Return only a JSON array of missing field names.',
        prompt,
        { model: 'gpt-4o-mini', temperature: 0, maxTokens: 200, jsonMode: false },
      );
      const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
      const arr = JSON.parse(cleaned) as string[];
      return Array.isArray(arr) ? arr.slice(0, 5) : [];  // cap at 5 questions max
    } catch {
      return [];
    }
  }

  // ── Public helpers for controller ─────────────────────────────────────────

  /** Build the skipNodes array from confirmed, non-cancelled skip decisions */
  buildSkipNodes(session: WorkflowTriggerSession) {
    return session.skipDecisions
      .filter(sd => !sd.cancelled)
      .map(sd => ({ nodeId: sd.nodeId, outputs: sd.outputs, reason: sd.reason }));
  }
}
