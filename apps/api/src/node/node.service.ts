import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class NodeService {
  constructor(private readonly supabase: SupabaseService) {}

  /** List all enabled nodes, optionally filtered by category or pack */
  async findAll(options?: { category?: string; packId?: string }) {
    let query = this.supabase.admin
      .from('registered_nodes')
      .select(`
        type, name, description, version, category, icon, color, tags,
        inputs, outputs, config_schema, ui_schema, pack_id,
        packs ( id, display_name, color, icon )
      `)
      .eq('is_enabled', true)
      .order('category')
      .order('name');

    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.packId) {
      query = query.eq('pack_id', options.packId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Get a single node definition by type */
  async findOne(type: string) {
    const { data, error } = await this.supabase.admin
      .from('registered_nodes')
      .select(`
        type, name, description, version, category, icon, color, tags,
        inputs, outputs, config_schema, ui_schema, pack_id,
        packs ( id, display_name, color, icon )
      `)
      .eq('type', type)
      .eq('is_enabled', true)
      .single();

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

  /** List all enabled packs */
  async findAllPacks() {
    const { data, error } = await this.supabase.admin
      .from('packs')
      .select('id, display_name, description, author, version, icon, color, is_official')
      .eq('is_enabled', true)
      .order('display_name');

    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
