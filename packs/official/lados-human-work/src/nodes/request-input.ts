/**
 * lados.human.request_input — Phase 22 S22.2 (§4.4)
 *
 * Sibling to request_approval, sharing the same pause/resume plumbing and
 * approval_tasks lifecycle (task_type='input' discriminates it) — but with
 * no approve/reject concept. Pauses the workflow so a human can inject or
 * correct structured data mid-run; execution resumes only after a human
 * submits via POST /approvals/:taskId/submit-input.
 *
 * This is the direct answer to "a standard pipeline that receives new
 * input along the way" — until now, mid-run human data entry only existed
 * implicitly via out-of-band Resource edits, which wasn't enforced or
 * auditable as a discrete workflow step.
 *
 * AI guardrail (non-negotiable): AI must never resolve this pause or
 * fabricate submittedData on a human's behalf.
 *
 * Config/Inputs:
 *   title         — task title (required)
 *   description   — task description (optional)
 *   inputSchema   — array of { key, label, type: 'string'|'number'|'boolean'|'select', required?, options? }
 *                   Deliberately minimal, not a full JSON Schema
 *                   implementation — matches this pack's existing "honest
 *                   floor, not fabricated richness" convention (see
 *                   deriveConfigSchema(), S7.3).
 *   assigneeRole / assigneeUserId / escalateAfterMinutes / escalatedToUserId
 *                 — same assignment/escalation config as request_approval (§4.1/4.3).
 *   notifyUserId  — user to notify immediately (optional, falls back to ctx.userId)
 *
 * Outputs (before pause):
 *   inputTask — { approvalTaskId, assigneeRole, pending }
 * Outputs (after resume, injected by the runner from the submitted data):
 *   submittedData — the human-entered payload, keyed by inputSchema[].key
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IApprovalTaskService, INotificationService } from './request-approval';

export interface InputFieldSpec {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required?: boolean;
  options?: string[];
}

/**
 * The canvas inspector currently derives every config field as a plain
 * `type:'string'` text input (deriveConfigSchema(), S7.3 — no per-field
 * type metadata exists in the manifest contract yet to route this to a
 * proper JSON editor). So a human filling in `inputSchema` via the canvas
 * today literally types JSON into a text box, which saves as a raw string,
 * not an array. Parse defensively rather than erroring on the exact input
 * shape today's inspector floor produces.
 */
function parseInputSchema(raw: unknown): InputFieldSpec[] | undefined {
  if (Array.isArray(raw)) return raw as InputFieldSpec[];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as InputFieldSpec[]) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseEscalateAfterMinutes(raw: unknown): number | undefined {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export async function requestInput(
  ctx: NodeContext,
  approvalService?: IApprovalTaskService,
  notificationService?: INotificationService,
): Promise<NodeExecuteResult> {
  if (!approvalService) {
    return { status: 'failure', outputs: {}, error: { code: 'NO_SERVICE', message: 'ApprovalTaskService not injected' } };
  }

  // `||` (not `??`) throughout this block, deliberately — the canvas
  // inspector's generic TextField saves an unfilled optional field as `""`,
  // not undefined (deriveConfigSchema(), S7.3), and `""` must not survive
  // as a "set" value for any of these (an empty-string assigneeUserId hits
  // the DB's uuid column and fails; an empty-string notifyUserId should
  // fall back to ctx.userId, not silently skip the notification).
  const title = (ctx.inputs['title'] || ctx.config['title']) as string | undefined;
  const description = (ctx.inputs['description'] || ctx.config['description']) as string | undefined;
  const assigneeRole = ((ctx.inputs['assigneeRole'] || ctx.config['assigneeRole'] || 'owner') as string);
  const notifyUserId = (ctx.inputs['notifyUserId'] || ctx.config['notifyUserId'] || ctx.userId) as string | undefined;
  const assigneeUserId = (ctx.inputs['assigneeUserId'] || ctx.config['assigneeUserId'] || undefined) as string | undefined;
  const escalateAfterMinutes = parseEscalateAfterMinutes(ctx.inputs['escalateAfterMinutes'] || ctx.config['escalateAfterMinutes']);
  const escalatedToUserId = (ctx.inputs['escalatedToUserId'] || ctx.config['escalatedToUserId'] || undefined) as string | undefined;
  const rawInputSchema = ctx.inputs['inputSchema'] ?? ctx.config['inputSchema'];
  const inputSchema = parseInputSchema(rawInputSchema);

  if (!title) {
    return { status: 'failure', outputs: {}, error: { code: 'MISSING_INPUT', message: 'title is required' } };
  }
  if (!inputSchema || inputSchema.length === 0) {
    const hint = typeof rawInputSchema === 'string' && rawInputSchema.trim()
      ? ' (received a string that did not parse as a JSON array — check for a trailing comma or unquoted key)'
      : '';
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'MISSING_INPUT',
        message: `inputSchema (non-empty array of field specs, e.g. [{"key":"note","label":"Note","type":"string","required":true}]) is required${hint}`,
      },
    };
  }

  ctx.logger.info(`lados.human.request_input: "${title}" — ${inputSchema.length} field(s), assigneeRole:${assigneeRole}`);

  const { taskId } = await approvalService.createTask({
    executionId: ctx.executionId,
    workflowId: ctx.workflowId,
    projectId: ctx.projectId ?? '',
    nodeId: ctx.nodeId ?? 'unknown',
    nodeName: title,
    orgId: ctx.organizationId ?? '',
    title,
    description: description ?? `Input required by ${assigneeRole}`,
    assigneeRole,
    data: { ...ctx.inputs, inputSchema },
    assigneeUserId,
    taskType: 'input',
    escalateAfterMinutes,
    escalatedToUserId,
  });

  ctx.logger.info(`Input task created: ${taskId} — pausing workflow`);

  if (notificationService && notifyUserId) {
    const actionUrl = `/approvals?runId=${ctx.executionId}&taskId=${taskId}`;
    notificationService
      .notify({
        userId: notifyUserId,
        orgId: ctx.organizationId,
        type: 'input_request',
        title: `Input Needed: ${title}`,
        body: description ?? 'A workflow step is waiting for you to enter data. Click to fill it in.',
        actionUrl,
        metadata: { workflowId: ctx.workflowId, executionId: ctx.executionId, approvalTaskId: taskId },
      })
      .catch((err: unknown) => {
        ctx.logger.warn(`Notification failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }

  return {
    status: 'paused',
    outputs: {
      inputTask: { approvalTaskId: taskId, assigneeRole, pending: true },
    },
    pause: {
      title,
      description: description ?? `Input required by ${assigneeRole}`,
      assigneeRole,
      context: { approvalTaskId: taskId },
    },
    summary: `Paused: waiting for human input — "${title}"`,
  };
}
