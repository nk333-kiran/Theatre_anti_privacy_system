# Production Observability & Logging Standard

## 1. Structured JSON Logging

Every log event in the platform is emitted as a structured JSON object containing standard correlation context:

```json
{
  "timestamp": "2026-08-31T22:30:00.000Z",
  "level": "INFO",
  "message": "Patron screening session verified successfully",
  "correlationId": "CORR-REQ-1788195413514",
  "requestId": "REQ-78418-4065",
  "theatreId": "theatre-nyc-01",
  "actorRole": "THEATRE_STAFF",
  "route": "/api/verifications/verify-qr",
  "method": "POST",
  "statusCode": 200,
  "durationMs": 18
}
```

---

## 2. Zero-Secret Redaction Policy

The logging engine enforces strict redaction rules:

1. **Passwords & Hashes**: Never logged in plaintext or hashed form in application logs.
2. **Bearer JWT Tokens**: Header values are stripped before logging.
3. **Private Keys & Certificates**: Master private keys and DRM seeds are strictly blocked.
4. **Credit Card & Patron PII**: Patron phone numbers, email addresses, and payment data are masked.

---

## 3. Real-Time Metrics & Percentiles

The in-memory metrics engine (`metricsService.ts`) computes rolling metrics:

* **Throughput**: Total requests, active requests, requests/minute.
* **Latency Percentiles**:
  - `p50`: Median request processing duration (Target < 50ms)
  - `p95`: 95th percentile latency (Target < 200ms)
  - `p99`: Tail latency (Target < 500ms)
* **Domain Subsystem Counters**:
  - `QR Admission`: Verification attempts, valid, expired, duplicate, cross-theatre attempts.
  - `Watermarking`: Dynamic canvas rotations, attribution attempts, attribution successes.
  - `Evidence Vault`: Catalog count, cryptographic verification checks, tamper mismatches.
  - `Unified SOC`: Ingested threat events, high-severity alerts, retry queue depth.
  - `Disaster Recovery`: Backup freshness age, verification status, RPO compliance, RTO readiness.
