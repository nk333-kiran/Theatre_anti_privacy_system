"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("@antipiracy/database");
const envValidator_1 = require("../config/envValidator");
/**
 * Phase 12 Deployment Preflight Validator
 * Runs prior to starting production containers/processes to ensure all infrastructure
 * prerequisites, database connections, and volume permissions are healthy.
 */
async function runDeploymentPreflight() {
    console.log("\n==================================================");
    console.log("🚀 PRODUCTION DEPLOYMENT PREFLIGHT AUDIT");
    console.log("==================================================\n");
    const results = [];
    // 1. Environment Configuration Validation
    try {
        const validated = (0, envValidator_1.validateAndLoadEnv)();
        results.push({
            check: "1. Environment Variables Schema",
            status: "PASS",
            details: `Environment: ${validated.NODE_ENV}, Port: ${validated.PORT}`,
        });
    }
    catch (err) {
        results.push({
            check: "1. Environment Variables Schema",
            status: "FAIL",
            details: err.message,
        });
    }
    // 2. Database Connectivity & Ping
    try {
        const start = Date.now();
        await database_1.prisma.$queryRaw `SELECT 1`;
        const latency = Date.now() - start;
        results.push({
            check: "2. PostgreSQL Connectivity Probe",
            status: "PASS",
            details: `Connection verified (Ping: ${latency}ms)`,
        });
    }
    catch (err) {
        results.push({
            check: "2. PostgreSQL Connectivity Probe",
            status: "FAIL",
            details: `Database connection failed: ${err.message}`,
        });
    }
    // 3. Storage Directory & Write Permissions
    try {
        const storageDir = envValidator_1.env.STORAGE_BASE_DIR;
        if (!fs_1.default.existsSync(storageDir)) {
            fs_1.default.mkdirSync(storageDir, { recursive: true });
        }
        const testFile = path_1.default.join(storageDir, `.write_test_${Date.now()}`);
        fs_1.default.writeFileSync(testFile, "test-write-permission", "utf-8");
        fs_1.default.unlinkSync(testFile);
        results.push({
            check: "3. Media Storage Volume Permissions",
            status: "PASS",
            details: `Write access verified at: ${storageDir}`,
        });
    }
    catch (err) {
        results.push({
            check: "3. Media Storage Volume Permissions",
            status: "FAIL",
            details: `Storage volume inaccessible: ${err.message}`,
        });
    }
    // 4. Backup Directory & Manifest Permissions
    try {
        const backupDir = path_1.default.resolve(process.cwd(), "backups");
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        const testFile = path_1.default.join(backupDir, `.write_test_${Date.now()}`);
        fs_1.default.writeFileSync(testFile, "test-backup-permission", "utf-8");
        fs_1.default.unlinkSync(testFile);
        results.push({
            check: "4. Backup Directory Permissions",
            status: "PASS",
            details: `Write access verified at: ${backupDir}`,
        });
    }
    catch (err) {
        results.push({
            check: "4. Backup Directory Permissions",
            status: "FAIL",
            details: `Backup directory inaccessible: ${err.message}`,
        });
    }
    // 5. Cryptographic JWT Secret Check
    if (envValidator_1.env.JWT_SECRET && envValidator_1.env.JWT_SECRET.length >= 32) {
        results.push({
            check: "5. JWT Secret Entropy",
            status: "PASS",
            details: `Strong cryptographic secret (${envValidator_1.env.JWT_SECRET.length} characters)`,
        });
    }
    else {
        results.push({
            check: "5. JWT Secret Entropy",
            status: envValidator_1.env.NODE_ENV === "production" ? "FAIL" : "WARN",
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
    await database_1.prisma.$disconnect();
    if (failCount > 0) {
        console.error("❌ Preflight check failed. Resolve failures before proceeding with deployment.");
        process.exit(1);
    }
    else {
        console.log("✅ Preflight validation passed. Application is ready for launch.");
        process.exit(0);
    }
}
runDeploymentPreflight().catch((err) => {
    console.error("Fatal error during deployment preflight:", err);
    process.exit(1);
});
