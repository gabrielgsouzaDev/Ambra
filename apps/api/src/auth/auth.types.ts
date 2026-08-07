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

/** Resposta do login: o token e um resumo seguro do usuário (sem hash de senha). */
export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}
