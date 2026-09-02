# Anti-Piracy Threat Intelligence Architecture

## Overview
The **Theatre Anti-Piracy Threat Intelligence Mesh** continuously correlates multi-source telemetry across ticketing checkpoints, playback sessions, DRM licensing events, watermarking decoders, and immutable security audit logs to produce deterministic, explainable risk ratings and controlled automated containment.

---

## 1. System Architecture

```text
 ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
 │  Checkpoint Scans │    │ Playback Sessions │    │   DRM Licensing   │
 └─────────┬─────────┘    └─────────┬─────────┘    └─────────┬─────────┘
           │                        │                        │
           └────────────────► ┌─────▼────────────────────────▼────┐
                              │    Telemetry Correlation Mesh     │
                              │    (Multi-Signal Deduplication)   │
                              └──────────────┬────────────────────┘
                                             │
                                             ▼
                              ┌──────────────────────────────────┐
                              │  Deterministic Risk Evaluator    │
                              │  (0–100 Score, Explainable Logs) │
                              └──────────────┬───────────────────┘
                                             │
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
        ┌──────────────────────────────────┐    ┌──────────────────────────────────┐
        │   Clustered Incident Database    │    │   Automated Containment Engine   │
        │   (Unified threat investigation) │    │   (Approval-Gated Mitigation)    │
        └──────────────────────────────────┘    └──────────────────────────────────┘
```

---

## 2. Fundamental Principles & Reality Constraints

> [!IMPORTANT]
> **No Magic AI / Optical Recording Constraints**: Browser and web technologies **cannot** physically detect optical camcorders, mobile phone cameras held by cinema patrons, or guarantee 100% prevention of external analog recording. 
> 
> The platform operates on **cryptographic token authenticity, dynamic forensic watermarking, synchronized playback session verification, DRM authorization integrity, and multi-signal behavioral anomaly correlation**.

---

## 3. Data Protection & Zero-PII Guarantee
1. **Never Stored in Intelligence Feeds**:
   - Customer names, phone numbers, email addresses, credit card details.
   - Master encryption keys, JWT secrets, private storage paths.
2. **Attribution Model**:
   - Threat incidents correlate non-PII operational identifiers: `theatreId`, `showId`, `activationId`, `playbackSessionId`, `seatNumber`, and anonymized SHA-256 device fingerprints.
