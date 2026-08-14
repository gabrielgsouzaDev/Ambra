import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ActivateDto } from './dto/activate.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
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

  /**
   * "Esqueci minha senha". Público e limitado — responde igual exista ou não a
   * conta, para não virar um oráculo de quem tem cadastro na escola.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.invite.forgotPassword(dto.email);
  }
}
