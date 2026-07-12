/**
 * ProgramArtifactService — Phase 23 S23.3, renamed from
 * PipelineArtifactService in Phase 24 S24.1/S24.2.
 *
 * Thin service over the `program_artifacts` table (migration 0075, renamed
 * by 0079) — successor to the dead `project_artifacts`/`ArtifactService`
 * pairing used by the old `project.save_artifact`/`project.read_artifact`
 * nodes (archived with `lados.core-pack` in Phase 21 S9). Scoped to one
 * `program_run_id`, not a project-wide singleton per key — two concurrent
 * program runs can never clobber each other's handoff data under the same
 * artifact_key (migration 0075's `UNIQUE (program_run_id, artifact_key)`,
 * renamed by 0079).
 *
 * Kept in its own lightweight module (no ExecutionModule/ProgramExecutionModule
 * dependency) so ExecutionModule can import it directly for both
 * ExecutionService and ExecutionWorker to inject into buildRealNodeResolver()
 * — the same "extract a Core module to avoid a circular import" pattern used
 * for ApprovalTaskCreator/ApprovalCoreModule (Phase 7).
 *
 * Note (S24.2): the object key this service is injected under when calling
 * into `lados-workflow-foundation`'s resolver is still `pipelineArtifactService`
 * until S24.3 renames that pack's own `WorkflowFoundationServices` interface
 * and node type strings — see execution/real-nodes/index.ts.
 */
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class ProgramArtifactService {
  constructor(private readonly supabase: SupabaseService) {}

  async saveArtifact(params: {
    programRunId: string;
    sourceStageId: string;
    sourceRunId?: string;
    artifactKey: string;
    value: unknown;
  }): Promise<{ id: string }> {
    const { data, error } = await this.supabase.admin
      .from('program_artifacts')
      .upsert(
        {
          program_run_id: params.programRunId,
          source_stage_id: params.sourceStageId,
          source_run_id:   params.sourceRunId ?? null,
          artifact_key:    params.artifactKey,
          value:           params.value ?? null,
        },
        { onConflict: 'program_run_id,artifact_key' },
      )
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to save program artifact');
    return { id: data['id'] as string };
  }

  async readArtifact(params: {
    programRunId: string;
    artifactKey: string;
  }): Promise<{ value: unknown; found: boolean }> {
    const { data, error } = await this.supabase.admin
      .from('program_artifacts')
      .select('value')
      .eq('program_run_id', params.programRunId)
      .eq('artifact_key', params.artifactKey)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return { value: data?.['value'] ?? null, found: !!data };
  }
}
