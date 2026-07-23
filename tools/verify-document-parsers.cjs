#!/usr/bin/env node

const path = require('path');
const { createRequire } = require('module');

const apiRequire = createRequire(path.join(__dirname, '..', 'apps', 'api', 'package.json'));
const { PDFParse } = apiRequire('pdf-parse');
const mammoth = apiRequire('mammoth');
const { PDFDocument, StandardFonts } = apiRequire('pdf-lib');
const { Document, Packer, Paragraph } = apiRequire('docx');

async function main() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([400, 300]);
  page.drawText('Payment certificate 07', { x: 40, y: 240, size: 16, font });
  const parser = new PDFParse({ data: Buffer.from(await pdf.save()) });
  let pdfText;
  try {
    pdfText = (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
  if (!pdfText.includes('Payment certificate 07')) throw new Error('PDF text extraction verification failed');

  const docxBuffer = await Packer.toBuffer(new Document({
    sections: [{ children: [new Paragraph('Variation order VO-12')] }],
  }));
  const docxText = (await mammoth.extractRawText({ buffer: docxBuffer })).value;
  if (!docxText.includes('Variation order VO-12')) throw new Error('DOCX text extraction verification failed');

  console.log('Document parser verification passed: PDF and DOCX text extracted.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
