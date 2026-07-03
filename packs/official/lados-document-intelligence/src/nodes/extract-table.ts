/**
 * lados.document.extract_table — Phase 21 S2 (Wave 1)
 *
 * Extracts tabular data from a document. Two supported paths:
 *   1. An already-parsed table is passed in via `ctx.inputs['table']`
 *      (e.g. chained from `lados.document.read_excel`) — re-wrapped with
 *      confidence/review metadata, no re-parsing needed.
 *   2. A raw spreadsheet-like file is passed via `ctx.inputs['file']` /
 *      `fileId` — parsed with the same XLSX engine as read_excel.
 *
 * Always advisory: `aiBoundary: 'advisory'` in the manifest, and this node
 * always sets `reviewRequired: true` on its output — extracted values must
 * be reviewed before use in commercial decisions, per the pack guardrail.
 *
 * Non-spreadsheet sources (scanned PDFs, photographed documents) are not
 * yet supported — this node does not fabricate a table for those; it fails
 * with a clear NO_SUPPORTED_SOURCE error instead of guessing.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import * as XLSX from 'xlsx';

export interface IFileService {
  getUpload(fileId: string): Promise<{ storage_path: string }>;
  downloadFile(storagePath: string): Promise<Buffer>;
}

function parseSpreadsheetBuffer(buffer: Buffer, targetTable?: string) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = targetTable ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName ?? ''];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false }) as (
    | string
    | number
    | boolean
    | null
  )[][];
  const headerRowIndex = raw.findIndex((row) => row.filter(Boolean).length >= 2);
  if (headerRowIndex < 0) throw new Error('Could not find a header row');

  const headers = (raw[headerRowIndex] ?? []).map((h) => String(h ?? '').trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const rowData = raw[i];
    if (!rowData || rowData.every((v) => v === null || v === '')) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, colIdx) => { if (h) obj[h] = rowData[colIdx] ?? null; });
    rows.push(obj);
  }
  return { headers, rows };
}

export async function extractTable(
  ctx: NodeContext,
  fileService?: IFileService,
): Promise<NodeExecuteResult> {
  const targetTable = ctx.config['targetTable'] as string | undefined;
  const expectedColumns = ctx.config['expectedColumns'] as string[] | undefined;
  const preExtracted = ctx.inputs['table'] as { headers?: string[]; rows?: unknown[] } | undefined;

  if (preExtracted?.rows) {
    ctx.logger.info(`lados.document.extract_table: re-wrapping ${preExtracted.rows.length} pre-parsed rows`);
    return {
      status: 'success',
      outputs: {
        table: {
          headers: preExtracted.headers ?? [],
          rows: preExtracted.rows,
          rowCount: preExtracted.rows.length,
          confidence: 1.0,
          reviewRequired: true,
          sourceSpans: [],
        },
      },
      summary: `Extracted ${preExtracted.rows.length} rows (pre-parsed input)`,
    };
  }

  const fileId = (ctx.inputs['fileId'] ?? ctx.config['fileId']) as string | undefined;
  if (!fileId || !fileService) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'NO_SUPPORTED_SOURCE',
        message: 'extract_table needs either a pre-parsed "table" input or a spreadsheet-like file with FileService injected. Scanned/photographed documents are not yet supported.',
      },
    };
  }

  try {
    const upload = await fileService.getUpload(fileId);
    const buffer = await fileService.downloadFile(upload.storage_path);
    const { headers, rows } = parseSpreadsheetBuffer(buffer, targetTable);

    if (expectedColumns?.length) {
      const missing = expectedColumns.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        ctx.logger.warn(`lados.document.extract_table: expected columns missing: ${missing.join(', ')}`);
      }
    }

    ctx.logger.info(`lados.document.extract_table: parsed ${rows.length} rows from file ${fileId}`);

    return {
      status: 'success',
      outputs: {
        table: { headers, rows, rowCount: rows.length, confidence: 0.9, reviewRequired: true, sourceSpans: [] },
      },
      summary: `Extracted ${rows.length} rows — review required before commercial use`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failure', outputs: {}, error: { code: 'EXTRACT_FAILED', message } };
  }
}
