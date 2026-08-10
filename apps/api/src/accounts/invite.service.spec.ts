import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { InviteService } from './invite.service';
import { hashToken } from './tokens';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-pw') }));

describe('InviteService', () => {
  let service: InviteService;
  let findFirst: jest.Mock;
  let update: jest.Mock;

  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);
  const validInvite = { id: 'g-1', name: 'Pai', email: 'p@x.com', inviteExpiresAt: future };

  beforeEach(async () => {
    findFirst = jest.fn();
    update = jest.fn().mockResolvedValue({});

    const moduleRef = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: PrismaService, useValue: { user: { findFirst, update } } },
      ],
    }).compile();

    service = moduleRef.get(InviteService);
  });

  it('ativa com token válido: grava senha, marca ACTIVE e queima o token', async () => {
    findFirst.mockResolvedValue(validInvite);

    const result = await service.activate({ token: 'raw-token', password: 'segredo123' });

    expect(result).toEqual({ activated: true });
    // busca pelo HASH do token, nunca pelo texto
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inviteTokenHash: hashToken('raw-token') } }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'g-1' },
        data: expect.objectContaining({
          passwordHash: 'hashed-pw',
          status: 'ACTIVE',
          inviteTokenHash: null,
          inviteExpiresAt: null,
        }),
      }),
    );
    expect(bcrypt.hash).toHaveBeenCalledWith('segredo123', 10);
  });

  it('rejeita token inexistente', async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      service.activate({ token: 'x', password: 'segredo123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejeita token expirado', async () => {
    findFirst.mockResolvedValue({ ...validInvite, inviteExpiresAt: past });
    await expect(
      service.activate({ token: 'x', password: 'segredo123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('verify devolve nome e e-mail para token válido', async () => {
    findFirst.mockResolvedValue(validInvite);
    await expect(service.verify('raw')).resolves.toEqual({ name: 'Pai', email: 'p@x.com' });
  });
});
