import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, toSkipTake } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListGuardiansDto } from './dto/list-guardians.dto';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista os responsáveis com os dependentes vinculados. Filtrar por `PENDING`
   * dá à escola a lista de quem ainda não ativou — antes disso, só dava para
   * descobrir entrando aluno por aluno.
   */
  async list(query: ListGuardiansDto) {
    const where: Prisma.UserWhereInput = {
      role: 'RESPONSAVEL',
      ...(query.status ? { status: query.status } : {}),
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
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          students: { select: { student: { select: { id: true, name: true, turma: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const mapped = items.map((guardian) => ({
      ...guardian,
      students: guardian.students.map((link) => link.student),
    }));

    return paginated(mapped, total, query);
  }
}
