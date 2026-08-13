import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { AppConfigService } from '../config/app-config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy, JWT_STRATEGY } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: JWT_STRATEGY }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      // No @nestjs/jwt v11 o expiresIn é tipado como StringValue (pacote `ms`),
      // mas o valor vem do ambiente como string ("1d") — a conversão fica aqui.
      useFactory: (config: AppConfigService): JwtModuleOptions => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
