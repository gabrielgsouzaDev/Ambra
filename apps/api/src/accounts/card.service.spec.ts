import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from './students.service';

describe('StudentsService — cartão (bloqueio / reemissão)', () => {
  let service: StudentsService;
  let findUnique: jest.Mock;
  let update: jest.Mock;

  beforeEach(async () => {
    findUnique = jest.fn();
    update = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: { student: { findUnique, update } } },
      ],
    }).compile();

    service = moduleRef.get(StudentsService);
  });

  it('bloqueia o cartão (cardStatus = BLOCKED)', async () => {
    findUnique.mockResolvedValue({ id: 's-1' });
    update.mockResolvedValue({ id: 's-1', name: 'Ana', cardStatus: 'BLOCKED' });

    const result = await service.blockCard('s-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's-1' }, data: { cardStatus: 'BLOCKED' } }),
    );
    expect(result.cardStatus).toBe('BLOCKED');
  });

  it('reemite: gera um qrToken novo e reativa o cartão', async () => {
    findUnique.mockResolvedValue({ id: 's-1' });
    update.mockResolvedValue({ id: 's-1', name: 'Ana', qrToken: 'novo', cardStatus: 'ACTIVE' });

    await service.reissueCard('s-1');

    const data = update.mock.calls[0]![0].data;
    expect(typeof data.qrToken).toBe('string');
    expect(data.qrToken.length).toBeGreaterThan(0);
    expect(data.cardStatus).toBe('ACTIVE');
  });

  it('404 quando o aluno não existe', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.blockCard('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});
