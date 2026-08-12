import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

/**
 * Portal Responsável (M6). Extrato, dependentes, limiar de alerta e pedido de
 * bloqueio do cartão. Recarga, limite diário e bloqueio por produto já existem
 * (M3/M4) e o responsável vinculado já os acessa — o portal apenas completa o resto.
 */
@Module({
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
