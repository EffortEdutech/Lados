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
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
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
  pages: Array<{ page: number; text: string }>;
}

export interface ParseDocxResult {
  text: string;
  messages: Array<{ type: string; message: string }>;
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
      }, () => {/* non-blocking */});

    return {
      sheetName,
      sheets: workbook.SheetNames,
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  async parsePdf(buffer: Buffer, options: { pages?: number[] } = {}): Promise<ParsePdfResult> {
    this.logger.debug(`Parsing PDF buffer (${buffer.length} bytes)`);
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText(options.pages?.length ? { partial: options.pages } : undefined);
      const pages = result.pages.map((page) => ({ page: page.num, text: page.text }));
      this.writeParseAudit('document.parse_pdf', buffer.length, {
        page_count: result.total,
        extracted_pages: pages.map((page) => page.page),
        character_count: result.text.length,
      });
      return { text: result.text, pageCount: result.total, pages };
    } finally {
      await parser.destroy();
    }
  }

  async parseDocx(buffer: Buffer): Promise<ParseDocxResult> {
    this.logger.debug(`Parsing DOCX buffer (${buffer.length} bytes)`);
    const result = await mammoth.extractRawText({ buffer });
    const messages = result.messages.map((message) => ({ type: message.type, message: message.message }));
    this.writeParseAudit('document.parse_docx', buffer.length, {
      character_count: result.value.length,
      message_count: messages.length,
    });
    return { text: result.value, messages };
  }

  private writeParseAudit(eventType: string, bufferBytes: number, metadata: Record<string, unknown>): void {
    this.supabase.admin.from('audit_log').insert({
      event_type: eventType,
      summary: eventType,
      service_id: 'document-service',
      metadata: { ...metadata, buffer_bytes: bufferBytes },
    }).then(({ error }) => {
      if (error) this.logger.warn(`Audit write failed: ${error.message}`);
    }, () => {/* non-blocking */});
  }
}
