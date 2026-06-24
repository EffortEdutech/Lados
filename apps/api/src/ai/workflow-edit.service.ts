/**
 * WorkflowEditService — Phase 11 (Design Studio AI Co-pilot)
 *
 * Handles the conversational AI layer inside AiWorkflowDesigner.
 * Called each time the user sends a chat message during the design session.
 *
 * The AI can:
 *   - update_sequence  — modify the ordered node list (add/remove/reorder/redesign)
 *   - highlight_nodes  — surface relevant nodes in the palette (find/search)
 *   - suggest_pack     — tell the user what pack they'd need for unavailable features
 *   - answer           — answer a question or give advice without changing anything
 *
 * PACK CONTRACT: ONLY node types from allAvailableNodes may appear in updatedNodes.
 * Hallucinated types are stripped before returning.
 *
 * Sprint 11 (S11-005)
 */

import { Injectable, Logger } from '@nestjs/common';
import { AiService } from './ai.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditableNode {
  id:    string;
  type:  string;
  label: string;
}

export interface AvailableNode {
  type:         string;
  name:         string;
  description?: string;
}

export type EditAction =
  | 'update_sequence'
  | 'highlight_nodes'
  | 'suggest_pack'
  | 'answer';

export interface WorkflowEditResponse {
  action:       EditAction;
  /** Full updated sequence (present only when action = update_sequence) */
  updatedNodes?: EditableNode[];
  /** Node types to pulse-highlight in palette (action = highlight_nodes) */
  highlights?:   string[];
  /** Human-readable AI response shown in the chat history */
  message:       string;
  /** Pack slug to suggest installing (action = suggest_pack) */
  suggestPack?:  string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class WorkflowEditService {
  private readonly logger = new Logger(WorkflowEditService.name);

  constructor(private readonly ai: AiService) {}

  async edit(params: {
    message:           string;
    currentNodes:      EditableNode[];
    allAvailableNodes: AvailableNode[];
  }): Promise<WorkflowEditResponse> {
    const { message, currentNodes, allAvailableNodes } = params;

    const currentList = currentNodes.length
      ? currentNodes.map((n, i) => `  ${i + 1}. [${n.type}] "${n.label}"`).join('\n')
      : '  (empty — no nodes yet)';

    const availableList = allAvailableNodes.length
      ? allAvailableNodes
          .map(n => `  ${n.type} — ${n.name}${n.description ? ` (${n.description.slice(0, 80)})` : ''}`)
          .join('\n')
      : '  (none)';

    const systemPrompt =
      `You are an AI assistant helping a user design a business workflow in an interactive design studio.
The user can ask you to add, remove, or reorder steps, find relevant nodes, or ask questions.
NEVER invent node type strings — ONLY use types from the AVAILABLE NODES list.
Respond ONLY with valid JSON — no markdown, no extra text.`;

    const userPrompt =
      `CURRENT WORKFLOW SEQUENCE:
${currentList}

AVAILABLE NODES (use ONLY these exact type strings):
${availableList}

USER MESSAGE: "${message}"

Choose the best action and respond with one of these JSON shapes:

── If user wants to ADD, REMOVE, REORDER, or REDESIGN steps ──
{
  "action": "update_sequence",
  "updatedNodes": [
    { "type": "exact.type.from.available", "label": "Clear business label" }
  ],
  "message": "What you changed and why (1-2 sentences, friendly tone)"
}
NOTE: Return the COMPLETE new sequence. Preserve unchanged nodes exactly as-is.
      Only use type strings from AVAILABLE NODES. NEVER invent new types.

── If user wants to FIND or SEARCH for relevant nodes ──
{
  "action": "highlight_nodes",
  "highlights": ["node.type.1", "node.type.2"],
  "message": "Here are the nodes I found that match your request"
}
NOTE: highlights must be type strings from AVAILABLE NODES only.

── If user asks for something NOT in available nodes ──
{
  "action": "suggest_pack",
  "suggestPack": "descriptive-pack-slug",
  "message": "What you'd need and which type of pack could provide it"
}

── If user asks a QUESTION or wants ADVICE ──
{
  "action": "answer",
  "message": "Clear, helpful answer (2-3 sentences max)"
}`;

    const raw = await this.ai.runCompletion(systemPrompt, userPrompt, {
      model:       'gpt-4o-mini',
      temperature: 0.2,
      maxTokens:   1200,
      jsonMode:    false,
    });

    return this.parseResponse(raw, currentNodes, allAvailableNodes);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private parseResponse(
    raw:               string,
    currentNodes:      EditableNode[],
    allAvailableNodes: AvailableNode[],
  ): WorkflowEditResponse {
    let jsonStr = raw.trim();

    // Strip ```json ... ``` fences
    const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) jsonStr = fenced[1].trim();
    if (!jsonStr.startsWith('{')) {
      const m = jsonStr.match(/\{[\s\S]*\}/);
      if (m) jsonStr = m[0];
    }

    let parsed: WorkflowEditResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      this.logger.error('WorkflowEditService: JSON parse failed', jsonStr.slice(0, 200));
      return {
        action:  'answer',
        message: "I didn't quite understand that. Could you rephrase?",
      };
    }

    // ── Enforce pack contract on update_sequence ──────────────────────────
    if (parsed.action === 'update_sequence' && Array.isArray(parsed.updatedNodes)) {
      const validTypes  = new Set(allAvailableNodes.map(n => n.type));
      const existingMap = new Map(currentNodes.map(n => [n.type + '::' + n.label, n.id]));

      const before = parsed.updatedNodes.length;
      parsed.updatedNodes = parsed.updatedNodes
        .filter(n => validTypes.has(n.type))
        .map(n => ({
          ...n,
          id: existingMap.get(n.type + '::' + n.label) ?? `node-${crypto.randomUUID()}`,
        }));

      const stripped = before - parsed.updatedNodes.length;
      if (stripped > 0) {
        this.logger.warn(`Stripped ${stripped} hallucinated node type(s) from edit response`);
      }
    }

    // ── Enforce pack contract on highlight_nodes ──────────────────────────
    if (parsed.action === 'highlight_nodes' && Array.isArray(parsed.highlights)) {
      const validTypes = new Set(allAvailableNodes.map(n => n.type));
      parsed.highlights = parsed.highlights.filter(t => validTypes.has(t));
    }

    return parsed;
  }
}
