import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: { transaction: { findMany } } },
      ],
    }).compile();
    service = moduleRef.get(ReportsService);
  });

  it('consolida total, contagem, ticket médio e por produto', async () => {
    findMany.mockResolvedValue([
      {
        amountCents: 1100,
        items: [
          { productName: 'Coxinha', unitPriceCents: 600, quantity: 1 },
          { productName: 'Suco', unitPriceCents: 500, quantity: 1 },
        ],
      },
      {
        amountCents: 1200,
        items: [{ productName: 'Coxinha', unitPriceCents: 600, quantity: 2 }],
      },
    ]);

    const report = await service.daily('2026-08-12');

    expect(report.date).toBe('2026-08-12');
    expect(report.totalCents).toBe(2300);
    expect(report.purchaseCount).toBe(2);
    expect(report.averageTicketCents).toBe(1150);
    // por produto, ordenado por valor desc: Coxinha 3× = 1800, Suco 1× = 500
    expect(report.byProduct).toEqual([
      { productName: 'Coxinha', quantity: 3, totalCents: 1800 },
      { productName: 'Suco', quantity: 1, totalCents: 500 },
    ]);
  });

  it('dia sem vendas → zeros e lista vazia', async () => {
    findMany.mockResolvedValue([]);
    const report = await service.daily('2026-08-12');
    expect(report).toMatchObject({ totalCents: 0, purchaseCount: 0, averageTicketCents: 0, byProduct: [] });
  });

  it('data inválida → BadRequest', async () => {
    await expect(service.daily('12/08/2026')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.daily('2026-13-40')).rejects.toBeInstanceOf(BadRequestException);
  });
});
