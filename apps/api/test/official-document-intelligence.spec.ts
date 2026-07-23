/**
 * Phase 21 S2 (Wave 1) — @lados/official-document-intelligence.
 *
 * Covers the master-plan S2 test requirement: "Jest per node: manifest ↔
 * executor contract, MockNodeContext execution" for all 6 nodes
 * (upload_file, read_excel, read_pdf, read_docx, extract_table,
 * generate_document).
 *
 * PDF/DOCX readers use the injected DocumentService and preserve source
 * provenance. Missing parser or download services fail loudly.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { createMockNodeContext } from '@lados/testing';
import {
  resolveNode,
  type IFileService,
  type ILibraryService,
  type IDocumentService,
  type IDocumentStorageService,
} from '@lados/official-document-intelligence';

interface NodeManifestLike {
  type: string;
  executorStatus: string;
}

const manifests: NodeManifestLike[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../../packs/official/lados-document-intelligence/nodes.json'),
    'utf8',
  ),
);

function makeExcelBuffer(): Buffer {
  // fallbackParseExcel's header-row heuristic requires >= 3 truthy cells in
  // a row before it treats it as the header — hence 3 columns here, not 2.
  const ws = XLSX.utils.aoa_to_sheet([
    ['id', 'amount', 'status'],
    [1, 100, 'paid'],
    [2, 200, 'pending'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function fakeFileService(buffer: Buffer): IFileService {
  return {
    getUpload: jest.fn().mockResolvedValue({ storage_path: 'uploads/file.xlsx' }),
    downloadFile: jest.fn().mockResolvedValue(buffer),
  };
}

describe('official-document-intelligence — manifest <-> executor contract', () => {
  const resolve = resolveNode();

  it('every node declared in nodes.json resolves to a real executor', () => {
    for (const m of manifests) {
      expect(typeof resolve(m.type)).toBe('function');
    }
  });

  it('all Document Intelligence nodes are implemented', () => {
    for (const m of manifests) {
      expect(m.executorStatus).toBe('implemented');
    }
  });

  it('unknown node types resolve to null', () => {
    expect(resolve('lados.document.does_not_exist')).toBeNull();
  });
});

describe('lados.document.upload_file', () => {
  it('passes through a runtime fileId', async () => {
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'file-1' } });
    const exec = resolveNode()('lados.document.upload_file')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['file']).toEqual({ fileId: 'file-1' });
  });

  it('returns an empty fileId when nothing is provided', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.document.upload_file')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['file']).toEqual({ fileId: '' });
  });
});

describe('lados.document.read_excel', () => {
  it('fails with NO_FILE_SOURCE when no file is available', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.document.read_excel')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_FILE_SOURCE');
  });

  it('parses rows via the fallback XLSX parser when no DocumentService is injected', async () => {
    const fileService = fakeFileService(makeExcelBuffer());
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'file-1' } });
    const exec = resolveNode({ fileService })('lados.document.read_excel')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    const table = result.outputs['table'] as { rowCount: number; headers: string[] };
    expect(table.rowCount).toBe(2);
    expect(table.headers).toEqual(['id', 'amount', 'status']);
  });

  it('uses an injected DocumentService when provided', async () => {
    const documentService: IDocumentService = {
      parseExcel: jest.fn().mockReturnValue({
        sheetName: 'Sheet1',
        sheets: ['Sheet1'],
        headers: ['id', 'amount'],
        rows: [{ id: 1, amount: 100 }],
        rowCount: 1,
      }),
      parsePdf: jest.fn(),
      parseDocx: jest.fn(),
    };
    const fileService = fakeFileService(makeExcelBuffer());
    const libraryService: ILibraryService = {
      getFile: jest.fn(),
      downloadFile: jest.fn(),
    };
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'file-1' } });
    const exec = resolveNode({ fileService, libraryService, documentService })('lados.document.read_excel')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(documentService.parseExcel).toHaveBeenCalledTimes(1);
    expect((result.outputs['table'] as { rowCount: number }).rowCount).toBe(1);
  });
});

describe('lados.document.read_pdf', () => {
  it('fails when fileId is missing', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.document.read_pdf')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_FILE_SOURCE');
  });

  it('extracts text and page provenance through DocumentService', async () => {
    const fileService = fakeFileService(Buffer.from('fake pdf bytes'));
    const documentService = {
      parseExcel: jest.fn(),
      parsePdf: jest.fn().mockResolvedValue({
        text: 'Payment certificate', pageCount: 2,
        pages: [{ page: 1, text: 'Payment' }, { page: 2, text: 'certificate' }],
      }),
      parseDocx: jest.fn(),
    } satisfies IDocumentService;
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'file-1' }, config: { pageRange: '1-2' } });
    const exec = resolveNode({ fileService, documentService })('lados.document.read_pdf')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['document']).toMatchObject({
      fileId: 'file-1', textExtracted: true, text: 'Payment certificate', pageCount: 2,
    });
    expect(documentService.parsePdf).toHaveBeenCalledWith(expect.any(Buffer), { pages: [1, 2] });
  });

  it('fails loudly when DocumentService is unavailable', async () => {
    const fileService = fakeFileService(Buffer.from('fake pdf bytes'));
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'file-1' } });
    const result = await resolveNode({ fileService })('lados.document.read_pdf')!(ctx);
    expect(result.error?.code).toBe('DOCUMENT_SERVICE_NOT_CONFIGURED');
  });
});

describe('lados.document.read_docx', () => {
  it('extracts text through DocumentService', async () => {
    const fileService = fakeFileService(Buffer.from('fake docx bytes'));
    const documentService = {
      parseExcel: jest.fn(),
      parsePdf: jest.fn(),
      parseDocx: jest.fn().mockResolvedValue({ text: 'Variation order', messages: [] }),
    } satisfies IDocumentService;
    const { ctx } = createMockNodeContext({ inputs: { fileId: 'file-1' } });
    const exec = resolveNode({ fileService, documentService })('lados.document.read_docx')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['document']).toMatchObject({ textExtracted: true, text: 'Variation order' });
  });
});

describe('lados.document.extract_table', () => {
  it('re-wraps a pre-parsed table with confidence 1.0 and reviewRequired', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { table: { headers: ['id'], rows: [{ id: 1 }] } },
    });
    const exec = resolveNode()('lados.document.extract_table')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(result.outputs['table']).toMatchObject({ confidence: 1.0, reviewRequired: true, rowCount: 1 });
  });

  it('fails with NO_SUPPORTED_SOURCE rather than fabricating a table', async () => {
    const { ctx } = createMockNodeContext();
    const exec = resolveNode()('lados.document.extract_table')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('NO_SUPPORTED_SOURCE');
  });
});

describe('lados.document.generate_document', () => {
  it('fails when data is missing', async () => {
    const { ctx } = createMockNodeContext({ config: { title: 'Report' } });
    const exec = resolveNode()('lados.document.generate_document')!;

    const result = await exec(ctx);

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('MISSING_INPUT');
  });

  it('generates a docx inline as base64 when no storage service is injected', async () => {
    const { ctx } = createMockNodeContext({
      inputs: { title: 'Progress Claim Summary', data: { amount: 1000, status: 'draft' } },
    });
    const exec = resolveNode()('lados.document.generate_document')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    const doc = result.outputs['document'] as { fileName: string; base64: string };
    expect(doc.fileName).toMatch(/\.docx$/);
    expect(doc.base64.length).toBeGreaterThan(0);
  });

  it('persists via the storage service when injected', async () => {
    const storageService: IDocumentStorageService = {
      saveGeneratedDocument: jest.fn().mockResolvedValue({ fileId: 'generated-doc-1' }),
    };
    const { ctx } = createMockNodeContext({
      inputs: { title: 'Report', data: { amount: 500 } },
      organizationId: 'org-1',
    });
    const exec = resolveNode({ storageService })('lados.document.generate_document')!;

    const result = await exec(ctx);

    expect(result.status).toBe('success');
    expect(storageService.saveGeneratedDocument).toHaveBeenCalledTimes(1);
    expect(result.outputs['document']).toMatchObject({ fileId: 'generated-doc-1' });
  });
});
