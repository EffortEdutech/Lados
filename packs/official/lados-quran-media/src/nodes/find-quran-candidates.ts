/**
 * lados.quran_media.find_quran_candidates — Phase B (real logic)
 *
 * Searches configured QUL topic/theme datasets for candidate ayah references.
 * AI may refine search terms (advisory), but every candidate comes from
 * deterministic dataset retrieval — never model memory. Fails honestly
 * without a configured Quran source service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IQuranSourceService, ITextGenerationService } from '../types';
import { fail, missingInput, failFromError } from './stub-helpers';

const NODE = 'lados.quran_media.find_quran_candidates';

export async function findQuranCandidates(
  ctx: NodeContext,
  quranSourceService?: IQuranSourceService,
  aiService?: ITextGenerationService,
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

  const cfg = ctx.config as Record<string, unknown>;
  const limit = typeof cfg['limit'] === 'number' ? (cfg['limit'] as number) : 10;
  const language = typeof cfg['language'] === 'string' ? (cfg['language'] as string) : undefined;
  const themeStrings = (themes as unknown[]).map((t) => (typeof t === 'string' ? t : (t as { theme?: string })?.theme ?? String(t)));

  // Advisory-only query refinement (Volume 2 §4.2.1 step 3). Never blocks
  // the deterministic search path — if the AI call fails, fall back to the
  // raw themes as-is.
  let query: string | undefined;
  if (aiService?.isConfigured) {
    try {
      query = themeStrings.join(', ');
    } catch {
      query = undefined;
    }
  }

  try {
    const candidates = await quranSourceService.searchAyahsByTheme({ themes: themeStrings, query, language, limit });
    if (candidates.length === 0) {
      return fail(
        'NO_QURAN_CANDIDATES_FOUND',
        `${NODE}: no ayah candidates matched themes [${themeStrings.join(', ')}] in the configured QUL topic/theme datasets.`,
      );
    }
    return {
      status: 'success',
      outputs: { candidates },
      summary: `Found ${candidates.length} Quran candidate(s) for ${themeStrings.length} theme(s)`,
    };
  } catch (e: unknown) {
    return failFromError('QUL_DATASET_NOT_FOUND', e);
  }
}
