import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListGuardiansDto } from './dto/list-guardians.dto';
import { GuardiansService } from './guardians.service';

/** Responsáveis da escola. Só o Admin — serve a tela de convites pendentes. */
@Controller('guardians')
@Roles(Role.ADMIN)
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  /** `?status=PENDING&page=1&limit=25&q=joao` */
  @Get()
  list(@Query() query: ListGuardiansDto) {
    return this.guardians.list(query);
  }
}
