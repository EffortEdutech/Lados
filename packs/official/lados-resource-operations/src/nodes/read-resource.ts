/**
 * lados.resource.read — Phase 21 S4 (Wave 2)
 *
 * Reads a single Workspace Resource by id. Resolves the id from an upstream
 * `ref` input object first, falling back to a bound/config `resourceId`.
 *
 * Outputs:
 *   resource — { resourceId, type, name, state, data } | null on failure
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IReadResourceService } from '../types';

export async function readResource(
  ctx: NodeContext,
  resourceService?: IReadResourceService,
): Promise<NodeExecuteResult> {
  if (!resourceService) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'NO_SERVICE', message: 'Resource read service not injected' },
    };
  }

  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const ref = (inp['ref'] as Record<string, unknown> | undefined) ?? {};

  const resourceId = (ref['resourceId'] ?? ref['id'] ?? cfg['resourceId']) as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.read: resourceId is required (bind a resource or provide ref.resourceId)' },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.resource.read: organizationId missing from execution context' },
    };
  }

  try {
    const record = await resourceService.getResource(resourceId, ctx.organizationId);
    return {
      status: 'success',
      outputs: {
        resource: { resourceId: record.id, type: record.type, name: record.name, state: record.state, data: record.data },
      },
      summary: `Resource read: ${record.name}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: { resource: null }, error: { code: 'RESOURCE_NOT_FOUND', message } };
  }
}
