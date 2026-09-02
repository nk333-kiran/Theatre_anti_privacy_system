# Background Worker Queue Operations & Dead-Letter Handling

## 1. Job Lifecycle & Queue States

```text
 ┌─────────────┐         ┌──────────────┐         ┌───────────┐
 │   PENDING   │ ──────> │  PROCESSING  │ ──────> │ COMPLETED │
 └─────────────┘         └──────────────┘         └───────────┘
                                │
                                ▼ (Failure)
                         ┌──────────────┐
                         │   RETRYING   │ (Exponential backoff: 2^retry * 100ms)
                         └──────────────┘
                                │
                                ▼ (Max retries exceeded)
                         ┌──────────────┐
                         │ DEAD_LETTER  │ (Saved for forensic/operator triage)
                         └──────────────┘
```

---

## 2. Worker Concurrency & Recovery

* **Worker Concurrency**: 4 parallel workers per node.
* **Dead Letter Queue (DLQ)**: Jobs failing 3 consecutive attempts are quarantined into the DLQ with full stack traces, avoiding CPU starvation or infinite retry loops.
