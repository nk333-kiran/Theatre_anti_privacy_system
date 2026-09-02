#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { dataImportService } = require('../api/dist/services/database/dataImportService');

async function main() {
  const args = process.argv.slice(2);

  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const hasFlag = (flag) => args.includes(flag);

  const filePath = getArg('--file');
  const entity = getArg('--entity');
  const dryRun = hasFlag('--dry-run') || !hasFlag('--commit');
  const skipDuplicates = !hasFlag('--error-on-duplicate');

  if (hasFlag('--help') || !filePath || !entity) {
    console.log(`
Usage: node scripts/import_data_cli.js --file <PATH> --entity <TYPE> [--dry-run | --commit]

Options:
  --file <PATH>          Path to .csv or .json file
  --entity <TYPE>        Entity type:
                           - production-companies
                           - theatres
                           - screens
                           - users
                           - movies
                           - movie-releases
                           - shows
                           - tickets
  --dry-run              Validate dataset without inserting into PostgreSQL (default)
  --commit               Commit validated records into PostgreSQL in a transaction
  --error-on-duplicate   Fail if duplicate record is encountered (default: skips duplicate)
  --help                 Show this help screen
    `);
    process.exit(0);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found at '${resolvedPath}'`);
    process.exit(1);
  }

  console.log(`\n📂 Loading file: ${resolvedPath}`);
  const content = fs.readFileSync(resolvedPath, 'utf8');

  let rawData;
  if (resolvedPath.endsWith('.json')) {
    try {
      rawData = JSON.parse(content);
    } catch (e) {
      console.error(`❌ Error: Invalid JSON syntax in file: ${e.message}`);
      process.exit(1);
    }
  } else {
    rawData = content;
  }

  console.log(`🔍 Mode: ${dryRun ? 'DRY-RUN (Validation only)' : '⚡ LIVE COMMIT (PostgreSQL Transaction)'}`);
  console.log(`🏷️ Entity: ${entity}`);

  try {
    const report = await dataImportService.importData(entity, rawData, {
      dryRun,
      skipDuplicates,
      actorEmail: 'cli.admin@theatre.system',
    });

    console.log('\n======================================================');
    console.log('              DATA IMPORT REPORT                      ');
    console.log('======================================================');
    console.log(`Status:       ${report.failed === 0 ? '✅ SUCCESS' : '⚠️ COMPLETED WITH ERRORS'}`);
    console.log(`Total Rows:   ${report.totalRecords}`);
    console.log(`Inserted:     ${report.inserted}`);
    console.log(`Skipped:      ${report.skipped}`);
    console.log(`Failed:       ${report.failed}`);
    console.log(`Summary:      ${report.summary}`);

    if (report.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      report.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. Row #${err.index} [Field: ${err.field || 'N/A'}]: ${err.message}`);
      });
    }
    console.log('======================================================\n');

    process.exit(report.failed === 0 ? 0 : 1);
  } catch (err) {
    console.error(`\n❌ Import failed with unhandled exception:`, err);
    process.exit(1);
  }
}

main();
