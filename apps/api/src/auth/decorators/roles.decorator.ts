import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe uma rota a um ou mais papéis. Ex.: @Roles(Role.ADMIN, Role.OPERATOR).
 * Sem @Roles(), qualquer usuário autenticado passa (só o JWT é exigido).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
