/**
 * DocumentService — Sprint 14 (S14-001)
 *
 * Centralises file-parsing logic that was previously duplicated
 * across individual node implementations.
 *
 * Parsing methods:
 *   parseExcel(buffer, options?)  → { headers, rows, sheetName, sheets }
 *   parsePdf(buffer)              → { text, pageCount }  (stub, Sprint 19+)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { SupabaseService } from '../common/supabase/supabase.service';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ExcelRow {
  row: number;
  [col: string]: string | number | boolean | null;
}

export interface ParseExcelResult {
  sheetName: string;
  sheets: string[];
  headers: string[];
  rows: ExcelRow[];
  rowCount: number;
}

export interface ParseExcelOptions {
  /** 1-based row number to use as header. Auto-detected when absent or 0. */
  headerRow?: number | string;
  /** Sheet name to parse. Defaults to the first sheet. */
  sheetName?: string;
}

export interface ParsePdfResult {
  text: string;
  pageCount: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Parse an Excel workbook buffer and return structured row data.
   *
   * Extracted from document-read-excel.ts (Sprint 7) so both
   * document.read_excel and qs.read_boq can share this logic.
   */
  parseExcel(buffer: Buffer, options: ParseExcelOptions = {}): ParseExcelResult {
    this.logger.debug(`Parsing Excel buffer (${buffer.length} bytes)`);

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const sheetName =
      (options.sheetName?.trim() || undefined) ?? workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(
        `Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(', ')}`,
      );
    }

    // Raw rows — array of arrays
    const raw: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as (string | number | boolean | null)[][];

    // Header row resolution — same logic as original node
    const headerRowRaw = options.headerRow;
    const headerRowNum = Number(headerRowRaw);
    const headerRowIndex =
      headerRowRaw !== undefined &&
      headerRowRaw !== null &&
      headerRowRaw !== '' &&
      headerRowNum > 0
        ? headerRowNum - 1
        : raw.findIndex((row) => row.filter(Boolean).length >= 3);

    if (headerRowIndex < 0) {
      throw new Error('Could not find a header row with ≥3 columns');
    }

    const headers = raw[headerRowIndex].map((h) =>
      String(h ?? '').trim().toLowerCase().replace(/\s+/g, '_'),
    );

    // Data rows
    const rows: ExcelRow[] = [];
    for (let i = headerRowIndex + 1; i < raw.length; i++) {
      const rowData = raw[i];
      if (!rowData || rowData.every((v) => v === null || v === '')) continue;

      const obj: ExcelRow = { row: i + 1 };
      headers.forEach((h, colIdx) => {
        if (h) obj[h] = rowData[colIdx] ?? null;
      });
      rows.push(obj);
    }

    this.logger.debug(`Parsed ${rows.length} rows from sheet "${sheetName}"`);

    // ── Audit write (S14-005) — fire and forget ───────────────────────────────
    this.supabase.admin
      .from('audit_log')
      .insert({
        event_type: 'document.parse_excel',
        summary:    'document.parse_excel',
        service_id: 'document-service',
        metadata: {
          sheet_name:   sheetName,
          row_count:    rows.length,
          buffer_bytes: buffer.length,
        },
      })
      .then(({ error }) => {
        if (error) this.logger.warn(`Audit write failed: ${error.message}`);
      })
      .catch(() => {/* non-blocking */});

    return {
      sheetName,
      sheets: workbook.SheetNames,
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Extract plain text from a PDF buffer.
   * Stub — full OCR/extraction in Sprint 19 when OCR Service is built.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parsePdf(_buffer: Buffer): ParsePdfResult {
    this.logger.warn('parsePdf called — OCR Service not yet built (Sprint 19)');
    return {
      text: '',
      pageCount: 0,
    };
  }
}
