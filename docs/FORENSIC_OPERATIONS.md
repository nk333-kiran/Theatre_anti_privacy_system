# Anti-Piracy Forensic Operations Playbook

## 1. Operating Procedures for SOC Analysts

### Scenario A: Real-Time Acoustic/Spectral Watermark Trigger
1. **Detection**: Sensor daemon detects illegal cam-recording acoustic frequency in Screen 3.
2. **Auto-Capture**: System generates `EvidenceRecord` (classification: `WATERMARK_MATCH`) with canonical SHA-256 hash.
3. **Investigation Creation**: Analyst opens an `InvestigationCase`, linking the captured evidence record.
4. **Analyst Review**: Investigator inspects seat coordinates ($B\text{-}14$) and admission ticket.
5. **Mitigation**: If confirmed active pirate recording, analyst triggers playback watermarking shift or security checkpoint verification.
6. **Case Resolution**: Analyst logs investigative conclusions, transitions status to `RESOLVED` and then `CLOSED`.

---

## 2. Integrity Verification Operations

* **Continuous Scanning**: Scheduled daemons trigger `evidenceIntegrityService.runBatchIntegrityCheck()`.
* **On-Demand Verification**: Operators can click "Verify Integrity" in the **Forensic Evidence Vault** UI.
* **Tamper Incident Response**: If `tamperDetected == true`:
  1. Record status automatically updates to `FLAGGED_TAMPERED`.
  2. A `CRITICAL` Security Audit Log is published.
  3. Real-time SOC event `EVIDENCE_TAMPERING_DETECTED` streams to all connected administrators.

---

## 3. Legal Hold Discovery Procedure

1. Upon receipt of a legal preservation order or subpoena, locate the relevant `EvidenceRecord` in the **Forensic Evidence Vault**.
2. Click **Apply Legal Hold** and enter the legal case identifier or subpoena docket number.
3. Verify that `retentionStatus` updates to `LEGAL_HOLD`.
4. Click **Export Dossier** &rarr; Select `REPORT` or `JSON` to generate the discovery package.
