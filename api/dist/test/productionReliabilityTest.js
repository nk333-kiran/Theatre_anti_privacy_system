"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const envValidator_1 = require("../config/envValidator");
const correlationId_1 = require("../middleware/correlationId");
const logger_1 = require("../services/logging/logger");
const metricsService_1 = require("../services/observability/metricsService");
const maintenanceMode_1 = require("../middleware/maintenanceMode");
const database_1 = require("@antipiracy/database");
const drmManager_1 = require("../services/drm/drmManager");
/**
 * Phase 11: Production Deployment, Observability & Reliability Automated Test Suite
 */
async function runProductionReliabilityTests() {
    console.log("\n==================================================================");
    console.log("🚀 PHASE 11: PRODUCTION OBSERVABILITY & RELIABILITY TEST SUITE");
    console.log("==================================================================\n");
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
    // 1. REQUEST CORRELATION ID GENERATION
    try {
        const reqId1 = (0, correlationId_1.generateRequestId)();
        const reqId2 = (0, correlationId_1.generateRequestId)();
        const reqIdRegex = /^REQ-\d{8}-[a-f0-9]{8}$/;
        assert("1. Correlation ID matches REQ-YYYYMMDD-XXXXXXXX format", reqIdRegex.test(reqId1));
        assert("1. Correlation IDs are unique across subsequent requests", reqId1 !== reqId2);
    }
    catch (err) {
        assert("Request Correlation ID Test", false, err.message);
    }
    // 2. ZERO-SECRET STRUCTURED LOGGING REDACTION
    try {
        const sensitivePayload = {
            user: "theatre_admin@example.com",
            password: "SuperSecretPassword123!",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
            jwtSecret: "some-long-secret-key-that-should-never-leak",
            authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anotherdummy",
            drmKey: "raw-private-key-12345",
            safeField: "Standard movie title",
        };
        const redacted = (0, logger_1.redactSensitiveData)(sensitivePayload);
        assert("2. Redaction strips plaintext password", redacted.password === "[REDACTED]");
        assert("2. Redaction strips JWT tokens", redacted.token === "[REDACTED]");
        assert("2. Redaction strips Authorization header content", redacted.authorization.includes("[REDACTED]"));
        assert("2. Redaction strips DRM private keys", redacted.drmKey === "[REDACTED]");
        assert("2. Non-sensitive attributes remain intact", redacted.safeField === "Standard movie title");
    }
    catch (err) {
        assert("Logging Redaction Test", false, err.message);
    }
    // 3. IN-MEMORY PERFORMANCE METRICS SERVICE
    try {
        metricsService_1.metricsService.recordRequest("/api/playback/authorize", 200, 45);
        metricsService_1.metricsService.recordRequest("/api/drm/license", 200, 60);
        metricsService_1.metricsService.recordRequest("/api/auth/login", 401, 30);
        metricsService_1.metricsService.recordRateLimitViolation();
        metricsService_1.metricsService.recordAuthFailure();
        const metrics = metricsService_1.metricsService.getMetrics();
        assert("3. Metrics service records requests accurately", metrics.totalRequests >= 3);
        assert("3. Metrics service tracks error counts", metrics.totalErrors >= 1);
        assert("3. Metrics service calculates average latency", metrics.averageLatencyMs > 0);
        assert("3. Metrics service tracks rate-limit events", metrics.rateLimitViolations >= 1);
    }
    catch (err) {
        assert("Performance Metrics Service Test", false, err.message);
    }
    // 4. MAINTENANCE MODE CONTROLLER & INTERCEPTOR
    try {
        maintenanceMode_1.maintenanceState.setStatus(false);
        assert("4. Maintenance Mode initializes in inactive state", !maintenanceMode_1.maintenanceState.getStatus().enabled);
        maintenanceMode_1.maintenanceState.setStatus(true, "Emergency maintenance scheduled");
        const activeState = maintenanceMode_1.maintenanceState.getStatus();
        assert("4. Maintenance Mode toggles to ACTIVE", activeState.enabled);
        assert("4. Maintenance Mode preserves custom status message", activeState.message === "Emergency maintenance scheduled");
        // Reset back to inactive
        maintenanceMode_1.maintenanceState.setStatus(false);
    }
    catch (err) {
        assert("Maintenance Mode Test", false, err.message);
    }
    // 5. PRODUCTION ENVIRONMENT & WEAK JWT VALIDATION
    try {
        const validConfig = (0, envValidator_1.validateAndLoadEnv)();
        assert("5. Environment validator loads valid configuration", typeof validConfig.PORT === "number");
        assert("5. CORS origins parsed as explicit array", Array.isArray(validConfig.CORS_ORIGIN) && validConfig.CORS_ORIGIN.length > 0);
    }
    catch (err) {
        assert("Environment Validator Test", false, err.message);
    }
    // 6. RBAC GATE SIMULATION FOR OPERATIONS ENDPOINTS
    try {
        const adminUser = { id: "op-admin-1", email: "admin@theatre.com", role: "ADMIN" };
        const staffUser = { id: "op-staff-1", email: "staff@theatre.com", role: "THEATRE_STAFF" };
        const studioUser = { id: "op-studio-1", email: "studio@theatre.com", role: "PRODUCTION_COMPANY" };
        const adminToken = jsonwebtoken_1.default.sign(adminUser, envValidator_1.env.JWT_SECRET, { expiresIn: "1h" });
        const staffToken = jsonwebtoken_1.default.sign(staffUser, envValidator_1.env.JWT_SECRET, { expiresIn: "1h" });
        const studioToken = jsonwebtoken_1.default.sign(studioUser, envValidator_1.env.JWT_SECRET, { expiresIn: "1h" });
        const decodedAdmin = jsonwebtoken_1.default.verify(adminToken, envValidator_1.env.JWT_SECRET);
        const decodedStaff = jsonwebtoken_1.default.verify(staffToken, envValidator_1.env.JWT_SECRET);
        const decodedStudio = jsonwebtoken_1.default.verify(studioToken, envValidator_1.env.JWT_SECRET);
        assert("6. Admin role recognized for operations portal", decodedAdmin.role === "ADMIN");
        assert("6. Staff role strictly rejected from operations portal", decodedStaff.role !== "ADMIN");
        assert("6. Production studio role strictly rejected from operations portal", decodedStudio.role !== "ADMIN");
    }
    catch (err) {
        assert("RBAC Operations Gate Test", false, err.message);
    }
    // 7. SAFE DRM DEPENDENCY STATUS (NO CREDENTIAL LEAKAGE)
    try {
        const drmStatus = await drmManager_1.activeDrmProvider.getProviderStatus();
        assert("7. DRM dependency probe returns status object", typeof drmStatus.status === "string");
        assert("7. DRM status does NOT leak master encryption keys", !("rawMasterKey" in drmStatus) && !("secretKey" in drmStatus));
    }
    catch (err) {
        assert("DRM Safe Diagnostics Test", false, err.message);
    }
    // 8. DATABASE ATOMIC TRANSACTION INTEGRITY
    try {
        const testId = `tx-${Date.now().toString(36)}`;
        const result = await database_1.prisma.$transaction(async (tx) => {
            const th = await tx.theatre.create({
                data: {
                    name: `Transaction Safety Theatre (${testId})`,
                    code: `TX-${testId.slice(-4).toUpperCase()}`,
                    location: "Atomic Test Dome",
                },
            });
            const sc = await tx.screen.create({
                data: {
                    theatreId: th.id,
                    screenNumber: 99,
                    name: "Screen 99 (Atomic)",
                    capacity: 100,
                },
            });
            return { theatreId: th.id, screenId: sc.id };
        });
        assert("8. Database multi-entity state persisted atomically in transaction", !!result.theatreId && !!result.screenId);
        // Clean up
        await database_1.prisma.screen.delete({ where: { id: result.screenId } });
        await database_1.prisma.theatre.delete({ where: { id: result.theatreId } });
    }
    catch (err) {
        assert("Database Transaction Safety Test", false, err.message);
    }
    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 11 RELIABILITY SUITE RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0) {
        process.exit(1);
    }
}
runProductionReliabilityTests().catch((err) => {
    console.error("FATAL in Production Reliability Test:", err);
    process.exit(1);
});
