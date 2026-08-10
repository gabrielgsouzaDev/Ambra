import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvitesService } from './invites.service';

/** Enviar/reenviar convite de ativação ao responsável. Só o Admin. */
@Controller('onboarding')
@Roles(Role.ADMIN)
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post('guardians/:id/invite')
  @HttpCode(HttpStatus.OK)
  send(@Param('id') id: string) {
    return this.invites.sendInvite(id);
  }
}
