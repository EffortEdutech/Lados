/**
 * lados.artifact.read — Phase 21 S4 (Wave 2)
 *
 * Canonical successor to the prototype `artifact.read` / legacy
 * `project.read_artifact`. Reads a named artifact written by
 * lados.artifact.write in a prior workflow run.
 *
 * Config:
 *   key      — required
 *   required — if true, fails when the artifact is not found (default false)
 *
 * Outputs:
 *   value, found, version, key
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IArtifactReadService } from '../types';

export async function readArtifact(
  ctx: NodeContext,
  artifactService?: IArtifactReadService,
): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const key      = cfg['key'] as string | undefined;
  const required = (cfg['required'] as boolean | undefined) ?? false;

  if (!key) {
    return {
      status: 'failure',
      outputs: { value: null, found: false, version: 0, key: null },
      error: { code: 'MISSING_INPUT', message: 'lados.artifact.read: key is required' },
    };
  }
  if (!ctx.projectId) {
    return {
      status: 'failure',
      outputs: { value: null, found: false, version: 0, key },
      error: { code: 'MISSING_CONTEXT', message: 'lados.artifact.read: projectId missing from execution context' },
    };
  }
  if (!artifactService) {
    return {
      status: 'failure',
      outputs: { value: null, found: false, version: 0, key },
      error: { code: 'NO_SERVICE', message: 'Artifact read service not injected' },
    };
  }

  const record = await artifactService.readArtifact(ctx.projectId, key, false);

  if (!record) {
    if (required) {
      return {
        status: 'failure',
        outputs: { value: null, found: false, version: 0, key },
        error: { code: 'ARTIFACT_NOT_FOUND', message: `lados.artifact.read: artifact "${key}" not found` },
      };
    }
    ctx.logger.warn(`lados.artifact.read: "${key}" not found (required=false, continuing)`);
    return { status: 'success', outputs: { value: null, found: false, version: 0, key } };
  }

  ctx.logger.info(`lados.artifact.read: "${key}" v${record.version} loaded`);

  return {
    status: 'success',
    outputs: { value: record.data, found: true, version: record.version, key: record.artifact_key },
  };
}
