/**
 * @lados/official-video-production — manifest <-> executor contract + per-node tests.
 *
 * Covers all 8 nodes (read_script, scaffold_project, draft_scenes,
 * generate_scene_batch, render_scenes, revise_scene_layout,
 * remove_background, insert_images) — same "TEST per node" convention as
 * every other official pack wave.
 *
 * Honesty note under test: render_scenes is a stub — this suite asserts it
 * is still marked `executorStatus: "stub"` in nodes.json (not
 * "implemented"), and that it fails clearly (RENDER_BACKEND_NOT_CONFIGURED)
 * rather than silently pretending to have rendered anything, since no
 * render backend is wired.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createMockNodeContext } from '@lados/testing';
import { resolveNode, type IFileService, type IRenderService } from '@lados/official-video-production';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../../packs/official/lados-video-production/nodes.json'),
    'utf8',
  ),
);

function fakeFileService(exists = true): IFileService {
  return {
    getUpload: jest.fn().mockImplementation((fileId: string) =>
      exists ? Promise.resolve({ storage_path: `uploads/${fileId}` }) : Promise.reject(new Error('not found')),
    ),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from('Paragraph one.\n\nParagraph two.\n\nParagraph three.')),
  };
}

function fakeRenderService(rendered = true): IRenderService {
  return {
    render: jest.fn().mockResolvedValue(
      rendered
        ? { rendered: true, outDir: 'out', files: ['Scene01.mp4', 'Scene02.mp4'] }
        : { rendered: false, outDir: null, files: [], error: 'render backend unavailable' },
    ),
  };
}

describe('official-video-production — manifest <-> executor contract', () => {
  it('every node declared in nodes.json resolves to a real executor', () => {
    const resolve = resolveNode({ fileService: fakeFileService(), renderService: fakeRenderService() });
    for (const m of manifests) {
      expect(typeof resolve(m.type)).toBe('function');
    }
  });

  it('render_scenes is honestly marked as a stub (no render backend wired anywhere)', () => {
    const node = manifests.find((m) => m.type === 'lados.video.render_scenes')!;
    expect(node.executorStatus).toBe('stub');
  });

  it('every other node is marked implemented', () => {
    const implemented = manifests.filter((m) => m.type !== 'lados.video.render_scenes');
    for (const m of implemented) {
      expect(m.executorStatus).toBe('implemented');
    }
  });

  it('unknown node types resolve to null', () => {
    const resolve = resolveNode();
    expect(resolve('lados.video.does_not_exist')).toBeNull();
  });
});

describe('lados.video.read_script', () => {
  it('fails when neither scriptText nor fileId is given', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const exec = resolveNode()('lados.video.read_script')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('reads inline scriptText and computes metrics', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { scriptText: 'Hello world.\n\nThis is scene two.', title: 'Demo' },
    });
    const exec = resolveNode()('lados.video.read_script')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['script']).toMatchObject({ title: 'Demo', paragraphCount: 2 });
  });

  it('fails with NO_SERVICE when fileId is given but no FileService injected', async () => {
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'f-1' } });
    const exec = resolveNode()('lados.video.read_script')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SERVICE');
  });

  it('resolves a script via FileService when fileId is given', async () => {
    const fileService = fakeFileService();
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'f-1' } });
    const exec = resolveNode({ fileService })('lados.video.read_script')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['script']).toMatchObject({ paragraphCount: 3 });
    expect(fileService.getUpload).toHaveBeenCalledWith('f-1');
  });
});

describe('lados.video.scaffold_project', () => {
  it('fails when projectName is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const exec = resolveNode()('lados.video.scaffold_project')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('fails on an invalid template', async () => {
    const { ctx } = createMockNodeContext({ inputs: { projectName: 'Learn V1', template: 'not-a-template' } });
    const exec = resolveNode()('lados.video.scaffold_project')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_TEMPLATE');
  });

  it('defaults to the adaptive template', async () => {
    const { ctx } = createMockNodeContext({ inputs: { projectName: 'Learn V1' } });
    const exec = resolveNode()('lados.video.scaffold_project')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['project']).toMatchObject({ projectName: 'Learn V1', template: 'adaptive' });
  });
});

describe('lados.video.draft_scenes', () => {
  it('fails when script.text is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const exec = resolveNode()('lados.video.draft_scenes')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('splits by paragraph by default', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { script: { text: 'Scene one text.\n\nScene two text.\n\nScene three text.' } },
    });
    const exec = resolveNode()('lados.video.draft_scenes')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const scenes = result.outputs['scenes'] as { sceneNumber: number }[];
    expect(scenes).toHaveLength(3);
    expect(scenes[0].sceneNumber).toBe(1);
  });

  it('splits evenly by word count when splitStrategy is "even"', async () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ');
    const { ctx } = createMockNodeContext({
      inputs: { script: { text: words }, splitStrategy: 'even', scenesPerBatch: 4 },
    });
    const exec = resolveNode()('lados.video.draft_scenes')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const scenes = result.outputs['scenes'] as unknown[];
    expect(scenes.length).toBeLessThanOrEqual(4);
  });
});

describe('lados.video.generate_scene_batch', () => {
  const scenes = Array.from({ length: 12 }, (_, i) => ({ sceneNumber: i + 1 }));

  it('fails when creativeDirection is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { scenes, batchIndex: 1 } });
    const exec = resolveNode()('lados.video.generate_scene_batch')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('locks a batch of 5 scenes and marks rotated=true when no previous direction given', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { scenes, batchIndex: 1, creativeDirection: 'Clean glass UI panels' },
    });
    const exec = resolveNode()('lados.video.generate_scene_batch')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['batch']).toMatchObject({
      batchIndex: 1,
      sceneNumbers: [1, 2, 3, 4, 5],
      rotated: true,
    });
  });

  it('flags (not blocks) a repeated creative direction', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        scenes,
        batchIndex: 2,
        creativeDirection: 'Clean glass UI panels',
        previousDirection: 'Clean glass UI panels',
      },
    });
    const exec = resolveNode()('lados.video.generate_scene_batch')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['batch']).toMatchObject({ rotated: false });
  });

  it('fails when the requested batch has no scenes', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { scenes, batchIndex: 10, creativeDirection: 'Anything' },
    });
    const exec = resolveNode()('lados.video.generate_scene_batch')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SCENES_IN_BATCH');
  });
});

describe('lados.video.render_scenes — stub honesty', () => {
  it('fails with MISSING_INPUT when scenes is empty', async () => {
    const { ctx } = createMockNodeContext({ inputs: { scenes: [] } });
    const exec = resolveNode()('lados.video.render_scenes')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('reports RENDER_BACKEND_NOT_CONFIGURED rather than pretending to render', async () => {
    const { ctx } = createMockNodeContext({ inputs: { scenes: [{ sceneNumber: 1 }, { sceneNumber: 2 }] } });
    const exec = resolveNode()('lados.video.render_scenes')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('RENDER_BACKEND_NOT_CONFIGURED');
    expect(result.outputs['render']).toMatchObject({ rendered: false });
  });

  it('renders successfully when a renderService is injected', async () => {
    const renderService = fakeRenderService(true);
    const { ctx } = createMockNodeContext({ inputs: { scenes: [{ sceneNumber: 1 }], resolution: '4k' } });
    const exec = resolveNode({ renderService })('lados.video.render_scenes')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['render']).toMatchObject({ rendered: true, outDir: 'out' });
    expect(renderService.render).toHaveBeenCalledWith(
      expect.objectContaining({ sceneIds: ['1'], resolution: '4k' }),
    );
  });
});

describe('lados.video.revise_scene_layout', () => {
  it('fails when sceneNumber or sceneTitle is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { scene: { sceneNumber: 2 } } });
    const exec = resolveNode()('lados.video.revise_scene_layout')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('computes V2 from an original (version 1) scene', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { scene: { sceneNumber: 2, sceneTitle: 'The Workflow Problem' } },
    });
    const exec = resolveNode()('lados.video.revise_scene_layout')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['revision']).toMatchObject({
      version: 2,
      label: 'Scene 2 V2 - The Workflow Problem',
    });
  });

  it('computes V3 from a scene already at V2 (never resets to V1)', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { scene: { sceneNumber: 2, sceneTitle: 'The Workflow Problem', currentVersion: 2 } },
    });
    const exec = resolveNode()('lados.video.revise_scene_layout')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['revision']).toMatchObject({ version: 3, label: 'Scene 2 V3 - The Workflow Problem' });
  });

  it('rejects an invalid targetZone', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { scene: { sceneNumber: 1, sceneTitle: 'Intro' }, targetZone: 'middle' },
    });
    const exec = resolveNode()('lados.video.revise_scene_layout')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_ZONE');
  });
});

describe('lados.video.remove_background', () => {
  it('fails when sceneNumber is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: {} });
    const exec = resolveNode()('lados.video.remove_background')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('validates a correct pure-green request', async () => {
    const { ctx } = createMockNodeContext({ inputs: { scene: { sceneNumber: 3 } } });
    const exec = resolveNode()('lados.video.remove_background')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    expect(result.outputs['chromaKey']).toMatchObject({ valid: true, backgroundColor: '#00FF00' });
  });

  it('fails a non-pure-green background', async () => {
    const { ctx } = createMockNodeContext({ inputs: { scene: { sceneNumber: 3 }, backgroundColor: '#00FF01' } });
    const exec = resolveNode()('lados.video.remove_background')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('INVALID_CHROMA_KEY');
  });

  it('fails when a gradient background is allowed', async () => {
    const { ctx } = createMockNodeContext({ inputs: { scene: { sceneNumber: 3 }, allowGradient: true } });
    const exec = resolveNode()('lados.video.remove_background')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.outputs['chromaKey']).toMatchObject({ valid: false });
  });
});

describe('lados.video.insert_images', () => {
  it('fails when targetElement is missing', async () => {
    const { ctx } = createMockNodeContext({ inputs: { images: [{ fileId: 'img-1' }], sceneNumbers: [1] } });
    const exec = resolveNode()('lados.video.insert_images')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('maps images round-robin across scenes', async () => {
    const { ctx } = createMockNodeContext({
      inputs: {
        images: [{ fileId: 'img-1' }, { fileId: 'img-2' }],
        targetElement: 'phone',
        sceneNumbers: [1, 2, 3],
      },
    });
    const exec = resolveNode()('lados.video.insert_images')!;
    const result = await exec(ctx);
    expect(result.status).toBe('success');
    const mapping = result.outputs['mapping'] as { sceneNumber: number; fileId: string | null }[];
    expect(mapping).toHaveLength(3);
    expect(mapping[0].fileId).toBe('img-1');
    expect(mapping[1].fileId).toBe('img-2');
    expect(mapping[2].fileId).toBe('img-1');
  });

  it('fails when a referenced image cannot be resolved via FileService', async () => {
    const fileService = fakeFileService(false);
    const { ctx } = createMockNodeContext({
      inputs: { images: [{ fileId: 'missing-1' }], targetElement: 'card', sceneNumbers: [1] },
    });
    const exec = resolveNode({ fileService })('lados.video.insert_images')!;
    const result = await exec(ctx);
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('IMAGE_NOT_FOUND');
  });
});
