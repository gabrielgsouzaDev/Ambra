import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { createInviteToken, generateOpaqueToken } from './tokens';

export interface GuardianResult {
  email: string;
  status: 'invited' | 'existing';
  activationToken?: string; // só para 'invited' — repassado ao Admin até o e-mail (M2)
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cadastra o aluno JUNTO com 1 a 2 responsáveis, numa transação. Assim a regra
   * "mínimo 1 responsável" nasce garantida (não existe aluno sem responsável) e o
   * QR é gerado de uma vez. Responsável já existente (por e-mail) é reaproveitado
   * (N:N); responsável novo entra PENDING com um convite para criar senha.
   */
  async createStudent(dto: CreateStudentDto): Promise<{
    student: { id: string; name: string; turma: string | null; rm: string; qrToken: string };
    guardians: GuardianResult[];
  }> {
    const emails = dto.guardians.map((g) => g.email.toLowerCase().trim());
    if (new Set(emails).size !== emails.length) {
      throw new BadRequestException('Há responsáveis com o mesmo e-mail.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Uma escola por instância: o aluno herda a escola existente (criada no seed).
        const school = await tx.school.findFirst({ select: { id: true } });
        if (!school) {
          throw new BadRequestException('Escola não inicializada. Rode o seed (npm run db:seed).');
        }

        const student = await tx.student.create({
          data: {
            schoolId: school.id,
            name: dto.name,
            turma: dto.turma,
            rm: dto.rm,
            qrToken: generateOpaqueToken(),
          },
          select: { id: true, name: true, turma: true, rm: true, qrToken: true },
        });

        const guardians: GuardianResult[] = [];
        for (const input of dto.guardians) {
          const email = input.email.toLowerCase().trim();
          const existing = await tx.user.findUnique({
            where: { email },
            select: { id: true, role: true },
          });

          if (existing) {
            // Só reaproveita se for RESPONSAVEL — o e-mail de um Admin/Operador
            // não pode virar "responsável" por engano (alinha com o InvitesService).
            if (existing.role !== 'RESPONSAVEL') {
              throw new BadRequestException(
                `O e-mail ${email} pertence a uma conta que não é de responsável.`,
              );
            }
            await tx.guardianStudent.create({
              data: { guardianId: existing.id, studentId: student.id },
            });
            guardians.push({ email, status: 'existing' });
            continue;
          }

          const invite = createInviteToken();
          const created = await tx.user.create({
            data: {
              schoolId: school.id,
              name: input.name,
              email,
              role: 'RESPONSAVEL',
              status: 'PENDING',
              inviteTokenHash: invite.hash,
              inviteExpiresAt: invite.expiresAt,
            },
            select: { id: true },
          });
          await tx.guardianStudent.create({
            data: { guardianId: created.id, studentId: student.id },
          });
          guardians.push({ email, status: 'invited', activationToken: invite.token });
        }

        return { student, guardians };
      });
    } catch (error) {
      // RM duplicado na escola cai aqui (@@unique([schoolId, rm])).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um aluno com este RM nesta escola.');
      }
      throw error;
    }
  }

  async list(): Promise<
    Array<{ id: string; name: string; turma: string | null; rm: string; createdAt: Date }>
  > {
    return this.prisma.student.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, turma: true, rm: true, createdAt: true },
    });
  }

  async getById(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        turma: true,
        rm: true,
        qrToken: true,
        createdAt: true,
        guardians: {
          select: {
            guardian: { select: { id: true, name: true, email: true, status: true } },
          },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }
    return {
      ...student,
      guardians: student.guardians.map((link) => link.guardian),
    };
  }

  /** Bloqueia o cartão (impede débito no PDV). A reemissão física é ação da escola. */
  async blockCard(id: string): Promise<{ id: string; name: string; cardStatus: 'ACTIVE' | 'BLOCKED' }> {
    await this.ensureExists(id);
    return this.prisma.student.update({
      where: { id },
      data: { cardStatus: 'BLOCKED' },
      select: { id: true, name: true, cardStatus: true },
    });
  }

  /**
   * Reemissão: gera um QR novo (o antigo deixa de valer) e reativa o cartão.
   * Devolve o novo qrToken para a escola reimprimir o cartão.
   */
  async reissueCard(
    id: string,
  ): Promise<{ id: string; name: string; qrToken: string; cardStatus: 'ACTIVE' | 'BLOCKED' }> {
    await this.ensureExists(id);
    return this.prisma.student.update({
      where: { id },
      data: { qrToken: generateOpaqueToken(), cardStatus: 'ACTIVE' },
      select: { id: true, name: true, qrToken: true, cardStatus: true },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const student = await this.prisma.student.findUnique({ where: { id }, select: { id: true } });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }
  }
}
