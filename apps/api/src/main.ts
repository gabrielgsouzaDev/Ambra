import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(AppConfigService);

  // Barra input inválido na borda: só o que está no DTO passa, com tipos convertidos.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({ origin: config.corsOrigin, credentials: true });

  // Encerramento limpo (fecha a conexão do Prisma via onModuleDestroy).
  app.enableShutdownHooks();

  await app.listen(config.port);
  new Logger('Bootstrap').log(
    `API no ar em http://localhost:${config.port} · pagamentos=${config.isPaymentsEnabled ? 'ON' : 'OFF'}`,
  );
}

void bootstrap();
