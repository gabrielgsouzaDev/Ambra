import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { toBuffer } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

const MARGIN = 36;
const COLS = 2;
const ROWS = 4;

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * PDF (A4) com uma grade de cartões — nome, turma, RM e o QR de cada aluno —
   * para a escola imprimir e distribuir. Usa o qrToken atual (reemissão gera outro).
   */
  async generateCardsPdf(): Promise<Buffer> {
    const students = await this.prisma.student.findMany({
      orderBy: [{ turma: 'asc' }, { name: 'asc' }],
      select: { name: true, turma: true, rm: true, qrToken: true },
    });

    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const cardW = (doc.page.width - MARGIN * 2) / COLS;
    const cardH = (doc.page.height - MARGIN * 2) / ROWS;
    const perPage = COLS * ROWS;

    for (let i = 0; i < students.length; i++) {
      const student = students[i]!;
      const slot = i % perPage;
      if (i > 0 && slot === 0) doc.addPage();

      const x = MARGIN + (slot % COLS) * cardW;
      const y = MARGIN + Math.floor(slot / COLS) * cardH;

      const qr = await toBuffer(student.qrToken, { margin: 1, width: 110 });
      doc.rect(x + 4, y + 4, cardW - 8, cardH - 8).stroke('#cccccc');
      doc.image(qr, x + 12, y + 12, { width: 92, height: 92 });
      doc.fillColor('#000000').fontSize(12).text(student.name, x + 112, y + 16, { width: cardW - 124 });
      doc.fillColor('#555555').fontSize(9).text(`Turma: ${student.turma ?? '-'}`, x + 112, y + 42, { width: cardW - 124 });
      doc.fillColor('#555555').fontSize(9).text(`RM: ${student.rm}`, x + 112, y + 56, { width: cardW - 124 });
    }

    if (students.length === 0) {
      doc.fillColor('#555555').fontSize(12).text('Nenhum aluno cadastrado ainda.', MARGIN, MARGIN);
    }

    doc.end();
    return done;
  }
}
