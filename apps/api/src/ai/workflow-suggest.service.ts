/**
 * WorkflowSuggestService — Phase 11 (Level 4 AI-Assisted Editor)
 *
 * Converts a natural language description into a workflow node graph
 * using ONLY node types from the user's installed and enabled packs.
 *
 * PACK CONTRACT (non-negotiable):
 *   - Queries registered_nodes WHERE is_enabled = true AND pack is enabled
 *   - Strips any AI-hallucinated node types before returning
 *   - Returns a QSWorkflowDefinition-compatible node + connection list
 *   - Never publishes — caller saves as draft, human reviews before publish
 *
 * Sprint 11 (S11-003)
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { AiService }        from './ai.service';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeTypeInfo {
  type:        string;
  name:        string;
  description: string;
  category:    string;
}

export interface SuggestedNode {
  id:       string;   // generated UUID — ready to use in QSWorkflowDefinition
  type:     string;
  label:    string;
  position: { x: number; y: number };
}

export interface WorkflowConnection {
  id:           string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface WorkflowSuggestion {
  name:           string;
  description:    string;
  /** AI-ordered sequence — the starting workflow plan */
  suggestedNodes: SuggestedNode[];
  /** All nodes from relevant packs — full palette for the designer */
  availableNodes: SuggestedNode[];
  connections:    WorkflowConnection[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class WorkflowSuggestService {
  private readonly logger = new Logger(WorkflowSuggestService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai:       AiService,
  ) {}

  /**
   * Main entry point.
   * @param description  Natural language description of the workflow (BM or EN)
   */
  async suggest(description: string): Promise<WorkflowSuggestion> {
    const nodeTypes = await this.getAvailableNodeTypes();

    if (nodeTypes.length === 0) {
      throw new Error(
        'No pack nodes available. Please enable at least one pack in Settings → Packs.',
      );
    }

    this.logger.log(`Suggesting workflow for: "${description}" (${nodeTypes.length} node types available)`);

    const suggestion = await this.callAI(description, nodeTypes);

    // ── PACK CONSTRAINT ENFORCEMENT ──────────────────────────────────────────
    // Strip any node types the AI hallucinated that are not in installed packs.
    const validTypes = new Set(nodeTypes.map(n => n.type));

    const stripAndPosition = (nodes: SuggestedNode[]): SuggestedNode[] =>
      nodes
        .filter(n => validTypes.has(n.type))
        .map((n, i) => ({ ...n, position: { x: 250, y: 60 + i * 160 } }));

    const beforeSeq = suggestion.suggestedNodes.length;
    suggestion.suggestedNodes = stripAndPosition(suggestion.suggestedNodes);
    const strippedSeq = beforeSeq - suggestion.suggestedNodes.length;

    const beforeAvail = suggestion.availableNodes.length;
    suggestion.availableNodes = stripAndPosition(suggestion.availableNodes);
    const strippedAvail = beforeAvail - suggestion.availableNodes.length;

    if (strippedSeq + strippedAvail > 0) {
      this.logger.warn(
        `Stripped ${strippedSeq} hallucinated sequence node(s) and ${strippedAvail} palette node(s)`,
      );
    }

    // Merge: availableNodes should include ALL relevant nodes (sequence + palette),
    // deduped by type so the UI has the full picture.
    const seqTypes = new Set(suggestion.suggestedNodes.map(n => n.type));
    const paletteOnly = suggestion.availableNodes.filter(n => !seqTypes.has(n.type));
    suggestion.availableNodes = [...suggestion.suggestedNodes, ...paletteOnly];

    // Rebuild connections from the final validated sequence
    suggestion.connections = this.buildConnections(suggestion.suggestedNodes);

    return suggestion;
  }

  // ── Private: fetch node catalogue from DB ─────────────────────────────────

  private async getAvailableNodeTypes(): Promise<NodeTypeInfo[]> {
    // 1. Which packs are enabled?
    const { data: packs } = await this.supabase.admin
      .from('packs')
      .select('id')
      .eq('is_enabled', true);

    if (!packs || packs.length === 0) return [];

    const packIds = packs.map(p => p.id as string);

    // 2. Fetch all enabled nodes from those packs
    const { data: nodes, error } = await this.supabase.admin
      .from('registered_nodes')
      .select('type, name, description, category')
      .eq('is_enabled', true)
      .in('pack_id', packIds)
      .order('category')
      .order('name');

    if (error) {
      this.logger.error('Failed to fetch node types', error.message);
      return [];
    }

    return (nodes ?? []) as NodeTypeInfo[];
  }

  // ── Private: call GPT-4o-mini ─────────────────────────────────────────────

  private async callAI(description: string, nodeTypes: NodeTypeInfo[]): Promise<WorkflowSuggestion> {
    // Group by category for a cleaner, shorter prompt
    const grouped: Record<string, NodeTypeInfo[]> = {};
    for (const n of nodeTypes) {
      const cat = n.category ?? 'general';
      grouped[cat] = grouped[cat] ?? [];
      grouped[cat].push(n);
    }

    const nodeList = Object.entries(grouped)
      .map(([cat, nodes]) =>
        `[${cat.toUpperCase()}]\n` +
        nodes.map(n =>
          `  ${n.type} — ${n.name}${n.description ? ` (${n.description.slice(0, 80)})` : ''}`,
        ).join('\n'),
      )
      .join('\n\n');

    const systemPrompt =
      `You are a senior business process designer for a construction contractor management system.
You analyse a request and return TWO things:
  1. suggestedSequence — a complete ordered workflow (4-6 nodes, trigger to final outcome)
  2. alsoRelevant — other nodes from the catalogue that COULD apply but are not in the sequence

CRITICAL RULES:
- NEVER invent node type strings — use ONLY the exact "type" values from the catalogue
- Think through the FULL cycle: what triggers it → intermediates → final outcome
- alsoRelevant must NOT duplicate types already in suggestedSequence
- Respond ONLY with valid JSON — no markdown, no explanations`;

    const userPrompt =
      `Design a workflow for: "${description}"

AVAILABLE NODE TYPES (use ONLY these exact "type" strings):
${nodeList}

STEP-BY-STEP THINKING (do this mentally before writing JSON):
1. What is the opening event / trigger?
2. Are there approvals, assignments, or notifications in the middle?
3. What operational steps happen (job, trip, invoice)?
4. What closes the cycle (payment, notification, state change)?
5. Which OTHER nodes from the catalogue could optionally apply but are not in the core sequence?

Respond with this exact JSON (no markdown):
{
  "name": "Workflow name, max 60 chars",
  "description": "One sentence: full end-to-end process summary",
  "suggestedSequence": [
    { "tempId": "n1", "type": "exact.type.from.catalogue", "label": "Plain business action" },
    { "tempId": "n2", "type": "exact.type.from.catalogue", "label": "Plain business action" }
  ],
  "alsoRelevant": [
    { "type": "exact.type.from.catalogue", "label": "Short node name" }
  ]
}

Rules:
- suggestedSequence: 4-6 nodes, ordered start→finish, covering the complete cycle
- alsoRelevant: 2-6 nodes the user MIGHT want to add (no duplicates with suggestedSequence)
- Labels: plain business language ("Receive Order", not "resource.create")
- If a category has no relevant nodes, omit it from alsoRelevant`;

    const raw = await this.ai.runCompletion(systemPrompt, userPrompt, {
      model:       'gpt-4o-mini',
      temperature: 0.3,   // slightly more creative to avoid degenerate 2-node answers
      maxTokens:   1500,
      jsonMode:    false,
    });

    // ── Parse: extract JSON even if AI wraps it in markdown ──────────────────
    let jso