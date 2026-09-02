# External Intelligence Response Safety & Non-Disruption Policy

## 1. Core Principles of Safe Threat Response

External threat intelligence provides vital contextual signals regarding syndicated piracy groups, leak portals, and restream proxies. However, because external intelligence feeds can suffer from false positives, compromised upstream relays, or malicious data poisoning, the platform enforces strict safety rules:

1. **No Automated Destructive Actions**: An external threat intelligence match alone **MUST NEVER** automatically:
   - Terminate active movie playback in any theatre screen.
   - Revoke active customer tickets or deny QR entry.
   - Revoke DRM decryption licenses for legitimate auditorium players.
   - Block or isolate theatre network endpoints.
2. **Advisory First**: Matches generate high-visibility alerts in the Anti-Piracy Command Center and Real-Time SOC dashboards for human analyst review.
3. **Analyst-Gated Escalation**: Any consequential mitigation action (e.g. initiating dynamic watermark frequency escalation, opening a forensic investigation case, or requesting staff physical checkpoint verification) requires human administrator approval.

---

## 2. Decision & Safety Matrix

| Sighting Scenario | Automated Engine Response | Permitted Analyst Actions | Prohibited Automated Actions |
| :--- | :--- | :--- | :--- |
| **External IOC matches Playback Session IP** | • Log `ThreatIntelMatch`<br>• Emit Advisory Alert to SOC<br>• Elevate Session Risk Score | • Escalate to Investigation Case<br>• Request On-Site Staff Check<br>• Tighten Forensic Watermarking | ❌ Terminate Playback<br>❌ Revoke DRM License<br>❌ Eject Patrons |
| **High Confidence Torrent Hash Matches File** | • Create `ThreatIntelMatch`<br>• Correlate with Movie Title | • Link to Forensic Case<br>• Trigger Watermark Extraction | ❌ Revoke Release License<br>❌ Block Studio Feed |
| **Suspicious IP hits Admission API** | • Increase verification logging<br>• Check Rate Limiting gates | • Analyst reviews audit logs<br>• Issue security warning | ❌ Cancel Unrelated Tickets |
