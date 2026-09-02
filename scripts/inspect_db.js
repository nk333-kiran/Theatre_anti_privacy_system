const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DB INSPECTION START ---');
  const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
  console.log('Database Info:', dbInfo);

  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log(`Total Tables in public schema: ${tables.length}`);

  const counts = {};
  for (let t of tables) {
    const tableName = t.table_name;
    try {
      const res = await prisma.$queryRawUnsafe(`SELECT count(*)::int as count FROM "${tableName}"`);
      counts[tableName] = res[0].count;
    } catch (e) {
      counts[tableName] = `error: ${e.message}`;
    }
  }
  console.log('Table Row Counts:', JSON.stringify(counts, null, 2));

  try {
    const migrations = await prisma.$queryRaw`SELECT id, migration_name, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at`;
    console.log('Prisma Migrations in DB:', migrations);
  } catch (e) {
    console.log('Error reading _prisma_migrations:', e.message);
  }
  console.log('--- DB INSPECTION END ---');
}

main()
  .catch((e) => {
    console.error('Inspection Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
