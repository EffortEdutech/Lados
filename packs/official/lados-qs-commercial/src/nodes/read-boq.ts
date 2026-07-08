/**
 * lados.qs.read_boq — Phase 21 S6 (Wave 4)
 *
 * Reads BOQ rows either from raw tabular input (e.g. the output of
 * lados.document.read_excel / extract_table) or from an existing `boq`
 * Workspace Resource bound via config[bindingKey] (resolved at definition
 * time by execution.service.ts#resolveDefinitionBindings, same mechanism
 * as every other resource-bound node since S4). Column mapping config
 * fields (itemNo/description/unit/quantity/rate) name which raw-row key
 * holds each field, defaulting to the same-named key when omitted.
 *
 * This node only reads/structures data — it never persists anything and
 * never certifies accuracy (see lados.qs.normalize_boq for cleaning +
 * optional persistence).
 *
 * Config/Inputs:
 *   source.rows        — array of raw row objects (sourceType 'rows'/'document')
 *   sourceType          — 'rows' | 'resource', default 'rows'
 *   bindingKey          — config field holding the bound boq resourceId (sourceType 'resource')
 *   itemNo/description/unit/quantity/rate — column-name mapping, default same-named key
 *
 * Outputs:
 *   boq — { items: BoqRow[], source: 'rows'|'resource', boqId?: string }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IReadResourceService } from '../types';

interface BoqRow {
  itemNo?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
}

export async function readBoq(
  ctx: NodeContext,
  readService?: IReadResourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;
  const sourceInput = (inp['source'] as Record<string, unknown> | undefined) ?? {};

  const sourceType = (cfg['sourceType'] as string | undefined) ?? 'rows';
  const bindingKey = cfg['bindingKey'] as string | undefined;

  const colMap = {
    itemNo: (cfg['itemNo'] as string | undefined) ?? 'itemNo',
    description: (cfg['description'] as string | undefined) ?? 'description',
    unit: (cfg['unit'] as string | undefined) ?? 'unit',
    quantity: (cfg['quantity'] as string | undefined) ?? 'quantity',
    rate: (cfg['rate'] as string | undefined) ?? 'rate',
  };

  if (sourceType === 'resource') {
    if (!bindingKey) {
      return {
        status: 'failure',
        outputs: { boq: null },
        error: { code: 'MISSING_INPUT', message: 'lados.qs.read_boq: bindingKey is required when sourceType is "resource"' },
      };
    }
    if (!readService) {
      return {
        status: 'failure',
        outputs: { boq: null },
        error: { code: 'NO_SERVICE', message: 'Resource read service not injected' },
      };
    }
    const resourceId = cfg[bindingKey] as string | undefined;
    if (!resourceId) {
      return {
        status: 'failure',
        outputs: { boq: null },
        error: { code: 'MISSING_INPUT', message: `lados.qs.read_boq: config["${bindingKey}"] (bound boq resourceId) is required` },
      };
    }
    if (!ctx.organizationId) {
      return {
        status: 'failure',
        outputs: { boq: null },
        error: { code: 'MISSING_CONTEXT', message: 'lados.qs.read_boq: organizationId missing from execution context' },
      };
    }

    const record = await readService.getResource(resourceId, ctx.organizationId);
    const items = (record.data['items'] as BoqRow[] | undefined) ?? [];

    ctx.logger.info(`lados.qs.read_boq → read ${items.length} items from resource ${resourceId}`);

    return {
      status: 'success',
      outputs: { boq: { items, source: 'resource', boqId: record.id } },
      summary: `Read ${items.length} BOQ items from resource ${resourceId}`,
    };
  }

  const rawRows = (sourceInput['rows'] as Record<string, unknown>[] | undefined) ?? [];
  const items: BoqRow[] = rawRows.map((row) => ({
    itemNo: row[colMap.itemNo] as string | undefined,
    description: row[colMap.description] as string | undefined,
    unit: row[colMap.unit] as string | undefined,
    quantity: typeof row[colMap.quantity] === 'number' ? (row[colMap.quantity] as number) : Number(row[colMap.quantity]) || undefined,
    rate: typeof row[colMap.rate] === 'number' ? (row[colMap.rate] as number) : Number(row[colMap.rate]) || undefined,
  }));

  ctx.logger.info(`lados.qs.read_boq → parsed ${items.length} rows`);

  return {
    status: 'success',
    outputs: { boq: { items, source: 'rows' } },
    summary: `Read ${items.length} BOQ rows`,
  };
}
