/**
 * lados.video.draft_scenes
 *
 * Segments a script into a numbered scene plan. Per the Scene Composition
 * rule, this is a structural split only (roughly one scene per paragraph,
 * or evenly by word count when splitStrategy is 'even') — it deliberately
 * does NOT decide what each scene should visually show. That creative
 * judgement belongs to generate_scene_batch's creative-direction lock and,
 * ultimately, to the human + Claude session per the Creative Unlock Rule.
 *
 * Config/Inputs:
 *   script         — { text } from read_script
 *   splitStrategy  — 'paragraph' (default) | 'even'
 *   scenesPerBatch — used only to size 'even' splits (default: 5)
 *
 * Outputs:
 *   scenes — array of { sceneNumber, title, sourceExcerpt }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

function titleFromExcerpt(excerpt: string): string {
  const words = excerpt.trim().split(/\s+/).slice(0, 6).join(' ');
  return words || 'Untitled Scene';
}

export async function draftScenes(ctx: NodeContext): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const script = inp['script'] as { text?: string } | undefined;
  const text = script?.text;
  const splitStrategy = ((inp['splitStrategy'] ?? cfg['splitStrategy']) as string | undefined) ?? 'paragraph';
  const scenesPerBatchRaw = (inp['scenesPerBatch'] ?? cfg['scenesPerBatch']) as number | undefined;
  const scenesPerBatch =
    Number.isFinite(scenesPerBatchRaw) && Number(scenesPerBatchRaw) > 0 ? Number(scenesPerBatchRaw) : 5;

  if (!text) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.draft_scenes: script.text is required (connect read_script)' },
    };
  }

  let chunks: string[];
  if (splitStrategy === 'even') {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const perScene = Math.max(1, Math.ceil(words.length / scenesPerBatch));
    chunks = [];
    for (let i = 0; i < words.length; i += perScene) {
      chunks.push(words.slice(i, i + perScene).join(' '));
    }
  } else {
    chunks = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }

  if (chunks.length === 0) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'EMPTY_SCRIPT', message: 'lados.video.draft_scenes: script produced zero scenes' },
    };
  }

  const scenes = chunks.map((excerpt, i) => ({
    sceneNumber: i + 1,
    title: titleFromExcerpt(excerpt),
    sourceExcerpt: excerpt,
  }));

  ctx.logger.info(`lados.video.draft_scenes: drafted ${scenes.length} scenes (strategy: ${splitStrategy})`);

  return {
    status: 'success',
    outputs: { scenes },
    summary: `Drafted ${scenes.length} scenes`,
  };
}
