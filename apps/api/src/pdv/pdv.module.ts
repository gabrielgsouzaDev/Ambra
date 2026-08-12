import { Module } from '@nestjs/common';
import { PdvController } from './pdv.controller';
import { PdvService } from './pdv.service';

/** PDV / Débito (M5): leitura do cartão e o débito atômico — o coração do sistema. */
@Module({
  controllers: [PdvController],
  providers: [PdvService],
})
export class PdvModule {}
