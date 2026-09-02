# Real-Time Anti-Piracy Intelligence & Automated SOC Response Architecture

## 1. System Overview
The **Real-Time Security Architecture** integrates an internal event bus, multi-signal threat correlation, dynamic risk escalation with time decay, Server-Sent Events (SSE) streaming with Role-Based Access Control (RBAC), and administrator-gated response automation.

```text
 ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
 │ Authenticated Ingest │    │ Checkpoint Scanners  │    │  DRM / Video Stream  │
 └──────────┬───────────┘    └──────────┬───────────┘    └──────────┬───────────┘
            │                           │                           │
            └───────────────────► ┌─────▼───────────────────────────▼─────┐
                                  │       Realtime Event Bus Layer        │
                                  │   (Sanitizer & Zero-Secret Filter)    │
                                  └─────────────────┬─────────────────────┘
                                                    │
                                  ┌─────────────────┴─────────────────────┐
                                  ▼                                       ▼
                  ┌───────────────────────────────┐       ┌───────────────────────────────┐
                  │    Event Correlation Engine   │       │    Risk Escalation Engine     │
                  │   (Sliding Window Clustering) │       │   (Escalation & Time Decay)   │
                  └───────────────┬───────────────┘       └───────────────┬───────────────┘
                                  │                                       │
                                  └─────────────────┬─────────────────────┘
                                                    ▼
                                  ┌───────────────────────────────────────┐
                                  │       Realtime Threat Engine          │
                                  │   (Automated Response & Dedupe)       │
                                  └─────────────────┬─────────────────────┘
                                                    │
                                                    ▼
                                  ┌───────────────────────────────────────┐
                                  │       SSE Security Stream API         │
                                  │   (RBAC Scoped to Admin/Studio/Staff) │
                                  └───────────────────────────────────────┘
```

---

## 2. Ingested Real-Time Events

1. **Authentication & Session**: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `TOKEN_REPLAY`, `RATE_LIMIT_EXCEEDED`
2. **Ticket & Checkpoint**: `QR_ACTIVATION`, `QR_ACTIVATION_DENIED`, `STAFF_VERIFICATION`
3. **Playback & DRM**: `PLAYBACK_AUTHORIZED`, `PLAYBACK_DENIED`, `PLAYBACK_TERMINATED`, `DRM_LICENSE_AUTHORIZED`, `DRM_LICENSE_DENIED`, `DRM_LICENSE_REVOKED`, `SCREENSHOT_ATTEMPT_DETECTED`
4. **Forensic & Incident**: `FORENSIC_WATERMARK_MATCH`, `INCIDENT_CREATED`, `INCIDENT_ESCALATED`

---

## 3. Zero-PII & Zero-Secret Guarantee
Every incoming payload is intercepted and stripped of JWT secrets, database passwords, DRM master keys, authentication tokens, and customer PII before broadcast or persistence.
