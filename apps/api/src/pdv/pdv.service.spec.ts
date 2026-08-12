import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PdvService } from './pdv.service';

describe('PdvService — débito atômico', () => {
  let service: PdvService;
  let tx: {
    student: { findUnique: jest.Mock; updateMany: jest.Mock };
    product: { findMany: jest.Mock };
    studentProductBlock: { findMany: jest.Mock };
    transaction: { aggregate: jest.Mock; create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };

  const coxinha = { id: 'p-1', name: 'Coxinha', priceCents: 600, available: true };
  const order = { studentId: 'stu-1', items: [{ productId: 'p-1', quantity: 2 }] }; // 2 × 600 = 1200

  beforeEach(async () => {
    tx = {
      student: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'stu-1',
          balanceCents: 10000,
          dailyLimitCents: null,
          cardStatus: 'ACTIVE',
          version: 3,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      product: { findMany: jest.fn().mockResolvedValue([coxinha]) },
      studentProductBlock: { findMany: jest.fn().mockResolvedValue([]) },
      transaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 0 } }),
        create: jest.fn().mockResolvedValue({ id: 'tx-1', createdAt: new Date() }),
      },
    };
    prisma = { $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)) };

    const moduleRef = await Test.createTestingModule({
      providers: [PdvService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PdvService);
  });

  it('debita com version+gte e registra a compra com snapshot de nome/preço', async () => {
    const result = await service.purchase(order);

    // o débito é condicionado a version E saldo >= total, num UPDATE só
    expect(tx.student.updateMany).toHaveBeenCalledWith({
      where: { id: 'stu-1', version: 3, balanceCents: { gte: 1200 } },
      data: { balanceCents: { decrement: 1200 }, version: { increment: 1 } },
    });
    expect(result.totalCents).toBe(1200);
    expect(result.balanceAfterCents).toBe(8800);

    const createArg = tx.transaction.create.mock.calls[0]![0];
    expect(createArg.data.type).toBe('PURCHASE');
    expect(createArg.data.amountCents).toBe(1200);
    expect(createArg.data.balanceAfterCents).toBe(8800);
    expect(createArg.data.items.create[0]).toMatchObject({
      productName: 'Coxinha',
      unitPriceCents: 600,
      quantity: 2,
    });
  });

  it('saldo insuficiente / concorrência (updateMany count 0) → Conflict, sem registrar', async () => {
    tx.student.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.purchase(order)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('cartão BLOCKED → recusa antes de qualquer débito', async () => {
    tx.student.findUnique.mockResolvedValue({
      id: 'stu-1',
      balanceCents: 10000,
      dailyLimitCents: null,
      cardStatus: 'BLOCKED',
      version: 3,
    });
    await expect(service.purchase(order)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });

  it('produto bloqueado para o aluno (o "X") → recusa', async () => {
    tx.studentProductBlock.findMany.mockResolvedValue([{ productId: 'p-1' }]);
    await expect(service.purchase(order)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });

  it('produto indisponível → 400', async () => {
    tx.product.findMany.mockResolvedValue([{ ...coxinha, available: false }]);
    await expect(service.purchase(order)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });

  it('limite diário excedido (gastoHoje + total > limite) → recusa', async () => {
    tx.student.findUnique.mockResolvedValue({
      id: 'stu-1',
      balanceCents: 10000,
      dailyLimitCents: 1500,
      cardStatus: 'ACTIVE',
      version: 3,
    });
    tx.transaction.aggregate.mockResolvedValue({ _sum: { amountCents: 1000 } }); // 1000 + 1200 > 1500
    await expect(service.purchase(order)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });

  it('produto do pedido inexistente/inativo → 400', async () => {
    tx.product.findMany.mockResolvedValue([]);
    await expect(service.purchase(order)).rejects.toBeInstanceOf(BadRequestException);
  });
});
