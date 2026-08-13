import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PurchaseDto } from './dto/purchase.dto';
import { PdvService } from './pdv.service';

/** PDV do balcão (operador da cantina). Também acessível ao Admin. */
@Controller('pdv')
@Roles(Role.OPERATOR, Role.ADMIN)
export class PdvController {
  private readonly logger = new Logger(PdvController.name);

  constructor(private readonly pdv: PdvService) {}

  /** Leitura do QR: retorna aluno + saldo + limite restante + catálogo com flags. */
  @Get('student')
  byToken(@Query('token') token: string) {
    return this.pdv.lookupByToken(token);
  }

  /**
   * Fallback "esqueceu o cartão": consulta pontual por RM. Uso ocasional por
   * definição — limite apertado e log de auditoria desencorajam varredura de RMs
   * (que exporia nome/foto/saldo de toda a escola).
   */
  @Get('student-by-rm')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  byRm(@Query('rm') rm: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`Consulta por RM ${rm} feita por ${user.email} (${user.role}).`);
    return this.pdv.lookupByRm(rm);
  }

  /** Fecha o pedido: débito atômico do saldo. */
  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  purchase(@Body() dto: PurchaseDto) {
    return this.pdv.purchase(dto);
  }
}
