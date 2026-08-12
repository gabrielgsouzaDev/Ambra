/**
 * Porta hexagonal do gateway de pagamento. O núcleo do `wallet` fala SÓ com esta
 * interface — nunca com o SDK de um provedor. O split (repasse à cantina) e a
 * autenticação do webhook vivem DENTRO de cada adapter, invisíveis ao núcleo.
 *
 * Adapters: `FakeGateway` (dev) → provedor com split em sandbox → AbacatePay
 * quando o split dele existir. Trocar = trocar o adapter, não o produto.
 */

export interface CreatePixChargeInput {
  rechargeId: string;
  amountCents: number; // vai pra cantina (via split do provedor)
  feeCents: number; // sua taxa
  payerName?: string;
}

export interface PixCharge {
  gatewayChargeId: string; // id da cobrança no provedor (ancora a idempotência)
  brCode: string; // copia-e-cola do PIX
  brCodeBase64: string; // QR em base64 (imagem)
}

export interface PaymentEvent {
  gatewayChargeId: string;
  status: 'CONFIRMED' | 'FAILED';
}

export abstract class PaymentGateway {
  /** Cria a cobrança PIX (com split, dentro do adapter). */
  abstract createPixCharge(input: CreatePixChargeInput): Promise<PixCharge>;

  /**
   * Valida e traduz o webhook do provedor num evento de domínio.
   * Retorna `null` se inválido (assinatura ruim / payload desconhecido) — o
   * núcleo trata isso como 400, sem creditar nada.
   */
  abstract verifyWebhook(rawBody: unknown, signature?: string): PaymentEvent | null;
}
