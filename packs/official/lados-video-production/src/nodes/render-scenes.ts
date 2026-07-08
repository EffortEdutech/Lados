/**
 * lados.video.render_scenes — STUB
 *
 * Requests a render pass for a batch of scenes. No render backend is wired
 * into the API yet — there is no NestJS service anywhere in this repo that
 * shells out to Remotion's CLI (`npx remotion render`), and adding one means
 * spawning arbitrary child processes from the API server, which deserves its
 * own dedicated, security-reviewed pass rather than being bundled in here.
 *
 * Wired correctly end-to-end to an IRenderService so a future pass can
 * implement it without touching this node's contract — mirrors
 * lados.communication.send_sms's honest-stub pattern exactly.
 *
 * Config/Inputs:
 *   scenes     — array of scene numbers or scene objects to render
 *   resolution — '1080p' (default) | '4k'
 *   outDir     — target output folder, default 'out'
 *
 * Outputs:
 *   render — { rendered, outDir, files, resolution }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IRenderService } from '../types';

interface SceneLike { sceneNumber: number }

export async function renderScenes(
  ctx: NodeContext,
  renderService?: IRenderService,
): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const scenesInput = (inp['scenes'] as (SceneLike | number)[] | undefined) ?? [];
  const sceneIds = scenesInput.map((s) => (typeof s === 'number' ? String(s) : String(s.sceneNumber)));
  const resolution = ((inp['resolution'] ?? cfg['resolution']) as string | undefined) ?? '1080p';
  const outDir = ((inp['outDir'] ?? cfg['outDir']) as string | undefined) ?? 'out';

  if (sceneIds.length === 0) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'MISSING_INPUT',
        message: 'lados.video.render_scenes: scenes is required (connect draft_scenes or generate_scene_batch)',
      },
    };
  }

  if (!renderService) {
    ctx.logger.warn(
      'lados.video.render_scenes: no render backend configured — this node cannot invoke Remotion. Run the render prompt in your Claude + Remotion session instead.',
    );
    return {
      status: 'failure',
      outputs: { render: { rendered: false, outDir: null, files: [], resolution } },
      error: {
        code: 'RENDER_BACKEND_NOT_CONFIGURED',
        message:
          'No render backend is wired into the API yet. Use the blueprint\'s "Create the out folder with all the scenes" prompt in your Claude + Remotion session.',
      },
    };
  }

  const result = await renderService.render({
    sceneIds,
    resolution: resolution === '4k' ? '4k' : '1080p',
    outDir,
  });

  return {
    status: result.rendered ? 'success' : 'failure',
    outputs: { render: { rendered: result.rendered, outDir: result.outDir, files: result.files, resolution } },
    ...(result.rendered ? {} : { error: { code: 'RENDER_FAILED', message: result.error ?? 'Render failed' } }),
    summary: result.rendered
      ? `Rendered ${result.files.length} scene(s) to ${result.outDir}`
      : `Render failed: ${result.error}`,
  };
}
