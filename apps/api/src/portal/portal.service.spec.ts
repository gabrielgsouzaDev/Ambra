import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PortalService } from './portal.service';

describe('PortalService', () => {
  let service: PortalService;
  let prisma: {
    student: { findMany: jest.Mock; update: jest.Mock };
    transaction: { findMany: jest.Mock; count: jest.Mock };
    guardianStudent: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const guardianId = 'g-1';

  beforeEach(async () => {
    prisma = {
      student: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) },
      transaction: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      guardianStudent: { findFirst: jest.fn() },
      // statement() usa $transaction([findMany, count]) para paginar
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PortalService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PortalService);
  });

  it('lista só os dependentes do responsável logado', async () => {
    await service.myStudents(guardianId);
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { guardians: { some: { guardianId } } } }),
    );
  });

  it('extrato de aluno que NÃO é dependente → Forbidden (sem ler transações)', async () => {
    prisma.guardianStudent.findFirst.mockResolvedValue(null);
    await expect(
      service.statement('s-x', guardianId, { page: 1, limit: 25 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('extrato de dependente → devolve as transações paginadas', async () => {
    prisma.guardianStudent.findFirst.mockResolvedValue({ id: 'gs-1' });

    const result = await service.statement('s-1', guardianId, { page: 2, limit: 10 });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 's-1' },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toMatchObject({ page: 2, limit: 10 });
  });

  it('pedir bloqueio do cartão marca cardStatus=BLOCKED (após checar vínculo)', async () => {
    prisma.guardianStudent.findFirst.mockResolvedValue({ id: 'gs-1' });
    await service.requestCardBlock('s-1', guardianId);
    expect(prisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's-1' }, data: { cardStatus: 'BLOCKED' } }),
    );
  });

  it('define o limiar de alerta (null desliga)', async () => {
    prisma.guardianStudent.findFirst.mockResolvedValue({ id: 'gs-1' });
    await service.setAlertThreshold('s-1', guardianId, null);
    expect(prisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lowBalanceThresholdCents: null } }),
    );
  });
});
