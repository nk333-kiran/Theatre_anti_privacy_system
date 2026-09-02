# Production Alerting Runbook & Incident Triage

## 1. Alert Severities & SLA Expectations

| Severity | Description | Response SLA | Target Channels |
| :--- | :--- | :--- | :--- |
| `CRITICAL` | Imminent data loss, Evidence Vault tamper, DB outage, Corrupted backup | < 15 minutes | PagerDuty, SMS, Real-Time SOC Modal |
| `HIGH` | API 5xx spike (>5%), p95 latency > 2000ms, RPO violation (>15m) | < 30 minutes | Slack #ops-critical, SOC Incident Queue |
| `MEDIUM` | Telemetry queue growth (>50), Repeated auth failures (>25) | < 2 hours | Slack #ops-alerts, Dashboard Banner |
| `LOW` | Minor probe latency, Non-critical schema warning | Next business day | Audit logs, Weekly report |
| `INFO` | Deployment status change, Drill completion, System boot | Informational | System logs |

---

## 2. Standard Alert Incident Triage

### 2.1 `EVIDENCE_HASH_MISMATCH` (CRITICAL)
* **Trigger**: Cryptographic SHA-256 hash mismatch on Evidence Vault record.
* **Immediate Response**:
  1. **Do NOT overwrite or run automatic database repairs**.
  2. Inspect the audit log using the correlation ID.
  3. Verify if unauthorized storage modification occurred.
  4. Escalate to the Lead Forensic Officer and Legal Counsel.

### 2.2 `BACKUP_STALE_RPO_VIOLATION` (HIGH)
* **Trigger**: Backup age > 15 minutes.
* **Immediate Response**:
  1. Trigger manual snapshot via `/api/recovery/backups`.
  2. Check PostgreSQL WAL archiving and backup cron logs.
  3. Ensure RPO remains below the contractual 15-minute SLA.

### 2.3 `API_5XX_SPIKE` (CRITICAL)
* **Trigger**: API 5xx rate > 5%.
* **Immediate Response**:
  1. Check database connection pool exhaustion.
  2. Verify downstream storage or DRM key provider health.
  3. Review `/health/dependencies` response.
