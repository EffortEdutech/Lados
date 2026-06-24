/**
 * AiContextBuilderService — Phase 10 (AI Runtime)
 *
 * Assembles a structured context object from live platform data.
 * This context is injected into every runAssist() call so the AI
 * speaks about real resources and events, not hallucinated data.
 *
 * Context shape:
 *   {
 *     org:            { id, name },
 *     role:           string,            // caller's org membership role
 *     resourceSummary: [{                // up to 50 most recent resources
 *       id, type, name, state,
 *       data (subset — no PII beyond what's already in name/state)
 *     }],
 *     recentEvents:   [{                 // last 20 events across org
 *       id, type, source_type, source_id, payload, created_at
 *     }],
 *     availableTools: string[]           // registered tool names
 *   }
 *
 * AI guardrail: this service is READ-ONLY.
 * It never writes to any table. It never calls transitionState().
 *
 * Sprint 10 (S10-002)
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

// ── Output types ──────────────────────────────────────────────────────────────

export interface AiResourceSummary {
  id:    string;
  type:  string;
  name:  string;
  state: string;
  /** Trimmed data — only scalar fields, no nested objects */
  data:  Record<string, string | number | boolean | null>;
}

export interface AiEventSummary {
  id:          string;
  type:        string;
  source_type: string | null;
  source_id:   string | null;
  payload:     Record<string, unknown>;
  created_at:  string;
}

export interface AiContext {
  org: {
    id:   string;
    name: string;
  };
  role:            string;
  resourceSummary: AiResourceSummary[];
  recentEvents:    AiEventSummary[];
  availableTools:  string[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AiContextBuilderService {
  private readonly logger = new Logger(AiContextBuilderService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Build the AI context for a given org + caller role.
   *
   * @param orgId   - organization UUID
   * @param role    - caller's membership role (owner | admin | driver | …)
   * @param tools   - list of tool names registered in the AI tool registry
   */
  async build(
    orgId:   string,
    role:    string,
    tools:   string[],
  ): Promise<AiContext> {
    const [org, resources, events] = await Promise.allSettled([
      this.fetchOrg(orgId),
      this.fetchResources(orgId),
      this.fetchRecentEvents(orgId),
    ]);

    const orgData = org.status === 'fulfilled' ? org.value : { id: orgId, name: 'Unknown' };
    const resourceData  = resources.status === 'fulfilled' ? resources.value : [];
    const eventData     = events.status    === 'fulfilled' ? events.value    : [];

    if (org.status      === 'rejected') this.logger.warn(`Context: org fetch failed — ${org.reason}`);
    if (resources.status === 'rejected') this.logger.warn(`Context: resources fetch failed — ${resources.reason}`);
    if (events.status   === 'rejected') this.logger.warn(`Context: events fetch failed — ${events.reason}`);

    return {
      org:             orgData,
      role,
      resourceSummary: resourceData,
      recentEvents:    eventData,
      availableTools:  tools,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async fetchOrg(orgId: string): Promise<{ id: string; name: string }> {
    const { data, error } = await this.supabase.admin
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (error) throw error;
    return { id: data.id as string, name: data.name as string };
  }

  private async fetchResources(orgId: string): Promise<AiResourceSummary[]> {
    const { data, error } = await this.supabase.admin
      .from('lados_resources')
      .select('id, type, name, state, data')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data ?? []).map((r) => ({
      id:    r.id as string,
      type:  r.type as string,
      name:  r.name as string,
      state: r.state as string,
      // Keep only flat scalar values — strip nested objects / arrays
      data:  this.flattenData(r.data as Record<string, unknown>),
    }));
  }

  private async fetchRecentEvents(orgId: string): Promise<AiEventSummary[]> {
    const { data, error } = await this.supabase.admin
      .from('lados_events')
      .select('id, type, source_type, source_id, payload, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data ?? []).map((e) => ({
      id:          e.id as string,
      type:        e.type as string,
      source_type: e.source_type as string | null,
      source_id:   e.source_id as string | null,
      payload:     (e.payload ?? {}) as Record<string, unknown>,
      created_at:  e.created_at as string,
    }));
  }

  /**
   * Strip nested objects and arrays from resource data.
   * The AI only needs scalar fields for context (type safety + token economy).
   */
  private flattenData(
    data: Record<string, unknown>,
  ): Record<string, string | number | boolean | null> {
    const out: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(data ?? {})) {
      if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        out[k] = v as string | number | boolean | null;
      }
      // skip objects, arrays — avoids leaking deeply nested PII or bloat
    }
    return out;
  }
}
