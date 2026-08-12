import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { SetDailyLimitDto } from './dto/set-daily-limit.dto';
import { RECHARGE_FEE_CENTS, SUGGESTED_AMOUNTS_CENTS } from './wallet.constants';
import { WalletService } from './wallet.service';

/** Saldo, limite e recarga. Admin (qualquer aluno) ou Responsável (os seus). */
@Controller()
@Roles(Role.ADMIN, Role.RESPONSAVEL)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('students/:id/wallet')
  getWallet(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.wallet.getWallet(id, user);
  }

  @Patch('students/:id/daily-limit')
  setDailyLimit(
    @Param('id') id: string,
    @Body() dto: SetDailyLimitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.wallet.setDailyLimit(id, dto.dailyLimitCents, user);
  }

  @Post('recharges')
  @HttpCode(HttpStatus.CREATED)
  createRecharge(@Body() dto: CreateRechargeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.wallet.createRecharge(dto, user);
  }

  /** Taxa + valores sugeridos para a tela de recarga (taxa transparente). */
  @Get('recharges/config')
  config() {
    return { feeCents: RECHARGE_FEE_CENTS, suggestedAmountsCents: SUGGESTED_AMOUNTS_CENTS };
  }
}
