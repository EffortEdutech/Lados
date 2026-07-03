/**
 * lados.resource.resolve_binding — Phase 21 S4 (Wave 2)
 *
 * Resource Bindings are resolved at the definition level, before a run
 * starts (apps/api/src/execution/execution.service.ts —
 * resolveDefinitionBindings): the bound resourceId is merged directly into
 * this node's `config` under the key named by `bindingKey`. This node's
 * job is simply to fetch the full resource for that already-resolved id
 * and (optionally) validate its type before handing it to downstream
 * nodes. It resolves references only — it does not change data.
 *
 * Config:
 *   bindingKey           — required; names the config field the canvas
 *                          binding writes the resolved resourceId into
 *   requiredResourceType — optional; fails with TYPE_MISMATCH if the bound
 *                          resource's type doesn't match
 *
 * Outputs:
 *   resource — { resourceId, type, name, state, data }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IReadResourceService } from '../types';

export async function resolveBinding(
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

  const cfg = ctx.config as Record<string, unknown>;
  const bindingKey = cfg['bindingKey'] as string | undefined;
  const requiredResourceType = cfg['requiredResourceType'] as string | undefined;

  if (!bindingKey) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_INPUT', message: 'lados.resource.resolve_binding: bindingKey is required' },
    };
  }

  const resourceId = cfg[bindingKey] as string | undefined;

  if (!resourceId) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: {
        code: 'UNRESOLVED_BINDING',
        message: `lados.resource.resolve_binding: no resource is bound to key "${bindingKey}" yet — bind a resource on the canvas`,
      },
    };
  }
  if (!ctx.organizationId) {
    return {
      status: 'failure',
      outputs: { resource: null },
      error: { code: 'MISSING_CONTEXT', message: 'lados.resource.resolve_binding: organizationId missing from execution context' },
    };
  }

  try {
    const record = await resourceService.getResource(resourceId, ctx.organizationId);

    if (requiredResourceType && record.type !== requiredResourceType) {
      return {
        status: 'failure',
        outputs: { resource: null },
        error: {
          code: 'TYPE_MISMATCH',
          message: `lados.resource.resolve_binding: bound resource is type "${record.type}", expected "${requiredResourceType}"`,
        },
      };
    }

    return {
      status: 'success',
      outputs: {
        resource: { resourceId: record.id, type: record.type, name: record.name, state: record.state, data: record.data },
      },
      summary: `Resolved binding "${bindingKey}" → ${record.name}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: { resource: null }, error: { code: 'RESOURCE_NOT_FOUND', message } };
  }
}
