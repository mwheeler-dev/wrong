// Additive and idempotent: existing accounts keep NULL until they choose a handle.
// Run before Prisma db push so no blanket --accept-data-loss flag is needed.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
    await tx.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT');
    await tx.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usernameChangedAt" TIMESTAMP(3)');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")');
  });
  console.log('Username column and unique index ready; existing accounts preserved.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
