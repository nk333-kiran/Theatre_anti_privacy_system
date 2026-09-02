# Intelligence Operations & SOC Workflow Runbook

## 1. SOC Analyst Operational Workflow

```text
 ┌────────────────────────────────────────────────────────┐
 │ 1. Command Center / Threat Intelligence Dashboard      │
 │    - Inspect Overall System Risk Score                 │
 │    - Review Upcoming Screening Risk Rankings           │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Emerging Threat Pattern Detected                    │
 │    - Review Occurrence Count & Affected Venues         │
 │    - Click "Acknowledge" to log analyst triage         │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. "Explain Risk" Inspection                           │
 │    - View Contributing Signals & Compound Multipliers  │
 │    - Inspect Audit Log Trail & Checkpoint Telemetry    │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. Forensic Watermark & Investigation Link             │
 │    - Click "Open Forensic Investigation"               │
 │    - Correlate Physical Auditorium Seat & Session      │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 5. Controlled Response Action                          │
 │    - Execute Gated Containment (e.g. Invalidate Stream)│
 │    - Immutable Security Audit Log Persisted            │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based Access Control (RBAC) Matrix

| Endpoint / Capability | Platform Administrator (`ADMIN`) | Production Studio (`PRODUCTION_COMPANY`) | Theatre Staff (`THEATRE_STAFF`) |
| :--- | :---: | :---: | :---: |
| **Global System Risk & Score** | ✅ Full Access | ❌ Scoped / Restricted | ❌ No Access |
| **Movie / Release Predictions** | ✅ All Titles | ✅ Owned Titles Only | ❌ No Access |
| **Recalculate AI Scores** | ✅ Full Access | ❌ No Access | ❌ No Access |
| **Acknowledge Patterns** | ✅ Full Access | ❌ No Access | ❌ No Access |
| **Execute Containment Actions**| ✅ Full Access | ❌ No Access | ❌ No Access |
