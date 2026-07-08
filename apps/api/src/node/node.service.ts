import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

// ── Select strings ────────────────────────────────────────────────────────────
// V3 select includes uses_services + data_pack_deps (migration 0013),
// packs.layer (migration 0056), and canvas_ux (migration 0061 — S7 UI
// Alignment, lets the canvas honor each official node's declared
// minWidth/minHeight/maxVisiblePortsPerSide instead of a fixed 260px card).
// If any of these columns don't exist yet (schema cache lag or a migration
// pending on a given environment), we fall back to the bare-minimum select
// so the app stays functional — this only matters for a DB that's behind
// on migrations; any fully-migrated environment succeeds on the first try.
const SELECT_V3 = `
  type, name, description, version, category, icon, color, tags,
  inputs, outputs, config_schema, ui_schema, pack_id,
  uses_services, data_pack_deps, canvas_ux,
  packs ( id, display_name, color, icon, layer, is_official )
`;

const SELECT_FALLBACK = `
  type, name, description, version, category, icon, color, tags,
  inputs, outputs, config_schema, ui_schema, pack_id,
  packs ( id, display_name, color, icon, is_official )
`;

const SELECT_CASCADE = [SELECT_V3, SELECT_FALLBACK];

/** Detect Postgres "column does not exist" (42703) or PostgREST 400 errors
 *  that indicate migration 0013, 0056, or 0061 hasn't been applied yet. */
function isMissingColumnError(msg: string): boolean {
  return (
    msg.includes('uses_services') ||
    msg.includes('data_pack_deps') ||
    msg.includes('layer') ||
    msg.includes('canvas_ux') ||
    msg.includes('42703')
  );
}

@Injectable()
export class NodeService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Run a Supabase query built from `queryFactory(select)`, trying each
   * select string in `selects` (defaults to the registered_nodes
   * `SELECT_CASCADE`) in order until one succeeds or a non-schema error is
   * hit. Shared by findAll/findOne/search/findAllPacks so the fallback
   * logic for uses_services/data_pack_deps (migration 0013), packs.layer
   * (migration 0056), and canvas_ux (migration 0061) lives in one place.
   */
  private async runSelectCascade<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFactory: (select: string) => PromiseLike<{ data: T | null; error: any }>,
    selects: string[] = SELECT_CASCADE,
  ): Promise<{ data: T | null; error: { message: string } | null }> {
    let lastError: { message: string } | null = null;
    for (const select of selects) {
      const { data, error } = await queryFactory(select);
      if (!error) return { data, error: null };
      lastError = error;
      if (!isMissingColumnError(error.message)) {
        return { data: null, error };
      }
      // else: schema-cache mismatch — try the next, narrower select
    }
    return { data: null, error: lastError };
  }

  /** List all enabled nodes, optionally filtered by category or pack */
  async findAll(options?: { category?: string; packId?: string }) {
    const { data, error } = await this.runSelectCascade((select) => {
      let q = this.supabase.admin
        .from('registered_nodes')
        .select(select)
        .eq('is_enabled', true)
        .order('category')
        .order('name');

      if (options?.category) q = q.eq('category', options.category);
      if (options?.packId)   q = q.eq('pack_id',  options.packId);

      return q;
    });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Get a single node definition by type */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findOne(type: string): Promise<Record<string, any>> {
    const { data, error } = await this.runSelectCascade((select) =>
      this.supabase.admin
        .from('registered_nodes')
        .select(select)
        .eq('type', type)
        .eq('is_enabled', true)
        .single(),
    );

    if (error ?? !data) throw new NotFoundException(`Node type "${type}" not found`);
    return data;
  }

  /** Return only the ui_schema for a node type */
  async getUISchema(type: string) {
    const { data, error } = await this.supabase.admin
      .from('registered_nodes')
      .select('type, ui_schema, config_schema')
      .eq('type', type)
      .eq('is_enabled', true)
      .single();

    if (error ?? !data) throw new NotFoundException(`Node type "${type}" not found`);
    return data;
  }

  /**
   * Validate a node configuration object against the node's config_schema.
   * Returns { valid, errors }.
   */
  async validateConfig(type: string, config: Record<string, unknown>) {
    const node = await this.findOne(type);
    const schema = node.config_schema as Array<{
      key: string;
      label: string;
      required?: boolean;
    }>;

    const errors: Array<{ field: string; message: string }> = [];

    for (const field of schema) {
      if (field.required) {
        const value = config[field.key];
        const missing =
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim() === '');
        if (missing) {
          errors.push({ field: field.key, message: `"${field.label}" is required` });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /** List all enabled packs with skill count */
  async findAllPacks() {
    const PACKS_SELECT_V3 = 'id, display_name, description, author, version, icon, color, is_official, layer';
    const PACKS_SELECT_FALLBACK = 'id, display_name, description, author, version, icon, color, is_official';
    const PACKS_SELECT_CASCADE = [PACKS_SELECT_V3, PACKS_SELECT_FALLBACK];

    // Not passing an explicit <T> here — same as findAll/findOne/search
    // below, letting TS infer the (necessarily loose/untyped, since
    // `select` is a plain string) shape from the Supabase query builder
    // itself, rather than asserting it against a hand-written interface.
    // Asserting a concrete type argument here fails: passing a runtime
    // `string` to `.select()` makes Supabase's typed client fall back to
    // its `GenericStringError` sentinel row type, which a hand-written
    // interface (with a required `id`) isn't assignable from.
    const { data, error } = await this.runSelectCascade(
      (select) =>
        this.supabase.admin
          .from('packs')
          .select(select)
          .eq('is_enabled', true)
          .order('display_name'),
      PACKS_SELECT_CASCADE,
    );

    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packs = (data ?? []) as Array<Record<string, any>>;

    // Attach skill count per pack
    const { data: nodes } = await this.supabase.admin
      .from('registered_nodes')
      .select('pack_id')
      .eq('is_enabled', true);

    const countMap: Record<string, number> = {};
    for (const n of nodes ?? []) {
      countMap[n.pack_id] = (countMap[n.pack_id] ?? 0) + 1;
    }

    return packs.map((p) => ({ ...p, skill_count: countMap[p.id] ?? 0 }));
  }

  /**
   * Search nodes by name, description, type, or pack name.
   * Sprint 15 (S15-004) — server-side search to replace client-side filter.
   */
  async search(q: string) {
    const term = q.trim();
    if (!term) return this.findAll();

    const { data, error } = await this.runSelectCascade((select) =>
      this.supabase.admin
        .from('registered_nodes')
        .select(select)
        .eq('is_enabled', true)
        .or(
          `name.ilike.%${term}%,description.ilike.%${term}%,type.ilike.%${term}%,pack_id.ilike.%${term}%`,
        )
        .order('category')
        .order('name'),
    );

    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
