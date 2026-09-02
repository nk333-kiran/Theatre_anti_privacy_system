# Automated Threat Containment & Response Policy

## 1. Response Action Taxonomy

The automated response engine implements controlled mitigation actions:

| Action Code | Description | Scope |
| :--- | :--- | :--- |
| `REVOKE_PLAYBACK_SESSION` | Immediately invalidates the active video stream session token. | Single Playback Session |
| `REVOKE_ACTIVATION` | Invalidates the patron's entry QR token. | Single Ticket / Activation |
| `REVOKE_DRM_LICENSE` | Revokes active DRM keys on the client device. | Client Key Store |
| `BLOCK_VIDEO_ASSET` | Temporarily pauses delivery of a specific master/HLS asset. | Content Asset |
| `RATE_LIMIT_SOURCE` | Enforces aggressive IP/Token sliding-window throttling. | Origin Source |
| `FLAG_SESSION` | Marks the session for active telemetry capture without disruption. | Passive Audit |
| `REQUIRE_MANUAL_REVIEW` | Queues the incident for Tier 2 SOC Analyst investigation. | SOC Incident Queue |

---

## 2. Approval Gating Policies

```text
 ┌────────────────┐
 │ Risk Evaluation│
 └───────┬────────┘
         │
         ├─── [CRITICAL (≥80)] ──► Emergency Containment (Autonomous Execution)
         │
         ├─── [HIGH (60–79)] ───► SOC Approval Gated (Queued for analyst review)
         │
         └─── [LOW / MEDIUM] ───► Recommended & Logged (Non-disruptive rate-limiting)
```

1. **Non-Destructive Actions**:
   - Automated actions **never** delete media files from cloud storage or drop database records.
   - Operations transition state to `TERMINATED`, `REVOKED`, or `EXPIRED`.
2. **SOC Override & Bypass**:
   - Authenticated SOC Analysts (`role: "ADMIN"`) can execute any containment action immediately by setting `isApprovedBySoc: true`.
3. **Audit Ledger Attribution**:
   - Every action generates an immutable record in `AutomatedResponseAction` and logs to `SecurityAuditLog`.
