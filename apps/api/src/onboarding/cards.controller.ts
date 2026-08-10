import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { CardsService } from './cards.service';

/** Exportação dos cartões QR em PDF. Só o Admin. */
@Controller('onboarding')
@Roles(Role.ADMIN)
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get('cards.pdf')
  async cardsPdf(@Res() res: Response): Promise<void> {
    const pdf = await this.cards.generateCardsPdf();
    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', 'attachment; filename="cartoes-ambra.pdf"');
    res.send(pdf);
  }
}
