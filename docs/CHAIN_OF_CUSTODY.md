# Cryptographic Chain of Custody Specification

## 1. Mathematical Model

The Platform utilizes a sequential cryptographic block-hash structure to record all modifications, access events, inspections, and status changes for every piece of evidence.

### Block Hashing Formula
For the genesis block ($n = 1$):
$$H_0 = \text{"0000000000000000000000000000000000000000000000000000000000000000"}$$

For each subsequent event ($n \ge 1$):
$$H_n = \text{SHA256}(H_{n-1} \,\|\, \text{eventType} \,\|\, \text{actorId} \,\|\, \text{timestamp} \,\|\, \text{eventData})$$

```text
┌───────────────────────────┐       ┌───────────────────────────┐
│ Block 1: Genesis          │       │ Block 2: Inspection       │
│ PrevHash: 000000000000... │ ───>  │ PrevHash: e4f912...       │
│ Current:  e4f912a78b9c... │       │ Current:  89ac013ef4...   │
└───────────────────────────┘       └───────────────────────────┘
                                                  │
                                                  ▼
                                    ┌───────────────────────────┐
                                    │ Block 3: Legal Export     │
                                    │ PrevHash: 89ac013ef4...   │
                                    │ Current:  12d4889ea7...   │
                                    └───────────────────────────┘
```

---

## 2. Event Types Recorded

| Event Type | Trigger | Description |
| :--- | :--- | :--- |
| `ACQUISITION` | Sensor or Watermark match | Genesis block created with initial payload snapshot |
| `ANALYST_ACCESS` | Analyst views evidence | Audit log entry appended to chain |
| `VERIFICATION` | Manual or daemon scanner | Integrity scan record verifying unbroken hash |
| `LEGAL_HOLD_APPLIED` | Admin applies legal hold | Tags record as non-purgeable |
| `LEGAL_HOLD_RELEASED`| Admin releases legal hold | Restores normal retention schedule |
| `EXPORT` | Dossier generated | Logs format, actor, and export purpose |
| `ARCHIVAL` | Retention evaluator | Historical archival record |

---

## 3. Tamper Detection Workflow

1. The `evidenceIntegrityService` pulls all chain events sorted chronologically by `timestamp` and `id`.
2. For each block $i$, it validates that $\text{previousChainHash}_i = \text{currentChainHash}_{i-1}$.
3. It recalculates the SHA-256 block hash and tests timing-safe equivalence against $\text{currentChainHash}_i$.
4. If an insertion, omission, or alteration is detected:
   * Record status transitions to `FLAGGED_TAMPERED`.
   * Real-time SOC event published: `EVIDENCE_TAMPERING_DETECTED`.
   * CRITICAL Security Audit Log recorded.
