import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    AccountsModule,
    OnboardingModule,
    WalletModule,
    CatalogModule,
    PdvModule,
    PortalModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordem importa: autentica (JWT) e depois autoriza (papel). Ambos globais.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
