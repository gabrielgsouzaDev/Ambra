import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function contextWith(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('libera rota pública', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('libera quando a rota não exige papel', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(undefined); // roles
    expect(guard.canActivate(contextWith({ role: Role.RESPONSAVEL }))).toBe(true);
  });

  it('libera quando o papel do usuário casa', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([Role.ADMIN, Role.OPERATOR]);
    expect(guard.canActivate(contextWith({ role: Role.OPERATOR }))).toBe(true);
  });

  it('bloqueia quando o papel não casa', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([Role.ADMIN]);
    expect(() => guard.canActivate(contextWith({ role: Role.RESPONSAVEL }))).toThrow(
      ForbiddenException,
    );
  });
});
