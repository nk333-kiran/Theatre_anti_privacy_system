# Enterprise Production Go-Live Checklist

## 1. Infrastructure Readiness
- [x] PostgreSQL 15+ instance provisioned with SSL enforcement.
- [x] Multi-AZ high availability & read-replica failover configured.
- [x] Continuous automated backup cron active with SHA-256 archive checksums.
- [x] Reverse proxy configured with HTTPS (TLS 1.3), HSTS, and CORS whitelisting.
- [x] Environment secrets (JWT_SECRET ≥ 32 characters, DB credentials) externalized.

## 2. Application & Build Verification
- [x] API TypeScript compilation (`tsc`) passes with 0 errors.
- [x] Next.js Web production bundle (`next build`) compiles 9/9 pages with 0 errors.
- [x] Health endpoints (`/health`, `/health/live`, `/health/ready`, `/health/version`) operational.
- [x] Deployment gates endpoint (`/api/production-ops/readiness`) returns `READY_FOR_PRODUCTION`.

## 3. Security & Governance
- [x] Strict Multi-Tenant isolation verified across Theatres and Production Studios.
- [x] Secret-redaction active across all application logs and SOC timelines.
- [x] Role-Based Access Control (RBAC) enforced on all administrative endpoints.
- [x] Zero-Trust token validation with session expiration handling.

## 4. Forensic Evidence & Chain-of-Custody
- [x] Canonical SHA-256 evidence hashing verified.
- [x] Strict non-overwrite guarantee active (No silent tamper repairs).
- [x] Immutable chain-of-custody event log active.

## 5. Disaster Recovery & Rollback
- [x] RPO ≤ 15 minutes validated in automated test suites.
- [x] RTO ≤ 60 minutes validated in automated test suites.
- [x] Application deployment rollback path verified to v0.9.8.
- [x] Pre-migration safety verification service operational.

## 6. Mobile Android Client
- [x] Release build configuration stripped of debug logging.
- [x] `WindowManager.LayoutParams.FLAG_SECURE` enforced during screening.
- [x] CameraX QR token HMAC scanner operational.
- [x] Physical external camera boundary explicitly communicated (Non-fabrication guarantee).
