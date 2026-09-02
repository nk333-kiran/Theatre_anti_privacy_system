# Production Deployment Architecture

## 1. Top-Level Architectural Topology

```
Internet (Clients, Mobile Apps, Studios, Cinema Admin)
                ↓ HTTPS (Port 443) / TLS 1.3
        [ Nginx Reverse Proxy / Load Balancer ]
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
[ Web Frontend ]       [ API Service ] (Port 4000)
(Next.js SSR/Static)        ↓
                            ├──────────────────────────────────────┐
                            ↓                                      ↓
                [ PostgreSQL Database ]                 [ Private Evidence Storage ]
                (Isolated `db-network`)                (SHA-256 Vault / Chain-of-Custody)
                            ↓                                      ↓
                [ Backup & Disaster Recovery ]         [ Observability & SOC Stream ]
                (AES-256 Snapshots, RPO <= 15m)       (Prometheus Exporter / Audit Log)
```

## 2. Network Boundaries & Isolation

| Boundary Tier | Accessible From | Protocol / Port | Isolation Controls |
| :--- | :--- | :--- | :--- |
| **Public Edge** | Public Internet | HTTPS (443), HTTP (80 -> 443 redirect) | TLS 1.2/1.3, Strict CSP, HSTS, Rate Limiting zones |
| **Application Tier** | Reverse Proxy | HTTP Internal (3000 Web, 4000 API) | Non-root containers, Request hardening, Parameter pollution guard |
| **Database Tier** | API Service Only | PostgreSQL (5432) | Isolated Docker bridge (`internal: true`), no external routing |
| **Storage Tier** | API Service Only | Local filesystem volume mount | Read-only mounts for web/proxy, strict POSIX permissions |

## 3. Secrets & Key Boundaries

- **Database Credentials**: Injected via Docker secrets / Environment variables at container startup; never committed to git.
- **JWT & Master Keys**: Loaded by `SecretsManager` using pluggable providers (`EnvSecretProvider`, Cloud KMS); runtime leak scanner prevents reflection into logs or error objects.
- **Forensic Watermark HMAC Keys**: Kept in memory inside API service, rotated per session.

## 4. Monitoring & Telemetry Paths

1. **In-Flight Metrics**: Ingested on every HTTP request/response cycle via `metricsService`.
2. **Prometheus Exposition**: Available on `/api/production/metrics/prometheus` for scraping.
3. **Audit Trails**: Hash-linked tamper-evident audit records logged synchronously for critical security events.
