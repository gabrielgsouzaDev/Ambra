import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WalletService } from './wallet.service';

/**
 * Webhook do gateway de pagamento. Público (sem JWT) — a legitimidade é validada
 * DENTRO do adapter (assinatura/consulta), não por sessão. Responde 200 para o
 * provedor não reenviar; payload inválido → 400.
 */
@Controller('recharges')
export class WebhookController {
  constructor(private readonly wallet: WalletService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() body: unknown,
    @Headers('x-signature') signature?: string,
  ): Promise<{ received: true }> {
    await this.wallet.handleWebhook(body, signature);
    return { received: true };
  }
}
