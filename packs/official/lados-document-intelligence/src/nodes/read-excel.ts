/**
 * lados.document.read_excel — Phase 21 S2 (Wave 1)
 *
 * Official successor to the prototype `document.read_excel`. Downloads the
 * referenced workbook (via an injected file/library service, when present)
 * and reads it into structured rows. Falls back to an inline XLSX parser
 * when no DocumentService is injected, so the node works standalone.
 *
 * Config/Inputs:
 *   fileId       — runtime file reference (ctx.inputs['fileId'] or ctx.config['fileId'])
 *   libraryFileId — design-time library file selection (ctx.config only)
 *   sheetName    — optional sheet name (default: first sheet)
 *   headerRow    — optional 1-based header row number (default: auto-detect)
 *
 * Outputs:
 *   table — { fileId, sheetName, sheets, headers, rowCount, rows }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import * as XLSX from 'xlsx';

export type ExcelRow = Record<string, string | number | boolean | null | undefined> & { row?: number };

export interface IFileService {
  getUpload(fileId: string): Promise<{ storage_path: string }>;
  downloadFile(storagePath: string): Promise<Buffer>;
}

export interface ILibraryService {
  getFile(fileId: string): Promise<{ storage_path: string }>;
  downloadFile(storagePath: string): Promise<Buffer>;
}

export interface IDocumentService {
  parseExcel(
    buffer: Buffer,
    options?: { headerRow?: number | string; sheetName?: string },
  ): { sheetName: string; sheets: string[]; headers: string[]; rows: ExcelRow[]; rowCount: number };
}

function fallbackParseExcel(buffer: Buffer, ctx: NodeContext) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = (ctx.config['sheetName'] as string | undefined) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName ?? ''];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false }) as (
    | string
    | number
    | boolean
    | null
  )[][];

  const headerRowRaw = ctx.config['headerRow'];
  const headerRowNum = Number(headerRowRaw);
  const headerRowIndex =
    headerRowRaw !== undefined && headerRowRaw !== null && headerRowRaw !== '' && headerRowNum > 0
      ? headerRowNum - 1
      : raw.findIndex((row) => row.filter(Boolean).length >= 3);

  if (headerRowIndex < 0) throw new Error('Could not find header row');

  const headers = (raw[headerRowIndex] ?? []).map((h) => String(h ?? '').trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: ExcelRow[] = [];
  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const rowData = raw[i];
    if (!rowData || rowData.every((v) => v === null || v === '')) continue;
    const obj: ExcelRow = { row: i + 1 };
    headers.forEach((h, colIdx) => { if (h) obj[h] = rowData[colIdx] ?? null; });
    rows.push(obj);
  }
  return { sheetName: sheetName ?? '', sheets: workbook.SheetNames, headers, rows, rowCount: rows.length };
}

export async function readExcel(
  ctx: NodeContext,
  fileService?: IFileService,
  libraryService?: ILibraryService,
  documentService?: IDocumentService,
): Promise<NodeExecuteResult> {
  const libraryFileId = ctx.config['libraryFileId'] as string | undefined;
  const fileId = (ctx.inputs['fileId'] ?? ctx.config['fileId']) as string | undefined;

  let fileBuffer: Buffer;

  try {
    if (libraryFileId && libraryService) {
      ctx.logger.info(`lados.document.read_excel: reading library file ${libraryFileId}`);
      const libFile = await libraryService.getFile(libraryFileId);
      fileBuffer = await libraryService.downloadFile(libFile.storage_path);
    } else if (fileId && fileService) {
      ctx.logger.info(`lados.document.read_excel: fetching upload ${fileId}`);
      const upload = await fileService.getUpload(fileId);
      fileBuffer = await fileService.downloadFile(upload.storage_path);
    } else {
      return {
        status: 'failure',
        outputs: {},
        error: { code: 'NO_FILE_SOURCE', message: 'No file source provided — set libraryFileId in config or connect an upload node.' },
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'DOWNLOAD_FAILED', message } };
  }

  try {
    const result = documentService
      ? documentService.parseExcel(fileBuffer, {
          headerRow: ctx.config['headerRow'] as number | string | undefined,
          sheetName: ctx.config['sheetName'] as string | undefined,
        })
      : fallbackParseExcel(fileBuffer, ctx);

    ctx.logger.info(`lados.document.read_excel: parsed ${result.rowCount} rows from sheet "${result.sheetName}"`);

    return {
      status: 'success',
      outputs: {
        table: {
          fileId: fileId ?? libraryFileId ?? null,
          sheetName: result.sheetName,
          sheets: result.sheets,
          headers: result.headers,
          rowCount: result.rowCount,
          rows: result.rows,
        },
      },
      summary: `Read ${result.rowCount} rows from sheet "${result.sheetName}"`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'PARSE_FAILED', message } };
  }
}
