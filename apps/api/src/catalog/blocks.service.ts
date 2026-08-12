import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface Actor {
  id: string;
  role: Role;
}

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Produtos bloqueados para o aluno (o "X"). */
  async list(studentId: string, actor: Actor) {
    await this.assertCanManage(studentId, actor);
    const blocks = await this.prisma.studentProductBlock.findMany({
      where: { studentId },
      select: { product: { select: { id: true, name: true, priceCents: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return blocks.map((b) => b.product);
  }

  /** Bloqueia um produto para o aluno. Idempotente (unique studentId+productId). */
  async block(studentId: string, productId: string, actor: Actor) {
    await this.assertCanManage(studentId, actor);
    await this.ensureProduct(productId);
    await this.prisma.studentProductBlock.upsert({
      where: { studentId_productId: { studentId, productId } },
      update: {},
      create: { studentId, productId },
    });
    return { studentId, productId, blocked: true };
  }

  /** Remove o bloqueio. Idempotente (não erra se não existia). */
  async unblock(studentId: string, productId: string, actor: Actor) {
    await this.assertCanManage(studentId, actor);
    await this.prisma.studentProductBlock.deleteMany({ where: { studentId, productId } });
    return { studentId, productId, blocked: false };
  }

  private async ensureProduct(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
  }

  /** Admin gerencia qualquer aluno; Responsável só os seus (vínculo GuardianStudent). */
  private async assertCanManage(studentId: string, actor: Actor): Promise<void> {
    if (actor.role === 'ADMIN') {
      return;
    }
    if (actor.role === 'RESPONSAVEL') {
      const link = await this.prisma.guardianStudent.findFirst({
        where: { studentId, guardianId: actor.id },
        select: { id: true },
      });
      if (link) {
        return;
      }
    }
    throw new ForbiddenException('Você não pode gerenciar este aluno.');
  }
}
