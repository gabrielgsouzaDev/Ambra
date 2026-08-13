import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(AppConfigService);

  // Headers de segurança (HSTS, nosniff, no-frame, etc.).
  app.use(helmet());
  // A API não deve ser indexada por buscadores nem mapeada por bots.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  // Barra input inválido na borda: só o que está no DTO passa, com tipos convertidos.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS: origem explícita (auth é Bearer, não cookie → sem credentials).
  // Em produção, recusar curinga '*' (vazaria a API para qualquer site).
  if (process.env.NODE_ENV === 'production' && config.corsOrigin === '*') {
    throw new Error('CORS_ORIGIN não pode ser "*" em produção.');
  }
  app.enableCors({ origin: config.corsOrigin });

  // Encerramento limpo (fecha a conexão do Prisma via onModuleDestroy).
  app.enableShutdownHooks();

  await app.listen(config.port);
  new Logger('Bootstrap').log(
    `API no ar em http://localhost:${config.port} · pagamentos=${config.isPaymentsEnabled ? 'ON' : 'OFF'}`,
  );
}

void bootstrap();
