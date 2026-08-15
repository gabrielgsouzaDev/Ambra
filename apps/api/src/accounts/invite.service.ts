import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../config/app-config.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivateDto } from './dto/activate.dto';
import { createInviteToken, hashToken } from './tokens';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: AppConfigService,
  ) {}

  /** Dados mínimos para a tela "criar senha". Erro genérico se o token não vale. */
  async verify(token: string): Promise<{ name: string; email: string }> {
    const user = await this.findValidInvite(token);
    return { name: user.name, email: user.email };
  }

  /**
   * Ativa a conta (ou redefine a senha): grava a senha, marca ACTIVE e queima o
   * token. Sobe o `tokenVersion` para derrubar qualquer sessão emitida antes —
   * se a conta estava comprometida, trocar a senha expulsa quem estava dentro.
   */
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
        tokenVersion: { increment: 1 },
      },
    });
    return { activated: true };
  }

  /**
   * "Esqueci minha senha": gera um novo token de redefinição e envia por e-mail.
   * Responde SEMPRE igual, exista o e-mail ou não — senão o endpoint vira um
   * oráculo para descobrir quem tem conta na escola.
   */
  async forgotPassword(email: string): Promise<{ requested: true }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, name: true, status: true },
    });

    if (user) {
      const invite = createInviteToken();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { inviteTokenHash: invite.hash, inviteExpiresAt: invite.expiresAt },
      });

      const link = `${this.config.corsOrigin}/ativar?token=${invite.token}`;
      const html =
        `<p>Olá, ${user.name}.</p>` +
        `<p>Recebemos um pedido para redefinir sua senha no Ambra. Clique para criar uma nova:</p>` +
        `<p><a href="${link}">Redefinir minha senha</a></p>` +
        `<p>O link expira em 7 dias. Se não foi você, ignore este e-mail.</p>`;
      await this.email.send(normalized, 'Redefinir sua senha no Ambra', html);
    }

    return { requested: true };
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
