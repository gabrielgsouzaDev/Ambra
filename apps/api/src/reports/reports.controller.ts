import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

/** Fechamento da cantina. Operador e Admin. */
@Controller('reports')
@Roles(Role.OPERATOR, Role.ADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Fechamento consolidado do dia (default: hoje). `?date=YYYY-MM-DD`. */
  @Get('daily')
  daily(@Query('date') date?: string) {
    return this.reports.daily(date);
  }

  /** As compras do dia, para conferência. */
  @Get('daily/transactions')
  dailyTransactions(@Query('date') date?: string) {
    return this.reports.dailyTransactions(date);
  }
}
