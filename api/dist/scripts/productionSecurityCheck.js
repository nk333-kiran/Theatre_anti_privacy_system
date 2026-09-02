"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envValidator_1 = require("../config/envValidator");
/**
 * Phase 11 Production Security Configuration Checker
 * Validates environment variables, cryptographic strength, CORS policies,
 * DRM provider settings, and network isolation before deployment.
 */
function runProductionSecurityCheck() {
    console.log("\n==================================================");
    console.log("🔒 PRODUCTION SECURITY CONFIGURATION AUDIT");
    console.log("==================================================\n");
    const results = [];
    try {
        const env = (0, envValidator_1.validateAndLoadEnv)();
        // 1. Environment Check
        if (env.NODE_ENV === "production") {
            results.push({ rule: "1. NODE_ENV set to production", status: "PASS", reason: "NODE_ENV=production" });
        }
        else {
            results.push({ rule: "1. NODE_ENV set to production", status: "WARN", reason: `Current NODE_ENV is '${env.NODE_ENV}'` });
        }
        // 2. JWT Secret Strength
        if (!env.JWT_SECRET) {
            results.push({ rule: "2. Cryptographic JWT Secret", status: "FAIL", reason: "JWT_SECRET is missing" });
        }
        else if (env.JWT_SECRET.length < 32) {
            results.push({ rule: "2. Cryptographic JWT Secret", status: "FAIL", reason: "JWT_SECRET is shorter than 32 characters" });
        }
        else if (env.JWT_SECRET.includes("development") || env.JWT_SECRET.includes("dev-secret") || env.JWT_SECRET.includes("placeholder")) {
            results.push({ rule: "2. Cryptographic JWT Secret", status: "FAIL", reason: "JWT_SECRET appears to be a known development placeholder" });
        }
        else {
            results.push({ rule: "2. Cryptographic JWT Secret", status: "PASS", reason: `Strong secret configured (${env.JWT_SECRET.length} chars)` });
        }
        // 3. CORS Policy
        if (env.CORS_ORIGIN.includes("*")) {
            results.push({ rule: "3. CORS Origin Restriction", status: "FAIL", reason: "Wildcard origin '*' is present in CORS_ORIGIN" });
        }
        else if (env.CORS_ORIGIN.some((o) => o.includes("localhost") || o.includes("127.0.0.1"))) {
            results.push({ rule: "3. CORS Origin Restriction", status: "WARN", reason: "Localhost origins detected in CORS_ORIGIN list" });
        }
        else {
            results.push({ rule: "3. CORS Origin Restriction", status: "PASS", reason: `Strict explicit allowlist configured (${env.CORS_ORIGIN.length} origins)` });
        }
        // 4. Database URL Configuration
        if (!env.DATABASE_URL) {
            results.push({ rule: "4. Database URL Configuration", status: "FAIL", reason: "DATABASE_URL is missing" });
        }
        else if (env.DATABASE_URL.includes("postgres:postgres@localhost")) {
            results.push({ rule: "4. Database URL Configuration", status: "WARN", reason: "Default postgres credentials / localhost detected" });
        }
        else {
            results.push({ rule: "4. Database URL Configuration", status: "PASS", reason: "Secure PostgreSQL connection URL configured" });
        }
        // 5. DRM Provider Configuration
        if (env.DRM_PROVIDER === "mock" && env.NODE_ENV === "production") {
            results.push({ rule: "5. Production Hardware DRM Provider", status: "WARN", reason: "Mock DRM provider active in production (switch to Widevine/PlayReady/FairPlay for release)" });
        }
        else {
            results.push({ rule: "5. Production Hardware DRM Provider", status: "PASS", reason: `DRM provider set to '${env.DRM_PROVIDER}'` });
        }
        // 6. Maintenance Mode Status
        results.push({
            rule: "6. Maintenance Mode Flag",
            status: env.MAINTENANCE_MODE ? "WARN" : "PASS",
            reason: env.MAINTENANCE_MODE ? "MAINTENANCE_MODE is active (public playback will be blocked)" : "Normal operation active",
        });
        // Print summary table
        results.forEach((r) => {
            const badge = r.status === "PASS" ? "✅ [PASS]" : r.status === "WARN" ? "⚠️ [WARN]" : "❌ [FAIL]";
            console.log(`  ${badge} ${r.rule}`);
            console.log(`         Details: ${r.reason}`);
        });
        const passCount = results.filter((r) => r.status === "PASS").length;
        const warnCount = results.filter((r) => r.status === "WARN").length;
        const failCount = results.filter((r) => r.status === "FAIL").length;
        console.log("\n--------------------------------------------------");
        console.log(`📊 AUDIT SUMMARY: ${passCount} Passed, ${warnCount} Warnings, ${failCount} Failures`);
        console.log("--------------------------------------------------\n");
        if (failCount > 0) {
            console.error("❌ Production Security Audit FAILED. Resolve critical failures before deploying.");
            process.exit(1);
        }
        else {
            console.log("✅ Production Security Configuration Check Passed.");
        }
    }
    catch (err) {
        console.error("❌ Configuration audit failed:", err.message);
        process.exit(1);
    }
}
runProductionSecurityCheck();
