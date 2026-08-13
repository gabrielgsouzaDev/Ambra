import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PdvModule } from './pdv/pdv.module';
import { PortalModule } from './portal/portal.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    // Rate limit global: 120 req/min por IP (in-memory; MVP single-instance).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ConfigModule,
    PrismaModule,
    AuthModule,
    AccountsModule,
    OnboardingModule,
    WalletModule,
    CatalogModule,
    PdvModule,
    PortalModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordem importa: rate-limit primeiro, depois autentica (JWT), depois autoriza (papel).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
