import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

/**
 * Acesso TIPADO à configuração. Nada de `configService.get('STRING_MÁGICA')`
 * espalhado pelo código — tudo passa por aqui, com tipo garantido.
 */
@Injectable()
export class AppConfigService {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get jwtSecret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.config.get('JWT_EXPIRES_IN', { infer: true });
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get corsOrigin(): string {
    return this.config.get('CORS_ORIGIN', { infer: true });
  }

  /** Feature flag: recarga PIX (AbacatePay). Desligada até a ME. */
  get isPaymentsEnabled(): boolean {
    return this.config.get('PAGAMENTOS_ATIVOS', { infer: true });
  }
}
