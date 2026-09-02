# Compliance & Retention Policy Engine

## 1. Overview

The **Compliance & Retention Engine** automates statutory data lifecycle policies across all forensic evidence records, access logs, and investigation dossiers while enforcing legal hold safeguards.

---

## 2. Retention Schedules

| Record Classification | Default Retention Period | Auto-Transition Status |
| :--- | :--- | :--- |
| **Low / Medium Anomalies** | 90 Days | `EXPIRED` &rarr; `ARCHIVED` |
| **Watermark & Critical Tamper Records** | 365 Days | `EXPIRED` &rarr; `ARCHIVED` |
| **Active Legal Hold Records** | **Indefinite** | Exemption from automated purge |

---

## 3. Legal Hold Protection Mechanism

```text
┌──────────────────────────────────────┐
│  Automated Retention Evaluator Job   │
└──────────────────┬───────────────────┘
                   │
                   ▼
       [Is Record Expired?]
          ├── YES ──> [retentionStatus == "LEGAL_HOLD"?]
          │                ├── YES ──> [SKIP: IMMUTABLE PROTECTION]
          │                └── NO  ──> [UPDATE status = "ARCHIVED"]
          └── NO  ──> [RETAIN ACTIVE]
```

### Applying a Legal Hold
* **Actor Authorization**: Only users with `ADMIN` privileges can apply or release legal holds.
* **Audit Trail**: Every hold application/release requires a documented reason and appends a `LEGAL_HOLD_APPLIED` or `LEGAL_HOLD_RELEASED` block to the cryptographic chain of custody.
* **Exemption Guarantee**: Records with `retentionStatus: "LEGAL_HOLD"` are skipped by all automated retention cleanups.

---

## 4. Privacy & Regulatory Boundaries

> [!NOTE]
> The system implements non-PII technical watermarking tokens and cryptographic hash chains. The platform explicitly does not claim certified compliance with GDPR, DPDP, SOC 2, or ISO 27001 without third-party formal audit and attestation.
