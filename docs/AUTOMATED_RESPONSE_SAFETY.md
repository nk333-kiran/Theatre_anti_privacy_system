# Automated Response Safety & Human-in-the-Loop Controls

## 1. Core Safety Guarantees

1. **No Autonomous Disruptions**: The system never automatically terminates a paying patron's active movie stream or revokes credentials solely based on an anomaly score without explicit Administrator approval.
2. **RECOMMENDED State Default**: Automated responses are generated in a pending `RECOMMENDED` state.
3. **Dual Action Path**: Administrators can click **Approve** to execute or **Reject** with false-positive notes.
4. **Idempotency & Auditing**: Every executed action records who approved it (`executedBy`), timestamp (`executedAt`), result, and emits an immutable log entry in `SecurityAuditLog`.

---

## 2. Risk Decay Against False Positives
Dynamic risk scores apply time-based exponential decay every 60 seconds (15% reduction per 10 minutes of clean activity). Temporary network glitches or benign anomalies naturally de-escalate rather than accumulating indefinitely.
