/**
 * PipelineService
 *
 * Stores and retrieves the React Flow pipeline layout for a project.
 * One layout per project — upserted on every canvas save.
 * Sprint 11 (S11-002)
 */
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

export interface PipelineLayout {
  nodes: unknown[];
  edges: unknown[];
}

@Injectable()
export class PipelineService {
  constructor(private readonly supabase: SupabaseService) {}

  async get(projectId: string): Promise<PipelineLayout> {
    const { data, error } = await this.supabase.admin
      .from('project_pipelines')
      .select('layout')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Return empty layout if none saved yet — canvas auto-populates from workflows
    return (data?.layout as PipelineLayout) ?? { nodes: [], edges: [] };
  }

  async upsert(projectId: string, layout: PipelineLayout): Promise<PipelineLayout> {
    const { data, error } = await this.supabase.admin
      .from('project_pipelines')
      .upsert(
        { project_id: projectId, layout },
        { onConflict: 'project_id' },
      )
      .select('layout')
      .single();

    if (error) throw new Error(error.message);
    return data.layout as PipelineLayout;
  }
}
