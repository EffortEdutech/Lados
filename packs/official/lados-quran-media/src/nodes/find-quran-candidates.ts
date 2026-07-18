/**
 * lados.quran_media.find_quran_candidates — STUB (real logic: Phase B)
 *
 * Searches configured QUL topic/theme datasets for candidate ayah references.
 * AI may refine search terms (advisory), but every candidate must come from
 * deterministic dataset retrieval — never model memory. Fails honestly
 * without a configured Quran source service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IQuranSourceService, ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.find_quran_candidates';

export async function findQuranCandidates(
  ctx: NodeContext,
  quranSourceService?: IQuranSourceService,
  _aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const themes = inp['themes'];
  if (!Array.isArray(themes) || themes.length === 0) {
    return missingInput(NODE, 'themes', 'connect map_islamic_themes');
  }
  if (!quranSourceService) {
    return fail(
      'RELIGIOUS_DATA_PATH_NOT_CONFIGURED',
      `${NODE}: no Quran source service is wired — the QUL dataset adapters (apps/api/src/religious-source/) are Phase B. Quran candidates are never generated from model memory.`,
    );
  }
  return notImplemented(NODE, 'Phase B (deterministic evidence nodes)');
}
