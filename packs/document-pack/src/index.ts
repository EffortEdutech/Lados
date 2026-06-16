/**
 * @qsos/document-pack
 *
 * Document processing nodes: PDF generation, DOCX parsing, Supabase Storage upload.
 * Sprint 1 stub — node implementations added in Sprint 3+.
 */
import type { PackManifest } from '@qsos/pack-sdk';

export const PACK_ID = 'document-pack' as const;
export const PACK_VERSION = '0.1.0' as const;

export const manifest: PackManifest = {
  id: PACK_ID,
  version: PACK_VERSION,
  displayName: 'Document Pack',
  description:
    'Document business capabilities — read Excel/PDF, extract tables, generate Word/PDF, save and convert documents',
  author: 'QS-OS Team',
  nodes: [
    // Document capabilities (Vol 0 §28.4)
    'document.read-excel',       // Read Excel
    'document.read-pdf',         // Read PDF
    'document.extract-table',    // Extract Table
    'document.generate-word',    // Generate Word
    'document.generate-pdf',     // Generate PDF
    'document.save-document',    // Save Document
    'document.convert-file',     // Convert File
  ],
};

// Sprint 3+: export { ReadExcelNode } from './nodes/read-excel.node';
// Sprint 3+: export { ReadPdfNode } from './nodes/read-pdf.node';
// Sprint 3+: export { ExtractTableNode } from './nodes/extract-table.node';
// Sprint 3+: export { GenerateWordNode } from './nodes/generate-word.node';
// Sprint 3+: export { GeneratePdfNode } from './nodes/generate-pdf.node';
// Sprint 3+: export { SaveDocumentNode } from './nodes/save-document.node';
