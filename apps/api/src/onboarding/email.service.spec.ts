import { Test } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  async function make(resendKey?: string): Promise<EmailService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: AppConfigService,
          useValue: { resendKey, resendFrom: 'Ambra <x@resend.dev>' },
        },
      ],
    }).compile();
    return moduleRef.get(EmailService);
  }

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('sem RESEND_KEY: não chama a API e retorna false (degradado)', async () => {
    const service = await make(undefined);
    const sent = await service.send('a@x.com', 'Assunto', '<p>oi</p>');
    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('com chave e HTTP ok: envia e retorna true', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const service = await make('re_test');

    const sent = await service.send('a@x.com', 'Assunto', '<p>oi</p>');

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('com chave e HTTP de erro: lança em vez de engolir', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    const service = await make('re_test');

    await expect(service.send('a@x.com', 'Assunto', '<p>oi</p>')).rejects.toThrow(/401/);
  });
});
