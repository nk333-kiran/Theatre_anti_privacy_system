# SOC Notification Framework

## Overview

The **SOC Notification Framework** delivers real-time, sanitized, and deduplicated operational notifications across administrators, analysts, and theatre managers.

---

## Supported Notification Categories

1. `CRITICAL_SECURITY_EVENT`
2. `HIGH_RISK_INCIDENT`
3. `EVIDENCE_TAMPERING`
4. `IOC_CORRELATION`
5. `COORDINATED_ATTACK`
6. `PRIVILEGED_ACTION`
7. `BREAK_GLASS`
8. `SYSTEM_HEALTH`

---

## Core Security & Privacy Guarantees

1. **Zero-Secret Guarantee**:
   - JWT tokens, passwords, master keys, and authorization headers are automatically redacted with `[REDACTED_JWT_TOKEN]` and `[REDACTED_CREDENTIAL]`.

2. **Zero-PII Protection**:
   - User email addresses are masked (e.g. `jo***@cinema.com`) to prevent exposure of customer and staff identities in broadcast channels.

3. **Intelligent Deduplication**:
   - Notifications compute a SHA-256 deduplication key over `(category, subjectId, titleSnippet)`.
   - Subsequent identical alerts within a 5-minute sliding cooldown window are suppressed to prevent alert fatigue and notification storms.

4. **Multi-Tenant Scoping**:
   - Theatre staff only receive notifications pertinent to their authorized venue or global broadcasts (`theatreId: null`). Cross-theatre alert leakage is strictly prevented.
