import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    school: { findFirst: jest.Mock };
    product: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      school: { findFirst: jest.fn().mockResolvedValue({ id: 'school-1' }) },
      product: {
        create: jest.fn().mockResolvedValue({ id: 'p-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({ id: 'p-1' }),
        update: jest.fn().mockResolvedValue({ id: 'p-1', active: false }),
      },
      // list() usa $transaction([findMany, count]) para paginar
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  it('lista só os ativos, paginado', async () => {
    const result = await service.list({ page: 1, limit: 25 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true }, skip: 0, take: 25 }),
    );
    expect(result).toMatchObject({ items: [], total: 0, page: 1, limit: 25, hasNext: false });
  });

  it('busca por nome (case-insensitive) e respeita a página', async () => {
    await service.list({ page: 2, limit: 10, q: 'coxi' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, name: { contains: 'coxi', mode: 'insensitive' } },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('hasNext fica true quando ainda há registros além da página', async () => {
    prisma.$transaction.mockResolvedValue([[{ id: 'p-1' }], 40]);
    const result = await service.list({ page: 1, limit: 25 });
    expect(result.hasNext).toBe(true);
  });

  it('soft-delete marca active=false (não apaga a linha)', async () => {
    await service.softDelete('p-1');
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } }),
    );
  });

  it('soft-delete de produto inexistente → 404', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.softDelete('zzz')).rejects.toBeInstanceOf(NotFoundException);
  });
});
