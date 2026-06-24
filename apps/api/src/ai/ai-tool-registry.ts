/**
 * AiToolRegistry — Phase 10 (AI Runtime)
 *
 * Defines the OpenAI function-calling tools available to runAssist().
 * Each tool has:
 *   - definition: the OpenAI `tools` array entry (schema)
 *   - handler:    the async function that executes the tool call
 *
 * Available tools:
 *   search_resources     — keyword search across org resources by type/state/name
 *   get_resource_detail  — full detail for a single resource by ID
 *   get_recent_events    — recent domain events, optionally filtered by type
 *
 * AI guardrail: ALL tools here are READ-ONLY.
 * No tool in this registry may write to any table, transition state,
 * approve/reject anything, or initiate a financial action.
 *
 * Sprint 10 (S10-003)
 */

import { SupabaseService } from '../common/supabase/supabase.service';

// ── OpenAI tool definition types ──────────────────────────────────────────────

export interface OpenAiToolDefinition {
  type: 'function';
  function: {
    name:        string;
    description: string;
    parameters:  Record<string, unknown>;
  };
}

export interface ToolCallResult {
  toolName: string;
  result:   unknown;
  /** Resource IDs surfaced by this call (for ledger resource_refs) */
  resourceIds: string[];
}

// ── Tool definitions (OpenAI schema) ─────────────────────────────────────────

export const AI_TOOL_DEFINITIONS: OpenAiToolDefinition[] = [
  {
    type: 'function',
    function: {
      name:        'search_resources',
      description: 'Search for resources in the organisation by type, state, or name keyword. Returns up to 20 matches.',
      parameters: {
        type:       'object',
        properties: {
          type: {
            type:        'string',
            description: 'Filter by resource type (e.g. job, trip, vehicle, driver, invoice, customer).',
          },
          state: {
            type:        'string',
            description: 'Filter by resource state (e.g. active, pending, in_progress, completed).',
          },
          nameContains: {
            type:        'string',
            description: 'Case-insensitive substring match on the resource name.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'get_resource_detail',
      description: 'Get full details for a single resource by its UUID, including all data fields.',
      parameters: {
        type:       'object',
        properties: {
          resourceId: {
            type:        'string',
            description: 'The UUID of the resource to fetch.',
          },
        },
        required: ['resourceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'get_recent_events',
      description: 'Get recent domain events for the organisation. Optionally filter by event type prefix (e.g. "resource.state_changed", "approval.approved").',
      parameters: {
        type:       'object',
        properties: {
          eventTypePrefix: {
            type:        'string',
            description: 'Filter events whose type starts with this string (e.g. "resource.", "approval.").',
          },
          limit: {
            type:        'number',
            description: 'Number of events to return (default 10, max 30).',
          },
        },
        required: [],
      },
    },
  },
];

export const AI_TOOL_NAMES = AI_TOOL_DEFINITIONS.map((t) => t.function.name);

// ── Tool handlers ─────────────────────────────────────────────────────────────

export async function executeToolCall(
  toolName:  string,
  toolArgs:  Record<string, unknown>,
  orgId:     string,
  supabase:  SupabaseService,
): Promise<ToolCallResult> {
  switch (toolName) {
    case 'search_resources':
      return searchResources(toolArgs, orgId, supabase);

    case 'get_resource_detail':
      return getResourceDetail(toolArgs, orgId, supabase);

    case 'get_recent_events':
      return getRecentEvents(toolArgs, orgId, supabase);

    default:
      return {
        toolName,
        result:      { error: `Unknown tool: ${toolName}` },
        resourceIds: [],
      };
  }
}

// ── Individual handlers ───────────────────────────────────────────────────────

async function searchResources(
  args:     Record<string, unknown>,
  orgId:    string,
  supabase: SupabaseService,
): Promise<ToolCallResult> {
  let query = supabase.admin
    .from('lados_resources')
    .select('id, type, name, state, data, created_at, updated_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (args.type)         query = query.eq('type',  args.type as string);
  if (args.state)        query = query.eq('state', args.state as string);
  if (args.nameContains) query = query.ilike('name', `%${args.nameContains}%`);

  const { data, error } = await query;

  if (error) return { toolName: 'search_resources', result: { error: error.message }, resourceIds: [] };

  const rows = data ?? [];
  return {
    toolName:    'search_resources',
    result:      { count: rows.length, resources: rows },
    resourceIds: rows.map((r: { id: string }) => r.id),
  };
}

async function getResourceDetail(
  args:     Record<string, unknown>,
  orgId:    string,
  supabase: SupabaseService,
): Promise<ToolCallResult> {
  const resourceId = args.resourceId as string;

  const { data, error } = await supabase.admin
    .from('lados_resources')
    .select('*')
    .eq('id',     resourceId)
    .eq('org_id', orgId)      // scope to org — security guard
    .single();

  if (error) return { toolName: 'get_resource_detail', result: { error: error.message }, resourceIds: [] };

  return {
    toolName:    'get_resource_detail',
    result:      data,
    resourceIds: data ? [data.id as string] : [],
  };
}

async function getRecentEvents(
  args:     Record<string, unknown>,
  orgId:    string,
  supabase: SupabaseService,
): Promise<ToolCallResult> {
  const limit = Math.min(Number(args.limit ?? 10), 30);

  let query = supabase.admin
    .from('lados_events')
    .select('id, type, source_type, source_id, actor_id, payload, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (args.eventTypePrefix) {
    // ilike with trailing % for prefix match
    query = query.ilike('type', `${args.eventTypePrefix}%`);
  }

  const { data, error } = await query;

  if (error) return { toolName: 'get_recent_events', result: { error: error.message }, resourceIds: [] };

  return {
    toolName:    'get_recent_events',
    result:      { count: (data ?? []).length, events: data ?? [] },
    resourceIds: [],
  };
}
