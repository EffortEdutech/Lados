/**
 * ArtifactService
 *
 * Manages project_artifacts — the key-value store used for inter-workflow
 * data handoff. project.save_artifact nodes write here; project.read_artifact
 * nodes read from here.
 * Sprint 11 (S11-003)
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

export interface ArtifactRecord {
  id: string;
  artifact_key: string;
  value: Record<string, unknown>;
  source_workflow_id: string | null;
  execution_run_id: string | null;
  updated_at: string;
}

@Injectable()
export class ArtifactService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(projectId: string): Promise<ArtifactRecord[]> {
    const { data, error } = await this.supabase.admin
      .from('project_artifacts')
      .select('id, artifact_key, value, source_workflow_id, execution_run_id, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as ArtifactRecord[];
  }

  async get(projectId: string, key: string): Promise<ArtifactRecord> {
    const { data, error } = await this.supabase.admin
      .from('project_artifacts')
      .select('id, artifact_key, value, source_workflow_id, execution_run_id, updated_at')
      .eq('project_id', projectId)
      .eq('artifact_key', key)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException(`Artifact "${key}" not found for this project`);
    return data as ArtifactRecord;
  }

  async upsert(
    projectId: string,
    key: string,
    value: Record<string, unknown>,
    meta?: { sourceWorkflowId?: string; executionRunId?: string },
  ): Promise<ArtifactRecord> {
    const { data, error } = await this.supabase.admin
      .from('project_artifacts')
      .upsert(
        {
          project_id: projectId,
          artifact_key: key,
          value,
          source_workflow_id: meta?.sourceWorkflowId ?? null,
          execution_run_id: meta?.executionRunId ?? null,
        },
        { onConflict: 'project_id,artifact_key' },
      )
      .select('id, artifact_key, value, source_workflow_id, execution_run_id, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return data as ArtifactRecord;
  }
}
