/**
 * lados.document.upload_file — Phase 21 S2 (Wave 1)
 *
 * Official successor to the prototype `document.upload_file`. Pass-through
 * node that forwards the runtime file reference from either the run payload
 * or a static config fallback. Intake only — no approval or certification.
 *
 * Inputs/Config:
 *   fileId — from ctx.inputs['fileId'] (runtime upload) or ctx.config['fileId']
 *
 * Outputs:
 *   file — { fileId } (empty string when no file provided)
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export async function uploadFile(ctx: NodeContext): Promise<NodeExecuteResult> {
  const fileId =
    (ctx.inputs['fileId'] as string | undefined) ??
    (ctx.config['fileId'] as string | undefined) ??
    null;

  if (fileId) {
    ctx.logger.info(`lados.document.upload_file: file ready — ${fileId}`);
  } else {
    ctx.logger.info('lados.document.upload_file: no fileId in inputs or config — downstream nodes should use a resource binding.');
  }

  return {
    status: 'success',
    outputs: { file: { fileId: fileId ?? '' } },
    summary: fileId ? `File ready: ${fileId}` : 'No upload provided',
  };
}
