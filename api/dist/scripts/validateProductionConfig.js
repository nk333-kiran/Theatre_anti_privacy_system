"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envValidator_1 = require("../config/envValidator");
const secretsManager_1 = require("../services/security/secretsManager");
async function run() {
    console.log("==================================================================");
    console.log("🔍 PRODUCTION CONFIGURATION & SECRETS AUDIT");
    console.log("==================================================================");
    const configResult = (0, envValidator_1.validateEnvironmentConfiguration)();
    console.log(`Environment Target: [${configResult.environment}]`);
    console.log(`Configuration Status: ${configResult.valid ? "✅ VALID" : "❌ INVALID"}`);
    if (!configResult.valid) {
        console.error("❌ Missing Required Keys:", configResult.missingKeys);
        console.error("❌ Insecure Keys:", configResult.insecureKeys);
        process.exit(1);
    }
    // Scan mock target for secrets leakage
    const mockPayload = {
        appName: "Theatre Anti-Piracy",
        env: configResult.environment,
        status: "READY",
    };
    const audit = secretsManager_1.secretsManager.scanForLeaks(mockPayload, "StartupPayload");
    console.log(`Secret Leak Scan: ${audit.passed ? "✅ ZERO LEAKS DETECTED" : "❌ LEAKS FOUND"}`);
    if (!audit.passed) {
        console.error("❌ Secret Leaks detected:", audit.leaksDetected);
        process.exit(1);
    }
    console.log("==================================================================");
    console.log("✅ PRODUCTION CONFIGURATION VALIDATION PASSED");
    console.log("==================================================================");
}
run().catch((err) => {
    console.error("Validation error:", err);
    process.exit(1);
});
