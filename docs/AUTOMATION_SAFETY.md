# Security Automation Safety & Governance Principles

## Mandatory Safety Mandates

The Theatre Anti-Piracy Platform adheres to strict security, ethical, and operational boundaries:

---

### 1. Advisory-First Rule
- Predictive AI threat scores and external threat feeds are **advisory-first**.
- Automated systems must never terminate playback sessions, revoke tickets, or ban patrons solely based on a predictive probability score.

### 2. Administrator Authorization
- Consequential and destructive actions (e.g. key revocation, session termination, hardware quarantine) require authorized human approval.
- High-risk operations require two-person cryptographic sign-off.

### 3. Physical Hardware Boundary
- The software platform does not claim the ability to physically detect optical camcorders or optical recording equipment in an auditorium.
- Anti-piracy detection operates purely on forensic watermarking, telemetry anomalies, network analysis, and cryptographic authentication.

### 4. Zero-Secret & Zero-PII Ingestion
- No plaintext credentials, DRM master keys, JWT tokens, or raw patron PII are stored in plain text or emitted in system logs or notification feeds.

### 5. Auditability and Traceability
- Every automated workflow execution, state transition, and escalation is logged with an immutable audit event and correlation ID.
