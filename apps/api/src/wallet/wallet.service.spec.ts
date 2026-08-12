import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { FakeGateway } from './gateway/fake-gateway';
import { PaymentGateway } from './gateway/payment-gateway';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let paymentsEnabled: boolean;

  // Cliente da transação (o que roda dentro de prisma.$transaction).
  let txClient: {
    recharge: { updateMany: jest.Mock };
    student: { update: jest.Mock };
    transaction: { create: jest.Mock };
  };

  let prisma: {
    student: { findUnique: jest.Mock; update: jest.Mock };
    recharge: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findUnique: jest.Mock };
    guardianStudent: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const admin = { id: 'admin-1', role: 'ADMIN' as const };

  beforeEach(async () => {
    paymentsEnabled = true;

    txClient = {
      recharge: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      student: { update: jest.fn().mockResolvedValue({ balanceCents: 10000 }) },
      transaction: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      student: {
        findUnique: jest.fn().mockResolvedValue({ id: 'stu-1', name: 'Ana' }),
        update: jest.fn(),
      },
      recharge: {
        create: jest.fn().mockResolvedValue({ id: 'rec-1' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      guardianStudent: { findFirst: jest.fn() },
      $transaction: jest.fn((cb: (t: typeof txClient) => unknown) => cb(txClient)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentGateway, useClass: FakeGateway },
        {
          provide: AppConfigService,
          useValue: {
            get isPaymentsEnabled() {
              return paymentsEnabled;
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(WalletService);
  });

  describe('createRecharge', () => {
    it('cria a cobrança e devolve o total transparente (valor + taxa de 199)', async () => {
      const result = await service.createRecharge({ studentId: 'stu-1', amountCents: 10000 }, admin);

      expect(prisma.recharge.create).toHaveBeenCalledTimes(1);
      expect(result.feeCents).toBe(199);
      expect(result.totalCents).toBe(10199);
      expect(result.brCode).toContain('fake_rec-1');
      // grava o gatewayChargeId retornado pela porta
      expect(prisma.recharge.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { gatewayChargeId: 'fake_rec-1' } }),
      );
    });

    it('bloqueia a recarga quando PAGAMENTOS_ATIVOS=false', async () => {
      paymentsEnabled = false;
      await expect(
        service.createRecharge({ studentId: 'stu-1', amountCents: 10000 }, admin),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(prisma.recharge.create).not.toHaveBeenCalled();
    });

    it('barra responsável sem vínculo com o aluno', async () => {
      prisma.guardianStudent.findFirst.mockResolvedValue(null);
      await expect(
        service.createRecharge(
          { studentId: 'stu-x', amountCents: 10000 },
          { id: 'g-1', role: 'RESPONSAVEL' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.recharge.create).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook — crédito idempotente', () => {
    beforeEach(() => {
      prisma.recharge.findUnique.mockResolvedValue({
        id: 'rec-1',
        studentId: 'stu-1',
        amountCents: 10000,
      });
    });

    it('credita o saldo no primeiro CONFIRMED (e registra no livro-caixa)', async () => {
      txClient.recharge.updateMany.mockResolvedValue({ count: 1 });

      await service.handleWebhook({ gatewayChargeId: 'fake_rec-1', status: 'CONFIRMED' });

      expect(txClient.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { balanceCents: { increment: 10000 } } }),
      );
      expect(txClient.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'RECHARGE',
            amountCents: 10000,
            balanceAfterCents: 10000,
          }),
        }),
      );
    });

    it('NÃO credita de novo numa entrega duplicada (a reivindicação falha)', async () => {
      txClient.recharge.updateMany.mockResolvedValue({ count: 0 }); // já era CONFIRMED

      await service.handleWebhook({ gatewayChargeId: 'fake_rec-1', status: 'CONFIRMED' });

      expect(txClient.student.update).not.toHaveBeenCalled();
      expect(txClient.transaction.create).not.toHaveBeenCalled();
    });

    it('cobrança desconhecida não credita nada', async () => {
      prisma.recharge.findUnique.mockResolvedValue(null);

      await service.handleWebhook({ gatewayChargeId: 'fake_zzz', status: 'CONFIRMED' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('FAILED marca a recarga e não credita', async () => {
      await service.handleWebhook({ gatewayChargeId: 'fake_rec-1', status: 'FAILED' });

      expect(prisma.recharge.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FAILED' } }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('webhook inválido → BadRequest, sem tocar no banco', async () => {
      await expect(service.handleWebhook({ foo: 'bar' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.recharge.findUnique).not.toHaveBeenCalled();
    });
  });
});
