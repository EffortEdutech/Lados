/**
 * lados.video.revise_scene_layout
 *
 * Computes the next version label for a scene revision — Scene X V2, V3,
 * ... — per the Scene Revision & Versioning rule: never overwrite, always
 * version; the scene number stays fixed and only the version increases.
 * Also validates the requested layout zone (Part 9 of the blueprint:
 * reposition a scene into one side of frame for a webcam overlay).
 *
 * This node computes the label and validates the zone only; the actual
 * recomposition of the motion graphics happens in the connected Claude +
 * Remotion session using the blueprint's layout-revision prompt.
 *
 * Config/Inputs:
 *   scene          — { sceneNumber, sceneTitle, currentVersion? }
 *   sceneNumber    — required (alternative to scene.sceneNumber)
 *   sceneTitle     — required, carried through unchanged across versions
 *   currentVersion — the scene's current version (1 = original, no "V1" suffix); default 1
 *   targetZone     — 'left35' | 'right35' | 'top50' | 'bottom50'
 *
 * Outputs:
 *   revision — { sceneNumber, sceneTitle, version, label, targetZone }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

const VALID_ZONES = ['left35', 'right35', 'top50', 'bottom50'] as const;
type Zone = (typeof VALID_ZONES)[number];

interface SceneLike {
  sceneNumber?: number;
  sceneTitle?: string;
  currentVersion?: number;
}

export async function reviseSceneLayout(ctx: NodeContext): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const scene = inp['scene'] as SceneLike | undefined;
  const sceneNumber = (scene?.sceneNumber ?? inp['sceneNumber'] ?? cfg['sceneNumber']) as number | undefined;
  const sceneTitle = (scene?.sceneTitle ?? inp['sceneTitle'] ?? cfg['sceneTitle']) as string | undefined;
  const currentVersionRaw = (scene?.currentVersion ?? inp['currentVersion'] ?? cfg['currentVersion']) as
    | number
    | undefined;
  const currentVersion =
    Number.isFinite(currentVersionRaw) && Number(currentVersionRaw) >= 1 ? Number(currentVersionRaw) : 1;
  const targetZone = (inp['targetZone'] ?? cfg['targetZone']) as string | undefined;

  if (!sceneNumber || !sceneTitle) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.revise_scene_layout: sceneNumber and sceneTitle are required' },
    };
  }

  if (targetZone && !VALID_ZONES.includes(targetZone as Zone)) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'INVALID_ZONE',
        message: `lados.video.revise_scene_layout: targetZone must be one of ${VALID_ZONES.join(', ')}`,
      },
    };
  }

  const nextVersion = currentVersion + 1;
  const label = `Scene ${sceneNumber} V${nextVersion} - ${sceneTitle}`;

  ctx.logger.info(`lados.video.revise_scene_layout: ${label}${targetZone ? ` (zone: ${targetZone})` : ''}`);

  return {
    status: 'success',
    outputs: {
      revision: { sceneNumber, sceneTitle, version: nextVersion, label, targetZone: targetZone ?? null },
    },
    summary: `${label} — original scene left untouched`,
  };
}
