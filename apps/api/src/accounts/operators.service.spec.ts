import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { OperatorsService } from './operators.service';

describe('OperatorsService', () => {
  let service: OperatorsService;
  let findUnique: jest.Mock;
  let create: jest.Mock;

  beforeEach(async () => {
    findUnique = jest.fn();
    create = jest.fn().mockResolvedValue({
      id: 'op-1',
      name: 'Cantina',
      email: 'op@x.com',
      status: 'PENDING',
    });

    const prisma = {
      user: { findUnique, create, findMany: jest.fn() },
      school: { findFirst: jest.fn().mockResolvedValue({ id: 'school-1' }) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [OperatorsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(OperatorsService);
  });

  it('cria operador PENDING com convite (role OPERATOR) e devolve o token', async () => {
    findUnique.mockResolvedValue(null);

    const result = await service.create({ name: 'Cantina', email: 'OP@x.com' });

    const data = create.mock.calls[0]![0].data;
    expect(data.role).toBe('OPERATOR');
    expect(data.status).toBe('PENDING');
    expect(data.email).toBe('op@x.com'); // normalizado
    expect(typeof data.inviteTokenHash).toBe('string');
    expect(result.activationToken).toEqual(expect.any(String));
  });

  it('recusa e-mail já em uso', async () => {
    findUnique.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({ name: 'X', email: 'op@x.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });
});
