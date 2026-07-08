/**
 * lados.video.insert_images
 *
 * Maps uploaded images onto named scene elements (e.g. "phone screen",
 * "card") across a batch of scenes, per Part 11 of the blueprint. Claude +
 * Remotion don't generate images themselves — the user brings their own
 * (thumbnails, screenshots, product shots) and this node produces the slot
 * mapping Claude uses to wire them into the scene composition.
 *
 * Config/Inputs:
 *   images        — array of { fileId?, label? } — uploaded image references
 *   targetElement — required, e.g. "phone" | "card" | "thumbnail"
 *   sceneNumbers  — scenes to apply the mapping to
 *
 * Outputs:
 *   mapping — array of { sceneNumber, targetElement, fileId }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IFileService } from '../types';

interface ImageRef { fileId?: string; label?: string }

export async function insertImages(
  ctx: NodeContext,
  fileService?: IFileService,
): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const images = (inp['images'] as ImageRef[] | undefined) ?? [];
  const targetElement = (inp['targetElement'] ?? cfg['targetElement']) as string | undefined;
  const sceneNumbers = (inp['sceneNumbers'] as number[] | undefined) ?? [];

  if (!targetElement) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.insert_images: targetElement is required (e.g. "phone", "card")' },
    };
  }
  if (images.length === 0) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.insert_images: images is required (at least one image reference)' },
    };
  }
  if (sceneNumbers.length === 0) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.insert_images: sceneNumbers is required' },
    };
  }

  // Validate each image reference resolves, when a FileService is available
  // and the reference carries a fileId. Missing service or missing fileId
  // (e.g. a bare label-only reference) is not fatal — recorded as unverified.
  const resolvedFileIds: (string | null)[] = [];
  for (const img of images) {
    if (img.fileId && fileService) {
      try {
        await fileService.getUpload(img.fileId);
        resolvedFileIds.push(img.fileId);
      } catch {
        return {
          status: 'failure',
          outputs: {},
          error: { code: 'IMAGE_NOT_FOUND', message: `lados.video.insert_images: image fileId "${img.fileId}" could not be resolved` },
        };
      }
    } else {
      resolvedFileIds.push(img.fileId ?? null);
    }
  }

  // Round-robin assign images across the target scenes.
  const mapping = sceneNumbers.map((sceneNumber, i) => ({
    sceneNumber,
    targetElement,
    fileId: resolvedFileIds[i % resolvedFileIds.length],
  }));

  ctx.logger.info(
    `lados.video.insert_images: mapped ${images.length} image(s) onto "${targetElement}" across ${sceneNumbers.length} scene(s)`,
  );

  return {
    status: 'success',
    outputs: { mapping },
    summary: `Mapped ${images.length} image(s) onto "${targetElement}" across ${sceneNumbers.length} scene(s)`,
  };
}
