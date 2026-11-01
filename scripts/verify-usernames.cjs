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
      const now = new Date();
      const cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
      const eligible = { id: a.id, OR: [{ username: null }, { usernameChangedAt: null }, { usernameChangedAt: { lte: cutoff } }] };
      await tx.user.update({ where: { id: a.id }, data: { username, usernameChangedAt: now } });
      const locked = await tx.user.updateMany({ where: eligible, data: { username: `${username}x`, usernameChangedAt: now } });
      if (locked.count !== 0) throw new Error('Cooldown allowed an early change');
      await tx.user.update({ where: { id: a.id }, data: { usernameChangedAt: cutoff } });
      const atBoundary = await tx.user.updateMany({ where: eligible, data: { username, usernameChangedAt: now } });
      if (atBoundary.count !== 1) throw new Error('Cooldown blocked a change at exactly 72 hours');
      const repeated = await tx.user.updateMany({ where: eligible, data: { username: `${username}x`, usernameChangedAt: now } });
      if (repeated.count !== 0) throw new Error('Cooldown allowed a second change');
      const firstChoice = await tx.user.updateMany({ where: { id: b.id, username: null }, data: { username: `${username}b`, usernameChangedAt: now } });
      if (firstChoice.count !== 1) throw new Error('Existing player could not choose a first username');
      await tx.user.update({ where: { id: b.id }, data: { username } });
      throw new Error('Database allowed a duplicate username');
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
  }
  const remaining = await prisma.user.count({ where: { email: { in: [`${marker}-a@example.invalid`, `${marker}-b@example.invalid`] } } });
  if (remaining !== 0) throw new Error('Verification rollback failed');
  console.log('PASS: nullable existing usernames, database-enforced uniqueness, 72-hour cooldown boundary, first selection, repeated-change rejection, and transaction rollback.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
