# Automated Incident Response & Threat Containment

## 1. Response Action Matrix

The Incident Response subsystem executes automated and operator-triggered containment actions against suspected piracy activities.

| Action Type | Target Entity | Mechanism | Reversibility |
| :--- | :--- | :--- | :--- |
| `SESSION_REVOKED` | `PlaybackSession` | Sets status to `TERMINATED` and records timestamp and reason. | Non-reversible |
| `ACTIVATION_REVOKED` | `Activation` & `Ticket` | Sets activation to `REVOKED` and ticket to `CANCELLED`. | Reversible via Admin Override |
| `DRM_REVOKED` | `DrmLicense` | Invalidates active DRM key licenses across DRM providers. | Non-reversible |
| `TOKEN_BLACKLISTED` | `RevokedToken` | Inserts SHA-256 token digest into PostgreSQL blacklist. | Non-reversible |
| `PLAYBACK_DISABLED` | `VideoAsset` | Transitions asset state to `BLOCKED`. | Reversible by Production Studio |
| `SEVERITY_ESCALATED` | `SecurityIncident` | Upgrades severity to `CRITICAL` and status to `ESCALATED`. | Yes |
| `INVESTIGATION_CREATED` | `PiracyIncident` | Creates linked Phase 13 forensic investigation record. | Permanent Audit Log |

---

## 2. Audit Trail & Idempotency

* **Idempotency**: Multiple executions of the same response action (e.g. repeated `SESSION_REVOKED` calls) return `SKIPPED_ALREADY_APPLIED` rather than throwing errors or corrupting state.
* **Zero Evidence Deletion**: In accordance with forensic standards, evidence items and action records are append-only.
* **Audit Ledger**: Every action records the `actorId`, `actorRole`, `targetId`, `result`, and `metadata` in both `IncidentAction` and `SecurityAuditLog`.
