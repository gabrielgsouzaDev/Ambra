import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from './blocks.service';

describe('BlocksService', () => {
  let service: BlocksService;
  let prisma: {
    studentProductBlock: { findMany: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
    product: { findUnique: jest.Mock };
    guardianStudent: { findFirst: jest.Mock };
  };

  const admin = { id: 'a-1', role: 'ADMIN' as const };
  const guardian = { id: 'g-1', role: 'RESPONSAVEL' as const };

  beforeEach(async () => {
    prisma = {
      studentProductBlock: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'p-1' }) },
      guardianStudent: { findFirst: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [BlocksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BlocksService);
  });

  it('bloqueia de forma idempotente (upsert por studentId+productId)', async () => {
    await service.block('s-1', 'p-1', admin);
    expect(prisma.studentProductBlock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId_productId: { studentId: 's-1', productId: 'p-1' } },
      }),
    );
  });

  it('bloquear produto inexistente → 404', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.block('s-1', 'zzz', admin)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studentProductBlock.upsert).not.toHaveBeenCalled();
  });

  it('responsável sem vínculo com o aluno é barrado', async () => {
    prisma.guardianStudent.findFirst.mockResolvedValue(null);
    await expect(service.block('s-x', 'p-1', guardian)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.studentProductBlock.upsert).not.toHaveBeenCalled();
  });

  it('responsável vinculado pode bloquear', async () => {
    prisma.guardianStudent.findFirst.mockResolvedValue({ id: 'gs-1' });
    await service.block('s-1', 'p-1', guardian);
    expect(prisma.studentProductBlock.upsert).toHaveBeenCalledTimes(1);
  });

  it('desbloqueia (deleteMany idempotente)', async () => {
    await service.unblock('s-1', 'p-1', admin);
    expect(prisma.studentProductBlock.deleteMany).toHaveBeenCalledWith({
      where: { studentId: 's-1', productId: 'p-1' },
    });
  });
});
