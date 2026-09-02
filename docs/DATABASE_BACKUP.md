# PostgreSQL Database Backup, Retention & Integrity Guide

## 1. Backup Architecture Overview

The Theatre Anti-Piracy Platform implements a multi-tier database backup strategy combining automated table snapshots with SHA-256 cryptographic checksums, automated retention pruning, and zero-secret exposure.

```
 ┌────────────────────────┐
 │ PostgreSQL Primary DB  │
 └───────────┬────────────┘
             │ (Atomic Snapshot / Dump)
             ▼
 ┌────────────────────────────────────────────────────────┐
 │  Backup Engine (api/src/services/backup/backupService) │
 └───────────┬────────────────────────────────────────────┘
             │
             ├──► 1. Compute SHA-256 Checksum
             ├──► 2. Write Snapshot to /backups/theatre_db_<timestamp>.json
             ├──► 3. Update backups_manifest.json
             └──► 4. Emit SOC Security Audit Log
```

---

## 2. Backup Types & Triggers

| Backup Type | Trigger | Frequency | Storage Location | Retention |
| :--- | :--- | :--- | :--- | :--- |
| **Scheduled Automatic** | Cron / Background Worker | Hourly | `/backups` + Encrypted S3/GCS bucket | 30 Days |
| **Manual Admin Snapshot** | Admin Operations Dashboard / API | On-Demand (Pre-deploy) | `/backups` | 30 Days |
| **Pre-Migration Dump** | CI/CD Pipeline pre-deploy hook | On every schema migration | Persistent Volume | 90 Days |

---

## 3. Operational APIs (Admin Only)

| Endpoint | Method | Action | Description |
| :--- | :--- | :--- | :--- |
| `/api/operations/backups` | `GET` | List Backups | Returns manifest of all backups, file sizes, checksums, and verification status. |
| `/api/operations/backups/create` | `POST` | Create Backup | Triggers an immediate atomic database snapshot. |
| `/api/operations/backups/:id/verify` | `POST` | Verify Integrity | Recalculates file hash on disk and compares against recorded SHA-256 checksum. |
| `/api/operations/backups/prune` | `POST` | Retention Pruning | Removes archives older than retention window (default: 30 days). |
| `/api/operations/disaster-recovery` | `GET` | DR SLA Status | Returns RPO, RTO, and recovery readiness telemetry. |

---

## 4. Integrity & Anti-Tamper Verification

Every backup file is hashed with SHA-256 upon generation. When verifying integrity:
1. The raw file buffer is streamed into `crypto.createHash('sha256')`.
2. The resultant 64-character hexadecimal digest is compared against the initial manifest value.
3. If hashes do not match, status is flagged as `CORRUPTED` and a `HIGH` severity alert is raised in the Security Operations Center (SOC).

---

## 5. Pruning & Retention Lifecycle

Backups are pruned automatically based on configurable age thresholds:
```typescript
// Prune archives older than 30 days
backupService.pruneExpiredBackups(30);
```
During pruning:
* Disk space is reclaimed.
* File references are cleared from the manifest.
* Audit events log the number of files pruned and total kilobytes freed.
