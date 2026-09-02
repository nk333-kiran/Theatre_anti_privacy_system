# Threat Correlation & Incident Clustering

## 1. Sliding Window Correlation Logic

The correlation engine maintains a 15-minute sliding window of security events, continuously grouping telemetry by auditorium show, cinema venue, and content asset.

### Attack Vector Correlation Matrix

| Correlated Cluster Type | Contributing Signals | Severity | Confidence |
| :--- | :--- | :---: | :---: |
| **`PLAYBACK_PIRACY_ACTIVITY`** | DRM Denials + Session Termination + Screenshot Attempts | `CRITICAL` | 95% |
| **`CREDENTIAL_TOKEN_ATTACK`** | Repeated Login Failures (3+) + Token Replay | `HIGH` | 90% |
| **`QR_ABUSE_CLUSTER`** | QR Denials + Checkpoint Denials | `MEDIUM` | 85% |
| **`FORENSIC_WATERMARK_LEAK`** | Watermark Match + Stream Revocation | `CRITICAL` | 98% |
| **`COORDINATED_ATTACK`** | Simultaneous anomalies across 3+ independent venues | `CRITICAL` | 92% |

---

## 2. Duplicate Incident Prevention
To prevent alert fatigue and notification storms, the engine enforces a **5-minute cooldown period per cluster key** (`clusterType:entityId`). Related events are appended to the existing active cluster rather than spawning new incident tickets.
