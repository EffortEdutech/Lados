/**
 * lados.document.read_docx — Phase 21 S2 (Wave 1) — STUB
 *
 * Fetches the referenced Word document and returns its metadata. Text
 * extraction is NOT yet implemented — the `docx` package already in this
 * repo is write-only (document generation, used by generate_document); it
 * cannot read/parse existing .docx files. A read-capable dependency (e.g.
 * mammoth) would need to be added in a dedicated pass with a verified
 * lockfile update. Honestly marked `executorStatus: "stub"` in nodes.json.
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

export async function readDocx(
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
    ctx.logger.warn('lados.document.read_docx: no FileService injected — returning fileId only, no metadata fetched');
    return {
      status: 'success',
      outputs: { document: { fileId, sizeBytes: null, textExtracted: false } },
      summary: 'Word document referenced (text extraction not yet implemented)',
    };
  }

  try {
    const upload = await fileService.getUpload(fileId);
    const buffer = await fileService.downloadFile(upload.storage_path);
    ctx.logger.warn(
      `lados.document.read_docx: fetched ${buffer.length} bytes but text extraction is not yet implemented for this node`,
    );

    return {
      status: 'success',
      outputs: { document: { fileId, sizeBytes: buffer.length, textExtracted: false } },
      summary: `Word document fetched (${buffer.length} bytes) — text extraction not yet implemented`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'DOWNLOAD_FAILED', message } };
  }
}
