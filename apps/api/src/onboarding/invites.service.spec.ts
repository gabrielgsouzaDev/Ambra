import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { InvitesService } from './invites.service';

describe('InvitesService', () => {
  let service: InvitesService;
  let findUnique: jest.Mock;
  let update: jest.Mock;
  let send: jest.Mock;

  const pending = {
    id: 'g-1',
    name: 'Pai',
    email: 'pai@x.com',
    role: 'RESPONSAVEL',
    status: 'PENDING',
  };

  beforeEach(async () => {
    findUnique = jest.fn();
    update = jest.fn().mockResolvedValue({});
    send = jest.fn().mockResolvedValue(false); // sem RESEND_KEY → degradado

    const moduleRef = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: { user: { findUnique, update } } },
        { provide: EmailService, useValue: { send } },
        { provide: AppConfigService, useValue: { corsOrigin: 'http://localhost:3000' } },
      ],
    }).compile();

    service = moduleRef.get(InvitesService);
  });

  it('reenvia: gera token novo, devolve o link e reporta o envio', async () => {
    findUnique.mockResolvedValue(pending);

    const result = await service.sendInvite('g-1');

    expect(update).toHaveBeenCalledTimes(1);
    const data = update.mock.calls[0]![0].data;
    expect(typeof data.inviteTokenHash).toBe('string');
    expect(data.inviteExpiresAt).toBeInstanceOf(Date);
    expect(result.activationLink).toContain('/ativar?token=');
    expect(result.sent).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('rejeita responsável que já ativou (ACTIVE)', async () => {
    findUnique.mockResolvedValue({ ...pending, status: 'ACTIVE' });
    await expect(service.sendInvite('g-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejeita id inexistente ou que não é responsável', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.sendInvite('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
