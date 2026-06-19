/**
 * Real implementation: procurement.generate_po
 *
 * Generates a Purchase Order (PO) DOCX for an awarded trade package,
 * uploads it to Supabase Storage, and returns a signed URL.
 *
 * Inputs:
 *   - supplier_name      (string) — awarded supplier name
 *   - supplier_address   (string, optional) — supplier address
 *   - supplier_email     (string, optional)
 *   - supplier_reg_no    (string, optional) — CIDB / SSM reg no
 *   - trade              (string) — trade package name
 *   - line_items         (QuotationLineItem[]) — accepted line items
 *   - total_amount       (number) — contract sum
 *   - currency           (string, default 'MYR')
 *
 * Config:
 *   - project_name       (string)
 *   - po_number_prefix   (string, default 'PO')
 *   - payment_terms      (string, default '30 days net')
 *   - delivery_terms     (string, default 'DDP Site')
 *   - authorized_by      (string, optional) — name of authorizing officer
 *
 * Output:
 *   - documents          (PoArtifact[]) — same shape as RFQ artifacts for UI reuse
 *   - po_reference       (string)
 *
 * Security note: AI is advisory only. This node generates a DRAFT PO for
 * human review. It does not constitute a binding contract until signed by an
 * authorized officer. QS-OS must not impersonate a registered QS.
 *
 * Sprint 17 (S17-006)
 */
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  Packer,
  WidthType,
  BorderStyle,
  HeadingLevel,
  convertInchesToTwip,
  ShadingType,
} from 'docx';
import type { NodeContext, NodeExecuteResult } from '@qsos/execution-engine';
import type { LibraryService } from '../../library/library.service';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PoLineItem {
  item_no?: string;
  description: string;
  unit?: string;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
}

export interface PoArtifact {
  trade: string;
  label: string;
  storage_path: string;
  url: string;
  size_bytes: number;
  total_amount: number;
  currency: string;
  item_count: number;
  po_reference: string;
}

// ── Document colours (match RFQ branding) ─────────────────────────────────────

const BRAND_BLUE   = '1E3A5F';
const HEADER_GREY  = 'E8EDF2';
const BORDER_COLOR = 'C5CDD6';
const AWARDED_GREEN = 'D4EDDA';  // soft green for awarded header row

// ── Helpers ───────────────────────────────────────────────────────────────────

function cell(
  text: string,
  opts: {
    bold?: boolean;
    shade?: boolean;
    shadeColor?: string;
    center?: boolean;
    small?: boolean;
    width?: number;
  } = {},
): TableCell {
  const shadeColor = opts.shadeColor ?? HEADER_GREY;
  return new TableCell({
    shading: opts.shade ? { type: ShadingType.SOLID, color: shadeColor } : undefined,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      left:   { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      right:  { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
    },
    margins:  { top: 60, bottom: 60, left: 80, right: 80 },
    columnSpan: opts.width,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: opts.small ? 16 : 18,
          }),
        ],
      }),
    ],
  });
}

function spacer(lines = 1): Paragraph[] {
  return Array.from({ length: lines }, () =>
    new Paragraph({ children: [new TextRun({ text: '' })] }),
  );
}

function fmt(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined) return '';
  return n.toLocaleString('en-MY', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function today(): string {
  return new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── DOCX builder ──────────────────────────────────────────────────────────────

function buildPoDocument(opts: {
  poRef:          string;
  projectName:    string;
  trade:          string;
  supplierName:   string;
  supplierAddress: string;
  supplierEmail:  string;
  supplierRegNo:  string;
  lineItems:      PoLineItem[];
  totalAmount:    number;
  currency:       string;
  paymentTerms:   string;
  deliveryTerms:  string;
  authorizedBy:   string;
}): Document {
  const {
    poRef, projectName, trade, supplierName, supplierAddress, supplierEmail,
    supplierRegNo, lineItems, totalAmount, currency, paymentTerms, deliveryTerms, authorizedBy,
  } = opts;

  // ── Title block ─────────────────────────────────────────────────────────────
  const titleBlock = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: 'PURCHASE ORDER', bold: true, size: 48, color: BRAND_BLUE }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({ text: `PO Reference: ${poRef}`, bold: true, size: 26, color: BRAND_BLUE }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 400 },
      children: [
        new TextRun({ text: `Trade Package: ${trade}`, size: 22, color: '555555' }),
      ],
    }),
  ];

  // ── PO header info table ───────────────────────────────────────────────────
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell('PO Reference',   { bold: true, shade: true }),
          cell(poRef),
          cell('Date Issued',    { bold: true, shade: true }),
          cell(today()),
        ],
      }),
      new TableRow({
        children: [
          cell('Project',        { bold: true, shade: true }),
          cell(projectName),
          cell('Currency',       { bold: true, shade: true }),
          cell(currency),
        ],
      }),
      new TableRow({
        children: [
          cell('Payment Terms',  { bold: true, shade: true }),
          cell(paymentTerms),
          cell('Delivery Terms', { bold: true, shade: true }),
          cell(deliveryTerms),
        ],
      }),
    ],
  });

  // ── Supplier details ────────────────────────────────────────────────────────
  const supplierSection = [
    ...spacer(),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
      children: [new TextRun({ text: '1.  SUPPLIER DETAILS', bold: true, size: 24, color: BRAND_BLUE })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell('Company Name',       { bold: true, shade: true }),
            cell(supplierName),
            cell('Reg / CIDB No',      { bold: true, shade: true }),
            cell(supplierRegNo || '—'),
          ],
        }),
        new TableRow({
          children: [
            cell('Address',            { bold: true, shade: true }),
            cell(supplierAddress || '—'),
            cell('Email',              { bold: true, shade: true }),
            cell(supplierEmail || '—'),
          ],
        }),
      ],
    }),
  ];

  // ── Line items table ────────────────────────────────────────────────────────
  const itemsSection: (Paragraph | Table)[] = [
    ...spacer(),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
      children: [new TextRun({ text: '2.  SCOPE AND PRICING', bold: true, size: 24, color: BRAND_BLUE })],
    }),
  ];

  if (lineItems.length > 0) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        cell('Item',          { bold: true, shade: true, center: true, small: true }),
        cell('Description',   { bold: true, shade: true, small: true }),
        cell('Unit',          { bold: true, shade: true, center: true, small: true }),
        cell('Qty',           { bold: true, shade: true, center: true, small: true }),
        cell(`Rate (${currency})`,   { bold: true, shade: true, center: true, small: true }),
        cell(`Amount (${currency})`, { bold: true, shade: true, center: true, small: true }),
      ],
    });

    const dataRows = lineItems.map((li) => {
      const amount = li.amount ?? (li.qty != null && li.rate != null ? li.qty * li.rate : null);
      return new TableRow({
        children: [
          cell(li.item_no ?? '',         { center: true, small: true }),
          cell(li.description ?? '',     { small: true }),
          cell(li.unit ?? '',            { center: true, small: true }),
          cell(li.qty != null ? fmt(li.qty, 0) : '', { center: true, small: true }),
          cell(li.rate != null ? fmt(li.rate) : '',   { center: true, small: true }),
          cell(amount != null ? fmt(amount) : '',      { center: true, small: true }),
        ],
      });
    });

    const totalRow = new TableRow({
      children: [
        cell('', {}),
        cell('CONTRACT SUM (INCLUSIVE OF ALL COSTS)', { bold: true, shade: true, shadeColor: AWARDED_GREEN, small: true }),
        cell('', {}),
        cell('', {}),
        cell('', {}),
        cell(`${currency} ${fmt(totalAmount)}`, { bold: true, shade: true, shadeColor: AWARDED_GREEN, center: true, small: true }),
      ],
    });

    itemsSection.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows, totalRow],
        columnWidths: [700, 4200, 700, 700, 1200, 1200],
      }),
    );
  } else {
    itemsSection.push(
      new Paragraph({
        spacing: { before: 0, after: 200 },
        children: [
          new TextRun({
            text: `Total Contract Sum: ${currency} ${fmt(totalAmount)}`,
            bold: true,
            size: 22,
            color: BRAND_BLUE,
          }),
        ],
      }),
    );
  }

  // ── Terms and conditions ────────────────────────────────────────────────────
  const termsSection = [
    ...spacer(),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
      children: [new TextRun({ text: '3.  TERMS AND CONDITIONS', bold: true, size: 24, color: BRAND_BLUE })],
    }),
    ...[
      `1. This Purchase Order constitutes a binding agreement subject to the General Conditions of Contract and Project Specifications.`,
      `2. Payment shall be made within ${paymentTerms} of receipt of a valid tax invoice.`,
      `3. Delivery/commencement shall be on the terms: ${deliveryTerms}.`,
      '4. All materials and workmanship shall comply with Malaysian Standards (MS), UBBL, and CIDB requirements.',
      "5. Variations shall only be recognised if approved in writing by the Employer's Representative prior to execution.",
      '6. The Supplier shall maintain adequate insurance coverage for the duration of this contract.',
      '7. Any disputes shall be referred to adjudication under the Construction Industry Payment and Adjudication Act 2012 (CIPAA).',
      '8. DRAFT — This document is computer-generated by QS-OS and is subject to review and approval by an authorized Quantity Surveyor before it constitutes a binding commitment.',
    ].map((term) =>
      new Paragraph({
        spacing: { before: 60, after: 60 },
        indent: { left: convertInchesToTwip(0.2) },
        children: [new TextRun({ text: term, size: 18 })],
      }),
    ),
  ];

  // ── Signature block ─────────────────────────────────────────────────────────
  const sigBlock = [
    ...spacer(2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:             { style: BorderStyle.NONE },
        bottom:          { style: BorderStyle.NONE },
        left:            { style: BorderStyle.NONE },
        right:           { style: BorderStyle.NONE },
        insideHorizontal:{ style: BorderStyle.NONE },
        insideVertical:  { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Issued by (Employer):', bold: true, size: 18 })] }),
                ...spacer(3),
                new Paragraph({ children: [new TextRun({ text: '________________________________', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `Name:   ${authorizedBy || '________________________'}`, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Title:    ________________________', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Date:    ________________________', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Company Stamp:', size: 18 })] }),
              ],
            }),
            new TableCell({
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({ children: [new TextRun({ text: `Accepted by (${supplierName}):`, bold: true, size: 18 })] }),
                ...spacer(3),
                new Paragraph({ children: [new TextRun({ text: '________________________________', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Name:   ________________________', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Title:    ________________________', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Date:    ________________________', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Company Stamp:', size: 18 })] }),
              ],
            }),
          ],
        }),
      ],
    }),
    ...spacer(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `DRAFT — Generated by QS-OS Workflow Platform — ${today()} | AI-assisted, for human review and authorization only`,
          size: 14,
          color: 'CC0000',
          italics: true,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'This document does not constitute a binding contract until signed by an authorized officer.',
          size: 14,
          color: 'AAAAAA',
          italics: true,
        }),
      ],
    }),
  ];

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left:   convertInchesToTwip(1.25),
              right:  convertInchesToTwip(1.25),
            },
          },
        },
        children: [
          ...titleBlock,
          infoTable,
          ...supplierSection,
          ...itemsSection,
          ...termsSection,
          ...sigBlock,
        ],
      },
    ],
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

export async function realGeneratePo(
  ctx: NodeContext,
  libraryService: LibraryService,
): Promise<NodeExecuteResult> {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  const supplierName    = ((ctx.inputs['supplier_name'] as string | undefined) ?? '').trim();
  const supplierAddress = ((ctx.inputs['supplier_address'] as string | undefined) ?? '').trim();
  const supplierEmail   = ((ctx.inputs['supplier_email'] as string | undefined) ?? '').trim();
  const supplierRegNo   = ((ctx.inputs['supplier_reg_no'] as string | undefined) ?? '').trim();
  const trade           = ((ctx.inputs['trade'] as string | undefined) ?? 'General').trim();
  const lineItems       = (ctx.inputs['line_items'] as PoLineItem[] | undefined) ?? [];
  const totalAmount     = Number(ctx.inputs['total_amount'] ?? 0);
  const currency        = ((ctx.inputs['currency'] as string | undefined) ?? 'MYR').trim();

  // ── Config ─────────────────────────────────────────────────────────────────
  const projectName   = ((ctx.config['project_name']     as string | undefined) ?? 'Project').trim();
  const poPrefix      = ((ctx.config['po_number_prefix'] as string | undefined) ?? 'PO').trim();
  const paymentTerms  = ((ctx.config['payment_terms']    as string | undefined) ?? '30 days net').trim();
  const deliveryTerms = ((ctx.config['delivery_terms']   as string | undefined) ?? 'DDP Site').trim();
  const authorizedBy  = ((ctx.config['authorized_by']    as string | undefined) ?? '').trim();

  if (!supplierName) {
    return {
      status: 'failure',
      outputs: {},
      logs: [],
      error: {
        code: 'NO_SUPPLIER',
        message: 'supplier_name input is required. Connect a supplier data source or enter it manually.',
      },
    };
  }

  // ── Generate PO reference ──────────────────────────────────────────────────
  const safeTrade = trade.replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const poRef     = `${poPrefix}-${safeTrade}-${Date.now().toString().slice(-6)}`;

  ctx.logger.info(`Generating PO ${poRef} for ${supplierName} — ${trade}`);

  // ── Build DOCX ─────────────────────────────────────────────────────────────
  let buffer: Buffer;
  try {
    const doc = buildPoDocument({
      poRef,
      projectName,
      trade,
      supplierName,
      supplierAddress,
      supplierEmail,
      supplierRegNo,
      lineItems,
      totalAmount,
      currency,
      paymentTerms,
      deliveryTerms,
      authorizedBy,
    });
    buffer = await Packer.toBuffer(doc);
    ctx.logger.info(`  DOCX built — ${(buffer.length / 1024).toFixed(1)} KB`);
  } catch (err: unknown) {
    const msg = `Failed to build PO DOCX: ${err instanceof Error ? err.message : String(err)}`;
    ctx.logger.error(msg);
    return {
      status: 'failure',
      outputs: {},
      logs: [],
      error: { code: 'DOCX_BUILD_FAILED', message: msg },
    };
  }

  // ── Upload to Storage ──────────────────────────────────────────────────────
  const storagePath = `artifacts/${ctx.organizationId}/${ctx.executionId}/${safeTrade}_${Date.now()}_po.docx`;
  try {
    await libraryService.uploadBuffer(buffer, storagePath, 'application/octet-stream');
    ctx.logger.info(`  Uploaded to: ${storagePath}`);
  } catch (err: unknown) {
    const msg = `Storage upload failed: ${err instanceof Error ? err.message : String(err)}`;
    ctx.logger.error(msg);
    return {
      status: 'failure',
      outputs: {},
      logs: [],
      error: { code: 'UPLOAD_FAILED', message: msg },
    };
  }

  // ── Signed URL (2 hours) ──────────────────────────────────────────────────
  let signedUrl: string;
  try {
    signedUrl = await libraryService.createSignedUrl(storagePath, 7200);
  } catch (err: unknown) {
    const msg = `Signed URL generation failed: ${err instanceof Error ? err.message : String(err)}`;
    ctx.logger.error(msg);
    return {
      status: 'failure',
      outputs: {},
      logs: [],
      error: { code: 'SIGNED_URL_FAILED', message: msg },
    };
  }

  const artifact: PoArtifact = {
    trade,
    label:        `PO — ${trade}`,
    storage_path: storagePath,
    url:          signedUrl,
    size_bytes:   buffer.length,
    total_amount: totalAmount,
    currency,
    item_count:   lineItems.length,
    po_reference: poRef,
  };

  const summary = `Purchase Order ${poRef} generated for ${supplierName} (${currency} ${fmt(totalAmount)}) — ${lineItems.length} line item(s)`;
  ctx.logger.info(summary);

  return {
    status: 'success',
    outputs: {
      documents:    [artifact],   // ExecutionLogPanel detects this for download links
      po_reference: poRef,
      supplier:     supplierName,
      total_amount: totalAmount,
      currency,
    },
    logs: [],
    summary,
  };
}
