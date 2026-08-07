import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from '../auth.types';

export const JWT_STRATEGY = 'jwt';

/**
 * Valida o Bearer token e resolve o usuário. Confirma no banco a cada request
 * que o usuário ainda existe e está ACTIVE — desativar/apagar corta o acesso
 * mesmo com token válido não expirado.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(
    config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, schoolId: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Sessão inválida.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };
  }
}
