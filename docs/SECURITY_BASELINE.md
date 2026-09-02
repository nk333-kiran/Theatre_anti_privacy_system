# Enterprise Production Security Baseline

## 1. Security Scanner Criteria

| Check ID | Control Area | Requirement | Action on Failure |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Secrets | Zero weak/placeholder passwords or JWT secrets | **BLOCK** |
| **SEC-02** | Runtime | Sensitive data redacted in log streams | **BLOCK** |
| **SEC-03** | Frontend | Zero server secrets in `NEXT_PUBLIC_` bundle | **BLOCK** |
| **SEC-04** | Headers | Helmet with CSP, HSTS, X-Frame-Options | **BLOCK** |
| **SEC-05** | Rate Limits | Rate limiters configured on auth & public APIs | **BLOCK** |
| **SEC-06** | RBAC | Strict JWT claims validation & role checks | **BLOCK** |
| **SEC-07** | Multi-Tenancy | Tenant boundary verification across all entities | **BLOCK** |
| **SEC-08** | TLS | HTTPS enforced with TLS 1.2/1.3 | **BLOCK** |
| **SEC-09** | Auditing | Cryptographic tamper-evident audit logging | **BLOCK** |
