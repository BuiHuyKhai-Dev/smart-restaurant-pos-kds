const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.table.findMany({
    select: { id: true, tableNumber: true, qrToken: true, status: true, branchId: true },
  });
  console.log('Tables in DB:');
  console.table(tables);
}

main().catch(console.error).finally(() => prisma.$disconnect());

