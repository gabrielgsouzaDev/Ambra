import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreatePixChargeInput,
  PaymentEvent,
  PaymentGateway,
  PixCharge,
} from './payment-gateway';

/**
 * Adapter de DESENVOLVIMENTO. Não fala com provedor nenhum: gera uma cobrança
 * determinística e aceita um webhook simulado no formato `{ gatewayChargeId, status }`.
 * Serve para construir e testar todo o caminho de dinheiro (recarga → webhook →
 * crédito idempotente) sem depender de gateway real. Troca-se por um adapter com
 * split de verdade sem tocar no núcleo.
 */
@Injectable()
export class FakeGateway extends PaymentGateway implements OnModuleInit {
  /**
   * Trava de segurança: o FakeGateway credita saldo SEM validar assinatura de
   * webhook. Deixá-lo ativo em produção permitiria creditar sem pagar. Por isso,
   * ele se recusa a subir em produção — só um adapter real (com verificação de
   * webhook) pode rodar lá.
   */
  onModuleInit(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FakeGateway não pode rodar em produção (credita sem validar assinatura). ' +
          'Configure um adapter de gateway real antes de ligar PAGAMENTOS_ATIVOS em produção.',
      );
    }
  }

  createPixCharge(input: CreatePixChargeInput): Promise<PixCharge> {
    const gatewayChargeId = `fake_${input.rechargeId}`;
    const totalCents = input.amountCents + input.feeCents;
    const brCode = `00020126FAKE-${gatewayChargeId}-${totalCents}`;
    return Promise.resolve({
      gatewayChargeId,
      brCode,
      brCodeBase64: Buffer.from(brCode).toString('base64'),
    });
  }

  verifyWebhook(rawBody: unknown): PaymentEvent | null {
    const body = rawBody as { gatewayChargeId?: unknown; status?: unknown };
    const id = body?.gatewayChargeId;
    const status = body?.status;
    if (typeof id !== 'string' || (status !== 'CONFIRMED' && status !== 'FAILED')) {
      return null;
    }
    return { gatewayChargeId: id, status };
  }
}
