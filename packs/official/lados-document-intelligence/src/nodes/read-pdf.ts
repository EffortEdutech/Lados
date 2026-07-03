/**
 * lados.document.read_pdf — Phase 21 S2 (Wave 1) — STUB
 *
 * Fetches the referenced PDF file and returns its metadata. Text extraction
 * is NOT yet implemented — no PDF-parsing dependency exists in this repo
 * yet (Phase 21 kept new dependencies out of S2 to avoid touching the
 * lockfile blind). This node is honestly marked `executorStatus: "stub"`
 * in nodes.json — do not build workflows that depend on parsed PDF text
 * until this is upgraded.
 *
 * Follow-up: add a PDF text-extraction library (e.g. pdf-parse) in a
 * dedicated dependency-adding pass with a verified lockfile update, then
 * implement real parsing here following the read_excel pattern.
 *
 * Config/Inputs:
 *   fileId — runtime file reference
 *
 * Outputs:
 *   document — { fileId, sizeBytes, textExtracted: false }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

export interface IFileService {
  getUpload(fileId: string): Promise<{ storage_path: string }>;
  downloadFile(storagePath: string): Promise<Buffer>;
}

export async function readPdf(
  ctx: NodeContext,
  fileService?: IFileService,
): Promise<NodeExecuteResult> {
  const fileId = (ctx.inputs['fileId'] ?? ctx.config['fileId']) as string | undefined;

  if (!fileId) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'fileId is required' },
    };
  }

  if (!fileService) {
    ctx.logger.warn('lados.document.read_pdf: no FileService injected — returning fileId only, no metadata fetched');
    return {
      status: 'success',
      outputs: { document: { fileId, sizeBytes: null, textExtracted: false } },
      summary: 'PDF referenced (text extraction not yet implemented)',
    };
  }

  try {
    const upload = await fileService.getUpload(fileId);
    const buffer = await fileService.downloadFile(upload.storage_path);
    ctx.logger.warn(
      `lados.document.read_pdf: fetched ${buffer.length} bytes but text extraction is not yet implemented for this node`,
    );

    return {
      status: 'success',
      outputs: { document: { fileId, sizeBytes: buffer.length, textExtracted: false } },
      summary: `PDF fetched (${buffer.length} bytes) — text extraction not yet implemented`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'DOWNLOAD_FAILED', message } };
  }
}
