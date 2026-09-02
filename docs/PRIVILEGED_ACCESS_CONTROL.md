# Privileged Access Control & Two-Person Approval

## 1. Scope of Privileged Operations

The following operations are classified as **Privileged Actions** and cannot be executed unilaterally without two-person administrative authorization:
- `DRM_LICENSE_REVOKE`: Revoking active cryptographic playback licenses.
- `PLAYBACK_TERMINATE`: Force-terminating screening playback streams.
- `THEATRE_BLOCK`: Venue isolation or screen shutdown.
- `POLICY_MODIFY`: Production policy updates.
- `EVIDENCE_DELETE`: Deletion of forensic records.
- `BREAK_GLASS_ACTIVATE`: Emergency bypass activation.

---

## 2. Authorization Lifecycle

```mermaid
sequenceDiagram
    participant Requester as Analyst (Requester)
    participant Engine as Privileged Action Engine
    participant Approver as Security Admin (Approver)
    participant Target as DRM / Playback Subsystem

    Requester->>Engine: 1. requestAction(type, target, reason)
    Engine-->>Engine: 2. Create PENDING request (15m window)
    Approver->>Engine: 3. approveAction(requestId, notes)
    Engine-->>Approver: 4. Issue 64-char crypto Execution Token
    Requester->>Engine: 5. executeAction(requestId, executionToken)
    Engine->>Engine: 6. Timing-safe token verification
    Engine->>Target: 7. Execute privileged operation
    Engine-->>Engine: 8. Burn token (set to null) & transition to EXECUTED
    Engine-->>Engine: 9. Append GovernanceAuditEvent
```

---

## 3. Cryptographic Token Safety & Expiration

- **Short-Lived Window**: Requests expire automatically after 15 minutes if not approved and executed.
- **Timing-Safe Comparison**: Execution tokens are verified using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
- **Single-Use Burn**: The execution token is immediately deleted (`null`) upon successful execution, preventing token reuse.
