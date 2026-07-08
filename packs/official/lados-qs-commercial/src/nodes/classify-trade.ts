/**
 * lados.qs.classify_trade — Phase 21 S6 (Wave 4)
 *
 * Deterministic, keyword-based advisory classifier — NOT an AI/LLM call.
 * Matches each item's description against a small built-in keyword→trade
 * map (an honest, limited heuristic, same "no fabricated capability"
 * discipline as S5's compare_quotations lowest-price scorer). Items with
 * no keyword match default to "Uncategorized" with confidence 0 and are
 * always flagged for review. `knowledgePackRefs` (config) is a Knowledge
 * Pack reference pass-through only (e.g. a trade taxonomy pack) — the
 * framework logs any item UUIDs referenced in config automatically.
 *
 * Config/Inputs:
 *   items                — array of BOQ rows (with .description) — required.
 *                          Accepts either a bare array, or an object with an
 *                          `.items` array (e.g. lados.qs.normalize_boq's real
 *                          "normalized" output shape: { boqId?, items, issues }).
 *                          See resolveItemsInput below.
 *   tradeSystem           — label only, e.g. "CSI"/"Uniclass" (not enforced)
 *   confidenceThreshold   — default 0.6
 *   reviewLowConfidence   — default true
 *   knowledgePackRefs     — optional KP ref pass-through
 *
 * Outputs:
 *   classified — array of { ...item, trade, confidence, requiresReview }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface BoqItem {
  itemNo?: string;
  description?: string;
  [key: string]: unknown;
}

const TRADE_KEYWORDS: Array<{ trade: string; keywords: string[] }> = [
  { trade: 'Concrete Works', keywords: ['concrete', 'cement', 'formwork', 'screed'] },
  { trade: 'Reinforcement', keywords: ['rebar', 'reinforcement', 'steel bar', 'mesh'] },
  { trade: 'Masonry', keywords: ['brick', 'block', 'masonry', 'plaster'] },
  { trade: 'Structural Steel', keywords: ['structural steel', 'steel frame', 'i-beam', 'girder'] },
  { trade: 'Roofing', keywords: ['roof', 'roofing', 'gutter', 'flashing'] },
  { trade: 'Electrical', keywords: ['electrical', 'wiring', 'cable', 'conduit', 'switchboard'] },
  { trade: 'Plumbing', keywords: ['plumbing', 'pipe', 'sanitary', 'drainage', 'valve'] },
  { trade: 'Painting', keywords: ['paint', 'coating', 'primer'] },
  { trade: 'Flooring', keywords: ['floor', 'tile', 'tiling', 'carpet'] },
  { trade: 'Earthworks', keywords: ['excavation', 'earthwork', 'backfill', 'grading'] },
];

/**
 * Accepts either a bare array of items, or an object wrapping them under an
 * `.items` key (e.g. lados.qs.normalize_boq's real "normalized" output
 * shape). Returns [] for anything else rather than throwing.
 */
function resolveItemsInput(value: unknown): BoqItem[] {
  if (Array.isArray(value)) return value as BoqItem[];
  const wrapped = (value as { items?: unknown } | undefined)?.items;
  return Array.isArray(wrapped) ? (wrapped as BoqItem[]) : [];
}

function classifyOne(description: string | undefined): { trade: string; confidence: number } {
  if (!description) return { trade: 'Uncategorized', confidence: 0 };
  const text = description.toLowerCase();
  for (const { trade, keywords } of TRADE_KEYWORDS) {
    const matched = keywords.filter((kw) => text.includes(kw));
    if (matched.length > 0) {
      // Confidence: proportion of keyword hits, floored so a single hit still scores reasonably.
      const confidence = Math.min(1, 0.6 + 0.2 * (matched.length - 1));
      return { trade, confidence };
    }
  }
  return { trade: 'Uncategorized', confidence: 0 };
}

export async function classifyTrade(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const items = resolveItemsInput(inp['items']);
  const confidenceThreshold = (cfg['confidenceThreshold'] as number | undefined) ?? 0.6;
  const reviewLowConfidence = (cfg['reviewLowConfidence'] as boolean | undefined) ?? true;
  const knowledgePackRefs = cfg['knowledgePackRefs'] as unknown[] | undefined;

  if (items.length === 0) {
    return {
      status: 'failure',
      outputs: { classified: null },
      error: { code: 'MISSING_INPUT', message: 'lados.qs.classify_trade: items array is required and must not be empty' },
    };
  }

  const classified = items.map((item) => {
    const { trade, confidence } = classifyOne(item.description);
    const requiresReview = reviewLowConfidence && confidence < confidenceThreshold;
    return { ...item, trade, confidence, requiresReview };
  });

  const flaggedCount = classified.filter((c) => c.requiresReview).length;

  ctx.logger.info(`lados.qs.classify_trade → classified ${classified.length} items, ${flaggedCount} flagged for review (deterministic keyword match, not AI)`);

  return {
    status: 'success',
    outputs: { classified },
    summary: `Classified ${classified.length} items (${flaggedCount} below confidence threshold — advisory only)`,
    logs: knowledgePackRefs ? [`knowledgePackRefs referenced: ${JSON.stringify(knowledgePackRefs)}`] : undefined,
  };
}
