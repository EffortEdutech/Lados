/**
 * lados.video.read_script
 *
 * Reads a script's raw text — either inline (ctx.inputs.scriptText /
 * ctx.config.scriptText) or from an uploaded file via the injected
 * FileService — and computes basic structure metrics (word count, line
 * count, paragraph count) used by draft_scenes to plan a scene count.
 *
 * This node does not interpret meaning; the Scene Composition rule (see the
 * blueprint's Resources folder) explicitly leaves that judgement to the
 * creative director (human + the connected Claude session), not to an
 * automated node.
 *
 * Config/Inputs:
 *   scriptText — raw script text (preferred, no upload needed)
 *   fileId     — uploaded file reference, read via FileService when scriptText is absent
 *   title      — optional script title, carried through to outputs
 *
 * Outputs:
 *   script — { title, text, wordCount, lineCount, paragraphCount }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IFileService } from '../types';

function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
}

export async function readScript(
  ctx: NodeContext,
  fileService?: IFileService,
): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const title = (inp['title'] ?? cfg['title']) as string | undefined;
  let text = (inp['scriptText'] ?? cfg['scriptText']) as string | undefined;
  const fileId = (inp['fileId'] ?? cfg['fileId']) as string | undefined;

  if (!text && fileId) {
    if (!fileService) {
      return {
        status: 'failure',
        outputs: {},
        error: { code: 'NO_SERVICE', message: 'lados.video.read_script: FileService not injected — cannot resolve fileId' },
      };
    }
    try {
      const upload = await fileService.getUpload(fileId);
      const buffer = await fileService.downloadFile(upload.storage_path);
      text = buffer.toString('utf8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'failure', outputs: {}, error: { code: 'DOWNLOAD_FAILED', message } };
    }
  }

  if (!text) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.read_script: scriptText or fileId is required' },
    };
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = text.split('\n').length;
  const paragraphCount = countParagraphs(text);

  ctx.logger.info(
    `lados.video.read_script: read ${wordCount} words across ${paragraphCount} paragraphs${title ? ` — "${title}"` : ''}`,
  );

  return {
    status: 'success',
    outputs: { script: { title: title ?? null, text, wordCount, lineCount, paragraphCount } },
    summary: `Read script (${wordCount} words, ${paragraphCount} paragraphs)`,
  };
}
