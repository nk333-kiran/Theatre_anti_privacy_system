# Unified Security Incident Lifecycle

## Overview

The Platform implements a standardized 8-stage state machine for anti-piracy security incidents:

$$\text{DETECTED} \longrightarrow \text{TRIAGED} \longrightarrow \text{INVESTIGATING} \longrightarrow \text{CONTAINMENT\_PENDING} \longrightarrow \text{CONTAINED} \longrightarrow \text{MONITORING} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED}$$

---

## State Transition Rules

```
                +------------+
                |  DETECTED  |
                +-----+------+
                      |
                      v
                +------------+
                |  TRIAGED   |<-------------------------+
                +-----+------+                          |
                      |                                 |
                      v                                 |
           +---------------------+                      |
           |    INVESTIGATING    |                      |
           +----------+----------+                      |
                      |                                 |
                      v                                 |
           +---------------------+                      |
           | CONTAINMENT_PENDING |                      |
           +----------+----------+                      |
                      |                                 |
                      v                                 |
           +---------------------+                      |
           |      CONTAINED      |                      |
           +----------+----------+                      |
                      |                                 |
                      v                                 |
           +---------------------+                      |
           |     MONITORING      |                      |
           +----------+----------+                      |
                      |                                 |
                      v                                 |
           +---------------------+                      |
           |      RESOLVED       |                      |
           +----------+----------+                      |
                      |                                 |
                      v                                 |
           +---------------------+                      |
           |       CLOSED        |                      |
           +----------+----------+                      |
                      |                                 |
                      +---(Reopen on new telemetry)----+
```

---

## Lifecycle Responsibilities

1. **`DETECTED`**: Automatically created upon telemetry anomaly or operator alert. Canonical `INC-YYYY-XXXX` identifier assigned.
2. **`TRIAGED`**: Assigned to an analyst; initial validity of telemetry confirmed; `acknowledgedAt` timestamp recorded.
3. **`INVESTIGATING`**: Deep forensic analysis in progress, linking watermarks, device fingerprints, and external IOCs.
4. **`CONTAINMENT_PENDING`**: Containment recommendations submitted and awaiting authorization.
5. **`CONTAINED`**: Approved containment actions (e.g. ticket batch hold, screening quarantine) active.
6. **`MONITORING`**: Post-containment telemetry verification to ensure no secondary leak streams remain active.
7. **`RESOLVED`**: Root cause established, resolution notes documented, `resolvedAt` timestamp recorded.
8. **`CLOSED`**: Post-incident review completed and archived.
