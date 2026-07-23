import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IDocumentService, IFileService, ILibraryService } from './read-excel';

export async function readDocx(
  ctx: NodeContext,
  fileService?: IFileService,
  libraryService?: ILibraryService,
  documentService?: IDocumentService,
): Promise<NodeExecuteResult> {
  const libraryFileId = ctx.config['libraryFileId'] as string | undefined;
  const fileId = (ctx.inputs['fileId'] ?? ctx.config['fileId']) as string | undefined;
  if (!libraryFileId && !fileId) {
    return { status: 'failure', outputs: {}, error: { code: 'NO_FILE_SOURCE', message: 'Set libraryFileId or connect/provide fileId.' } };
  }
  if (!documentService) {
    return { status: 'failure', outputs: {}, error: { code: 'DOCUMENT_SERVICE_NOT_CONFIGURED', message: 'DOCX parsing requires DocumentService.' } };
  }

  let buffer: Buffer;
  try {
    if (libraryFileId) {
      if (!libraryService) throw new Error('LibraryService is not configured');
      const file = await libraryService.getFile(libraryFileId);
      buffer = await libraryService.downloadFile(file.storage_path);
    } else {
      if (!fileService) throw new Error('FileService is not configured');
      const upload = await fileService.getUpload(fileId!);
      buffer = await fileService.downloadFile(upload.storage_path);
    }
  } catch (error) {
    return { status: 'failure', outputs: {}, error: { code: 'DOWNLOAD_FAILED', message: error instanceof Error ? error.message : String(error) } };
  }

  try {
    const parsed = await documentService.parseDocx(buffer);
    const sourceFileId = libraryFileId ?? fileId!;
    ctx.logger.info(`lados.document.read_docx: extracted ${parsed.text.length} characters`);
    return {
      status: 'success',
      outputs: {
        document: {
          fileId: sourceFileId,
          source: libraryFileId ? 'library' : 'upload',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: buffer.length,
          text: parsed.text,
          textExtracted: true,
          messages: parsed.messages,
        },
      },
      summary: `Extracted DOCX text (${parsed.text.length} characters)`,
    };
  } catch (error) {
    return { status: 'failure', outputs: {}, error: { code: 'PARSE_FAILED', message: error instanceof Error ? error.message : String(error) } };
  }
}
