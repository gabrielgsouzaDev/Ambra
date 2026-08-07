import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como pública (sem JWT). O JwtAuthGuard é global —
 * tudo é protegido por padrão; @Public() é a exceção explícita (ex.: login, health).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
