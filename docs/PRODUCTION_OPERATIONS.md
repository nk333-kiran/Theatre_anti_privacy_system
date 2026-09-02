# Production Operations Guide

## 1. Overview
The **Theatre Anti-Piracy Platform** is designed for high-availability theatrical screening environments with strict multi-tenant isolation, cryptographically verifiable forensic watermarks, Unified SOC telemetry ingestion, and dual-custody disaster recovery.

---

## 2. System Architecture & Boundaries

```
+---------------------------------------------------------------------------------------------------+
|                                  THEATRE ANTI-PIRACY PLATFORM                                     |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ Physical Theatre & Mobile Client ]                                                             |
|   - Native Android App (WindowManager.FLAG_SECURE, ScreenCaptureCallback, CameraX QR)             |
|   - Dynamic 60s rotating session watermarks (Patron seat attribution, show UUID, venue ID)        |
|                                                                                                   |
|  [ Edge & API Gateway Layer ]                                                                     |
|   - Reverse Proxy with HTTPS enforcement & HSTS (max-age=31536000)                                |
|   - Correlation ID Injection (x-correlation-id, x-request-id)                                     |
|   - Rate Limiting, Input Sanitization & Parameter Pollution Filters                               |
|                                                                                                   |
|  [ Core Application Subsystems ]                                                                  |
|   - Admission & QR HMAC Verification (`/api/verifications`, `/api/activations`)                   |
|   - Real-Time SOC Ingestion & Threat Engine (`/api/soc`, `/api/realtime`)                         |
|   - Forensic Evidence Vault & Chain-of-Custody (`/api/evidence`)                                  |
|   - Human-in-the-Loop Piracy Enforcement (`/api/enforcement`)                                     |
|   - Studio Distribution & Intelligence (`/api/intelligence`, `/api/production`)                   |
|   - Disaster Recovery & Deployment Gates (`/api/recovery`, `/api/production-ops`)                 |
|                                                                                                   |
|  [ Data & Cryptographic Storage Layer ]                                                           |
|   - PostgreSQL with Prisma ORM & Connection Pooling                                               |
|   - Encrypted Backup Archive Catalogs (SHA-256 Checksummed)                                       |
|   - Canonical SHA-256 Evidence Vault (Strict Non-Overwrite Policy)                                |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Operational Roles & Permissions

| Role | Access Scope | Allowed Operations |
| :--- | :--- | :--- |
| `ADMIN` | Global Platform | Full system operations, DR restore, rollback execution, security rule configuration |
| `THEATRE_ADMIN` | Theatre Venue Bound | Local venue screening schedule, staff management, local DR requests, SOC viewer |
| `THEATRE_STAFF` | Theatre Venue Bound | QR ticket scanning, patron admission, seat verification |
| `PRODUCTION_COMPANY` | Studio Bound | Movie catalog, forensic leak intelligence, legal enforcement reviews |

---

## 4. Key Operational Runbooks

### 4.1 Deployment Pre-Flight Check
Run the automated pre-flight gate check:
```bash
npm run test:production
```

### 4.2 Disaster Recovery Drill
Verify backup catalogs and simulated recovery:
```bash
npm run test:disaster-recovery
```

### 4.3 Clean Web & API Build
```bash
npm run build:api
npm run build:web
```
