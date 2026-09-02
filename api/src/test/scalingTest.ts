import { redisManager } from "../services/redis/redisManager";
import { persistentJobQueue } from "../services/workers/persistentJobQueue";

async function runScalingTests() {
  console.log("\n==================================================================");
  console.log("📈 PHASE 16: AUTO-SCALING & TRAFFIC ENGINEERING TEST SUITE");
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

  const redis = redisManager.getProvider();
  const testKey = `rl_test_${Date.now()}`;

  // 1. SLIDING-WINDOW DISTRIBUTED RATE LIMITING
  try {
    // 5 requests allowed in 10-second window
    const limit = 5;
    const windowSec = 10;

    for (let i = 0; i < 5; i++) {
      const check = await redis.slidingWindowRateLimit(testKey, limit, windowSec);
      assert(`1. Request ${i + 1}/5 allowed under sliding-window limit`, check.allowed);
    }

    // 6th request must be rejected
    const blockedCheck = await redis.slidingWindowRateLimit(testKey, limit, windowSec);
    assert("1. Excess request rejected with allowed=false", !blockedCheck.allowed && blockedCheck.remaining === 0);
  } catch (err: any) {
    assert("Sliding Window Rate Limit Test", false, err.message);
  }

  // 2. DISTRIBUTED MUTEX LOCKING
  try {
    const lockKey = `mutex_test_${Date.now()}`;
    const lock1 = await redis.acquireLock(lockKey, 5);
    assert("2. Primary client acquires distributed lock", lock1.acquired);

    const lock2 = await redis.acquireLock(lockKey, 5);
    assert("2. Secondary client strictly rejected while lock is active", !lock2.acquired);

    const released = await lock1.release();
    assert("2. Primary client releases distributed lock", released);

    const lock3 = await redis.acquireLock(lockKey, 5);
    assert("2. Secondary client successfully acquires lock after release", lock3.acquired);
    await lock3.release();
  } catch (err: any) {
    assert("Distributed Mutex Lock Test", false, err.message);
  }

  // 3. PERSISTENT WORKER QUEUE & DEAD-LETTER QUEUE
  try {
    // Register temporary failing handler
    persistentJobQueue.registerHandler("CLEANUP", async () => {
      throw new Error("Simulated Permanent Worker Fault");
    });

    const job = await persistentJobQueue.add("CLEANUP", { dir: "/tmp/test" }, { maxRetries: 1 });
    assert("3. Persistent queue adds job with tracking ID", job.id.startsWith("job_"));

    // Wait for retries to exhaust and trigger DLQ routing
    await new Promise((r) => setTimeout(r, 350));

    const dlq = persistentJobQueue.getDeadLetterJobs();
    assert("3. Exhausted jobs are routed to Dead Letter Queue (DLQ)", dlq.some((j) => j.id === job.id));

    const stats = persistentJobQueue.getQueueStats();
    assert("3. Queue statistics report active workers and DLQ count", stats.deadLetterCount >= 1 && stats.concurrency === 4);
  } catch (err: any) {
    assert("Persistent Queue Test", false, err.message);
  }

  console.log("\n------------------------------------------------------------------");
  console.log(`📊 PHASE 16 SCALING RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runScalingTests().catch((err) => {
  console.error("FATAL in Scaling Test Suite:", err);
  process.exit(1);
});
