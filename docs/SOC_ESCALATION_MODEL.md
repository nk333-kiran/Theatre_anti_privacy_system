# Policy-Driven SOC Escalation Model

## Overview

The Platform implements a deterministic, explainable escalation policy engine. Incidents are escalated automatically based on validated telemetry signals or analyst review.

---

## Escalation Triggers & Severity Mapping

| Signal / Condition | Resulting Severity | Rationale |
| :--- | :--- | :--- |
| **Risk Score $\ge 80/100$** | `CRITICAL` | High likelihood of active content extraction or unauthorized hardware decryption. |
| **Risk Score $60 - 79/100$** | `HIGH` | Multiple anomalous signals detected during screening session. |
| **Evidence Tampering** | `CRITICAL` | Integrity compromise in vault storage requires immediate forensic investigation. |
| **Repeat IOC Matches ($\ge 3$)** | `HIGH` / `CRITICAL` | Correlated with known darkweb release server distribution networks. |
| **Coordinated Attack ($\ge 2$ Theatres)** | `CRITICAL` | Simultaneous exploitation across multiple theatrical venues. |

---

## Escalation Auditability

Every escalation creates a `SecurityEscalation` record with:
- `fromSeverity` and `toSeverity`
- `fromRisk` and `toRisk`
- `reason`
- `triggeredBy` (`AUTOMATED_POLICY`, `ANALYST_ACTION`, `IOC_CORRELATION`, `EVIDENCE_TAMPERING`)
- `correlationId`
- Appended event in `SecurityIncidentTimeline`
