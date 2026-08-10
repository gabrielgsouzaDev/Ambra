import { createHash, randomBytes } from 'node:crypto';

const INVITE_TTL_DAYS = 7;

/** Token opaco e URL-safe (base64url). Usado no QR do aluno e nos convites. */
export function generateOpaqueToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

/** Guardamos só o HASH do token (convite/reset), nunca o valor em texto. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Cria um convite: o token (vai no link) + o hash (vai no banco) + expiração (7 dias). */
export function createInviteToken(): { token: string; hash: string; expiresAt: Date } {
  const token = generateOpaqueToken(32);
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
  };
}
