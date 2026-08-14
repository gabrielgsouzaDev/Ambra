import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

/** Admin/Onboarding (M2): import CSV, cartões PDF, envio/reenvio de convite. */
@Module({
  imports: [AccountsModule], // usa o StudentsService no import
  controllers: [ImportController, CardsController, InvitesController],
  providers: [ImportService, CardsService, InvitesService],
})
export class OnboardingModule {}
