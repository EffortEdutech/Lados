import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { IDocumentService, IFileService, ILibraryService } from './read-excel';

function parsePageRange(value: unknown): number[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const pages = new Set<number>();
  for (const part of String(value).split(',').map((item) => item.trim()).filter(Boolean)) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid page range "${part}". Use values such as 1-3,5.`);
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end - start > 999) throw new Error(`Invalid page range "${part}".`);
    for (let page = start; page <= end; page += 1) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

export async function readPdf(
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
    return { status: 'failure', outputs: {}, error: { code: 'DOCUMENT_SERVICE_NOT_CONFIGURED', message: 'PDF parsing requires DocumentService.' } };
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
    const pages = parsePageRange(ctx.config['pageRange']);
    const parsed = await documentService.parsePdf(buffer, { pages });
    const sourceFileId = libraryFileId ?? fileId!;
    ctx.logger.info(`lados.document.read_pdf: extracted ${parsed.text.length} characters from ${parsed.pages.length} page(s)`);
    return {
      status: 'success',
      outputs: {
        document: {
          fileId: sourceFileId,
          source: libraryFileId ? 'library' : 'upload',
          mimeType: 'application/pdf',
          sizeBytes: buffer.length,
          text: parsed.text,
          textExtracted: true,
          pageCount: parsed.pageCount,
          pages: parsed.pages,
        },
      },
      summary: `Extracted PDF text from ${parsed.pages.length} page(s)`,
    };
  } catch (error) {
    return { status: 'failure', outputs: {}, error: { code: 'PARSE_FAILED', message: error instanceof Error ? error.message : String(error) } };
  }
}
