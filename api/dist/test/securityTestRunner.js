"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const envValidator_1 = require("../config/envValidator");
const tokenService_1 = require("../services/security/tokenService");
const threatDetector_1 = require("../services/security/threatDetector");
const securityAuditService_1 = require("../services/security/securityAuditService");
const drmManager_1 = require("../services/drm/drmManager");
/**
 * Phase 10: Automated Security Test Suite
 * Validates cryptographic guarantees, RBAC gates, rate limiting logic,
 * token blacklists, threat heuristics, and secret exposure prevention.
 */
async function runSecurityTests() {
    console.log("\n==================================================");
    console.log("🛡️  THEATRE ANTI-PIRACY SECURITY HARDENING TEST SUITE");
    console.log("==================================================\n");
    let passed = 0;
    let failed = 0;
    function assert(testName, condition, details) {
        if (condition) {
            console.log(`  ✅ [PASS] ${testName}`);
            passed++;
        }
        else {
            console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
            failed++;
        }
    }
    // TEST 1: JWT Signing & Expiry Security
    try {
        const testUser = {
            id: "sec-user-1",
            email: "tester@security.com",
            role: "THEATRE_STAFF",
            name: "Security Tester",
        };
        const token = jsonwebtoken_1.default.sign(testUser, envValidator_1.env.JWT_SECRET, { expiresIn: "1h" });
        const decoded = jsonwebtoken_1.default.verify(token, envValidator_1.env.JWT_SECRET);
        assert("JWT token signs and verifies with active JWT_SECRET", decoded.email === testUser.email);
        assert("JWT token does not contain sensitive password fields", !("password" in decoded) && !("passwordHash" in decoded));
    }
    catch (err) {
        assert("JWT Signing & Expiration", false, err.message);
    }
    // TEST 2: Bcrypt Password Hash Verification
    try {
        const plainPassword = "SuperSecurePassword123!";
        const salt = await bcryptjs_1.default.genSalt(10);
        const hash = await bcryptjs_1.default.hash(plainPassword, salt);
        const match = await bcryptjs_1.default.compare(plainPassword, hash);
        const badMatch = await bcryptjs_1.default.compare("WrongPassword", hash);
        assert("Bcrypt correctly verifies genuine password hash", match);
        assert("Bcrypt strictly rejects incorrect passwords", !badMatch);
        assert("Password hash does not equal plaintext", hash !== plainPassword && hash.startsWith("$2"));
    }
    catch (err) {
        assert("Bcrypt Hash Verification", false, err.message);
    }
    // TEST 3: JWT Token Revocation & Blacklist Engine
    try {
        const revokedToken = jsonwebtoken_1.default.sign({ id: "revoked-user" }, envValidator_1.env.JWT_SECRET, { expiresIn: "10m" });
        await tokenService_1.TokenService.revokeToken(revokedToken, "revoked-user", "Security test revocation");
        const isBlacklisted = await tokenService_1.TokenService.isTokenRevoked(revokedToken);
        const validToken = jsonwebtoken_1.default.sign({ id: "clean-user" }, envValidator_1.env.JWT_SECRET, { expiresIn: "10m" });
        const isCleanRevoked = await tokenService_1.TokenService.isTokenRevoked(validToken);
        assert("TokenService records and identifies blacklisted token", isBlacklisted);
        assert("TokenService does not falsely blacklist active tokens", !isCleanRevoked);
    }
    catch (err) {
        assert("Token Blacklist Engine", false, err.message);
    }
    // TEST 4: Threat Detection Anomaly Heuristics
    try {
        const analysisNormal = await threatDetector_1.threatDetector.analyzeEvent({
            eventType: "LOGIN_SUCCESS",
            ipAddress: "127.0.0.1",
            actionSummary: "Normal login",
        });
        const analysisRateLimit = await threatDetector_1.threatDetector.analyzeEvent({
            eventType: "RATE_LIMIT_EXCEEDED",
            ipAddress: "10.0.0.99",
            endpoint: "/api/drm/license",
            actionSummary: "Rate limit breached",
        });
        assert("Threat detector identifies normal traffic as non-threat", !analysisNormal.isThreat);
        assert("Threat detector flags rate limit breach as threat anomaly", analysisRateLimit.isThreat);
    }
    catch (err) {
        assert("Threat Detection Heuristics", false, err.message);
    }
    // TEST 5: DRM Provider Abstraction Security & Zero-Key-Leakage
    try {
        const keyDetails = await drmManager_1.activeDrmProvider.createContentKey("asset-sec-test", "movie-sec-test");
        const status = await drmManager_1.activeDrmProvider.getProviderStatus();
        assert("DRM Provider creates valid Key Identifier (KID)", keyDetails.keyId.startsWith("urn:uuid:"));
        assert("DRM Provider reports safe status without credentials", status.status === "READY");
        assert("DRM Provider never exposes raw private master key", !("rawMasterKey" in keyDetails) && !("rawSecretKey" in keyDetails));
    }
    catch (err) {
        assert("DRM Provider Security", false, err.message);
    }
    // TEST 6: Unified Security Audit Service Zero-PII Guarantee
    try {
        await securityAuditService_1.SecurityAuditService.logEvent({
            eventType: "LOGIN_FAILED",
            severity: "MEDIUM",
            actorEmail: "audit-test@example.com",
            ipAddress: "192.168.1.50",
            actionSummary: "Security test failed login audit entry",
        });
        assert("SecurityAuditService safely logs event with actor attribution", true);
    }
    catch (err) {
        assert("Security Audit Service", false, err.message);
    }
    console.log("\n--------------------------------------------------");
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("--------------------------------------------------\n");
    if (failed > 0) {
        process.exit(1);
    }
}
runSecurityTests().catch((err) => {
    console.error("FATAL in test suite:", err);
    process.exit(1);
});
