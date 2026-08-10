import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ActivateDto } from './dto/activate.dto';
import { hashToken } from './tokens';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dados mínimos para a tela "criar senha". Erro genérico se o token não vale. */
  async verify(token: string): Promise<{ name: string; email: string }> {
    const user = await this.findValidInvite(token);
    return { name: user.name, email: user.email };
  }

  /** Ativa a conta: grava a senha (bcrypt), marca ACTIVE e queima o token (uso único). */
  async activate(dto: ActivateDto): Promise<{ activated: true }> {
    const user = await this.findValidInvite(dto.token);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });
    return { activated: true };
  }

  /** Resolve o convite pelo HASH do token e valida a expiração. */
  private async findValidInvite(
    token: string,
  ): Promise<{ id: string; name: string; email: string; inviteExpiresAt: Date | null }> {
    const user = await this.prisma.user.findFirst({
      where: { inviteTokenHash: hashToken(token) },
      select: { id: true, name: true, email: true, inviteExpiresAt: true },
    });
    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Convite inválido ou expirado.');
    }
    return user;
  }
}
