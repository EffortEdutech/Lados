/**
 * @lados/official-video-production
 *
 * New official Capability Pack (L2) — orchestrates and validates the
 * Claude + Remotion motion-graphics production workflow described in the
 * Chronixel "Claude + Remotion Blueprint" (project docs under the
 * "CLAUDE REMOTION BLUEPRINT" folder). Registry metadata lives in
 * ../manifest.json + ../nodes.json (read by OfficialPackLoaderService);
 * this package supplies runtime behavior only.
 *
 * Honesty note: render_scenes is a STUB — no NestJS service in this repo
 * shells out to the Remotion CLI yet. Its nodes.json entry is marked
 * `executorStatus: "stub"` and the pack's overall `runtimeStatus` is
 * `stub_executors`, not `runtime_enabled`. Every other node is a real,
 * deterministic implementation (text segmentation, versioning math, chroma
 * validation, image-slot mapping) — none of them call an LLM; the actual
 * creative generation happens in the connected Claude + Remotion session,
 * per the blueprint's own design (this pack orchestrates the plan, it does
 * not replace the session).
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { readScript } from './nodes/read-script';
import { scaffoldProject } from './nodes/scaffold-project';
import { draftScenes } from './nodes/draft-scenes';
import { generateSceneBatch } from './nodes/generate-scene-batch';
import { renderScenes } from './nodes/render-scenes';
import { reviseSceneLayout } from './nodes/revise-scene-layout';
import { removeBackground } from './nodes/remove-background';
import { insertImages } from './nodes/insert-images';

export {
  readScript,
  scaffoldProject,
  draftScenes,
  generateSceneBatch,
  renderScenes,
  reviseSceneLayout,
  removeBackground,
  insertImages,
};
export type { IFileService, IRenderService, RenderRequest, RenderResult, SceneRef } from './types';

export const PACK_ID = 'lados.video-production' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface VideoProductionServices {
  fileService?: import('./types').IFileService;
  renderService?: import('./types').IRenderService;
}

/**
 * Returns the real executor for a lados.video-production node type, or null
 * if unknown. Call once in buildRealNodeResolver, injecting NestJS services.
 * fileService reuses the platform's existing upload infrastructure;
 * renderService has no real implementation anywhere yet (see render-scenes.ts).
 */
export function resolveNode(
  services: VideoProductionServices = {},
): (nodeType: string) => NodeExecutor | null {
  const { fileService, renderService } = services;

  const nodes: Record<string, NodeExecutor> = {
    'lados.video.read_script': (ctx) => readScript(ctx, fileService),
    'lados.video.scaffold_project': (ctx) => scaffoldProject(ctx),
    'lados.video.draft_scenes': (ctx) => draftScenes(ctx),
    'lados.video.generate_scene_batch': (ctx) => generateSceneBatch(ctx),
    'lados.video.render_scenes': (ctx) => renderScenes(ctx, renderService),
    'lados.video.revise_scene_layout': (ctx) => reviseSceneLayout(ctx),
    'lados.video.remove_background': (ctx) => removeBackground(ctx),
    'lados.video.insert_images': (ctx) => insertImages(ctx, fileService),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
