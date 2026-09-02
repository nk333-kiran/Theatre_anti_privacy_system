# Theatrical Playback Device Operations & Management

## 1. Hardware Lifecycle

```text
 ┌────────────────┐         ┌───────────┐         ┌─────────┐
 │   REGISTERED   │ ──────> │  ACTIVE   │ ──────> │ BLOCKED │
 └────────────────┘         └───────────┘         └─────────┘
                                  │                     │
                                  ▼                     ▼
                            ┌───────────┐         ┌─────────┐
                            │  OFFLINE  │         │ RETIRED │
                            └───────────┘         └─────────┘
```

---

## 2. Terminal Authentication & Heartbeats

* **Device Registration**: When a Barco, Christie, or custom hardware projector terminal is provisioned in an auditorium, it is registered via `POST /api/devices/register` with its unique device ID and screen assignment.
* **Heartbeat Telemetry**: Every 60 seconds during active screenings, the terminal sends a heartbeat via `POST /api/devices/:id/heartbeat` reporting hardware telemetry, software version, and IP address.
* **Tamper Response**: If suspicious activity is detected on a terminal, the SOC Command Center immediately executes `POST /api/devices/:id/block`, terminating current playback and blocking future license issuance to that device.
