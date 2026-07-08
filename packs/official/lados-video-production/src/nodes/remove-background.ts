/**
 * lados.video.remove_background
 *
 * Validates a chroma-key request against the blueprint's Part 10 rule: pure
 * #00FF00, no gradients/shadows/texture/fog/glow/vignette, opaque UI
 * elements only. This node validates and records the request only — the
 * actual keying happens in the NLE (DaVinci Resolve's 3D Keyer or
 * equivalent), not here.
 *
 * Config/Inputs:
 *   scene           — { sceneNumber } to key
 *   sceneNumber     — required (alternative to scene.sceneNumber)
 *   backgroundColor — default '#00FF00'
 *   allowGradient   — must be false; flags gradient/semi-transparent backgrounds
 *
 * Outputs:
 *   chromaKey — { sceneNumber, backgroundColor, valid, issues }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

const PURE_GREEN = '#00FF00';

interface SceneLike { sceneNumber?: number }

export async function removeBackground(ctx: NodeContext): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const scene = inp['scene'] as SceneLike | undefined;
  const sceneNumber = (scene?.sceneNumber ?? inp['sceneNumber'] ?? cfg['sceneNumber']) as number | undefined;
  const backgroundColor = (((inp['backgroundColor'] ?? cfg['backgroundColor']) as string | undefined) ?? PURE_GREEN)
    .toUpperCase();
  const allowGradient = Boolean(inp['allowGradient'] ?? cfg['allowGradient'] ?? false);

  if (!sceneNumber) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.remove_background: sceneNumber is required' },
    };
  }

  const issues: string[] = [];
  if (backgroundColor !== PURE_GREEN) {
    issues.push(`backgroundColor must be ${PURE_GREEN} for a clean 3D Keyer pull, got ${backgroundColor}`);
  }
  if (allowGradient) {
    issues.push('Gradients/semi-transparent backgrounds create keying edge issues — set allowGradient to false');
  }

  const valid = issues.length === 0;

  if (!valid) {
    ctx.logger.warn(`lados.video.remove_background: scene ${sceneNumber} failed chroma-key validation — ${issues.join('; ')}`);
  } else {
    ctx.logger.info(`lados.video.remove_background: scene ${sceneNumber} chroma-key request validated (${backgroundColor})`);
  }

  return {
    status: valid ? 'success' : 'failure',
    outputs: { chromaKey: { sceneNumber, backgroundColor, valid, issues } },
    ...(valid ? {} : { error: { code: 'INVALID_CHROMA_KEY', message: issues.join('; ') } }),
    summary: valid
      ? `Scene ${sceneNumber} chroma-key request validated`
      : `Scene ${sceneNumber} chroma-key request has ${issues.length} issue(s)`,
  };
}
