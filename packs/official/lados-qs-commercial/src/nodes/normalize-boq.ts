/**
 * lados.qs.normalize_boq — Phase 21 S6 (Wave 4)
 *
 * Cleans and validates BOQ rows: trims descriptions, dedupes item numbers
 * (config.dedupeItemNo), coerces quantity/rate to numbers, and flags rows
 * missing required fields (config.requireRate / requireQuantity) rather
 * than silently dropping them. Optionally persists a `boq` Workspace
 * Resource (config.persist) so downstream nodes can reference it by id —
 * `boq` is already a permitted resource type (migration
 * 0041_construction_resources.sql), so no new migration is needed for
 * this pack.
 *
 * Never certifies accuracy — human review remains required before any
 * commercial use of the normalized data.
 *
 * Config/Inputs:
 *   items              — array of BOQ rows. Accepts either a bare array, or
 *                        an object with an `.items` array (the shape
 *                        lados.qs.read_boq's "boq" output actually is:
 *                        { items, source, boqId? }) — see resolveItemsInput
 *                        below. The runner's port-aware input resolution
 *                        (Phase 21 S9 chaining fix) only renames keys; it
 *                        does not unwrap nested shapes, so this node has
 *                        to accept both forms itself.
 *   dedupeItemNo        — default true
 *   requireRate         — default false
 *   requireQuantity     — default false
 *   persist             — default false
 *   boqName             — resource name when persist is true
 *
 * Outputs:
 *   normalized — { boqId?: string, items: NormalizedRow[], issues: string[] }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ICreateResourceService } from '../types';

interface BoqRow {
  itemNo?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
}

interface NormalizedRow extends BoqRow {
  quantity: number;
  rate: number;
}

/**
 * Accepts either a bare array of rows, or an object wrapping them under an
 * `.items` key (e.g. lados.qs.read_boq's real "boq" output shape:
 * `{ items, source, boqId? }`). Returns [] for anything else rather than
 * throwing — an empty result is still honestly "nothing to normalize",
 * not a fabricated one.
 */
function resolveItemsInput(value: unknown): BoqRow[] {
  if (Array.isArray(value)) return value as BoqRow[];
  const wrapped = (value as { items?: unknown } | undefined)?.items;
  return Array.isArray(wrapped) ? (wrapped as BoqRow[]) : [];
}

export async function normalizeBoq(
  ctx: NodeContext,
  createService?: ICreateResourceService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const rawItems = resolveItemsInput(inp['items']);
  const dedupeItemNo = (cfg['dedupeItemNo'] as boolean | undefined) ?? true;
  const requireRate = (cfg['requireRate'] as boolean | undefined) ?? false;
  const requireQuantity = (cfg['requireQuantity'] as boolean | undefined) ?? false;
  const persist = (cfg['persist'] as boolean | undefined) ?? false;
  const boqName = (cfg['boqName'] as string | undefined) ?? 'Normalized BOQ';

  const issues: string[] = [];
  const seenItemNo = new Set<string>();
  const normalized: NormalizedRow[] = [];

  for (const row of rawItems) {
    const itemNo = row.itemNo?.trim();
    if (dedupeItemNo && itemNo) {
      if (seenItemNo.has(itemNo)) {
        issues.push(`DUPLICATE_ITEM_NO:${itemNo}`);
        continue;
      }
      seenItemNo.add(itemNo);
    }

    const quantity = typeof row.quantity === 'number' && !Number.isNaN(row.quantity) ? row.quantity : 0;
    const rate = typeof row.rate === 'number' && !Number.isNaN(row.rate) ? row.rate : 0;

    if (requireQuantity && (!row.quantity || Number.isNaN(row.quantity))) {
      issues.push(`MISSING_QUANTITY:${itemNo ?? '(no item no)'}`);
    }
    if (requireRate && (!row.rate || Number.isNaN(row.rate))) {
      issues.push(`MISSING_RATE:${itemNo ?? '(no item no)'}`);
    }
    if (!row.description?.trim()) {
      issues.push(`MISSING_DESCRIPTION:${itemNo ?? '(no item no)'}`);
    }

    normalized.push({
      itemNo,
      description: row.description?.trim(),
      unit: row.unit?.trim(),
      quantity,
      rate,
    });
  }

  ctx.logger.info(`lados.qs.normalize_boq → ${normalized.length} rows normalized, ${issues.length} issue(s) flagged`);

  let boqId: string | undefined;
  if (persist) {
    if (!createService) {
      return {
        status: 'failure',
        outputs: { normalized: null },
        error: { code: 'NO_SERVICE', message: 'Resource create service not injected (required when persist:true)' },
      };
    }
    if (!ctx.organizationId) {
      return {
        status: 'failure',
        outputs: { normalized: null },
        error: { code: 'MISSING_CONTEXT', message: 'lados.qs.normalize_boq: organizationId missing from execution context' },
      };
    }
    const actorId = ctx.userId ?? 'system';
    const record = await createService.createResource({
      orgId: ctx.organizationId,
      projectId: ctx.projectId,
      type: 'boq',
      name: boqName,
      data: { items: normalized, issues },
      createdBy: actorId,
      initialState: 'normalized',
    });
    boqId = record.id;
  }

  return {
    status: 'success',
    outputs: { normalized: { boqId, items: normalized, issues } },
    summary: `Normalized ${normalized.length} BOQ rows (${issues.length} issue(s))`,
  };
}
