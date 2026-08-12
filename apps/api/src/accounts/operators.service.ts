import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { PrismaService } from '../prisma/prisma.service';
import { createInviteToken } from './tokens';

@Injectable()
export class OperatorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria a conta do operador da cantina (PENDING) com um convite — mesmo mecanismo
   * do responsável: o operador recebe o link, cria a senha e ativa. Assim o balcão
   * passa a ter login próprio (antes só o Admin conseguia operar o PDV).
   */
  async create(dto: CreateOperatorDto): Promise<{
    id: string;
    name: string;
    email: string;
    status: string;
    activationToken: string;
  }> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }
    const school = await this.prisma.school.findFirst({ select: { id: true } });
    if (!school) {
      throw new NotFoundException('Escola não inicializada. Rode o seed (npm run db:seed).');
    }

    const invite = createInviteToken();
    const operator = await this.prisma.user.create({
      data: {
        schoolId: school.id,
        name: dto.name,
        email,
        role: 'OPERATOR',
        status: 'PENDING',
        inviteTokenHash: invite.hash,
        inviteExpiresAt: invite.expiresAt,
      },
      select: { id: true, name: true, email: true, status: true },
    });

    // activationToken repassado ao Admin até o envio por e-mail (M2/Resend).
    return { ...operator, activationToken: invite.token };
  }

  list() {
    return this.prisma.user.findMany({
      where: { role: 'OPERATOR' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    });
  }
}
