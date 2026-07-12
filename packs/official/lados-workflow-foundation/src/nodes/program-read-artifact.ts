/**
 * lados.workflow.program_read_artifact — Phase 23 S23.3, renamed from
 * lados.workflow.pipeline_read_artifact in Phase 24 S24.3 (file renamed
 * from pipeline-read-artifact.ts).
 *
 * Reads a keyed value previously written by lados.workflow.program_save_artifact
 * anywhere else in the same program run (potentially a different workflow,
 * a different project). See program-save-artifact.ts's header for the full
 * design rationale (successor in spirit to the dead `project.read_artifact`,
 * architecturally new — scoped to one program_run_id).
 *
 * `found: false` (not a failure) when the key hasn't been written yet — a
 * missing artifact is an expected, checkable condition (e.g. a stage that
 * runs before its upstream sibling in a parallel branch), not an error.
 * Only NOT_IN_PROGRAM_CONTEXT (standalone run) and MISSING_INPUT (no key
 * configured) are real failures.
 *
 * Config/Inputs:
 *   artifactKey — required string identifying the piece of handoff data
 *
 * Outputs:
 *   value — the stored value, or null if not found
 *   found — whether the key existed
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IProgramArtifactService } from './program-save-artifact';

export type { IProgramArtifactService };

export async function programReadArtifact(
  ctx: NodeContext,
  service?: IProgramArtifactService,
): Promise<NodeExecuteResult> {
  if (!ctx.programRunId) {
    return {
      status: 'failure',
      outputs: { value: null, found: false },
      error: {
        code: 'NOT_IN_PROGRAM_CONTEXT',
        message: 'lados.workflow.program_read_artifact: this workflow is not running as a program stage',
      },
    };
  }
  if (!service) {
    return {
      status: 'failure',
      outputs: { value: null, found: false },
      error: { code: 'NO_SERVICE', message: 'Program artifact service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const artifactKey = (inp['artifactKey'] ?? cfg['artifactKey']) as string | undefined;

  if (!artifactKey) {
    return {
      status: 'failure',
      outputs: { value: null, found: false },
      error: { code: 'MISSING_INPUT', message: 'lados.workflow.program_read_artifact: artifactKey is required' },
    };
  }

  const result = await service.readArtifact({ programRunId: ctx.programRunId, artifactKey });

  ctx.logger.info(`lados.workflow.program_read_artifact → key:${artifactKey} found:${result.found}`);

  return {
    status: 'success',
    outputs: { value: result.value, found: result.found },
    summary: result.found ? `Artifact "${artifactKey}" read` : `Artifact "${artifactKey}" not found (yet)`,
  };
}
