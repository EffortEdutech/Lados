/**
 * @lados/official-document-intelligence
 *
 * Phase 21 S2 (Wave 1) — real executors for the `lados.document-intelligence`
 * official Capability Pack (L1). Registry metadata lives in ../manifest.json
 * + ../nodes.json (read by OfficialPackLoaderService); this package supplies
 * runtime behavior only.
 *
 * Honesty note: read_pdf and read_docx are STUBS — they fetch file metadata
 * but do not extract text, because no PDF/DOCX-reading dependency exists in
 * this repo yet. Their nodes.json entries are marked `executorStatus: "stub"`
 * accordingly; the pack's overall `runtimeStatus` is `stub_executors`, not
 * `runtime_enabled`. Do not build production templates depending on parsed
 * PDF/DOCX text until those two are upgraded with a verified dependency +
 * lockfile update.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { uploadFile } from './nodes/upload-file';
import { readExcel } from './nodes/read-excel';
import { readPdf } from './nodes/read-pdf';
import { readDocx } from './nodes/read-docx';
import { extractTable } from './nodes/extract-table';
import { generateDocument } from './nodes/generate-document';

export { uploadFile, readExcel, readPdf, readDocx, extractTable, generateDocument };
export { type IFileService, type ILibraryService, type IDocumentService } from './nodes/read-excel';
export { type IDocumentStorageService } from './nodes/generate-document';

export const PACK_ID = 'lados.document-intelligence' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface DocumentIntelligenceServices {
  fileService?: import('./nodes/read-excel').IFileService;
  libraryService?: import('./nodes/read-excel').ILibraryService;
  documentService?: import('./nodes/read-excel').IDocumentService;
  storageService?: import('./nodes/generate-document').IDocumentStorageService;
}

/**
 * Returns the real executor for a lados.document-intelligence node type, or
 * null if unknown. Call once in buildRealNodeResolver, injecting NestJS
 * services. All services are optional — nodes degrade gracefully (or fail
 * clearly) when a service isn't injected, per each node's own docstring.
 */
export function resolveNode(
  services: DocumentIntelligenceServices = {},
): (nodeType: string) => NodeExecutor | null {
  const { fileService, libraryService, documentService, storageService } = services;

  const nodes: Record<string, NodeExecutor> = {
    'lados.document.upload_file': (ctx) => uploadFile(ctx),
    'lados.document.read_excel': (ctx) => readExcel(ctx, fileService, libraryService, documentService),
    'lados.document.read_pdf': (ctx) => readPdf(ctx, fileService),
    'lados.document.read_docx': (ctx) => readDocx(ctx, fileService),
    'lados.document.extract_table': (ctx) => extractTable(ctx, fileService),
    'lados.document.generate_document': (ctx) => generateDocument(ctx, storageService),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
