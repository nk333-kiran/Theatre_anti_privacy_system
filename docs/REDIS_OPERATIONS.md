# Redis Cluster Operations & Distributed State Architecture

## 1. Key Namespaces & TTL Policies

| Key Pattern | Purpose | Data Structure | Default TTL |
| :--- | :--- | :--- | :--- |
| `rl:<ip>:<userId>` | Distributed sliding-window rate limit | Sorted Set / List of Timestamps | 60 – 300 seconds |
| `idemp_lock:<key>` | Idempotency lock mutex | String (Token) | 5 – 10 seconds |
| `cache:theatre:*` | Public venue and screen metadata | String (JSON) | 120 seconds |
| `cache:movie:*` | Movie release details | String (JSON) | 300 seconds |
| `dedup:<jobKey>` | Background worker job deduplication | String (Flag) | 30 seconds |

---

## 2. Failover & Local Memory Fallback

If the Redis cluster experiences a network partition or outage:
* `LocalRedisProvider` automatically takes over distributed locking and sliding-window rate limiting in-memory on the active node.
* Security operations, DRM issuance, and checkpoint staff verifications continue without degradation.
