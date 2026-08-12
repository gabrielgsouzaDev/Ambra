import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STATEMENT_LIMIT = 30;

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  /** A "home" do portal: os dependentes do responsável logado, com saldo/limite. */
  myStudents(guardianId: string) {
    return this.prisma.student.findMany({
      where: { guardians: { some: { guardianId } } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        turma: true,
        balanceCents: true,
        dailyLimitCents: true,
        lowBalanceThresholdCents: true,
        cardStatus: true,
      },
    });
  }

  /** Extrato do dependente: últimas transações (recarga e compra) com os itens. */
  async statement(studentId: string, guardianId: string) {
    await this.assertGuardian(studentId, guardianId);
    return this.prisma.transaction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: STATEMENT_LIMIT,
      select: {
        id: true,
        type: true,
        amountCents: true,
        balanceAfterCents: true,
        createdAt: true,
        items: { select: { productName: true, unitPriceCents: true, quantity: true } },
      },
    });
  }

  /** Define o limiar do alerta de saldo baixo (a ENTREGA do alerta é v1.1). */
  async setAlertThreshold(studentId: string, guardianId: string, thresholdCents: number | null | undefined) {
    await this.assertGuardian(studentId, guardianId);
    return this.prisma.student.update({
      where: { id: studentId },
      data: { lowBalanceThresholdCents: thresholdCents ?? null },
      select: { id: true, name: true, lowBalanceThresholdCents: true },
    });
  }

  /**
   * Pedir bloqueio do cartão = bloqueio SOFT e imediato (fecha a janela do cartão
   * perdido). A reemissão física do cartão continua sendo ação da escola (Admin).
   */
  async requestCardBlock(studentId: string, guardianId: string) {
    await this.assertGuardian(studentId, guardianId);
    return this.prisma.student.update({
      where: { id: studentId },
      data: { cardStatus: 'BLOCKED' },
      select: { id: true, name: true, cardStatus: true },
    });
  }

  /** O responsável só acessa os seus dependentes (vínculo GuardianStudent). */
  private async assertGuardian(studentId: string, guardianId: string): Promise<void> {
    const link = await this.prisma.guardianStudent.findFirst({
      where: { studentId, guardianId },
      select: { id: true },
    });
    if (!link) {
      throw new ForbiddenException('Este aluno não é seu dependente.');
    }
  }
}
