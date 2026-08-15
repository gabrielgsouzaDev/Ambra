import { Role } from '@prisma/client';

/**
 * Payload assinado dentro do JWT. Mínimo necessário para autorizar:
 * quem é (sub), papel (role) e de qual escola (schoolId — uma escola por instância).
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  schoolId: string;
  /** Versão da senha no momento da emissão — trocar a senha invalida tokens antigos. */
  tv: number;
}

/**
 * Usuário autenticado, anexado à request pelo JwtStrategy.
 * É o que @CurrentUser() entrega aos controllers.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  schoolId: string;
}

/** Uso interno do AuthService: leva a versão da senha, que não vai para os controllers. */
export interface AuthenticatedUserWithVersion extends AuthenticatedUser {
  tokenVersion: number;
}

/** Resposta do login: o token e um resumo seguro do usuário (sem hash de senha). */
export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}
