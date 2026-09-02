# Circuit Breaker Operations & Incident Runbook

## 1. Circuit States & Transitions

* **`CLOSED`**: All outbound requests to dependencies flow normally. Failure counts are tracked.
* **`OPEN`**: Tripped after 3–5 consecutive failures. Outbound requests are short-circuited immediately to prevent cascade failure. Safe fallback executed.
* **`HALF_OPEN`**: Entered after reset timeout (5–10s). A limited number of probe requests are permitted. If probes succeed, circuit returns to `CLOSED`.

---

## 2. Platform Circuit Breakers

| Breaker Name | Protected Subsystem | Failure Threshold | Reset Timeout |
| :--- | :--- | :--- | :--- |
| `database` | PostgreSQL Connection Pool | 5 failures | 5,000ms |
| `redis` | Redis Distributed State / Cache | 3 failures | 5,000ms |
| `cdn` | Cloudflare / Fastly CDN Edge | 3 failures | 5,000ms |
| `drm` | Commercial Widevine/PlayReady Servers | 4 failures | 8,000ms |
| `kms` | AWS KMS / Cloud HSM | 3 failures | 5,000ms |
| `storage` | Cloud S3 Object Storage | 4 failures | 10,000ms |
