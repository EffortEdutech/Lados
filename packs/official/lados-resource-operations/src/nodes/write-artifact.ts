/**
 * lados.artifact.write — Phase 21 S4 (Wave 2)
 *
 * Canonical successor to the prototype `artifact.write` / legacy
 * `project.save_artifact`. Persists a workflow artifact
 * (lados_artifacts/lados_artifact_versions) for later workflow steps or
 * future runs. Persists data only.
 *
 * `retention` (config) is accepted and logged but not yet enforced — no
 * retention-policy engine is wired in this repo.
 *
 * Config/Inputs:
 *   key      — required
 *   format   — 'json' | 'text' | 'file' (default 'json')
 *   retention — optional label, not yet enforced
 *   value    — data to store (inputs.value, or the whole inputs object)
 *
 * Outputs:
 *   artifact — { artifactId, key, version }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IArtifactWriteService } from '../types';

export async function writeArtifact(
  ctx: NodeContext,
  artifactService?: IArtifactWriteService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const key       = cfg['key'] as string | undefined;
  const format    = (cfg['format'] as 'json' | 'text' | 'file' | undefined) ?? 'json';
  const value     = (inp['value'] as Record<string, unknown> | undefined) ?? inp;
  const retention = cfg['retention'] as string | undefined;

  if (!key) {
    return { status: 'failure', outputs: { artifact: null }, error: { code: 'MISSING_INPUT', message: 'lados.artifact.write: key is required' } };
  }
  if (!ctx.projectId) {
    return { status: 'failure', outputs: { artifact: null }, error: { code: 'MISSING_CONTEXT', message: 'lados.artifact.write: projectId missing from execution context' } };
  }
  if (!ctx.organizationId) {
    return { status: 'failure', outputs: { artifact: null }, error: { code: 'MISSING_CONTEXT', message: 'lados.artifact.write: organizationId missing from execution context' } };
  }
  if (!artifactService) {
    return { status: 'failure', outputs: { artifact: null }, error: { code: 'NO_SERVICE', message: 'Artifact write service not injected' } };
  }

  const record = await artifactService.upsertArtifact({
    organisationId: ctx.organizationId,
    projectId: ctx.projectId,
    key,
    type: format,
    data: format === 'json' ? value : undefined,
    workflowId: ctx.workflowId,
    runId: ctx.executionId,
    createdBy: ctx.userId,
  });

  ctx.logger.info(
    `lados.artifact.write: "${key}" v${record.version} saved${retention ? ` (retention:${retention}, not yet enforced)` : ''}`,
  );

  return {
    status: 'success',
    outputs: { artifact: { artifactId: record.id, key: record.artifact_key, version: record.version } },
    summary: `Artifact "${key}" v${record.version} saved`,
  };
}
