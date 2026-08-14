import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUserWithVersion, JwtPayload, LoginResult } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Valida credenciais. Mensagem genérica de propósito (não revela se o e-mail
   * existe). Conta PENDING (sem senha ainda) ou sem hash cai no mesmo erro.
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<AuthenticatedUserWithVersion> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || user.status !== 'ACTIVE' || !user.passwordHash) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      tokenVersion: user.tokenVersion,
    };
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.validateCredentials(dto.email, dto.password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      tv: user.tokenVersion,
    };

    const accessToken = await this.jwt.signAsync(payload);
    const { tokenVersion: _tokenVersion, ...publicUser } = user;
    return { accessToken, user: publicUser };
  }
}
