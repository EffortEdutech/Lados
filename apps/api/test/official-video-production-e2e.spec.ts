/**
 * @lados/official-video-production — end-to-end proxy chain.
 *
 * There is no named gate template for this pack yet (it's a brand-new
 * Content Production line of business, not part of the Phase 21
 * QS/construction/procurement Wave program) — so, following the same
 * proxy-E2E approach every wave used before its own templates existed
 * (see official-wave2-e2e.spec.ts etc.), this test hand-chains all 8 nodes
 * in-process to prove they compose correctly end to end:
 *
 *   scaffold_project -> read_script -> draft_scenes -> generate_scene_batch
 *     -> render_scenes (honest stub failure, no backend configured)
 *     -> revise_scene_layout -> remove_background -> insert_images
 */
import { createMockNodeContext } from '@lados/testing';
import { resolveNode, type IFileService } from '@lados/official-video-production';

describe('Video Production official E2E — script-to-scene-plan proxy chain', () => {
  it('resolves all 8 nodes via one resolver', () => {
    const resolve = resolveNode({ fileService: undefined, renderService: undefined });
    for (const type of [
      'lados.video.scaffold_project',
      'lados.video.read_script',
      'lados.video.draft_scenes',
      'lados.video.generate_scene_batch',
      'lados.video.render_scenes',
      'lados.video.revise_scene_layout',
      'lados.video.remove_background',
      'lados.video.insert_images',
    ]) {
      expect(resolve(type)).not.toBeNull();
    }
  });

  it('runs the full chain in-process, honestly stubbing the render step', async () => {
    const fileService: IFileService = {
      getUpload: jest.fn().mockResolvedValue({ storage_path: 'uploads/img-1' }),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('')),
    };

    const scaffoldExec  = resolveNode()('lados.video.scaffold_project')!;
    const readExec       = resolveNode()('lados.video.read_script')!;
    const draftExec       = resolveNode()('lados.video.draft_scenes')!;
    const batchExec        = resolveNode()('lados.video.generate_scene_batch')!;
    const renderExec         = resolveNode()('lados.video.render_scenes')!;
    const revisionExec        = resolveNode()('lados.video.revise_scene_layout')!;
    const chromaExec           = resolveNode()('lados.video.remove_background')!;
    const insertExec = resolveNode({ fileService })('lados.video.insert_images')!;

    // 1. Scaffold the project
    const { ctx: scaffoldCtx } = createMockNodeContext({
      inputs: { projectName: 'Learn V1', template: 'adaptive' },
    });
    const scaffoldResult = await scaffoldExec(scaffoldCtx);
    expect(scaffoldResult.status).toBe('success');

    // 2. Read the script
    const { ctx: readCtx } = createMockNodeContext({
      inputs: {
        title: 'Learn V1 Script',
        scriptText:
          'Creators waste hours organizing their editing workflow.\n\n' +
          'A clean dashboard replaces the chaos.\n\n' +
          'Now everything ships in under an hour.',
      },
    });
    const readResult = await readExec(readCtx);
    expect(readResult.status).toBe('success');
    const script = readResult.outputs['script'];

    // 3. Draft scenes from the script
    const { ctx: draftCtx } = createMockNodeContext({ inputs: { script } });
    const draftResult = await draftExec(draftCtx);
    expect(draftResult.status).toBe('success');
    const scenes = draftResult.outputs['scenes'] as { sceneNumber: number; title: string }[];
    expect(scenes.length).toBeGreaterThanOrEqual(3);

    // 4. Lock the first creative-direction batch
    const { ctx: batchCtx } = createMockNodeContext({
      inputs: { scenes, batchIndex: 1, creativeDirection: 'Clean glass UI panels, orange gradient highlights' },
    });
    const batchResult = await batchExec(batchCtx);
    expect(batchResult.status).toBe('success');
    const batch = batchResult.outputs['batch'] as { sceneNumbers: number[] };

    // 5. Request a render — honestly fails, no backend configured
    const { ctx: renderCtx } = createMockNodeContext({ inputs: { scenes: batch.sceneNumbers } });
    const renderResult = await renderExec(renderCtx);
    expect(renderResult.status).toBe('failure');
    expect(renderResult.error?.code).toBe('RENDER_BACKEND_NOT_CONFIGURED');

    // 6. Revise the layout of the first scene for a webcam overlay
    const firstScene = scenes[0];
    const { ctx: revisionCtx } = createMockNodeContext({
      inputs: { scene: { sceneNumber: firstScene.sceneNumber, sceneTitle: firstScene.title }, targetZone: 'left35' },
    });
    const revisionResult = await revisionExec(revisionCtx);
    expect(revisionResult.status).toBe('success');
    expect(revisionResult.outputs['revision']).toMatchObject({
      version: 2,
      label: `Scene ${firstScene.sceneNumber} V2 - ${firstScene.title}`,
    });

    // 7. Validate a chroma-key request for the same scene
    const { ctx: chromaCtx } = createMockNodeContext({
      inputs: { scene: { sceneNumber: firstScene.sceneNumber } },
    });
    const chromaResult = await chromaExec(chromaCtx);
    expect(chromaResult.status).toBe('success');
    expect(chromaResult.outputs['chromaKey']).toMatchObject({ valid: true });

    // 8. Map an uploaded image onto the batch's scenes
    const { ctx: insertCtx } = createMockNodeContext({
      inputs: { images: [{ fileId: 'img-1' }], targetElement: 'phone', sceneNumbers: batch.sceneNumbers },
    });
    const insertResult = await insertExec(insertCtx);
    expect(insertResult.status).toBe('success');
    expect((insertResult.outputs['mapping'] as unknown[]).length).toBe(batch.sceneNumbers.length);

    // Invariant for the whole chain: render_scenes never fabricated a
    // completed render, even though every surrounding node succeeded.
    expect(renderResult.outputs['render']).toMatchObject({ rendered: false });
  });
});
