import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { PaymentEvent, PaymentGateway } from './gateway/payment-gateway';
import { RECHARGE_FEE_CENTS } from './wallet.constants';

/** Quem está agindo — o mínimo para autorizar (id + papel). */
interface Actor {
  id: string;
  role: Role;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGateway,
    private readonly config: AppConfigService,
  ) {}

  async getWallet(studentId: string, actor: Actor) {
    await this.assertCanManage(studentId, actor);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, balanceCents: true, dailyLimitCents: true },
    });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }
    return student;
  }

  async setDailyLimit(studentId: string, dailyLimitCents: number | null | undefined, actor: Actor) {
    await this.assertCanManage(studentId, actor);
    return this.prisma.student.update({
      where: { id: studentId },
      data: { dailyLimitCents: dailyLimitCents ?? null }, // ausente/null = sem limite
      select: { id: true, name: true, dailyLimitCents: true },
    });
  }

  /**
   * Cria a cobrança PIX pela porta do gateway. Atrás da flag `PAGAMENTOS_ATIVOS`.
   * NÃO credita nada aqui — o crédito só acontece no webhook confirmado.
   */
  async createRecharge(dto: CreateRechargeDto, actor: Actor) {
    if (!this.config.isPaymentsEnabled) {
      throw new ServiceUnavailableException('Recarga temporariamente indisponível.');
    }
    await this.assertCanManage(dto.studentId, actor);

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, name: true },
    });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const feeCents = RECHARGE_FEE_CENTS;
    const recharge = await this.prisma.recharge.create({
      data: {
        studentId: dto.studentId,
        guardianId: actor.id,
        amountCents: dto.amountCents,
        feeCents,
        status: 'PENDING',
      },
      select: { id: true },
    });

    const charge = await this.gateway.createPixCharge({
      rechargeId: recharge.id,
      amountCents: dto.amountCents,
      feeCents,
      payerName: student.name,
    });

    await this.prisma.recharge.update({
      where: { id: recharge.id },
      data: { gatewayChargeId: charge.gatewayChargeId },
    });

    return {
      rechargeId: recharge.id,
      amountCents: dto.amountCents,
      feeCents,
      totalCents: dto.amountCents + feeCents, // taxa transparente ("R$100 + R$1,99")
      brCode: charge.brCode,
      brCodeBase64: charge.brCodeBase64,
    };
  }

  /** Entrada do webhook do gateway. Valida pela porta e aplica o evento. */
  async handleWebhook(rawBody: unknown, signature?: string): Promise<void> {
    const event = this.gateway.verifyWebhook(rawBody, signature);
    if (!event) {
      throw new BadRequestException('Webhook inválido.');
    }
    await this.applyEvent(event);
  }

  /**
   * Credita o saldo UMA ÚNICA VEZ, mesmo com entregas duplicadas do webhook.
   * A idempotência é ancorada no `gatewayChargeId` único + a "reivindicação"
   * condicional `PENDING → CONFIRMED` (só a primeira entrega credita).
   */
  private async applyEvent(event: PaymentEvent): Promise<void> {
    const recharge = await this.prisma.recharge.findUnique({
      where: { gatewayChargeId: event.gatewayChargeId },
      select: { id: true, studentId: true, amountCents: true },
    });
    if (!recharge) {
      // Cobrança que não é nossa (ou ainda sem gatewayChargeId) → ignora, sem creditar.
      this.logger.warn(`Webhook para cobrança desconhecida: ${event.gatewayChargeId}`);
      return;
    }

    if (event.status === 'FAILED') {
      await this.prisma.recharge.updateMany({
        where: { id: recharge.id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Só a PRIMEIRA entrega (PENDING→CONFIRMED) passa daqui; duplicatas dão count 0.
      const claimed = await tx.recharge.updateMany({
        where: { id: recharge.id, status: 'PENDING' },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      if (claimed.count !== 1) {
        return; // entrega duplicada → não credita de novo (idempotente)
      }

      const student = await tx.student.update({
        where: { id: recharge.studentId },
        data: { balanceCents: { increment: recharge.amountCents } },
        select: { balanceCents: true },
      });

      // Livro-caixa append-only: registra o crédito confirmado.
      await tx.transaction.create({
        data: {
          studentId: recharge.studentId,
          type: 'RECHARGE',
          amountCents: recharge.amountCents,
          balanceAfterCents: student.balanceCents,
        },
      });
    });
  }

  /** Admin gerencia qualquer aluno; Responsável só os seus (vínculo GuardianStudent). */
  private async assertCanManage(studentId: string, actor: Actor): Promise<void> {
    if (actor.role === 'ADMIN') {
      return;
    }
    if (actor.role === 'RESPONSAVEL') {
      const link = await this.prisma.guardianStudent.findFirst({
        where: { studentId, guardianId: actor.id },
        select: { id: true },
      });
      if (link) {
        return;
      }
    }
    throw new ForbiddenException('Você não pode gerenciar este aluno.');
  }
}
