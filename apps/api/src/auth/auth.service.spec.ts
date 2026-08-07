import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

// bcrypt é módulo nativo (compare não é redefinível via spyOn) → mock do módulo.
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
const compareMock = bcrypt.compare as unknown as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let findUnique: jest.Mock;

  const activeUser = {
    id: 'user-1',
    email: 'admin@escola.local',
    passwordHash: 'hashed',
    role: 'ADMIN',
    schoolId: 'school-1',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    findUnique = jest.fn();
    compareMock.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: { findUnique } } },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('signed.jwt') } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('emite um token para credenciais válidas', async () => {
    findUnique.mockResolvedValue(activeUser);
    compareMock.mockResolvedValue(true);

    const result = await service.login({ email: 'admin@escola.local', password: 'admin123' });

    expect(result.accessToken).toBe('signed.jwt');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'admin@escola.local',
      role: 'ADMIN',
      schoolId: 'school-1',
    });
  });

  it('normaliza o e-mail (minúsculas/trim) na busca', async () => {
    findUnique.mockResolvedValue(activeUser);
    compareMock.mockResolvedValue(true);

    await service.validateCredentials('  ADMIN@Escola.Local ', 'admin123');

    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'admin@escola.local' } });
  });

  it('rejeita senha incorreta', async () => {
    findUnique.mockResolvedValue(activeUser);
    compareMock.mockResolvedValue(false);

    await expect(
      service.validateCredentials('admin@escola.local', 'errada'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita usuário inexistente', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.validateCredentials('naoexiste@escola.local', 'x'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita conta PENDING (ainda sem senha ativada)', async () => {
    findUnique.mockResolvedValue({ ...activeUser, status: 'PENDING', passwordHash: null });

    await expect(
      service.validateCredentials('admin@escola.local', 'admin123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
