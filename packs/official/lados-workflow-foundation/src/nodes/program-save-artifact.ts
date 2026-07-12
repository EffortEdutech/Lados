/**
 * lados.workflow.program_save_artifact — Phase 23 S23.3, renamed from
 * lados.workflow.pipeline_save_artifact in Phase 24 S24.3 (file renamed
 * from pipeline-save-artifact.ts).
 *
 * Writes a keyed value into the parent program run's artifact store
 * (`program_artifacts`, migration 0075, renamed by 0079) so a later stage —
 * potentially a different workflow, in a different project — can read it
 * back via lados.workflow.program_read_artifact. Successor in spirit to the
 * dead `project.save_artifact` (registered under the archived
 * `lados.core-pack`, Phase 21 S9), but architecturally new: scoped to one
 * program_run_id, not a project-wide singleton per key, so concurrent
 * program runs can never clobber each other's handoff data under the same
 * key.
 *
 * Only meaningful when this workflow is running AS a program stage
 * (ctx.programRunId set by ProgramExecutionService.triggerRun() threading
 * through ExecutionService.triggerRun()'s programContext, S23.2, renamed
 * S24.2). A standalone workflow run has no programRunId — this node fails
 * cleanly with NOT_IN_PROGRAM_CONTEXT rather than silently no-op'ing,
 * matching this pack's fail-loud convention (MISSING_INPUT, MISSING_CONTEXT,
 * etc.).
 *
 * Config/Inputs:
 *   artifactKey — required string identifying this piece of handoff data
 *   value       — the data to save (any JSON-serializable value)
 *
 * Outputs:
 *   saved       — whether the write succeeded
 *   artifactKey — echoed back for downstream convenience
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export interface IProgramArtifactService {
  saveArtifact(params: {
    programRunId: string;
    sourceStageId: string;
    sourceRunId?: string;
    artifactKey: string;
    value: unknown;
  }): Promise<{ id: string }>;
  readArtifact(params: {
    programRunId: string;
    artifactKey: string;
  }): Promise<{ value: unknown; found: boolean }>;
}

export async function programSaveArtifact(
  ctx: NodeContext,
  service?: IProgramArtifactService,
): Promise<NodeExecuteResult> {
  if (!ctx.programRunId) {
    return {
      status: 'failure',
      outputs: { saved: false },
      error: {
        code: 'NOT_IN_PROGRAM_CONTEXT',
        message: 'lados.workflow.program_save_artifact: this workflow is not running as a program stage',
      },
    };
  }
  if (!service) {
    return {
      status: 'failure',
      outputs: { saved: false },
      error: { code: 'NO_SERVICE', message: 'Program artifact service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const artifactKey = (inp['artifactKey'] ?? cfg['artifactKey']) as string | undefined;
  const value = inp['value'] !== undefined ? inp['value'] : cfg['value'];

  if (!artifactKey) {
    return {
      status: 'failure',
      outputs: { saved: false },
      error: { code: 'MISSING_INPUT', message: 'lados.workflow.program_save_artifact: artifactKey is required' },
    };
  }

  ctx.logger.info(`lados.workflow.program_save_artifact → key:${artifactKey} programRun:${ctx.programRunId}`);

  await service.saveArtifact({
    programRunId: ctx.programRunId,
    sourceStageId: ctx.programStageId ?? ctx.nodeId,
    sourceRunId: ctx.executionId,
    artifactKey,
    value: value ?? null,
  });

  return {
    status: 'success',
    outputs: { saved: true, artifactKey },
    summary: `Artifact "${artifactKey}" saved to program run`,
  };
}
