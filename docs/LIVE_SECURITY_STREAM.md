# Server-Sent Events (SSE) Live Security Stream

## 1. Stream Endpoint Specification

* **Path**: `GET /api/security/live-stream` (or `/api/incidents/live-stream`)
* **Protocol**: Server-Sent Events (SSE) / HTTP `text/event-stream`
* **Authorization**: Bearer JWT (`ADMIN` role required)
* **Headers**:
  ```http
  Content-Type: text/event-stream
  Cache-Control: no-cache, no-transform
  Connection: keep-alive
  X-Accel-Buffering: no
  ```

---

## 2. Event Types & Payloads

### Event: `threat_alert`
Broadcast when a threat rule threshold is exceeded:
```json
{
  "id": "ta_1787986347318_85908cde",
  "alertType": "SCREENSHOT_ATTEMPT_DETECTED",
  "severity": "CRITICAL",
  "riskScore": 85,
  "confidence": 95,
  "theatreId": "th_imax_01",
  "description": "3 screen capture attempts detected in player sandbox",
  "recommendedResponse": "TERMINATE_SESSION_AND_REVOKE_DRM",
  "timestamp": "2026-08-29T07:15:00.000Z"
}
```

### Event: `incident_created`
Broadcast when a new security incident is logged:
```json
{
  "incidentId": "inc_987213",
  "incidentNumber": "SEC-KT7Y-9A",
  "title": "Automated Screen Capture Burst",
  "severity": "HIGH",
  "riskScore": 70,
  "createdAt": "2026-08-29T07:15:05.000Z"
}
```

### Event: `action_executed`
Broadcast when automated or manual containment occurs:
```json
{
  "incidentId": "inc_987213",
  "incidentNumber": "SEC-KT7Y-9A",
  "actionType": "SESSION_REVOKED",
  "result": "SUCCESS",
  "details": "Playback session terminated immediately.",
  "timestamp": "2026-08-29T07:15:10.000Z"
}
```

---

## 3. Resilience & Connection Management

* **Heartbeat**: Every 15 seconds, a comment line (`: heartbeat <timestamp>`) is pushed to prevent intermediate proxy/load balancer timeouts.
* **Auto-Reconnect**: Client EventSource automatically reconnects upon transient connection loss with automatic telemetry state resynchronization.
* **Zero Leakage**: Payloads never contain cryptographic secrets, database credentials, or sensitive consumer PII.
