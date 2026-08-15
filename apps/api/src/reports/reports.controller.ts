import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { DailyTransactionsDto } from './dto/daily-transactions.dto';
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

  /** As compras do dia, paginadas. `?date=YYYY-MM-DD&page=1&limit=25`. */
  @Get('daily/transactions')
  dailyTransactions(@Query() query: DailyTransactionsDto) {
    return this.reports.dailyTransactions(query, query.date);
  }
}
