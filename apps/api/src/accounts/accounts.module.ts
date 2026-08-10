import { Module } from '@nestjs/common';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

/** Contas & Identidade (M1): alunos, responsáveis, vínculo, cartão QR e convite. */
@Module({
  controllers: [StudentsController, InviteController],
  providers: [StudentsService, InviteService],
  exports: [StudentsService], // usado pelo módulo de onboarding (import CSV)
})
export class AccountsModule {}
