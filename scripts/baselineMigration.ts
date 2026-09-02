import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const migrationPath = path.resolve(__dirname, '../database/prisma/migrations/20260902000000_init/migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');

  console.log('Baseline migration checksum:', checksum);

  await prisma.$executeRawUnsafe(
    'INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (\, \, NOW(), \, NULL, NULL, NOW(), 1) ON CONFLICT (id) DO UPDATE SET checksum = \, finished_at = NOW(), applied_steps_count = 1;',
    'a1b2c3d4-0000-4000-8000-000000000001',
    checksum,
    '20260902000000_init'
  );

  console.log('? Successfully recorded baseline migration 20260902000000_init in _prisma_migrations!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error baselining migration:', err);
  process.exit(1);
});
