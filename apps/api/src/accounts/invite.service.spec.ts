import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../config/app-config.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { InviteService } from './invite.service';
import { hashToken } from './tokens';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-pw') }));

describe('InviteService', () => {
  let service: InviteService;
  let findFirst: jest.Mock;
  let findUnique: jest.Mock;
  let update: jest.Mock;
  let send: jest.Mock;

  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);
  const validInvite = { id: 'g-1', name: 'Pai', email: 'p@x.com', inviteExpiresAt: future };

  beforeEach(async () => {
    findFirst = jest.fn();
    findUnique = jest.fn();
    update = jest.fn().mockResolvedValue({});
    send = jest.fn().mockResolvedValue(false);

    const moduleRef = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: PrismaService, useValue: { user: { findFirst, update, findUnique } } },
        { provide: EmailService, useValue: { send } },
        { provide: AppConfigService, useValue: { corsOrigin: 'http://localhost:3000' } },
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

  it('ativar sobe o tokenVersion (derruba sessões emitidas antes da troca)', async () => {
    findFirst.mockResolvedValue(validInvite);

    await service.activate({ token: 'raw-token', password: 'segredo123' });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
      }),
    );
  });

  describe('forgotPassword', () => {
    it('gera um token novo e envia o e-mail quando a conta existe', async () => {
      findUnique.mockResolvedValue({ id: 'u-1', name: 'Pai', status: 'ACTIVE' });

      const result = await service.forgotPassword('  PAI@x.com ');

      expect(findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'pai@x.com' } }), // normalizado
      );
      const data = update.mock.calls[0]![0].data;
      expect(typeof data.inviteTokenHash).toBe('string');
      expect(data.inviteExpiresAt).toBeInstanceOf(Date);
      expect(send).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ requested: true });
    });

    it('responde IGUAL quando a conta não existe (não vira oráculo de e-mails)', async () => {
      findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('naoexiste@x.com');

      expect(result).toEqual({ requested: true }); // mesma resposta do caso que existe
      expect(update).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });
  });

  it('verify devolve nome e e-mail para token válido', async () => {
    findFirst.mockResolvedValue(validInvite);
    await expect(service.verify('raw')).resolves.toEqual({ name: 'Pai', email: 'p@x.com' });
  });
});
