# Security Automation Workflow Engine

## Overview

The **Security Automation Workflow Engine** provides configurable, auditable, and non-destructive automation for security operations.

---

## Trigger Types

| Trigger Type | Description |
| :--- | :--- |
| `THREAT_RISK_THRESHOLD` | Evaluates when a session or venue risk score exceeds a configurable threshold (e.g., $\ge 75$). |
| `REPEAT_IOC_CORRELATION` | Triggers when external piracy IOCs match multiple internal playback or network events. |
| `EVIDENCE_TAMPERING` | Fires immediately upon tamper detection or cryptographic HMAC mismatch in the evidence vault. |
| `COORDINATED_ATTACK` | Triggers when simultaneous correlated threats span multiple theatre screening venues. |
| `PRIVILEGED_ACTION_REQUEST` | Fires when an administrative action requires two-person approval. |
| `BREAK_GLASS_ACTIVE` | Fired when an emergency override session is activated. |
| `UNRESOLVED_THREAT` | Triggers when high-severity incidents remain unacknowledged past SLA windows. |

---

## Action Execution Policies

1. **`NOTIFY_SOC`**: Dispatches sanitized notifications to SOC operational queues.
2. **`CREATE_CRITICAL_ALERT`**: Generates high-priority real-time alerts across command consoles.
3. **`CREATE_INVESTIGATION`**: Automatically creates an investigation case with attached forensic telemetry.
4. **`ESCALATE_INCIDENT`**: Escalates incident severity to `HIGH` or `CRITICAL` according to escalation policies.
5. **`REQUIRE_APPROVAL`**: Enqueues action in the Two-Person Privileged Authorization queue.

---

## Execution Audit Ledger

Every automated execution produces an immutable `SecurityWorkflowExecution` record containing:
- `workflowId`: Associated workflow rule.
- `triggerEvent`: The originating event type.
- `decision`: `EXECUTED`, `SKIPPED`, or `REQUIRES_APPROVAL`.
- `actionTaken`: The exact operation performed.
- `correlationId`: Traceable correlation token.
- `executedAt`: Timestamp of execution.
