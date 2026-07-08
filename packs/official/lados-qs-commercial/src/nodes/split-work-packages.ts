/**
 * lados.qs.split_work_packages — Phase 21 S6 (Wave 4)
 *
 * Deterministic, stateless grouping — groups classified items by a
 * configurable field (default 'trade', i.e. lados.qs.classify_trade's
 * output field) into work packages with item counts and quantity totals.
 * No persistence — this node never creates a Workspace Resource; it only
 * shapes data for the next node in the chain (e.g.
 * lados.qs.reconcile_final_account). Does not itself approve or price
 * the split.
 *
 * Config/Inputs:
 *   items          — array of classified items (each with a groupByField) — required
 *   groupByField   — default 'trade'
 *   minPackageSize — optional; packages below this item count are merged into "Other"
 *
 * Outputs:
 *   workPackages — { packages: { key, itemCount, totalQuantity, items }[] }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface ClassifiedItem {
  quantity?: number;
  [key: string]: unknown;
}

interface WorkPackage {
  key: string;
  itemCount: number;
  totalQuantity: number;
  items: ClassifiedItem[];
}

export async function splitWorkPackages(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const items = (inp['items'] as ClassifiedItem[] | undefined) ?? [];
  const groupByField = (cfg['groupByField'] as string | undefined) ?? 'trade';
  const minPackageSize = (cfg['minPackageSize'] as number | undefined) ?? 0;

  if (items.length === 0) {
    return {
      status: 'failure',
      outputs: { workPackages: null },
      error: { code: 'MISSING_INPUT', message: 'lados.qs.split_work_packages: items array is required and must not be empty' },
    };
  }

  const groups = new Map<string, ClassifiedItem[]>();
  for (const item of items) {
    const key = (item[groupByField] as string | undefined) ?? 'Uncategorized';
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  let packages: WorkPackage[] = Array.from(groups.entries()).map(([key, groupItems]) => ({
    key,
    itemCount: groupItems.length,
    totalQuantity: groupItems.reduce((sum, i) => sum + (typeof i.quantity === 'number' ? i.quantity : 0), 0),
    items: groupItems,
  }));

  if (minPackageSize > 0) {
    const small = packages.filter((p) => p.itemCount < minPackageSize);
    const kept = packages.filter((p) => p.itemCount >= minPackageSize);
    if (small.length > 0) {
      const mergedItems = small.flatMap((p) => p.items);
      kept.push({
        key: 'Other',
        itemCount: mergedItems.length,
        totalQuantity: mergedItems.reduce((sum, i) => sum + (typeof i.quantity === 'number' ? i.quantity : 0), 0),
        items: mergedItems,
      });
    }
    packages = kept;
  }

  ctx.logger.info(`lados.qs.split_work_packages → ${packages.length} package(s) from ${items.length} items (grouped by "${groupByField}")`);

  return {
    status: 'success',
    outputs: { workPackages: { packages } },
    summary: `Split ${items.length} items into ${packages.length} work package(s)`,
  };
}
