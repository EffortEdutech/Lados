/**
 * lados.document.generate_document — Phase 21 S2 (Wave 1)
 *
 * Generates a simple Word document from workflow data using the `docx`
 * package (already a repo dependency for document generation — it cannot
 * read existing files, only write new ones, which is exactly what this
 * node needs). Renders a title heading followed by one paragraph per
 * key/value pair in the input data, or one row per array item.
 *
 * If a storage service is injected, the generated file is persisted and a
 * reference is returned. Otherwise the document is returned inline as a
 * base64 buffer so the node is still useful standalone (small documents,
 * tests) — this is a deliberate, documented fallback, not a limitation of
 * intent.
 *
 * Config/Inputs:
 *   title — document title (default: 'Generated Document')
 *   data  — object or array to render (required)
 *
 * Outputs:
 *   document — { fileName, mimeType, base64 } or { fileId } when persisted
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

export interface IDocumentStorageService {
  /** Persists a generated document buffer and returns a stable reference. */
  saveGeneratedDocument(params: {
    orgId: string;
    fileName: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ fileId: string }>;
}

function renderParagraphs(data: unknown): Paragraph[] {
  if (Array.isArray(data)) {
    return data.map((item, index) => new Paragraph({
      children: [new TextRun(`${index + 1}. ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)],
    }));
  }

  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>).map(([key, value]) => new Paragraph({
      children: [
        new TextRun({ text: `${key}: `, bold: true }),
        new TextRun(typeof value === 'object' ? JSON.stringify(value) : String(value)),
      ],
    }));
  }

  return [new Paragraph({ children: [new TextRun(String(data ?? ''))] })];
}

export async function generateDocument(
  ctx: NodeContext,
  storageService?: IDocumentStorageService,
): Promise<NodeExecuteResult> {
  const title = ((ctx.inputs['title'] ?? ctx.config['title'] ?? 'Generated Document') as string);
  const data = ctx.inputs['data'] ?? ctx.config['data'];

  if (data === undefined || data === null) {
    return { status: 'failure', outputs: {}, error: { code: 'MISSING_INPUT', message: 'data is required' } };
  }

  ctx.logger.info(`lados.document.generate_document: building "${title}"`);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          ...renderParagraphs(data),
        ],
      },
    ],
  });

  let buffer: Buffer;
  try {
    buffer = await Packer.toBuffer(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'GENERATE_FAILED', message } };
  }

  const fileName = `${title.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'document'}.docx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (storageService && ctx.organizationId) {
    try {
      const { fileId } = await storageService.saveGeneratedDocument({
        orgId: ctx.organizationId,
        fileName,
        buffer,
        mimeType,
      });
      ctx.logger.info(`lados.document.generate_document: saved as ${fileId}`);
      return {
        status: 'success',
        outputs: { document: { fileId, fileName, mimeType } },
        summary: `Generated "${fileName}" and saved (${fileId})`,
      };
    } catch (err) {
      ctx.logger.warn(`lados.document.generate_document: storage failed, falling back to inline — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    status: 'success',
    outputs: {
      document: { fileName, mimeType, base64: buffer.toString('base64') },
    },
    summary: `Generated "${fileName}" (${buffer.length} bytes, returned inline — no storage service injected)`,
  };
}
