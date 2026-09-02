# SOC Incident Response & Containment Workflow

## 1. Incident Lifecycle States

```text
  [ DETECTED ] ──► [ TRIAGED ] ──► [ INVESTIGATING ] ──► [ CONTAINMENT_RECOMMENDED ]
                                                                   │
                                                                   ▼
       [ CLOSED / RESOLVED ] ◄────────────────────────────── [ CONTAINED ]
```

### Stage Transitions
1. **`DETECTED`**: Threat engine ingests anomaly cluster and publishes alert to SOC queue.
2. **`TRIAGED`**: SOC operator acknowledges incident and assigns priority.
3. **`INVESTIGATING`**: Operator inspects audit logs, forensic session tags, and device fingerprints.
4. **`CONTAINMENT_RECOMMENDED`**: System calculates recommended remediation (e.g. revoke playback session).
5. **`CONTAINED`**: Administrator explicitly authorizes and executes containment action.
6. **`RESOLVED`**: Root cause confirmed, incident closed with immutable audit log.

---

## 2. Administrator Response Actions

| Action | Target | Impact |
| :--- | :--- | :--- |
| `REVOKE_PLAYBACK_SESSION` | PlaybackSession ID | Immediately terminates HLS stream with `TERMINATED` state. |
| `REVOKE_DRM_LICENSE` | License Token / DRM ID | Invalidates AES decryption keys for target client. |
| `REVOKE_ACTIVATION` | Activation Code | Disables entry/activation QR ticket. |
| `BLACKLIST_TOKEN` | Token Hash | Pushes JWT hash to distributed revoked tokens table. |
