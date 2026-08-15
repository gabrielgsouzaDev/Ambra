import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SetAlertThresholdDto } from './dto/set-alert-threshold.dto';
import { PortalService } from './portal.service';

/** Portal do Responsável (M6): a superfície de valor do pai. Só RESPONSAVEL. */
@Controller('me')
@Roles(Role.RESPONSAVEL)
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('students')
  myStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.portal.myStudents(user.id);
  }

  /** `?page=1&limit=25` — o extrato pagina para o pai ver além dos últimos lançamentos. */
  @Get('students/:id/statement')
  statement(
    @Param('id') id: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.portal.statement(id, user.id, query);
  }

  @Patch('students/:id/alert-threshold')
  setAlertThreshold(
    @Param('id') id: string,
    @Body() dto: SetAlertThresholdDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.portal.setAlertThreshold(id, user.id, dto.thresholdCents);
  }

  @Post('students/:id/card/block')
  @HttpCode(HttpStatus.OK)
  requestCardBlock(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.portal.requestCardBlock(id, user.id);
  }
}
