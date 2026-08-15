import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { OperatorsService } from './operators.service';

/** Contas de operador da cantina. Só o Admin cria/lista. */
@Controller('operators')
@Roles(Role.ADMIN)
export class OperatorsController {
  constructor(private readonly operators: OperatorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOperatorDto) {
    return this.operators.create(dto);
  }

  /** `?page=1&limit=25&q=cantina` — busca por nome ou e-mail. */
  @Get()
  list(@Query() query: PaginationDto) {
    return this.operators.list(query);
  }
}
