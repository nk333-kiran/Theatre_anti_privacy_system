# Enterprise Security Operations Standard

## 1. Unified Threat SOC

The Unified SOC processes events in real time from:
1. **Theatrical Mobile Devices** (Android CameraX, Screening sessions, Screen capture attempts)
2. **Auditorium Sensors & DRM Pipelines** (Watermark decoders, License verification)
3. **Identity & Access Management** (Token renewals, unauthorized access attempts)

---

## 2. Strictly Non-Punitive Architecture

The system strictly adheres to the non-punitive operational model:
- **No Automatic Lockouts**: An auditorium patron's phone is never locked or remotely manipulated based solely on an automated sensor ping.
- **Human-in-the-Loop Review**: All high-severity enforcement actions (e.g. issuing copyright notices or studio notifications) require explicit dual-custody human sign-off (`ADMIN`, `THEATRE_ADMIN`, `PRODUCTION_COMPANY`).
- **Explainability**: Every incident timeline documents the exact causal path (`WHY` $\to$ `EVIDENCE` $\to$ `RISK` $\to$ `ACTION` $\to$ `APPROVAL`).
