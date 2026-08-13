/**
 * Seed de BOOTSTRAP do M0: cria a escola (uma por instância) e o primeiro Admin,
 * para que o login seja testável antes do M1 (que traz a criação de usuários).
 * Idempotente: rodar de novo não duplica. Roda da raiz: `npm run db:seed`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const schoolName = process.env.SEED_SCHOOL_NAME ?? 'Escola Piloto';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@escola.local')
    .toLowerCase()
    .trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  // Em produção, nunca aceitar a senha padrão/fraca (takeover trivial de admin).
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.SEED_ADMIN_PASSWORD || adminPassword.length < 8 || adminPassword === 'admin123')
  ) {
    throw new Error(
      'Em produção, defina SEED_ADMIN_PASSWORD com uma senha forte (>= 8 caracteres, não o padrão).',
    );
  }

  // Uma escola por instância: reutiliza a existente, senão cria.
  const school =
    (await prisma.school.findFirst()) ??
    (await prisma.school.create({ data: { name: schoolName } }));

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      schoolId: school.id,
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Seed concluído:');
  console.log(`  Escola: ${school.name} (${school.id})`);
  console.log(`  Admin:  ${admin.email}  senha: ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
