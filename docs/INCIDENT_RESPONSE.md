# Security Incident Response & Threat Mitigation Runbook

## 1. Incident Severity Definitions

| Severity | Definition | Examples | Response Target |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Active security breach, unauthorized screening stream, DRM key exposure attempt | Multiple rate-limit bypasses on DRM licensing, credential stuffing, compromised staff account | &le; 15 Minutes |
| **HIGH** | Repeated authorization failures, suspicious concurrent device activations | High velocity QR code validation failures, abnormal geolocation hops | &le; 30 Minutes |
| **MEDIUM** | Transient spikes in rate limiting, localized playback authorization denials | Single auditorium projector disconnect, transcode failure | &le; 2 Hours |
| **LOW** | Minor anomalies, non-critical logging warnings | Single failed login attempt, non-critical health check retry | &le; 24 Hours |

---

## 2. Emergency Incident Response Procedures

### Scenario A: Compromised Staff or Studio Account
1. **Instantly Revoke User JWT Tokens**:
   ```bash
   curl -X POST http://localhost:4000/api/security/tokens/revoke \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"targetUserId": "<COMPROMISED_USER_ID>", "reason": "Compromised credential containment"}'
   ```
2. **Force Password Reset**: Update user record in PostgreSQL to invalidate existing hashes.

---

### Scenario B: Suspected Piracy / Screen Recording in Auditorium
1. **Terminate Active Playback Session**:
   ```bash
   curl -X POST http://localhost:4000/api/playback/terminate \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"playbackSessionId": "<SESSION_ID>", "reason": "Piracy detection in Auditorium"}'
   ```
2. **Revoke DRM Key License**:
   ```bash
   curl -X POST http://localhost:4000/api/drm/revoke \
     -H "Authorization: Bearer <ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"licenseToken": "<LICENSE_TOKEN>", "reason": "Auditorium capture mitigation"}'
   ```
3. **Inspect Forensic Watermark**:
   Query the `SecurityAuditLog` for the session's specific user ID, ticket ID, seat number, and screening auditorium timestamp embedded in the forensic watermark overlay.

---

### Scenario C: High-Volume DDoS / API Saturation
1. **Nginx Rate Limit Enforcement**: Verify Nginx rate-limiting zones (`api_general`, `auth_limit`) are actively dropping abusive IP addresses with HTTP 429.
2. **Dynamic Maintenance Mode Circuit Breaker**: If database saturation threatens system stability, enable Maintenance Mode via `/api/operations/maintenance`.
