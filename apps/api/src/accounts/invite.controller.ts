import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ActivateDto } from './dto/activate.dto';
import { InviteService } from './invite.service';

/** Ativação de conta do responsável via convite. Público — ainda não há sessão. */
@Controller('invite')
export class InviteController {
  constructor(private readonly invite: InviteService) {}

  @Public()
  @Get(':token')
  verify(@Param('token') token: string) {
    return this.invite.verify(token);
  }

  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  activate(@Body() dto: ActivateDto) {
    return this.invite.activate(dto);
  }
}
