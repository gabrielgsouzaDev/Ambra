import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationDto, paginated, toSkipTake } from '../common/dto/pagination.dto';
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

  /** Lista paginada, com busca por nome ou e-mail. */
  async list(query: PaginationDto) {
    const where: Prisma.UserWhereInput = {
      role: 'OPERATOR',
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { email: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        ...toSkipTake(query),
        select: { id: true, name: true, email: true, status: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(items, total, query);
  }
}
