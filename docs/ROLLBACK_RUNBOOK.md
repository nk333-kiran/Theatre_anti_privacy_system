# Production Deployment Rollback Runbook

## 1. Rollback Trigger Criteria

A production rollback is initiated when:
* Critical API crash rates exceed 1.0% over a 5-minute evaluation window.
* Database migration failures or data serialization errors are detected post-deployment.
* Evidence Vault hash generation or verification fails in production workflows.
* Mobile check-in scanner failure rates surge due to client-server contract mismatches.

---

## 2. Step-by-Step Rollback Workflow

```text
1. Outage / Bug Identification
          ↓
2. Submit Authorized Rollback Request via `POST /api/recovery/:id/rollback`
          ↓
3. Validate Schema Backwards Compatibility with Target Release (v0.9.8)
          ↓
4. Shift Traffic to Previous Known-Good Container Replicas
          ↓
5. Execute Health Probes (`/health`, `/health/db`, `/health/ready`)
          ↓
6. Run Deep Evidence Vault Integrity Scan (`GET /api/recovery/evidence/integrity`)
          ↓
7. Confirm Telemetry Queue Drain & Idempotency
          ↓
8. Log `ROLLBACK_COMPLETE` Audit Event & Notify SOC Lead
```

---

## 3. Pre-Flight Rollback Checklist

- [x] Target version tagged and verified in container registry.
- [x] Database schema verified as backwards compatible.
- [x] Administrative authorization credentials verified.
- [x] Immutable audit trail correlation ID generated.
