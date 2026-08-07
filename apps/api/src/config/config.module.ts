import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.validation';
import { join } from 'node:path';

/**
 * Config global e tipada. Lê o .env da RAIZ do monorepo (um .env só),
 * valida no boot e expõe AppConfigService em toda a aplicação.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // .env único na raiz do repo (../../.env a partir de apps/api).
      envFilePath: [join(process.cwd(), '.env'), join(__dirname, '..', '..', '..', '..', '.env')],
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
