import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginationDto, paginated, toSkipTake } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductLine {
  productName: string;
  quantity: number;
  totalCents: number;
}

/**
 * Faixa de um dia [00:00, dia seguinte 00:00) no fuso local.
 * Deploy deve usar TZ=America/Sao_Paulo para o "dia" bater com o da escola.
 */
function dayRange(dateStr?: string): { start: Date; end: Date; date: string } {
  let base: Date;
  if (dateStr) {
    const parts = dateStr.split('-').map(Number);
    const [y, m, d] = parts;
    if (parts.length !== 3 || !y || !m || !d) {
      throw new BadRequestException('Data inválida (use YYYY-MM-DD).');
    }
    base = new Date(y, m - 1, d);
    if (Number.isNaN(base.getTime()) || base.getMonth() !== m - 1) {
      throw new BadRequestException('Data inválida.');
    }
  } else {
    base = new Date();
  }
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
    start.getDate(),
  ).padStart(2, '0')}`;
  return { start, end, date };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Fechamento do dia da cantina: total vendido, nº de compras, ticket médio e por produto. */
  async daily(dateStr?: string) {
    const { start, end, date } = dayRange(dateStr);

    const purchases = await this.prisma.transaction.findMany({
      where: { type: 'PURCHASE', createdAt: { gte: start, lt: end } },
      select: {
        amountCents: true,
        items: { select: { productName: true, unitPriceCents: true, quantity: true } },
      },
    });

    const totalCents = purchases.reduce((sum, p) => sum + p.amountCents, 0);
    const purchaseCount = purchases.length;
    const averageTicketCents = purchaseCount === 0 ? 0 : Math.round(totalCents / purchaseCount);

    const byProductMap = new Map<string, ProductLine>();
    for (const purchase of purchases) {
      for (const item of purchase.items) {
        const line = byProductMap.get(item.productName) ?? {
          productName: item.productName,
          quantity: 0,
          totalCents: 0,
        };
        line.quantity += item.quantity;
        line.totalCents += item.unitPriceCents * item.quantity;
        byProductMap.set(item.productName, line);
      }
    }
    const byProduct = [...byProductMap.values()].sort((a, b) => b.totalCents - a.totalCents);

    return { date, totalCents, purchaseCount, averageTicketCents, byProduct };
  }

  /** As compras do dia, paginadas (um dia cheio numa escola grande passa de centenas). */
  async dailyTransactions(query: PaginationDto, dateStr?: string) {
    const { start, end } = dayRange(dateStr);
    const where = { type: 'PURCHASE' as const, createdAt: { gte: start, lt: end } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
        select: {
          id: true,
          amountCents: true,
          balanceAfterCents: true,
          createdAt: true,
          student: { select: { name: true, turma: true } },
          items: { select: { productName: true, unitPriceCents: true, quantity: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return paginated(items, total, query);
  }
}
