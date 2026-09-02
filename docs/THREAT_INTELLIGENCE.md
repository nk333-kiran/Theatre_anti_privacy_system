# Rule-Based Threat Intelligence & Risk Scoring Engine

## 1. Threat Scoring Architecture

The Threat Intelligence Engine processes multi-signal runtime telemetry to evaluate anomaly risk scores (0 to 100) and trigger automated defense policies.

```
 [ Runtime Signals ]
   ├── Screenshot Attempt Detections
   ├── High Velocity Rate Limit Breaches
   ├── Excessive DRM License Token Requests
   ├── Playback Authorization Denials
   └── Geo / Device Fingerprint Inconsistencies
               │
               ▼
   [ Threat Intelligence Engine (api/src/services/forensics/threatIntelligenceEngine) ]
               │
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │ Output: Risk Score (0-100), Severity, Recommended Action│
   └─────────────────────────────────────────────────────────┘
```

---

## 2. Threat Rule Matrix

| Rule ID | Rule Name | Detection Criteria | Max Score Contribution | Recommended Policy |
| :--- | :--- | :--- | :--- | :--- |
| **TR-001** | Screen Capture Tool Detected | Player sandbox detects browser screenshot, screencast, or devtools capture attempt. | +60 pts | `TERMINATE_SESSION` |
| **TR-002** | Rate Limit Breach Spike | Client IP exceeds API rate limit thresholds (>300 req/min or >10 login attempts). | +40 pts | `FLAG_AUDITORIUM` |
| **TR-003** | Excessive DRM Licenses | More than 2 concurrent DRM licenses requested for a single admission ticket. | +25 pts | `REVOKE_DRM` |
| **TR-004** | Authorization Rejection | Repeated 401/403 denials on `/api/playback/authorize` or `/api/drm/license`. | +40 pts | `OBSERVE` |

---

## 3. Severity Classification & Response Policy

| Score Range | Severity Level | Automated / Recommended Policy Action |
| :--- | :--- | :--- |
| **75 – 100** | **CRITICAL** | **Immediate Session Termination** & DRM Key Revocation. Raise high-priority incident in SOC. |
| **50 – 74** | **HIGH** | **Revoke DRM Key License**. Require security officer checkpoint reverification. |
| **25 – 49** | **MEDIUM** | **Flag Auditorium**. Increase watermark frequency and audit logging fidelity. |
| **0 – 24** | **LOW** | **Observe**. Standard forensic heartbeat monitoring. |

---

## 4. Operational API Integration

* `GET /api/investigations/threat-intelligence`: Real-time platform threat summary, distribution percentiles, active high-risk entities, and top triggered rules.
* `POST /api/investigations/incidents/:id/mitigate`: One-click execution of containment policy.
