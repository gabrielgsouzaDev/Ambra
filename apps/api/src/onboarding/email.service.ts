import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

/**
 * Envio de e-mail via Resend (HTTP API, sem SDK). Degrada de propósito: sem
 * RESEND_KEY, não envia — apenas loga e retorna false (o chamador ainda tem o link).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: AppConfigService) {}

  async send(to: string, subject: string, html: string): Promise<boolean> {
    const key = this.config.resendKey;
    if (!key) {
      this.logger.warn(`RESEND_KEY ausente — e-mail para ${to} NÃO enviado (modo degradado).`);
      return false;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.config.resendFrom, to, subject, html }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Falha real (chave presente mas envio falhou): não engolir — propagar.
      this.logger.error(`Resend falhou para ${to}: ${res.status} ${detail}`);
      throw new Error(`Envio de e-mail falhou (HTTP ${res.status}).`);
    }
    return true;
  }
}
