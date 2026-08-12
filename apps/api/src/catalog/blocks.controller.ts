import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BlocksService } from './blocks.service';

/** Bloqueio de produto por aluno (o "X"). Admin ou o Responsável vinculado. */
@Controller('students/:studentId/blocks')
@Roles(Role.ADMIN, Role.RESPONSAVEL)
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Get()
  list(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.blocks.list(studentId, user);
  }

  @Put(':productId')
  @HttpCode(HttpStatus.OK)
  block(
    @Param('studentId') studentId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.blocks.block(studentId, productId, user);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  unblock(
    @Param('studentId') studentId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.blocks.unblock(studentId, productId, user);
  }
}
