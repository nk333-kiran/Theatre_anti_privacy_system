import fs from "fs";
import path from "path";
import { prisma } from "@antipiracy/database";
import { env, validateAndLoadEnv } from "../config/envValidator";

/**
 * Phase 12 Deployment Preflight Validator
 * Runs prior to starting production containers/processes to ensure all infrastructure
 * prerequisites, database connections, and volume permissions are healthy.
 */
async function runDeploymentPreflight() {
  console.log("\n==================================================");
  console.log("🚀 PRODUCTION DEPLOYMENT PREFLIGHT AUDIT");
  console.log("==================================================\n");

  const results: { check: string; status: "PASS" | "WARN" | "FAIL"; details: string }[] = [];

  // 1. Environment Configuration Validation
  try {
    const validated = validateAndLoadEnv();
    results.push({
      check: "1. Environment Variables Schema",
      status: "PASS",
      details: `Environment: ${validated.NODE_ENV}, Port: ${validated.PORT}`,
    });
  } catch (err: any) {
    results.push({
      check: "1. Environment Variables Schema",
      status: "FAIL",
      details: err.message,
    });
  }

  // 2. Database Connectivity & Ping
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    results.push({
      check: "2. PostgreSQL Connectivity Probe",
      status: "PASS",
      details: `Connection verified (Ping: ${latency}ms)`,
    });
  } catch (err: any) {
    results.push({
      check: "2. PostgreSQL Connectivity Probe",
      status: "FAIL",
      details: `Database connection failed: ${err.message}`,
    });
  }

  // 3. Storage Directory & Write Permissions
  try {
    const storageDir = env.STORAGE_BASE_DIR;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const testFile = path.join(storageDir, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, "test-write-permission", "utf-8");
    fs.unlinkSync(testFile);

    results.push({
      check: "3. Media Storage Volume Permissions",
      status: "PASS",
      details: `Write access verified at: ${storageDir}`,
    });
  } catch (err: any) {
    results.push({
      check: "3. Media Storage Volume Permissions",
      status: "FAIL",
      details: `Storage volume inaccessible: ${err.message}`,
    });
  }

  // 4. Backup Directory & Manifest Permissions
  try {
    const backupDir = path.resolve(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const testFile = path.join(backupDir, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, "test-backup-permission", "utf-8");
    fs.unlinkSync(testFile);

    results.push({
      check: "4. Backup Directory Permissions",
      status: "PASS",
      details: `Write access verified at: ${backupDir}`,
    });
  } catch (err: any) {
    results.push({
      check: "4. Backup Directory Permissions",
      status: "FAIL",
      details: `Backup directory inaccessible: ${err.message}`,
    });
  }

  // 5. Cryptographic JWT Secret Check
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) {
    results.push({
      check: "5. JWT Secret Entropy",
      status: "PASS",
      details: `Strong cryptographic secret (${env.JWT_SECRET.length} characters)`,
    });
  } else {
    results.push({
      check: "5. JWT Secret Entropy",
      status: env.NODE_ENV === "production" ? "FAIL" : "WARN",
      details: "JWT_SECRET is shorter than 32 characters or using development default",
    });
  }

  // Print Summary
  results.forEach((r) => {
    const badge = r.status === "PASS" ? "✅ [PASS]" : r.status === "WARN" ? "⚠️ [WARN]" : "❌ [FAIL]";
    console.log(`  ${badge} ${r.check}`);
    console.log(`         ${r.details}`);
  });

  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log("\n--------------------------------------------------");
  console.log(`📊 PREFLIGHT RESULT: ${results.filter((r) => r.status === "PASS").length} Passed, ${results.filter((r) => r.status === "WARN").length} Warnings, ${failCount} Failures`);
  console.log("--------------------------------------------------\n");

  await prisma.$disconnect();

  if (failCount > 0) {
    console.error("❌ Preflight check failed. Resolve failures before proceeding with deployment.");
    process.exit(1);
  } else {
    console.log("✅ Preflight validation passed. Application is ready for launch.");
    process.exit(0);
  }
}

runDeploymentPreflight().catch((err) => {
  console.error("Fatal error during deployment preflight:", err);
  process.exit(1);
});
