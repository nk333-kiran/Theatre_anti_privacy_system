import { CircuitBreaker } from "../services/resilience/circuitBreaker";
import { cdnFailoverService } from "../services/cdn/cdnFailoverService";
import { cacheService } from "../services/cache/cacheService";

async function runHighAvailabilityTests() {
  console.log("\n==================================================================");
  console.log("⚡ PHASE 16: HIGH AVAILABILITY & RESILIENCE TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details || "Assertion failed"}`);
      failed++;
    }
  }

  // 1. CIRCUIT BREAKER RESILIENCE
  try {
    const breaker = new CircuitBreaker("test-drm-server", {
      failureThreshold: 3,
      resetTimeoutMs: 150,
      halfOpenMaxProbes: 2,
    });

    assert("1. Circuit breaker starts in CLOSED state", breaker.getState() === "CLOSED");

    // Execute successful call
    const successRes = await breaker.execute(async () => "SUCCESS");
    assert("1. Closed circuit passes requests successfully", successRes === "SUCCESS");

    // Trip the breaker with 3 consecutive failures
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error("Simulated DRM Timeout");
        });
      } catch {}
    }

    assert("1. Circuit breaker transitions to OPEN after 3 failures", breaker.getState() === "OPEN");

    // Fast-fail when OPEN
    let didFastFail = false;
    try {
      await breaker.execute(async () => "SHOULD_NOT_RUN");
    } catch (err: any) {
      didFastFail = err.message.includes("OPEN");
    }
    assert("1. Open circuit fails fast without executing protected action", didFastFail);

    // Fallback execution when OPEN
    const fallbackRes = await breaker.execute(
      async () => "UNREACHABLE",
      async () => "FALLBACK_CACHED_LICENSE"
    );
    assert("1. Open circuit executes safe fallback handler", fallbackRes === "FALLBACK_CACHED_LICENSE");

    // Wait for reset timeout and verify HALF_OPEN transition
    await new Promise((r) => setTimeout(r, 160));
    assert("1. Breaker transitions to HALF_OPEN after reset timeout", breaker.getState() === "HALF_OPEN");

    // 2 successful probes in HALF_OPEN close the circuit
    await breaker.execute(async () => "PROBE_1");
    await breaker.execute(async () => "PROBE_2");
    assert("1. Circuit returns to CLOSED after successful recovery probes", breaker.getState() === "CLOSED");
  } catch (err: any) {
    assert("Circuit Breaker Test", false, err.message);
  }

  // 2. MULTI-CDN FAILOVER
  try {
    const primary = cdnFailoverService.getActiveEndpoint();
    assert("2. Default active CDN is primary Cloudflare endpoint", primary.priority === 1);

    // Simulate primary CDN outage
    cdnFailoverService.setEndpointHealth(primary.id, false);
    const fallback = cdnFailoverService.getActiveEndpoint();
    assert("2. CDN failover promotes secondary Fastly endpoint when primary fails", fallback.priority === 2);

    // Resilient URL generation
    const resilient = cdnFailoverService.generateResilientPlaybackUrl({
      assetPath: "hls/master.m3u8",
      sessionId: "pb_sess_ha_test",
    });
    assert("2. Failover service generates both primary and fallback signed URLs", !!resilient.primaryUrl && !!resilient.fallbackUrl);

    // Restore primary health
    cdnFailoverService.setEndpointHealth(primary.id, true);
  } catch (err: any) {
    assert("CDN Failover Test", false, err.message);
  }

  // 3. SAFE CACHE LAYER WITH ENTITY INVALIDATION
  try {
    let factoryCalls = 0;
    const testKey = "theatre:meta:123";

    const fetchTheatre = async () => {
      factoryCalls++;
      return { id: "123", name: "IMAX Megaplex", seats: 450 };
    };

    // First fetch (Cache Miss)
    const val1 = await cacheService.getOrSet(testKey, fetchTheatre, 60);
    assert("3. Cache populates data on initial miss", val1.name === "IMAX Megaplex" && factoryCalls === 1);

    // Second fetch (Cache Hit)
    const val2 = await cacheService.getOrSet(testKey, fetchTheatre, 60);
    assert("3. Subsequent fetch returns cached data without calling factory", val2.name === "IMAX Megaplex" && factoryCalls === 1);

    // Invalidate
    await cacheService.invalidate(testKey);
    const val3 = await cacheService.getOrSet(testKey, fetchTheatre, 60);
    assert("3. Invalidation triggers fresh data reload on next access", val3.name === "IMAX Megaplex" && factoryCalls === 2);

    const stats = cacheService.getStats();
    assert("3. Cache statistics record hit ratio accurately", stats.hits >= 1 && stats.misses >= 2);
  } catch (err: any) {
    assert("Cache Layer Test", false, err.message);
  }

  console.log("\n------------------------------------------------------------------");
  console.log(`📊 PHASE 16 HIGH AVAILABILITY RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runHighAvailabilityTests().catch((err) => {
  console.error("FATAL in High Availability Test Suite:", err);
  process.exit(1);
});
