import { Module } from '@nestjs/common';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

/** Contas & Identidade: alunos, responsáveis, operadores, vínculo, cartão QR e convite. */
@Module({
  controllers: [StudentsController, InviteController, OperatorsController],
  providers: [StudentsService, InviteService, OperatorsService],
  exports: [StudentsService], // usado pelo módulo de onboarding (import CSV)
})
export class AccountsModule {}
