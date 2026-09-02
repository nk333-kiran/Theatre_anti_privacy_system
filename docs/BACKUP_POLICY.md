# Enterprise Backup & Verification Policy

## 1. Backup Schedule & Retention Rules

| Backup Tier | Frequency | Retention Window | Storage Target | Encryption |
| :--- | :--- | :--- | :--- | :--- |
| **Continuous WAL Logs** | Real-time stream | 7 days | Encrypted Cloud Bucket | AES-256-GCM |
| **Hourly Snapshots** | Every 15 minutes | 14 days | Multi-Region Storage | AES-256-GCM |
| **Daily Full Archives** | Daily at 02:00 UTC | 90 days | Cold Archive Tier | AES-256-GCM |
| **Evidence Vault Exports** | Event-driven / On-demand | 7 Years (Legal Hold) | Immutable WORM Storage | SHA-256 Sealed |

---

## 2. Cryptographic Checksum Verification

Every generated backup is cataloged in the verification manifest with:
* `backupId`: Unique identifier (e.g., `BKP-PROD-20260831-01`)
* `checksum`: Full SHA-256 hexadecimal hash computed immediately upon export
* `size`: Exact byte count
* `verificationStatus`: `PENDING`, `VERIFIED`, `FAILED`, `CORRUPTED`, `EXPIRED`

### Corruption Policy:
* Any backup with a modified payload or mismatched checksum is immediately flagged as `CORRUPTED`.
* Corrupted backups are **strictly quarantined** and blocked from restore pipelines.
