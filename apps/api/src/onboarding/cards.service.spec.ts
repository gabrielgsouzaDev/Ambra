import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CardsService } from './cards.service';

describe('CardsService', () => {
  let service: CardsService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [CardsService, { provide: PrismaService, useValue: { student: { findMany } } }],
    }).compile();
    service = moduleRef.get(CardsService);
  });

  // Executa de verdade pdfkit + qrcode.toBuffer + doc.image — trava a regressão
  // que o smoke provou à mão (buffer PDF real, não um stub).
  it('gera um PDF válido (%PDF) com os cartões dos alunos', async () => {
    findMany.mockResolvedValue([
      { name: 'Ana Souza', turma: '5A', rm: '001', qrToken: 'tok-ana' },
      { name: 'Bruno Lima', turma: '6B', rm: '002', qrToken: 'tok-bruno' },
    ]);

    const pdf = await service.generateCardsPdf();

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('gera um PDF válido mesmo sem alunos', async () => {
    findMany.mockResolvedValue([]);
    const pdf = await service.generateCardsPdf();
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
