import { Document, Packer, Paragraph } from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { DocumentService } from './document.service';

const getText = jest.fn();
const destroy = jest.fn();
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({ getText, destroy })),
}));

function makeService(): DocumentService {
  const supabase = {
    admin: {
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })),
    },
  };
  return new DocumentService(supabase as never);
}

describe('DocumentService text extraction', () => {
  it('extracts page text from a real PDF buffer', async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([400, 300]);
    page.drawText('Payment certificate 07', { x: 40, y: 240, size: 16, font });
    const buffer = Buffer.from(await pdf.save());
    getText.mockResolvedValue({
      text: 'Payment certificate 07', total: 1,
      pages: [{ num: 1, text: 'Payment certificate 07' }],
    });
    destroy.mockResolvedValue(undefined);

    const result = await makeService().parsePdf(buffer);

    expect(result.pageCount).toBe(1);
    expect(result.text).toContain('Payment certificate 07');
    expect(result.pages[0]).toMatchObject({ page: 1 });
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('extracts plain text from a real DOCX buffer', async () => {
    const buffer = await Packer.toBuffer(new Document({
      sections: [{ children: [new Paragraph('Variation order VO-12')] }],
    }));

    const result = await makeService().parseDocx(buffer);

    expect(result.text).toContain('Variation order VO-12');
    expect(result.messages).toEqual([]);
  });
});
