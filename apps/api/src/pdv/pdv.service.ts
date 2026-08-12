import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseDto } from './dto/purchase.dto';

const STUDENT_PDV_SELECT = {
  id: true,
  name: true,
  photoUrl: true,
  cardStatus: true,
  balanceCents: true,
  dailyLimitCents: true,
} as const;

/** Início do dia local (para o gasto diário). Deploy deve usar TZ=America/Sao_Paulo. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

interface StudentPdv {
  id: string;
  name: string;
  photoUrl: string | null;
  cardStatus: 'ACTIVE' | 'BLOCKED';
  balanceCents: number;
  dailyLimitCents: number | null;
}

@Injectable()
export class PdvService {
  constructor(private readonly prisma: PrismaService) {}

  /** Consulta pelo QR (token opaco) — a leitura da câmera no balcão. */
  async lookupByToken(token: string) {
    if (!token) {
      throw new BadRequestException('Token do cartão é obrigatório.');
    }
    const student = await this.prisma.student.findUnique({
      where: { qrToken: token },
      select: STUDENT_PDV_SELECT,
    });
    if (!student) {
      throw new NotFoundException('Cartão não encontrado.');
    }
    return this.buildView(student);
  }

  /** Fallback "esqueceu o cartão": consulta pontual por RM (+ foto para confirmar). */
  async lookupByRm(rm: string) {
    if (!rm) {
      throw new BadRequestException('RM é obrigatório.');
    }
    const school = await this.prisma.school.findFirst({ select: { id: true } });
    if (!school) {
      throw new NotFoundException('Escola não inicializada.');
    }
    const student = await this.prisma.student.findFirst({
      where: { schoolId: school.id, rm },
      select: STUDENT_PDV_SELECT,
    });
    if (!student) {
      throw new NotFoundException('RM não encontrado.');
    }
    return this.buildView(student);
  }

  /** Monta a visão do PDV: saldo, limite restante hoje e o catálogo com flags. */
  private async buildView(student: StudentPdv) {
    const spent = await this.prisma.transaction.aggregate({
      where: { studentId: student.id, type: 'PURCHASE', createdAt: { gte: startOfToday() } },
      _sum: { amountCents: true },
    });
    const dailySpentCents = spent._sum.amountCents ?? 0;
    const remainingTodayCents =
      student.dailyLimitCents === null
        ? null
        : Math.max(0, student.dailyLimitCents - dailySpentCents);

    const products = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, priceCents: true, available: true },
    });
    const blocks = await this.prisma.studentProductBlock.findMany({
      where: { studentId: student.id },
      select: { productId: true },
    });
    const blockedSet = new Set(blocks.map((b) => b.productId));

    return {
      student: {
        id: student.id,
        name: student.name,
        photoUrl: student.photoUrl,
        cardStatus: student.cardStatus,
        balanceCents: student.balanceCents,
        dailyLimitCents: student.dailyLimitCents,
        dailySpentCents,
        remainingTodayCents,
      },
      // Bloqueado marcado "X"; indisponível vem com available=false (cinza no PDV).
      catalog: products.map((p) => ({ ...p, blocked: blockedSet.has(p.id) })),
    };
  }

  /**
   * Débito atômico à prova de concorrência — o único ponto realmente delicado.
   * Dois caixas NUNCA gastam o mesmo saldo duas vezes: o decremento é condicionado
   * a `version` + `balanceCents >= total` num único UPDATE (`updateMany`); se não
   * afetar exatamente 1 linha, aborta. Preços e regras são revalidados no servidor
   * (nunca confia no cliente).
   */
  async purchase(dto: PurchaseDto) {
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: dto.studentId },
        select: {
          id: true,
          balanceCents: true,
          dailyLimitCents: true,
          cardStatus: true,
          version: true,
        },
      });
      if (!student) {
        throw new NotFoundException('Aluno não encontrado.');
      }
      if (student.cardStatus === 'BLOCKED') {
        throw new ForbiddenException('Cartão bloqueado. Peça a reemissão na secretaria.');
      }

      const productIds = [...new Set(dto.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, active: true },
        select: { id: true, name: true, priceCents: true, available: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      for (const item of dto.items) {
        const product = byId.get(item.productId);
        if (!product) {
          throw new BadRequestException('Produto inexistente no pedido.');
        }
        if (!product.available) {
          throw new BadRequestException(`"${product.name}" está indisponível.`);
        }
      }

      // Bloqueios do aluno (o "X") — recusa o item bloqueado.
      const blocked = await tx.studentProductBlock.findMany({
        where: { studentId: student.id, productId: { in: productIds } },
        select: { productId: true },
      });
      if (blocked.length > 0) {
        const names = blocked.map((b) => byId.get(b.productId)?.name).filter(Boolean);
        throw new ForbiddenException(`Item(ns) bloqueado(s) para este aluno: ${names.join(', ')}.`);
      }

      // Total pelo preço ATUAL do servidor (nunca o enviado pelo cliente).
      const lineItems = dto.items.map((item) => {
        const product = byId.get(item.productId)!;
        return {
          productId: product.id,
          productName: product.name,
          unitPriceCents: product.priceCents,
          quantity: item.quantity,
        };
      });
      const totalCents = lineItems.reduce((sum, li) => sum + li.unitPriceCents * li.quantity, 0);
      if (totalCents <= 0) {
        throw new BadRequestException('Pedido sem valor.');
      }

      // Limite diário (gastoHoje somado na MESMA transação).
      if (student.dailyLimitCents !== null) {
        const spent = await tx.transaction.aggregate({
          where: { studentId: student.id, type: 'PURCHASE', createdAt: { gte: startOfToday() } },
          _sum: { amountCents: true },
        });
        const spentToday = spent._sum.amountCents ?? 0;
        if (spentToday + totalCents > student.dailyLimitCents) {
          throw new ForbiddenException('Limite diário excedido.');
        }
      }

      // Débito atômico: version + saldo suficiente numa condição só.
      const debit = await tx.student.updateMany({
        where: { id: student.id, version: student.version, balanceCents: { gte: totalCents } },
        data: { balanceCents: { decrement: totalCents }, version: { increment: 1 } },
      });
      if (debit.count !== 1) {
        // Saldo insuficiente OU alguém debitou em paralelo (version mudou).
        throw new ConflictException('Saldo insuficiente ou compra concorrente. Refaça a leitura.');
      }

      const balanceAfterCents = student.balanceCents - totalCents;
      const transaction = await tx.transaction.create({
        data: {
          studentId: student.id,
          type: 'PURCHASE',
          amountCents: totalCents,
          balanceAfterCents,
          items: {
            create: lineItems.map((li) => ({
              productId: li.productId,
              productName: li.productName,
              unitPriceCents: li.unitPriceCents,
              quantity: li.quantity,
            })),
          },
        },
        select: { id: true, createdAt: true },
      });

      return { transactionId: transaction.id, totalCents, balanceAfterCents, items: lineItems };
    });
  }
}
