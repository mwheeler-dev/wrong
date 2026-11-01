// Database check in a rolled-back transaction; no test accounts remain.
const { PrismaClient, Prisma } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const prisma = new PrismaClient();
async function main() {
  const marker = randomUUID();
  const username = `qa_${marker.replaceAll('-', '').slice(0, 18)}`;
  try {
    await prisma.$transaction(async (tx) => {
      const data = { name: 'Temporary username verification', passwordHash: 'not-a-login-hash' };
      const a = await tx.user.create({ data: { ...data, email: `${marker}-a@example.invalid` } });
      const b = await tx.user.create({ data: { ...data, email: `${marker}-b@example.invalid` } });
      await tx.user.update({ where: { id: a.id }, data: { username } });
      await tx.user.update({ where: { id: b.id }, data: { username } });
      throw new Error('Database allowed a duplicate username');
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
  }
  const remaining = await prisma.user.count({ where: { email: { in: [`${marker}-a@example.invalid`, `${marker}-b@example.invalid`] } } });
  if (remaining !== 0) throw new Error('Verification rollback failed');
  console.log('PASS: nullable existing usernames, database-enforced uniqueness, and transaction rollback.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
