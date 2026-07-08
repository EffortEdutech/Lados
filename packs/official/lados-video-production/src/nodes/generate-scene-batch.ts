/**
 * lados.video.generate_scene_batch
 *
 * Locks a creative direction for the next batch of scenes and flags (never
 * blocks) when the same direction repeats instead of rotating, per the
 * blueprint's "switch the direction every 5 scenes" rule and the Creative
 * Unlock Rule's instruction to actively vary the visual approach.
 *
 * This node does not itself generate motion graphics — Claude + Remotion do
 * that in the connected session. It only records which batch is being built
 * and under what creative direction, so the rotation rule is auditable.
 *
 * Config/Inputs:
 *   scenes            — array from draft_scenes
 *   batchIndex        — 1-based batch number (default 1)
 *   creativeDirection — required, human-authored direction text (e.g. "Think clean glass UI panels...")
 *   previousDirection — optional, the direction used in the prior batch (for rotation check)
 *   batchSize         — default 5
 *
 * Outputs:
 *   batch — { batchIndex, sceneNumbers, creativeDirection, rotated }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface SceneLike { sceneNumber: number }

export async function generateSceneBatch(ctx: NodeContext): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const scenes = (inp['scenes'] as SceneLike[] | undefined) ?? [];
  const batchIndexRaw = (inp['batchIndex'] ?? cfg['batchIndex']) as number | undefined;
  const batchIndex = Number.isFinite(batchIndexRaw) && Number(batchIndexRaw) > 0 ? Number(batchIndexRaw) : 1;
  const batchSizeRaw = (inp['batchSize'] ?? cfg['batchSize']) as number | undefined;
  const batchSize = Number.isFinite(batchSizeRaw) && Number(batchSizeRaw) > 0 ? Number(batchSizeRaw) : 5;
  const creativeDirection = (inp['creativeDirection'] ?? cfg['creativeDirection']) as string | undefined;
  const previousDirection = (inp['previousDirection'] ?? cfg['previousDirection']) as string | undefined;

  if (!creativeDirection || !creativeDirection.trim()) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'MISSING_INPUT',
        message:
          'lados.video.generate_scene_batch: creativeDirection is required — state a "Creative direction locked: ..." line before building scenes',
      },
    };
  }

  const start = (batchIndex - 1) * batchSize;
  const sceneNumbers = scenes.slice(start, start + batchSize).map((s) => s.sceneNumber);

  if (sceneNumbers.length === 0) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'NO_SCENES_IN_BATCH',
        message: `lados.video.generate_scene_batch: batch ${batchIndex} has no scenes (only ${scenes.length} scenes drafted)`,
      },
    };
  }

  const repeated =
    Boolean(previousDirection) && previousDirection!.trim().toLowerCase() === creativeDirection.trim().toLowerCase();

  if (repeated) {
    ctx.logger.warn(
      `lados.video.generate_scene_batch: batch ${batchIndex} reuses the previous creative direction verbatim — the blueprint recommends rotating every batch`,
    );
  } else {
    ctx.logger.info(`lados.video.generate_scene_batch: batch ${batchIndex} locked to a new creative direction`);
  }

  return {
    status: 'success',
    outputs: {
      batch: {
        batchIndex,
        sceneNumbers,
        creativeDirection: creativeDirection.trim(),
        rotated: !repeated,
      },
    },
    summary: repeated
      ? `Batch ${batchIndex}: creative direction repeated (not rotated)`
      : `Batch ${batchIndex}: creative direction locked (${sceneNumbers.length} scenes)`,
  };
}
