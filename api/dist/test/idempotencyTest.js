"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const idempotencyService_1 = require("../services/resilience/idempotencyService");
async function runIdempotencyTests() {
    console.log("\n==================================================================");
    console.log("🔒 PHASE 16: IDEMPOTENCY & DUPLICATE PROTECTION TEST SUITE");
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
    const testKey = `idemp_test_${Date.now()}`;
    const mockReq = {
        method: "POST",
        originalUrl: "/api/tickets/create",
        path: "/api/tickets/create",
        body: { showId: "show-123", seat: "D-14" },
        user: { id: "user-buyer-1" },
    };
    // 1. INITIAL REQUEST IDEMPOTENCY ACQUISITION
    try {
        const check1 = await idempotencyService_1.IdempotencyService.checkOrAcquire(testKey, mockReq);
        assert("1. First mutation with key is accepted (isDuplicate=false)", check1.isDuplicate === false);
        // Concurrent/in-flight attempt with same key
        const check2 = await idempotencyService_1.IdempotencyService.checkOrAcquire(testKey, mockReq);
        assert("1. In-flight request with same key returns status PENDING", check2.isDuplicate === true && check2.status === "PENDING");
        // Record response
        const mockResponsePayload = { ticketId: "TCK-8899", seat: "D-14", status: "ISSUED" };
        await idempotencyService_1.IdempotencyService.recordResponse(testKey, 201, mockResponsePayload);
        // Subsequent call returns completed cached response
        const check3 = await idempotencyService_1.IdempotencyService.checkOrAcquire(testKey, mockReq);
        assert("1. Completed request returns cached response (isDuplicate=true)", check3.isDuplicate === true && check3.status === "COMPLETED");
        assert("1. Cached response status code matches 201", check3.statusCode === 201);
        assert("1. Cached response body matches original payload", check3.responseBody?.ticketId === "TCK-8899");
    }
    catch (err) {
        assert("Idempotency Service Test", false, err.message);
    }
    console.log("\n------------------------------------------------------------------");
    console.log(`📊 PHASE 16 IDEMPOTENCY RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("------------------------------------------------------------------\n");
    if (failed > 0)
        process.exit(1);
    else
        process.exit(0);
}
runIdempotencyTests().catch((err) => {
    console.error("FATAL in Idempotency Test Suite:", err);
    process.exit(1);
});
