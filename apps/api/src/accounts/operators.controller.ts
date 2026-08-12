import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Get()
  list() {
    return this.operators.list();
  }
}
