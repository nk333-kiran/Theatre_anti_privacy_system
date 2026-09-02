# Operational Acceptance Test (OAT) Specification

## 1. Scope & Verification Matrix

The Operational Acceptance Test validates that the platform performs safely, securely, and predictably under real operational workflows:

1. **Bootstrap & Health**: Server boots, validates environment config, passes `/health` and `/readiness` probes.
2. **Authentication & RBAC**: JWT access tokens issued, claims verified, multi-role policies enforced.
3. **QR Activation & Verification**: Fast ticket QR validation under simulated high throughput.
4. **Forensic Watermarking & Session Tracking**: Dynamic watermarks rendered and bound to playback sessions.
5. **SOC Incident Stream**: Live telemetry ingested, correlated, and surfaced to security dashboards.
6. **Chain-of-Custody**: SHA-256 evidence hashing and immutable vault records.
7. **Human-in-the-Loop Governance**: Automated actions restricted to non-punitive measures; punitive actions require human review.
8. **Business Continuity**: Backup integrity checked, RPO <= 15m, RTO <= 60m.
9. **Graceful Draining & Shutdown**: In-flight requests drained before process exit.
