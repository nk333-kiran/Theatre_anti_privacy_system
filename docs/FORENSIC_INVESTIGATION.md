# Forensic Watermarking & Piracy Investigation Architecture

## 1. Zero-PII Forensic Watermarking Engine

The Theatre Anti-Piracy Platform generates dynamic, session-unique forensic watermarks embedded in theatrical and streaming video playback.

```
 [ Admission Ticket ] ──► [ Mobile QR Activation ] ──► [ Checkpoint Verification ]
                                                              │
                                                              ▼
               [ 5-Point Playback Authorization ] ──► [ 10-Point DRM License ]
                                                              │
                                                              ▼
                     ┌──────────────────────────────────────────────────┐
                     │ Forensic Watermark Payload (Zero-PII v1.3)       │
                     │  - Activation ID (act_...)                       │
                     │  - Playback Session ID (pbt_...)                 │
                     │  - Theatre Code (e.g. TH-IMAX01)                 │
                     │  - Auditorium Screen (Screen 2)                  │
                     │  - Seat Number (Seat A-12)                       │
                     │  - Show ID & Movie ID                            │
                     │  - Timestamp (ISO 8601)                          │
                     │  - SHA-256 Fingerprint Hash                      │
                     └──────────────────────────────────────────────────┘
```

### Strict Zero-PII Guarantee
* **Never embedded in watermark**: Customer name, email, phone number, credit card details, plaintext passwords, JWT signing secrets, or DRM private encryption keys.
* **Traceability**: The watermark payload is sufficient to resolve the exact screening session, auditorium, seat, and admission ticket from the encrypted audit ledger without exposing sensitive consumer PII.

---

## 2. Reverse Watermark Tracing & Lookup Workflow

When a leaked video recording is identified:
1. **Extract Fingerprint**: Security investigators extract the visual/steganographic watermark string (e.g. `AGY-V13:TH01-S2-A12-ACT9F82-PBT4A1B-T1724932800`) or SHA-256 digest.
2. **Execute Lookup Probe**:
   ```bash
   curl -G "http://localhost:4000/api/investigations/watermark/lookup" \
     --data-urlencode "query=AGY-V13:TH01-S2-A12-ACT9F82-PBT4A1B-T1724932800" \
     -H "Authorization: Bearer <ADMIN_JWT>"
   ```
3. **Resolve Session Chain**:
   The engine performs an indexed database lookup returning:
   * **Movie Title & Duration**
   * **Theatrical Venue, Location & Code**
   * **Auditorium Screen & Exact Seat Number**
   * **Admission Ticket Number & Price**
   * **Security Checkpoint Officer Attestation**
   * **Playback Session & DRM License Status**

---

## 3. Piracy Incident Lifecycle & Evidence Integrity

### Incident Status Workflow
```
 DETECTED ──► TRIAGED ──► INVESTIGATING ──► CONFIRMED ──► MITIGATED ──► CLOSED
     │                                                                     ▲
     └──────────────────────────► FALSE_POSITIVE ──────────────────────────┘
```

### Cryptographic Evidence Hashes
Every attached piece of forensic evidence (frame captures, screen recording detections, DRM tamper reports) is hashed with SHA-256 upon ingestion:
* **Canonical Hash**: `SHA256(incidentId | evidenceType | fingerprint | source | timestamp)`
* **Anti-Tamper**: If evidence records are tampered with or modified post-ingestion, the verification endpoint flags the record as `CORRUPTED` and alerts the SOC.

---

## 4. Chronological Session Timeline

The platform reconstructs the chronological history of any screening session from birth to termination:
1. **Ticket Issuance**: Ticket number generated, seat assigned, price recorded.
2. **Mobile QR Activation**: Ticket bound to consumer device fingerprint and IP.
3. **Staff Verification**: Auditorium officer physical check-in attestation.
4. **Playback Authorization**: 5-point security gate verification.
5. **DRM Licensing**: 10-point DRM hardware key token issuance.
6. **Runtime Monitoring**: Screenshot attempts, fullscreen toggles, and heartbeat telemetry.
7. **Forensic Evidence Attachment**: Leak detections linked to session.
8. **Containment & Revocation**: Instant termination and DRM key revocation.
