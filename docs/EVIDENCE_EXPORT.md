# Forensic Evidence Export & Sanitization

## 1. Overview

The **Evidence Export System** produces self-contained, sanitized forensic dossiers suitable for legal discovery, law enforcement referrals, and studio technical audits.

---

## 2. Export Formats

### 1. Forensic Report (`.txt`)
Human-readable forensic summary containing:
* Executive incident description
* Canonical Record SHA-256 hash
* Sequential Chain of Custody blocks with timestamps and actors
* Attached artifact verification statuses
* Verification timestamp & legal hold status

### 2. Machine-Readable JSON (`.json`)
Structured payload containing:
* Canonical metadata attributes
* Sanitized artifact hashes and payload representations
* Full array of cryptographic chain events

### 3. Delimited CSV (`.csv`)
Tabular key-value export designed for ingest into spreadsheet tools and enterprise SIEM platforms.

---

## 3. Sanitization Guarantees

```text
┌─────────────────────────────────────────────────────────────┐
│                 Evidence Export Sanitizer                   │
├─────────────────────────────────────────────────────────────┤
│  ✓ Strips Master DRM Keys & Private Passphrases             │
│  ✓ Strips JWT Secrets and Authentication Tokens             │
│  ✓ Strips Patron Personal Identifiable Information (PII)   │
│  ✓ Retains Auditorium Coordinate & Session Hashes          │
│  ✓ Records Immutable EvidenceAccessLog on Export Action     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Chain of Custody Export Logging

Every export action triggers:
1. An entry in `EvidenceAccessLog` with `accessType: "EXPORT"` and authenticated user ID.
2. A new block appended to `EvidenceChainEvent` with `eventType: "EXPORT"`.
