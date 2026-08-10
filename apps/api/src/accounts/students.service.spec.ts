import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  let service: StudentsService;
  let tx: {
    school: { findFirst: jest.Mock };
    student: { create: jest.Mock };
    user: { findUnique: jest.Mock; create: jest.Mock };
    guardianStudent: { create: jest.Mock };
  };

  beforeEach(async () => {
    tx = {
      school: { findFirst: jest.fn().mockResolvedValue({ id: 'school-1' }) },
      student: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'stu-1', name: 'Ana', turma: '5A', rm: '123', qrToken: 'qr' }),
      },
      user: { findUnique: jest.fn(), create: jest.fn() },
      guardianStudent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prismaMock = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };

    const moduleRef = await Test.createTestingModule({
      providers: [StudentsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(StudentsService);
  });

  it('cria o aluno e convida um responsável novo (gera token de ativação)', async () => {
    tx.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: 'g-1' });

    const result = await service.createStudent({
      name: 'Ana',
      turma: '5A',
      rm: '123',
      guardians: [{ name: 'Pai', email: 'PAI@x.com' }],
    });

    expect(tx.student.create).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    // e-mail normalizado (minúsculas/trim)
    expect(tx.user.create.mock.calls[0]?.[0].data.email).toBe('pai@x.com');
    expect(result.guardians[0]).toMatchObject({ email: 'pai@x.com', status: 'invited' });
    expect(result.guardians[0]?.activationToken).toEqual(expect.any(String));
  });

  it('reaproveita responsável já existente, sem novo convite', async () => {
    tx.user.findUnique.mockResolvedValue({ id: 'g-existing' });

    const result = await service.createStudent({
      name: 'Ana',
      rm: '123',
      guardians: [{ name: 'Mãe', email: 'mae@x.com' }],
    });

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.guardianStudent.create).toHaveBeenCalledWith({
      data: { guardianId: 'g-existing', studentId: 'stu-1' },
    });
    expect(result.guardians[0]).toMatchObject({ email: 'mae@x.com', status: 'existing' });
    expect(result.guardians[0]?.activationToken).toBeUndefined();
  });

  it('rejeita responsáveis com e-mail duplicado no mesmo cadastro', async () => {
    await expect(
      service.createStudent({
        name: 'Ana',
        rm: '123',
        guardians: [
          { name: 'Pai', email: 'x@x.com' },
          { name: 'Mãe', email: 'X@X.com' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CreateStudentDto — trava de 1 a 2 responsáveis', () => {
  function build(guardians: unknown): CreateStudentDto {
    return plainToInstance(CreateStudentDto, { name: 'Ana', rm: '123', guardians });
  }
  function guardiansHasError(guardians: unknown): boolean {
    return validateSync(build(guardians)).some((e) => e.property === 'guardians');
  }
  const g = (email: string) => ({ name: 'Resp', email });

  it('aceita 1 responsável', () => {
    expect(guardiansHasError([g('a@x.com')])).toBe(false);
  });
  it('aceita 2 responsáveis', () => {
    expect(guardiansHasError([g('a@x.com'), g('b@x.com')])).toBe(false);
  });
  it('rejeita 0 responsáveis (mínimo 1)', () => {
    expect(guardiansHasError([])).toBe(true);
  });
  it('rejeita 3 responsáveis (máximo 2)', () => {
    expect(guardiansHasError([g('a@x.com'), g('b@x.com'), g('c@x.com')])).toBe(true);
  });
});
