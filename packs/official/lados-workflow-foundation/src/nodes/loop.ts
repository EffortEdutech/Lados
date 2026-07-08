/**
 * lados.workflow.loop — Phase 21 S9.1 (gap closure)
 *
 * Official successor to the prototype `core.loop`. Iterates over an array
 * of items — read from upstream node outputs, the `items` input, or
 * `config.items` (in that priority order) — optionally extracting a
 * sub-key from each item, and produces a results array plus aggregate
 * metadata (count/first/last).
 *
 * This node does not itself branch execution per-item (the runner has no
 * per-item sub-graph re-entry primitive yet); it collects/transforms the
 * array in one step, matching the prototype's exact behavior so existing
 * workflow authoring patterns (map + downstream aggregate) keep working.
 *
 * Config:
 *   items_key   — key to read the array from in upstream output / inputs (default: 'items')
 *   extract_key — optional: if set, map each item to item[extract_key]
 *   label       — optional human label shown in logs
 *
 * Inputs:
 *   items — the array to iterate (falls back to upstream/config lookup by items_key)
 *
 * Outputs:
 *   results — processed array (mapped by extract_key if configured, else items as-is)
 *   count   — number of items processed
 *   first   — first result, or null
 *   last    — last result, or null
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export async function loop(ctx: NodeContext): Promise<NodeExecuteResult> {
  const itemsKey = (ctx.config['items_key'] as string | undefined) ?? 'items';
  const extractKey = ctx.config['extract_key'] as string | undefined;
  const label = (ctx.config['label'] as string | undefined) ?? 'loop';

  // Resolve items array: upstream outputs first, then direct `items` input,
  // then named-key input, then config.items — matching core.loop's lookup
  // order so existing workflow definitions behave identically.
  let rawItems: unknown = ctx.upstream
    ? Object.values(ctx.upstream).reduceRight(
        (found, upstreamOutput) =>
          found !== undefined ? found : (upstreamOutput as Record<string, unknown>)[itemsKey],
        undefined as unknown,
      )
    : undefined;

  if (rawItems === undefined) rawItems = ctx.inputs?.['items'];
  if (rawItems === undefined) rawItems = ctx.inputs?.[itemsKey];
  if (rawItems === undefined) rawItems = ctx.config['items'];

  if (!Array.isArray(rawItems)) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'LOOP_NO_ARRAY',
        message:
          `lados.workflow.loop: expected array at key "${itemsKey}" but found ${typeof rawItems}. ` +
          `Pass items via the "items" port, upstream output, or config.items.`,
      },
    };
  }

  const items = rawItems as unknown[];

  const results: unknown[] = items.map((item) => {
    if (extractKey && typeof item === 'object' && item !== null) {
      return (item as Record<string, unknown>)[extractKey];
    }
    return item;
  });

  ctx.logger.info(
    `lados.workflow.loop: "${label}" — processed ${results.length} item(s)` +
      (extractKey ? ` (extracted key "${extractKey}")` : ''),
  );

  return {
    status: 'success',
    outputs: {
      results,
      count: results.length,
      first: results[0] ?? null,
      last: results[results.length - 1] ?? null,
    },
    summary: `Loop "${label}": ${results.length} item(s) processed`,
  };
}
