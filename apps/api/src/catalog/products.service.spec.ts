import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    school: { findFirst: jest.Mock };
    product: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      school: { findFirst: jest.fn().mockResolvedValue({ id: 'school-1' }) },
      product: {
        create: jest.fn().mockResolvedValue({ id: 'p-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'p-1' }),
        update: jest.fn().mockResolvedValue({ id: 'p-1', active: false }),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  it('lista só os ativos por padrão', async () => {
    await service.list();
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } }),
    );
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
