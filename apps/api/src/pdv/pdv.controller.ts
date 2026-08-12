import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PurchaseDto } from './dto/purchase.dto';
import { PdvService } from './pdv.service';

/** PDV do balcão (operador da cantina). Também acessível ao Admin. */
@Controller('pdv')
@Roles(Role.OPERATOR, Role.ADMIN)
export class PdvController {
  constructor(private readonly pdv: PdvService) {}

  /** Leitura do QR: retorna aluno + saldo + limite restante + catálogo com flags. */
  @Get('student')
  byToken(@Query('token') token: string) {
    return this.pdv.lookupByToken(token);
  }

  /** Fallback "esqueceu o cartão": consulta por RM. */
  @Get('student-by-rm')
  byRm(@Query('rm') rm: string) {
    return this.pdv.lookupByRm(rm);
  }

  /** Fecha o pedido: débito atômico do saldo. */
  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  purchase(@Body() dto: PurchaseDto) {
    return this.pdv.purchase(dto);
  }
}
