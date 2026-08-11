import { Module } from '@nestjs/common';
import { FakeGateway } from './gateway/fake-gateway';
import { PaymentGateway } from './gateway/payment-gateway';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WebhookController } from './webhook.controller';

/**
 * Carteira & Recarga (M3). O gateway entra pela PORTA `PaymentGateway`; hoje o
 * adapter é o `FakeGateway` (dev). Plugar um provedor real (com split) = trocar
 * só esta linha de provider, sem mexer no núcleo.
 */
@Module({
  controllers: [WalletController, WebhookController],
  providers: [WalletService, { provide: PaymentGateway, useClass: FakeGateway }],
})
export class WalletModule {}
