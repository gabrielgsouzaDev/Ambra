import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createInviteToken } from '../accounts/tokens';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Envia ou REENVIA o convite a um responsável PENDING. Gera um token novo
   * (invalida o anterior), tenta enviar por e-mail e sempre devolve o link — assim
   * o Admin consegue repassar mesmo sem e-mail configurado (modo degradado).
   */
  async sendInvite(
    guardianId: string,
  ): Promise<{ email: string; sent: boolean; activationLink: string }> {
    const guardian = await this.prisma.user.findUnique({
      where: { id: guardianId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    // Vale para responsável E operador — quem perde o link de ativação precisa de
    // reenvio, e recriar a conta do operador só por isso seria absurdo. Admin não
    // entra aqui: a conta dele nasce do seed, não de convite.
    if (!guardian || (guardian.role !== 'RESPONSAVEL' && guardian.role !== 'OPERATOR')) {
      throw new NotFoundException('Conta não encontrada.');
    }
    if (guardian.status === 'ACTIVE') {
      throw new BadRequestException('Esta conta já foi ativada.');
    }

    const invite = createInviteToken();
    await this.prisma.user.update({
      where: { id: guardian.id },
      data: { inviteTokenHash: invite.hash, inviteExpiresAt: invite.expiresAt },
    });

    const activationLink = `${this.config.corsOrigin}/ativar?token=${invite.token}`;
    const html =
      `<p>Olá, ${guardian.name}.</p>` +
      `<p>Você foi convidado(a) para acompanhar a cantina no Ambra. Clique para criar sua senha:</p>` +
      `<p><a href="${activationLink}">Ativar minha conta</a></p>` +
      `<p>O link expira em 7 dias.</p>`;
    const sent = await this.email.send(guardian.email, 'Ative sua conta no Ambra', html);

    return { email: guardian.email, sent, activationLink };
  }
}
